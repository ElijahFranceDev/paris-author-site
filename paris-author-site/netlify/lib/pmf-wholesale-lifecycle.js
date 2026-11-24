"use strict";
const states=["Order received","Under review","Invoice sent","Payment received","Printing / Processing","Shipped","Delivered","Cancelled"];
const actions=["status","archive","restore","delete"];
const terminal=status=>status==="Delivered"||status==="Cancelled";
class OrderActionError extends Error{constructor(message,status=409){super(message);this.status=status;}}
async function changeOrder(handle,raw,{validId,now=new Date().toISOString()}={}){
 if(!actions.includes(raw.action)||!validId(raw.id))throw new OrderActionError("Invalid order action.",400);
 const key="wholesale-orders/"+raw.id;
 const prior=await handle.get(key,{type:"json",consistency:"strong"});
 if(!prior)throw new OrderActionError("Order not found.",404);
 if(raw.action==="status"){
  if(prior.archivedAt)throw new OrderActionError("Restore the order before changing its status.");
  if(!states.includes(raw.status))throw new OrderActionError("Invalid status.",400);
  await handle.setJSON(key,{...prior,status:raw.status,updatedAt:now});
 }else if(raw.action==="archive"){
  if(!terminal(prior.status))throw new OrderActionError("Only delivered or cancelled orders can be archived.");
  if(!prior.archivedAt)await handle.setJSON(key,{...prior,archivedAt:now,updatedAt:now});
 }else if(raw.action==="restore"){
  if(prior.archivedAt)await handle.setJSON(key,{...prior,archivedAt:null,updatedAt:now});
 }else if(raw.action==="delete"){
  if(!prior.archivedAt||!terminal(prior.status))throw new OrderActionError("Archive the delivered or cancelled order before deleting it.");
  if(raw.confirm!==true)throw new OrderActionError("Confirm permanent deletion first.",400);
  // Delete associated notification metadata first; neither action changes Square or inventory.
  await handle.delete("wholesale-email/"+raw.id);
  await handle.delete(key);
 }
 return {ok:true};
}
module.exports={states,actions,terminal,OrderActionError,changeOrder};
