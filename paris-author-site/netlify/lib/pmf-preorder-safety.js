"use strict";
// Safety correction: only the Founding Reader Mystery Box is a preorder.
// Never alters product stock, price, description, images, sale links, or byline.
const MARKER="migrations/pmf-preorder-flag-safety-2026-10-17-v1";
const FIXES=[
 {id:"fbf596f2-cf8f-434d-a697-b0e322d5372c",title:"Smile For Me",sku:"PMF-SFM-001",
   preorder:false,comingSoon:true},
 {id:"0f3d3023-3395-4bc7-ad09-41c698ea9a19",title:"Smile For Me — Founding Reader Mystery Box",
   sku:"PMF-SFM-FRMB-001",preorder:true,comingSoon:false}
];
async function correctPreorderFlags(handle,production=false){
 if(!production)return;
 if(await handle.get(MARKER,{type:"json",consistency:"strong"}))return;
 const now=new Date().toISOString();
 for(const fix of FIXES){
  const key="products/"+fix.id;
  const p=await handle.get(key,{type:"json",consistency:"strong"});
  if(!p||p.title!==fix.title||p.sku!==fix.sku)continue;
  // Explicitly approved author business rules; do not touch any other fields.
  if(p.preorder===fix.preorder && p.comingSoon===fix.comingSoon)continue;
  await handle.setJSON(key,{...p,preorder:fix.preorder,comingSoon:fix.comingSoon,updatedAt:now});
 }
 await handle.setJSON(MARKER,{completedAt:now});
}
module.exports={MARKER,FIXES,correctPreorderFlags};
