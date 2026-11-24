(function(root){
"use strict";
const tiers=[{min:1,max:4,discount:45},{min:5,max:9,discount:50},{min:10,max:24,discount:55},{min:25,max:49,discount:60},{min:50,max:null,discount:65}];
const discount=q=>q>=50?65:q>=25?60:q>=10?55:q>=5?50:q>=1?45:0;
const unit=(msrp,d)=>Number.isSafeInteger(msrp)&&msrp>0?Math.floor((msrp*(100-d)+50)/100):null;
const eligible=p=>p.category==="book"&&["Paperback","Hardcover","Signed edition"].includes(p.format)&&p.shipping!=="digital"&&!p.preorder&&!p.comingSoon;
function summarize(lines){
 const priced=lines.filter(i=>Number.isSafeInteger(i.unitCents)&&i.unitCents>=0&&Number.isSafeInteger(i.quantity)&&i.quantity>0);
 const knownSubtotalCents=priced.reduce((s,i)=>s+i.unitCents*i.quantity,0);
 const pricedQuantity=priced.reduce((s,i)=>s+i.quantity,0);
 const pendingQuantity=lines.reduce((s,i)=>s+i.quantity,0)-pricedQuantity;
 return {knownSubtotalCents,pricedQuantity,pendingQuantity,subtotalCents:pendingQuantity?null:knownSubtotalCents};
}
const quote=(items)=>{const quantity=items.reduce((s,i)=>s+i.quantity,0),d=discount(quantity);const lines=items.map(i=>{const price=unit(i.wholesaleMsrpCents,d);return {...i,unitCents:price,lineCents:price===null?null:price*i.quantity};});return {quantity,discount:d,lines,...summarize(lines)};};
const api={tiers,discount,unit,eligible,quote,summarize};if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PMF_TRADE=api;
})(typeof globalThis!=="undefined"?globalThis:this);
