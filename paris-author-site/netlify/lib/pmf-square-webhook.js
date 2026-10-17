"use strict";
const crypto=require("node:crypto");
function verify(body,signature,key,url){
 if(!key||!url||typeof signature!=="string"||signature.length>150)return false;
 const digest=crypto.createHmac("sha256",key).update(url+body).digest("base64");
 const a=Buffer.from(digest),b=Buffer.from(signature);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function paymentId(event){
 if(!event||!["payment.created","payment.updated"].includes(event.type))return null;
 const p=event.data?.object?.payment;
 return typeof p?.id==="string"?p.id:null;
}
module.exports={verify,paymentId};
