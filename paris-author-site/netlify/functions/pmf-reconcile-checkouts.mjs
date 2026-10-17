import inventory from "../lib/pmf-inventory.js";
export default async function handler(){
 if(!inventory.databaseReady()||process.env.PMF_SQUARE_CART_ENABLED!=="true")return;
 const environment=process.env.SQUARE_ENVIRONMENT;
 if(!["sandbox","production"].includes(environment))return;
 const root=environment==="sandbox"?"https://connect.squareupsandbox.com":"https://connect.squareup.com";
 const headers={"Authorization":"Bearer "+process.env.SQUARE_ACCESS_TOKEN,"Square-Version":"2026-09-16"};
 for(const record of await inventory.pendingExpired(15)){
  try{
   const url=root+"/v2/online-checkout/payment-links/"+encodeURIComponent(record.square_link_id);
   const reply=await fetch(url,{method:"DELETE",headers});
   if(!reply.ok)continue;
   const info=await reply.json();
   if(info.cancelled_order_id!==record.square_order_id)continue;
   const verify=await fetch(root+"/v2/orders/"+encodeURIComponent(record.square_order_id),{headers});
   if(!verify.ok)continue;
   const result=await verify.json();
   if(result.order?.state==="CANCELED")await inventory.releaseCancelled(record.id,record.square_order_id);
  }catch(e){console.error("PMF order reconciliation",e?.name)}
 }
}
export const config={schedule:"*/30 * * * *"};
