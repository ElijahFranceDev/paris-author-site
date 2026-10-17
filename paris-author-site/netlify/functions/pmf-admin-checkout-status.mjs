import { toLegacyEvent, fromLegacyResponse } from "../lib/pmf-v2-bridge.mjs";
import auth from "../lib/pmf-admin-auth.js";
import catalog from "../lib/pmf-store.js";
import inventory from "../lib/pmf-inventory.js";
export default async function handler(request,context){
  const event=await toLegacyEvent(request,context);
  if(event.httpMethod!=="GET")return fromLegacyResponse(auth.json(405,{error:"Method not allowed"}));
  if(!auth.authorized(event))return fromLegacyResponse(auth.json(401,{error:"Author sign-in required"}));
  const production=catalog.isProductionDeploy(event);
  const environment=process.env.SQUARE_ENVIRONMENT||"";
  const expected=production?"production":"sandbox";
  const webhookUrl=production
    ?"https://parisfrance.shop/.netlify/functions/pmf-square-inventory-webhook"
    :new URL(request.url).origin+"/.netlify/functions/pmf-square-inventory-webhook";
  let databaseConnected=false;
  if(inventory.databaseReady()){
    try{await inventory.db().query("SELECT 1");databaseConnected=true}
    catch(err){console.error("Private PMF checkout database status",err?.code||"connection error")}
  }
  const result={
    deployment:production?"production":"preview",
    status:"Read-only configuration checklist; not a proof of payment completion",
    databaseConfigured:inventory.databaseReady(),
    databaseConnected,
    squareTokenConfigured:Boolean(process.env.SQUARE_ACCESS_TOKEN),
    squareLocationConfigured:Boolean(process.env.SQUARE_LOCATION_ID),
    squareEnvironmentCorrect:environment===expected,
    webhookKeyConfigured:Boolean(process.env.PMF_SQUARE_WEBHOOK_SIGNATURE_KEY),
    webhookUrlConfigured:process.env.PMF_SQUARE_WEBHOOK_NOTIFICATION_URL===webhookUrl,
    cartPaymentsEnabled:process.env.PMF_SQUARE_CART_ENABLED==="true",
    mysteryBoxPreordersEnabled:process.env.PMF_MYSTERY_PREORDER_ENABLED==="true",
    sandboxOrderAndWebhookTestVerified:false
  };
  return fromLegacyResponse(auth.json(200,result));
}
