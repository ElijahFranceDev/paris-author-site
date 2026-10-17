"use strict";
// Append author-approved date and dispatch commitment to whichever original
// description is already present. This intentionally keeps the author's copy.
const KEY="migrations/pmf-box-shipping-append-2026-10-17-v1";
const BOX_ID="0f3d3023-3395-4bc7-ad09-41c698ea9a19";
const SKU="PMF-SFM-FRMB-001";
const TERMS="Release date: November 7, 2026. Paid preorders ship November 14–17, 2026 (7–10 calendar days after release). Paid checkout activates after secure Square setup.";
async function appendMysteryBoxTerms(handle,production=false){
 if(!production)return;
 if(await handle.get(KEY,{type:"json",consistency:"strong"}))return;
 const key="products/"+BOX_ID;
 const box=await handle.get(key,{type:"json",consistency:"strong"});
 if(box?.sku===SKU){
   const before=String(box.description||"").trim();
   if(!before.includes("November 7, 2026") || !before.includes("7–10 days")){
     await handle.setJSON(key,{
       ...box,description:(before?before+"\n\n":"")+TERMS,
       updatedAt:new Date().toISOString()
     });
   }
 }
 await handle.setJSON(KEY,{completedAt:new Date().toISOString()});
}
module.exports={KEY,BOX_ID,TERMS,appendMysteryBoxTerms};
