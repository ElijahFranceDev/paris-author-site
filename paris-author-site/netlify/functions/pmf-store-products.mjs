import { toLegacyEvent, fromLegacyResponse } from "../lib/pmf-v2-bridge.mjs";
import catalog from "../lib/pmf-store.js";
import inv from "../lib/pmf-inventory.js";
const {store,list,display}=catalog;
import auth from "../lib/pmf-admin-auth.js";
const {json}=auth;
const legacyHandler=async(event)=>{
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 try{
   const products=(await inv.availability(await list(await store(event),{publicOnly:true}))).map(display);
   return json(200,{products,cartEnabled:process.env.PMF_SQUARE_CART_ENABLED==="true" && Boolean(process.env.SQUARE_ACCESS_TOKEN) && Boolean(process.env.SQUARE_LOCATION_ID) && ((process.env.CONTEXT==="production" && process.env.SQUARE_ENVIRONMENT==="production") || (process.env.CONTEXT!=="production" && process.env.SQUARE_ENVIRONMENT==="sandbox"))},{ "Cache-Control":"no-store" });
 }catch(err){
   console.error("Store catalog",err);
   return json(503,{error:"Our catalog is temporarily unavailable. Please try again."});
 }
};

export default async function handler(request) {
  const event = await toLegacyEvent(request);
  return fromLegacyResponse(await legacyHandler(event));
}
