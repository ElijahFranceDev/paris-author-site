import {toLegacyEvent,fromLegacyResponse} from '../lib/pmf-v2-bridge.mjs';
import auth from '../lib/pmf-admin-auth.js';
import catalog from '../lib/pmf-store.js';
import inventory from '../lib/pmf-inventory.js';
import analytics from '../lib/pmf-analytics.js';
export default async function(request,context){
 const event=await toLegacyEvent(request,context),reply=(s,b)=>fromLegacyResponse(auth.json(s,b));
 if(request.method!=='GET')return reply(405,{error:'Method not allowed.'});
 if(!auth.authorized(event))return reply(401,{error:'Author sign-in required.'});
 try{
 const store=await catalog.store(event),downloads=await analytics.downloadSummary(store);
 const config=await store.get('birthday/config',{type:'json'})||{books:[]};
 for(const b of config.books)if(!downloads.books.some(row=>row.bookId===b.id))downloads.books.push({bookId:b.id,title:b.title,downloads:0,uniqueSelections:0,lastDownload:null});
 const orders={available:false,total:0,revenueCents:0,recent:[],message:'Website order database is not connected.'};
 if(catalog.isProductionDeploy(event)&&inventory.databaseReady())try{
 const db=inventory.db();
 const totals=await db.query("SELECT count(*)::int AS total,COALESCE(sum(expected_total_cents),0)::bigint AS revenue FROM pmf_checkout_reservations WHERE status='paid'");
 const recent=await db.query("SELECT r.id::text,r.square_order_id,r.paid_at,r.expected_total_cents,COALESCE(json_agg(json_build_object('productId',i.product_id,'quantity',i.quantity)) FILTER (WHERE i.product_id IS NOT NULL),'[]'::json) AS items FROM pmf_checkout_reservations r LEFT JOIN pmf_reservation_items i ON i.reservation_id=r.id WHERE r.status='paid' GROUP BY r.id ORDER BY r.paid_at DESC LIMIT 50");
 const products=await catalog.list(store,{production:true,includeDeleted:true}),titles=new Map(products.map(p=>[p.id,p.title]));
 Object.assign(orders,{available:true,total:Number(totals.rows[0].total),revenueCents:Number(totals.rows[0].revenue),message:'Confirmed paid website cart orders. Legacy Square links, offline sales and refunds are not included.',recent:recent.rows.map(r=>({id:r.square_order_id||r.id,at:r.paid_at,totalCents:Number(r.expected_total_cents),items:r.items.map(i=>({...i,title:titles.get(i.productId)||i.productId}))}))});
 }catch(e){console.error('Order analytics',e?.code||e?.name);orders.message='Order data is temporarily unavailable. Try refreshing.';}
 return reply(200,{updatedAt:new Date().toISOString(),downloads,orders});
 }catch(e){console.error('Author analytics',e?.name);return reply(503,{error:'Analytics temporarily unavailable. Please refresh.'});}
}
