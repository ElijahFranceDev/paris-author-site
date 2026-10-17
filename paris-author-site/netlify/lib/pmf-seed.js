"use strict";
// Initial public product is seeded only into production Blobs when first needed.
// Preview/branch data stays isolated; the existing published static cover is reused.
const INITIAL_ID="0ca10d9e-841e-4d28-8582-c817c6c2c801";
const description=[
  "Sometimes, the most terrifying things happen in silence.",
  "",
  "Grief changes people. It reshapes memories, distorts reality, and leaves behind questions that refuse to disappear.",
  "",
  "In The Quiet Days, silence becomes something far more unsettling than the absence of noise. As memories grow uncertain and the familiar begins to feel strangely unfamiliar, an unnatural calm takes hold one that makes it increasingly difficult to separate truth from perception.",
  "",
  "But what happens when the quiet no longer feels peaceful?",
  "",
  "Atmospheric, haunting, and deeply psychological, The Quiet Days explores the fragile boundaries between grief, memory, and reality. It's a story about the things we remember, the things we bury, and the unsettling possibility that the truth has been there all along.",
  "",
  "Some stories stay with you long after the final page. This is one of them."
].join("\n");
async function seedProductionCatalog(handle, isProduction=false) {
  if(!isProduction) return;
  // Seed only a genuinely empty production catalog. Do not modify existing products
  // or re-create a product an author has archived or edited.
  const current=await handle.list({prefix:"products/"});
  if((current.blobs||[]).length>0)return;
  const key="products/"+INITIAL_ID;
  if(await handle.get(key,{type:"json",consistency:"strong"}))return;
  const now=new Date().toISOString();
  await handle.setJSON(key,{
    id:INITIAL_ID,
    title:"The Quiet Days",
    author:"Paris M. France",
    description,
    category:"book",
    format:"Paperback",
    sku:"PMF-TQD-001",
    priceCents:2899,
    shipping:"free-us",
    trackStock:false,
    stock:null,
    preorder:false,
    published:true,
    squarePaymentUrl:"",
    imageId:"",
    imagePath:"/images/the-quiet-days.png",
    createdAt:now,updatedAt:now
  });
}
module.exports={seedProductionCatalog,INITIAL_ID};
