import { toLegacyEvent,fromLegacyResponse } from "../lib/pmf-v2-bridge.mjs";
import auth from "../lib/pmf-admin-auth.js";
import catalog from "../lib/pmf-store.js";
import trade from "../../trade-pricing.js";
import {randomUUID} from "node:crypto";
const states=["Order received","Under review","Invoice sent","Payment received","Printing / Processing","Shipped","Delivered","Cancelled"];
const clean=(s,max)=>typeof s==="string"&&s.trim().length<=max?s.trim():"";
async function handler(e){
 if(e.httpMethod==="GET"&&!auth.authorized(e))return auth.json(401,{error:"Sign in to view wholesale orders."});
 if(e.httpMethod==="POST"&&!auth.sameOrigin(e))return auth.json(403,{error:"Invalid request origin."});
 if(!["GET","POST"].includes(e.httpMethod))return auth.json(405,{error:"Method not allowed."});
 try{
  const handle=await catalog.store(e);
  if(e.httpMethod==="GET"){let cursor,orders=[],pages=0;do{const r=await handle.list({prefix:"wholesale-orders/",...(cursor?{cursor}:{})});for(const b of r.blobs||[]){const v=await handle.get(b.key,{type:"json",consistency:"strong"});if(v)orders.push(v);}cursor=r.cursor;pages++;}while(cursor&&pages<20);orders.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return auth.json(200,{orders});}
  if((e.body||"").length>24000)return auth.json(413,{error:"Request too large."});
  let raw;try{raw=JSON.parse(e.body||"{}");}catch{return auth.json(400,{error:"Invalid request."});}
  if(!raw||typeof raw!=="object")return auth.json(400,{error:"Invalid request."});
  if(raw.action==="status"){const denied=auth.reject(e);if(denied)return denied;if(!catalog.validId(raw.id)||!states.includes(raw.status))return auth.json(400,{error:"Invalid status."});const key="wholesale-orders/"+raw.id,prior=await handle.get(key,{type:"json",consistency:"strong"});if(!prior)return auth.json(404,{error:"Order not found."});await handle.setJSON(key,{...prior,status:raw.status,updatedAt:new Date().toISOString()});return auth.json(200,{ok:true});}
  if(raw.website)return auth.json(400,{error:"Invalid request."});
  const organization=clean(raw.organization,150),contact=clean(raw.contact,150),email=clean(raw.email,254),address=clean(raw.address,500),notes=clean(raw.notes,1000);
  if(!organization||!contact||!address||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))return auth.json(400,{error:"Enter your organization, contact, email and shipping address."});
  if(!Array.isArray(raw.items)||!raw.items.length||raw.items.length>100)return auth.json(400,{error:"Choose eligible titles."});
  const products=await catalog.list(handle,{publicOnly:true,production:catalog.isProductionDeploy(e)}),byId=new Map(products.filter(trade.eligible).map(p=>[p.id,p])),seen=new Set(),items=[];
  for(const i of raw.items){if(!i||!byId.has(i.id)||seen.has(i.id)||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>10000)return auth.json(400,{error:"Invalid title or quantity."});seen.add(i.id);const p=byId.get(i.id);items.push({id:p.id,title:p.title,format:p.format,sku:p.sku,quantity:i.quantity,wholesaleMsrpCents:p.wholesaleMsrpCents??null,wholesaleResaleCents:p.wholesaleResaleCents??null});}
  const q=trade.quote(items);if(q.quantity>10000)return auth.json(400,{error:"Order limit is 10,000 copies per request."});
  const id=randomUUID(),now=new Date().toISOString();await handle.setJSON("wholesale-orders/"+id,{id,organization,contact,email,address,notes,...q,status:states[0],createdAt:now,updatedAt:now});return auth.json(201,{id});
 }catch(err){console.error("Wholesale order request failed",err?.name);return auth.json(503,{error:"Wholesale requests are temporarily unavailable."});}
}
export default async function(request,context){return fromLegacyResponse(await handler(await toLegacyEvent(request,context)));}
