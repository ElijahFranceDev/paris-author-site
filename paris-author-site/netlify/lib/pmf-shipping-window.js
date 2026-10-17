"use strict";
// Safe production-only fulfillment wording correction. Existing author product
// details, quantities, prices, photos, Square links and checkout flags survive.
const KEY="migrations/pmf-release-day-shipping-2026-10-17-v1";
const BOX_ID="0f3d3023-3395-4bc7-ad09-41c698ea9a19";
const BOX_SKU="PMF-SFM-FRMB-001";
const OLD_SENTENCE="Release date: November 7, 2026. Once paid preorders officially open, Mystery Boxes are scheduled to ship 7–10 days after each preorder is placed. Paid preorder checkout is not yet open.";
const NEW_TERMS="Release date: November 7, 2026. Paid preorders ship November 14–17, 2026 (7–10 calendar days after the release date), not 7–10 days after ordering. Free standard U.S. shipping. Payment is collected at checkout once prepaid ordering is activated.";
async function updateMysteryBoxShipping(handle,production=false){
 if(!production)return;
 if(await handle.get(KEY,{type:"json",consistency:"strong"}))return;
 const key="products/"+BOX_ID;
 const product=await handle.get(key,{type:"json",consistency:"strong"});
 if(product?.sku===BOX_SKU){
   const existing=String(product.description||"");
   let description=existing.replace(OLD_SENTENCE,NEW_TERMS);
   if(description===existing){
     // The author may have edited the teaser. Do not discard their copy.
     description=existing.replace(/Once paid preorders open, boxes are scheduled to ship 7–10 days after each preorder is placed\./g,"");
     if(!description.includes("November 14–17, 2026"))description=(description.trim()+"\n\n"+NEW_TERMS).trim();
   }
   if(description!==existing)await handle.setJSON(key,{...product,description,updatedAt:new Date().toISOString()});
 }
 await handle.setJSON(KEY,{completedAt:new Date().toISOString(),status:"updated"});
}
module.exports={KEY,BOX_ID,BOX_SKU,OLD_SENTENCE,NEW_TERMS,updateMysteryBoxShipping};
