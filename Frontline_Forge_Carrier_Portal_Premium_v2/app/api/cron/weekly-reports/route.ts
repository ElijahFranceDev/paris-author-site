import type { NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCarrierReport } from "@/lib/reports";
import { isoDate, startOfWeek, endOfWeek } from "@/lib/utils";
export const maxDuration = 60;
export async function GET(request: NextRequest){if(!cronAuthorized(request))return new Response("Unauthorized",{status:401});const admin=createAdminClient();const {data}=await admin.from("carriers").select("id").eq("status","active").eq("weekly_report_enabled",true);const start=new Date(startOfWeek());start.setUTCDate(start.getUTCDate()-7);const end=new Date(endOfWeek(start));const results=[];for(const carrier of data||[]){try{await generateCarrierReport({carrierId:carrier.id,reportType:"weekly",startDate:isoDate(start),endDate:isoDate(end)});results.push({id:carrier.id,ok:true});}catch(error){results.push({id:carrier.id,ok:false,error:String(error)});}}return Response.json({success:true,results});}
