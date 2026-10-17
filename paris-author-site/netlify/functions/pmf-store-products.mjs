import { toLegacyEvent, fromLegacyResponse } from "../lib/pmf-v2-bridge.mjs";
import catalog from "../lib/pmf-store.js";
import inv from "../lib/pmf-inventory.js";
const {store,list,display,isProductionDeploy}=catalog;
import auth from "../lib/pmf-admin-auth.js";
const {json}=auth;
const legacyHandler=async(event)=>{
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 try{
   const products=(await inv.availability(await list(await store(event),{publicOnly:true,production:isProductionDeploy(event)}))).map(display);
   const paymentReady=process.env.PMF_SQUARE_CART_ENABLED==="true" && inv.databaseReady() && Boolean(process.env.PMF_SQUARE_WEBHOOK_SIGNATURE_KEY) && Boolean(process.env.PMF_SQUARE_WEBHOOK_NOTIFICATION_URL) && Boolean(process.env.SQUARE_ACCESS_TOKEN) && Boolean(process.env.SQUARE_LOCATION_ID) && ((isProductionDeploy(event) && process.env.SQUARE_ENVIRONMENT==="production") || (!isProductionDeploy(event) && process.env.SQUARE_ENVIRONMENT==="sandbox"));
   return json(200,{products,cartEnabled:paymentReady,preorderEnabled:paymentReady && process.env.PMF_MYSTERY_PREORDER_ENABLED==="true"},{ "Cache-Control":"no-store" });
 }catch(err){
   console.error("Store catalog",err);
   return json(503,{error:"Our catalog is temporarily unavailable. Please try again."});
 }
};

export default async function handler(request, context) {
  const event = await toLegacyEvent(request, context);
  return fromLegacyResponse(await legacyHandler(event));
}
