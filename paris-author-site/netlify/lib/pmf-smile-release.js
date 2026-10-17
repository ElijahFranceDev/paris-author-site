"use strict";
// One-time production-only copy update for author-approved Nov 7 release and
// fulfillment terms. No stock, payment links, published status or preorder flags change.
const KEY="migrations/pmf-smile-nov7-shipping-2026-10-17-v1";
const CHANGES=[
  {
    id:"fbf596f2-cf8f-434d-a697-b0e322d5372c",
    sku:"PMF-SFM-001",
    previous:"Coming soon. Simone Reed built her career seeing what everyone else missed. After an investigation damaged her credibility, she left that life behind—but the questions never left her. A psychological thriller about evidence, obsession, and a reality she can no longer fully trust. Standard book edition; not the Founding Reader Mystery Box.",
    updated:"Releasing November 7, 2026. Simone Reed built her career seeing what everyone else missed. After an investigation damaged her credibility, she left that life behind—but the questions never left her. A psychological thriller about evidence, obsession, and a reality she can no longer fully trust. Standard paperback edition; separate from the Founding Reader Mystery Box. Coming soon."
  },
  {
    id:"0f3d3023-3395-4bc7-ad09-41c698ea9a19",
    sku:"PMF-SFM-FRMB-001",
    previous:"Limited Founding Reader Mystery Box preorder preview — planned edition of only 25 boxes. Includes one copy of Smile For Me, an author collectible, two small mystery items, and distinctive packaging. $21.99 includes free standard U.S. shipping. Contents and dispatch details will be finalized before payment opens. Preorders are not yet accepting payment.",
    updated:"Limited Founding Reader Mystery Box preorder — only 25 boxes. Includes one copy of Smile For Me, an author collectible, two small mystery items, and distinctive packaging. Release date: November 7, 2026. $21.99 includes free standard U.S. shipping. Paid preorders ship November 14–17, 2026 (7–10 calendar days after release). Paid checkout activates after secure Square setup."
  }
];
async function publishUpdatedSmileTerms(handle,isProduction=false){
  if(!isProduction)return;
  if(await handle.get(KEY,{type:"json",consistency:"strong"}))return;
  const now=new Date().toISOString();
  for(const change of CHANGES){
    const key="products/"+change.id;
    const product=await handle.get(key,{type:"json",consistency:"strong"});
    if(!product||product.sku!==change.sku||product.description!==change.previous)continue;
    await handle.setJSON(key,{...product,description:change.updated,updatedAt:now});
  }
  await handle.setJSON(KEY,{completedAt:now});
}
module.exports={KEY,CHANGES,publishUpdatedSmileTerms};