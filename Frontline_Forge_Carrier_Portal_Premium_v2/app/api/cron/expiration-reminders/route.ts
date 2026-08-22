import type { NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCarrier } from "@/lib/notifications";
export const maxDuration = 60;
export async function GET(request: NextRequest){if(!cronAuthorized(request))return new Response("Unauthorized",{status:401});const admin=createAdminClient();const cutoff=new Date(Date.now()+30*86400000).toISOString().slice(0,10);const {data:docs}=await admin.from("documents").select("carrier_id,title,expires_on").not("expires_on","is",null).lte("expires_on",cutoff).eq("status","active");const grouped=new Map<string,string[]>();for(const doc of docs||[]){const list=grouped.get(doc.carrier_id)||[];list.push(`${doc.title} expires ${doc.expires_on}`);grouped.set(doc.carrier_id,list);}for(const [carrierId,items] of grouped){await notifyCarrier({carrierId,title:"Document expiration reminder",message:items.join("; "),type:"expiration",link:"/profile",email:true});}return Response.json({success:true,carriers:grouped.size});}
