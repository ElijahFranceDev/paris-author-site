import { toLegacyEvent, fromLegacyResponse } from "../lib/pmf-v2-bridge.mjs";
import catalog from "../lib/pmf-store.js";
const {store,list,display}=catalog;
const {json}=require("../lib/pmf-admin-auth");
const legacyHandler=async(event)=>{
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 try{
   const products=(await list(await store(event),{publicOnly:true})).map(display);
   return json(200,{products},{ "Cache-Control":"public, max-age=0, must-revalidate"});
 }catch(err){
   console.error("Store catalog",err);
   return json(503,{error:"Our catalog is temporarily unavailable. Please try again."});
 }
};

export default async function handler(request) {
  const event = await toLegacyEvent(request);
  return fromLegacyResponse(await legacyHandler(event));
}
