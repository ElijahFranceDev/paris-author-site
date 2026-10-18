"use strict";
// P.M. France dedicated Neon/PostgreSQL inventory ledger.
// Netlify Blobs stores catalog text/images; this database alone enforces sellable stock.
const crypto=require("node:crypto");
const {Pool}=require("pg");
let pool;
class InventoryError extends Error {
 constructor(message,status=409){super(message);this.name="InventoryError";this.status=status;}
}
function databaseReady(){return Boolean(process.env.PMF_INVENTORY_DATABASE_URL);}
function db(){
 if(!databaseReady())throw new InventoryError("The inventory database is not connected. Checkout is paused.",503);
 if(!pool)pool=new Pool({
  connectionString:process.env.PMF_INVENTORY_DATABASE_URL,
  max:3,connectionTimeoutMillis:6000,idleTimeoutMillis:15000,
  ssl:{rejectUnauthorized:true}
 });
 return pool;
}
async function transaction(fn){
 const client=await db().connect();
 try{
  await client.query("BEGIN");
  const result=await fn(client);
  await client.query("COMMIT");return result;
 }catch(err){await client.query("ROLLBACK").catch(()=>{});throw err;}
 finally{client.release();}
}
async function availability(products){
 if(!databaseReady())return products;
 const ids=products.filter(p=>p.trackStock).map(p=>p.id);
 if(!ids.length)return products;
 const {rows}=await db().query(
  "SELECT product_id::text,stock_total,stock_sold,stock_reserved,version FROM pmf_inventory WHERE product_id::text=ANY($1::text[])",[ids]);
 const byId=new Map(rows.map(r=>[r.product_id,r]));
 return products.map(p=>{
   if(!p.trackStock)return p;
   const row=byId.get(p.id);
   if(!row)return {...p,inventoryVersion:null};
   const available=Number(row.stock_total)-Number(row.stock_sold)-Number(row.stock_reserved);
   return {...p,stock:available,inventoryVersion:Number(row.version)};
 });
}
async function updateStock(product,expectedVersion){
 if(!product.trackStock)return;
 if(!Number.isSafeInteger(product.stock)||product.stock<0)throw new InventoryError("Enter a valid stock quantity.",400);
 return transaction(async client=>{
  const existing=await client.query("SELECT * FROM pmf_inventory WHERE product_id=$1 FOR UPDATE",[product.id]);
  if(!existing.rowCount){
   if(expectedVersion!==null&&expectedVersion!==undefined)throw new InventoryError("Inventory changed. Refresh and retry.");
   await client.query("INSERT INTO pmf_inventory(product_id,stock_total) VALUES($1,$2)",[product.id,product.stock]);
   return;
  }
  const row=existing.rows[0];
  if(!Number.isInteger(expectedVersion)||expectedVersion!==row.version)
   throw new InventoryError("Inventory changed since you opened this product. Refresh the dashboard before saving.");
  const newTotal=Number(row.stock_sold)+Number(row.stock_reserved)+product.stock;
  await client.query("UPDATE pmf_inventory SET stock_total=$2,version=version+1,updated_at=now() WHERE product_id=$1",[product.id,newTotal]);
 });
}
async function reserve(order,products){
 return transaction(async client=>{
  const id=crypto.randomUUID();
  const byId=new Map(products.map(p=>[p.id,p]));
  const tracked=order.items.filter(i=>byId.get(i.id)?.trackStock).sort((a,b)=>a.id.localeCompare(b.id));
  for(const item of tracked){
   const product=byId.get(item.id);
   await client.query("INSERT INTO pmf_inventory(product_id,stock_total) VALUES($1,$2) ON CONFLICT DO NOTHING",[item.id,product.stock]);
   const res=await client.query("SELECT stock_total,stock_sold,stock_reserved FROM pmf_inventory WHERE product_id=$1 FOR UPDATE",[item.id]);
   const stock=res.rows[0];
   const available=Number(stock.stock_total)-Number(stock.stock_sold)-Number(stock.stock_reserved);
   if(available<item.qty)throw new InventoryError(product.title+" is sold out or has insufficient stock.");
   await client.query("UPDATE pmf_inventory SET stock_reserved=stock_reserved+$2,version=version+1,updated_at=now() WHERE product_id=$1",[item.id,item.qty]);
  }
  await client.query("INSERT INTO pmf_checkout_reservations(id,expected_total_cents,status) VALUES($1,$2,'preparing')",[id,order.totalCents]);
  for(const item of order.items){
   await client.query("INSERT INTO pmf_reservation_items(reservation_id,product_id,quantity,tracked) VALUES($1,$2,$3,$4)",[id,item.id,item.qty,Boolean(byId.get(item.id)?.trackStock)]);
  }
  return id;
 });
}
async function attachSquareLink(id,orderId,linkId){
 if(typeof orderId!=="string"||!orderId||typeof linkId!=="string"||!linkId)throw new InventoryError("Square checkout missing order details.",502);
 const {rowCount}=await db().query(
 "UPDATE pmf_checkout_reservations SET square_order_id=$2,square_link_id=$3,status='awaiting_payment',updated_at=now() WHERE id=$1 AND status='preparing'",[id,orderId,linkId]);
 if(!rowCount)throw new InventoryError("Checkout reservation changed. No link was activated.",503);
}
async function confirmPayment({orderId,paymentId,amountCents,currency,locationId}){
 if(!orderId||!paymentId||currency!=="USD"||locationId!==process.env.SQUARE_LOCATION_ID)return {ignored:true};
 return transaction(async client=>{
  const result=await client.query("SELECT * FROM pmf_checkout_reservations WHERE square_order_id=$1 FOR UPDATE",[orderId]);
  if(!result.rowCount)return {ignored:true};
  const reservation=result.rows[0];
  if(reservation.status==="paid")return {duplicate:true};
  if(reservation.status!=="awaiting_payment"){
   await client.query("UPDATE pmf_checkout_reservations SET status='review',updated_at=now() WHERE id=$1 AND status<>'paid'",[reservation.id]);
   return {review:true};
  }
  if(!Number.isSafeInteger(amountCents)||amountCents<reservation.expected_total_cents)
   throw new InventoryError("Square payment amount did not cover the order. Hold for review.",503);
  const items=await client.query("SELECT product_id,quantity,tracked FROM pmf_reservation_items WHERE reservation_id=$1 AND tracked=true ORDER BY product_id FOR UPDATE",[reservation.id]);
  for(const item of items.rows){
   await client.query("UPDATE pmf_inventory SET stock_reserved=stock_reserved-$2,stock_sold=stock_sold+$2,version=version+1,updated_at=now() WHERE product_id=$1",[item.product_id,item.quantity]);
  }
  await client.query("UPDATE pmf_checkout_reservations SET status='paid',payment_id=$2,paid_at=now(),updated_at=now() WHERE id=$1",[reservation.id,paymentId]);
  return {paid:true};
 });
}
// Release stock only when Square explicitly rejected payment-link creation.
// A successful or uncertain gateway response must never release a possibly payable order.
async function releaseFailedPreparation(id){
 return transaction(async client=>{
  const result=await client.query("SELECT status,square_link_id FROM pmf_checkout_reservations WHERE id=$1 FOR UPDATE",[id]);
  if(!result.rowCount||result.rows[0].status!=="preparing"||result.rows[0].square_link_id!==null)return false;
  const items=await client.query("SELECT product_id,quantity FROM pmf_reservation_items WHERE reservation_id=$1 AND tracked=true ORDER BY product_id FOR UPDATE",[id]);
  for(const item of items.rows){
   const updated=await client.query("UPDATE pmf_inventory SET stock_reserved=stock_reserved-$2,version=version+1,updated_at=now() WHERE product_id=$1 AND stock_reserved >= $2",[item.product_id,item.quantity]);
   if(updated.rowCount!==1)throw new InventoryError("Failed preparation inventory requires reconciliation.",503);
  }
  await client.query("UPDATE pmf_checkout_reservations SET status='released',updated_at=now() WHERE id=$1",[id]);
  return true;
 });
}
async function pendingExpired(limit=20){
 const {rows}=await db().query("SELECT id::text,square_order_id,square_link_id FROM pmf_checkout_reservations WHERE status='awaiting_payment' AND reserved_until<now() AND square_link_id IS NOT NULL ORDER BY reserved_until ASC LIMIT $1",[limit]);
 return rows;
}
async function releaseCancelled(id,orderId){
 return transaction(async client=>{
  const r=await client.query("SELECT * FROM pmf_checkout_reservations WHERE id=$1 FOR UPDATE",[id]);
  if(!r.rowCount||r.rows[0].status!=="awaiting_payment"||r.rows[0].square_order_id!==orderId)return false;
  const items=await client.query("SELECT product_id,quantity FROM pmf_reservation_items WHERE reservation_id=$1 AND tracked=true ORDER BY product_id FOR UPDATE",[id]);
  for(const item of items.rows){
    await client.query("UPDATE pmf_inventory SET stock_reserved=stock_reserved-$2,version=version+1,updated_at=now() WHERE product_id=$1",[item.product_id,item.quantity]);
  }
  await client.query("UPDATE pmf_checkout_reservations SET status='released',updated_at=now() WHERE id=$1",[id]);
  return true;
 });
}
module.exports={InventoryError,databaseReady,db,transaction,availability,updateStock,reserve,attachSquareLink,confirmPayment,pendingExpired,releaseCancelled,releaseFailedPreparation};
