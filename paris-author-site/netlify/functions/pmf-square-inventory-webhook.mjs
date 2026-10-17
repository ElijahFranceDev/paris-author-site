import inventory from "../lib/pmf-inventory.js";
import squareEvents from "../lib/pmf-square-webhook.js";
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export default async function handler(request){
 if(request.method!=="POST")return json(405,{error:"Not allowed"});
 const secret=process.env.PMF_SQUARE_WEBHOOK_SIGNATURE_KEY;
 const url=process.env.PMF_SQUARE_WEBHOOK_NOTIFICATION_URL;
 if(!secret||!url||!inventory.databaseReady())return json(503,{error:"Not configured"});
 const body=await request.text();
 if(body.length>500000)return json(413,{error:"Too large"});
 if(!squareEvents.verify(body,request.headers.get("x-square-hmacsha256-signature"),secret,url))
   return json(403,{error:"Signature invalid"});
 let event;try{event=JSON.parse(body)}catch{return json(400,{error:"Invalid payload"})}
 const id=squareEvents.paymentId(event);
 if(!id)return json(200,{received:true});
 const env=(process.env.SQUARE_ENVIRONMENT||"").toLowerCase();
 if(!["sandbox","production"].includes(env))return json(503,{error:"Invalid payment environment"});
 try{
  const endpoint=env==="sandbox"?"https://connect.squareupsandbox.com":"https://connect.squareup.com";
  const res=await fetch(endpoint+"/v2/payments/"+encodeURIComponent(id),{headers:{
    "Authorization":"Bearer "+process.env.SQUARE_ACCESS_TOKEN,
    "Square-Version":"2026-09-16"
  }});
  if(!res.ok){console.error("Square payment validation status",res.status);return json(503,{error:"Payment validation unavailable"})}
  const data=await res.json();
  const p=data.payment;
  if(!p||p.id!==id)return json(503,{error:"Payment verification mismatch"});
  if(p.status!=="COMPLETED")return json(200,{received:true});
  const result=await inventory.confirmPayment({
    paymentId:p.id,orderId:p.order_id,locationId:p.location_id,
    amountCents:Number(p.amount_money?.amount),currency:p.amount_money?.currency
  });
  if(result.review)console.error("Square payment needs manual inventory review:",p.order_id);
  return json(200,{received:true});
 }catch(e){
  console.error("PMF Square inventory confirmation",e?.name||"UnexpectedError");
  return json(503,{error:"Confirmation needs a retry"});
 }
}
