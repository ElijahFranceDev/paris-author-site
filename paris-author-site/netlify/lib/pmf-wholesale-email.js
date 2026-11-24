"use strict";
const emailPattern=/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,63}$/;
const validEmail=v=>typeof v==="string"&&v.length<=254&&emailPattern.test(v);
const {summarize}=require("../../trade-pricing.js");
const {html}=require("./pmf-wholesale-email-html.js");
const money=c=>c==null?"Quote on request":(c/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
function config(env=process.env){
 const key=env.PMF_WHOLESALE_RESEND_API_KEY,from=env.PMF_WHOLESALE_FROM_EMAIL,owner=env.PMF_WHOLESALE_OWNER_EMAIL;
 return key&&validEmail(from)&&validEmail(owner)?{key,from,owner}:null;
}
function messages(order,c){
 const summary=order.lines.map(i=>i.title+" ("+i.format+") × "+i.quantity+" — "+money(i.unitCents)+" per copy — "+money(i.unitCents==null?null:i.unitCents*i.quantity)+" line total").join("\n");
  const amounts=summarize(order.lines);
 const subtotal=amounts.pendingQuantity?"Priced books subtotal: "+money(amounts.knownSubtotalCents)+"\n"+amounts.pendingQuantity+" copies require pricing; complete subtotal pending.":"Estimated subtotal: "+money(amounts.subtotalCents);
 const totals="Reference: "+order.id+"\nTotal copies: "+order.quantity+"\nDiscount: "+order.discount+"% off MSRP\n"+subtotal+"\nShipping and applicable taxes confirmed on invoice.";
 const common={from:"P.M. France Wholesale <"+c.from+">"};
 return {
 owner:{...common,html:html(order,"owner"),to:[c.owner],reply_to:order.email,subject:"New P.M. France wholesale order request",text:"A new wholesale order was saved.\n\nBookstore/library: "+order.organization+"\nContact: "+order.contact+"\nEmail: "+order.email+"\nShipping address: "+order.address+"\nNotes: "+(order.notes||"None")+"\n\n"+summary+"\n\n"+totals+"\n\nReview in https://parisfrance.shop/admin.html — send your Square invoice manually. No payment or stock reservation has occurred."},
 customer:{...common,html:html(order,"customer"),to:[order.email],reply_to:c.owner,subject:"P.M. France — Wholesale request received",text:"Thank you for requesting books from P.M. France. Your wholesale request has been received.\n\n"+summary+"\n\n"+totals+"\n\nWe will review availability and pricing and send a Square invoice separately. You have not been charged, and inventory has not been reserved. This is not an invoice or a guarantee of fulfillment.\n\nP.M. France\nhttps://parisfrance.shop/wholesale.html"}
 };
}
async function notify(order,{production=false,env=process.env,fetcher=globalThis.fetch}={}){
 if(!production)return {owner:"preview_disabled",customer:"preview_disabled"};
 const c=config(env);if(!c)return {owner:"not_configured",customer:"not_configured"};
 if(!validEmail(order.email))return {owner:"invalid_email",customer:"invalid_email"};
 const m=messages(order,c);
 async function send(role){
  try{
   const r=await fetcher("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+c.key,"Content-Type":"application/json","Idempotency-Key":"pmf-wholesale/"+order.id+"/"+role},body:JSON.stringify(m[role]),signal:AbortSignal.timeout(5000)});
   if(!r.ok)return "failed";
   const data=await r.json();return typeof data.id==="string"&&data.id?"accepted":"failed";
  }catch{return "failed";}
 }
 const [owner,customer]=await Promise.all([send("owner"),send("customer")]);return {owner,customer};
}
module.exports={validEmail,config,messages,notify};
