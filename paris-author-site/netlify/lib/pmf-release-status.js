"use strict";
// One-time non-destructive migration for author-approved edition availability.
// Does not alter stock, prices, purchase links, covers, authors, or edited product records.
const KEY="migrations/pmf-ready-for-sale-2026-10-17-v1";
const CHANGES=[
  {
    id:"eb999311-4d26-4036-a23f-963e7237819f",
    title:"If Love Could Talk",
    oldDescription:"Coming soon. A dark romance tragedy and short story about missed calls, unsent messages, and the quiet moments when love is tangled in pride, pain, and timing. The final edition and availability will be announced before checkout opens.",
    newDescription:"A dark romance tragedy about missed calls, unsent messages, and the quiet moments when love is tangled in pride, pain, and timing. An intimate story about the words two hearts never got to say."
  },
  {
    id:"20b3a865-7185-4da1-9751-f90895af7afb",
    title:"Summer Kings",
    oldDescription:"Coming soon. In this urban tragedy, a summer of ambition, brotherhood, and loyalty takes a dark turn after one wrong ride, an impulsive decision, and a betrayal nobody escapes unchanged. The final edition and availability will be announced before checkout opens.",
    newDescription:"In this urban tragedy, a summer of ambition, brotherhood, and loyalty takes a dark turn after one wrong ride, an impulsive decision, and a betrayal nobody escapes unchanged."
  }
];
async function setReadyForSale(handle,production=false){
 if(!production)return;
 if(await handle.get(KEY,{type:"json",consistency:"strong"}))return;
 const now=new Date().toISOString();
 for(const change of CHANGES){
   const path="products/"+change.id;
   const product=await handle.get(path,{type:"json",consistency:"strong"});
   if(!product||product.title!==change.title)continue;
   // Respect subsequent author edits: only adjust listings still marked Coming Soon.
   if(product.comingSoon!==true)continue;
   const update={...product,comingSoon:false,updatedAt:now};
   if(product.description===change.oldDescription)update.description=change.newDescription;
   await handle.setJSON(path,update);
 }
 await handle.setJSON(KEY,{completedAt:now,version:1});
}
module.exports={KEY,CHANGES,setReadyForSale};
