(()=>{
"use strict";
const $=id=>document.getElementById(id),root=$("trade-orders"),status=$("trade-admin-status"),endpoint="/.netlify/functions/pmf-wholesale-orders",T=window.PMF_TRADE;
const states=["Order received","Under review","Invoice sent","Payment received","Printing / Processing","Shipped","Delivered","Cancelled"];
const money=c=>c==null?"Quote required":(c/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
const node=(tag,t,cls)=>{const e=document.createElement(tag);if(t!==undefined)e.textContent=t;if(cls)e.className=cls;return e;};
function block(label,value){const e=node("div",undefined,"trade-detail");e.append(node("span",label,"trade-label"),node("div",value));return e;}
function metric(label,value){const e=node("div",undefined,"trade-metric");e.append(node("span",label,"trade-label"),node("strong",value));return e;}
const statesText={accepted:"Accepted by email provider (delivery not confirmed)",failed:"Send failed — follow up manually",not_configured:"Not configured",preview_disabled:"Disabled in preview",invalid_email:"Invalid address"};
const emailState=v=>statesText[v]||"Not recorded";
let signed=false,version=0;
function orderCard(o){
 const a=node("article",undefined,"trade-order"),amounts=T.summarize(o.lines);
 const header=node("div",undefined,"trade-order-header"),heading=node("div");
 heading.append(node("h3",o.organization),node("p",new Date(o.createdAt).toLocaleString(),"trade-muted"));
 const badge=node("span",o.status,"trade-status");badge.dataset.status=o.status;header.append(heading,badge);a.append(header);
 const metrics=node("div",undefined,"trade-metrics");
 metrics.append(metric("Copies",String(o.quantity)),metric("Wholesale discount",o.discount+"%"),metric(amounts.pendingQuantity?"Priced books subtotal":"Order subtotal",money(amounts.knownSubtotalCents)));a.append(metrics);
 const details=node("div",undefined,"trade-details");
 details.append(block("Contact",o.contact),block("Email",o.email),block("Shipping address",o.address),block("Order reference",o.id));if(o.notes)details.append(block("Order notes",o.notes));a.append(details);
 const items=node("section",undefined,"trade-order-section");items.append(node("h4","Books ordered"));
 const scroll=node("div",undefined,"trade-table-scroll"),table=node("table",undefined,"trade-table"),head=node("thead"),hr=node("tr");
 ["Title / format","Qty","Unit price","Line total"].forEach(t=>{const th=node("th",t);th.scope="col";hr.append(th);});head.append(hr);table.append(head);
 const body=node("tbody");o.lines.forEach(i=>{const row=node("tr"),title=node("td");title.append(node("strong",i.title),node("div",i.format||"","trade-muted"));row.append(title,node("td",String(i.quantity)),node("td",money(i.unitCents)),node("td",money(i.unitCents==null?null:i.unitCents*i.quantity)));body.append(row);});table.append(body);scroll.append(table);items.append(scroll);
 const totals=node("div",undefined,"trade-total");totals.append(block(amounts.pendingQuantity?"Subtotal for priced copies":"Wholesale subtotal",money(amounts.knownSubtotalCents)));
 if(amounts.pendingQuantity){totals.append(node("p",amounts.pendingQuantity+" "+(amounts.pendingQuantity===1?"copy needs":"copies need")+" pricing. Full order subtotal pending.","trade-warning"));const link=node("a","Set missing MSRP in product manager");link.href="#editor-panel";totals.append(link);}
 totals.append(node("p","Shipping and applicable taxes are finalized on the Square invoice.","trade-muted"));items.append(totals);a.append(items);
 const notifications=node("section",undefined,"trade-order-section");notifications.append(node("h4","Email notifications"));
 const notices=node("div",undefined,"trade-details");notices.append(block("Author alert",emailState(o.notification?.owner)),block("Bookstore confirmation",emailState(o.notification?.customer)));notifications.append(notices);a.append(notifications);
 const controls=node("div",undefined,"trade-order-controls"),label=node("label","Order status"),select=node("select");states.forEach(s=>{const opt=node("option",s);opt.value=s;select.append(opt);});select.value=o.status;label.append(select);
 const save=node("button","Save status","btn secondary");save.type="button";save.addEventListener("click",async()=>{save.disabled=true;try{const r=await fetch(endpoint,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"status",id:o.id,status:select.value})});if(!r.ok)throw Error((await r.json()).error);await load();}catch(err){status.textContent=err.message||"Unable to update status.";}finally{save.disabled=false;}});controls.append(label,save);a.append(controls);return a;
}
async function load(){if(!signed)return;const v=++version;status.textContent="Loading requests…";try{const r=await fetch(endpoint,{cache:"no-store",credentials:"same-origin"}),d=await r.json();if(!r.ok)throw Error(d.error);if(!signed||v!==version)return;root.replaceChildren();status.textContent=d.orders.length+" "+(d.orders.length===1?"request":"requests")+" · "+(d.emailConfigured?"Email notifications configured":"Email notifications not configured or preview disabled");if(!d.orders.length)root.append(node("p","No wholesale requests yet.","trade-muted"));d.orders.forEach(o=>root.append(orderCard(o)));}catch(err){if(signed&&v===version)status.textContent=err.message||"Unable to load requests.";}}
document.addEventListener("pmf-auth",e=>{signed=e.detail.authenticated;if(signed)load();else{version++;root.replaceChildren();status.textContent="";}});$("trade-refresh").addEventListener("click",load);
})();
