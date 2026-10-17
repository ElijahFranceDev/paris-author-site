"use strict";
// Initial, idempotent author catalog expansion. Never overwrites existing records.
// Preorders and unreleased titles are display-only until explicitly activated.
const MARKER="migrations/pmf-book-collection-2026-10-17-v1";
const products=[
 {
   id:"fbf596f2-cf8f-434d-a697-b0e322d5372c",title:"Smile For Me",
   author:"P.M. France",sku:"PMF-SFM-001",category:"book",format:"Paperback",
   priceCents:2699,shipping:"square-calculated",
   description:"Coming soon. Simone Reed built her career seeing what everyone else missed. After an investigation damaged her credibility, she left that life behind—but the questions never left her. A psychological thriller about evidence, obsession, and a reality she can no longer fully trust. Standard book edition; not the Founding Reader Mystery Box.",
   imagePath:"",stock:100,trackStock:true,preorder:false,comingSoon:true,published:true
 },
 {
   id:"eb999311-4d26-4036-a23f-963e7237819f",title:"If Love Could Talk",
   author:"Paris M. France",sku:"PMF-ILCT-001",category:"book",format:"Other",
   priceCents:1599,shipping:"square-calculated",
   description:"Coming soon. A dark romance tragedy and short story about missed calls, unsent messages, and the quiet moments when love is tangled in pride, pain, and timing. The final edition and availability will be announced before checkout opens.",
   imagePath:"/images/if-love.png",stock:100,trackStock:true,preorder:false,comingSoon:true,published:true
 },
 {
   id:"20b3a865-7185-4da1-9751-f90895af7afb",title:"Summer Kings",
   author:"Paris M. France",sku:"PMF-SK-001",category:"book",format:"Other",
   priceCents:2599,shipping:"square-calculated",
   description:"Coming soon. In this urban tragedy, a summer of ambition, brotherhood, and loyalty takes a dark turn after one wrong ride, an impulsive decision, and a betrayal nobody escapes unchanged. The final edition and availability will be announced before checkout opens.",
   imagePath:"/images/leek.png",stock:100,trackStock:true,preorder:false,comingSoon:true,published:true
 },
 {
   id:"0f3d3023-3395-4bc7-ad09-41c698ea9a19",title:"Smile For Me — Founding Reader Mystery Box",
   author:"P.M. France",sku:"PMF-SFM-FRMB-001",category:"bundle",format:"Special edition",
   priceCents:2199,shipping:"free-us",
   description:"Limited Founding Reader Mystery Box preorder preview — planned edition of only 25 boxes. Includes one copy of Smile For Me, an author collectible, two small mystery items, and distinctive packaging. $21.99 includes free standard U.S. shipping. Release date: November 7, 2026. Paid preorders ship November 14–17, 2026 (7–10 calendar days after release). Paid checkout activates only when Square payments and inventory are ready.",
   imagePath:"",stock:25,trackStock:true,preorder:true,comingSoon:false,published:true
 }
];
async function seedAdditionalCatalog(handle,production=false){
 if(!production)return;
 if(await handle.get(MARKER,{type:"json",consistency:"strong"}))return;
 // Avoid duplicate titles/SKUs, even if the author added a product under another ID.
 const found=[];
 let cursor;
 do{
   const page=await handle.list({prefix:"products/",...(cursor?{cursor}:{})});
   for(const item of page.blobs||[]){
     const product=await handle.get(item.key,{type:"json",consistency:"strong"});
     if(product)found.push(product);
   }
   cursor=page.cursor||undefined;
 }while(cursor&&found.length<500);
 const now=new Date().toISOString();
 const normalizeTitle=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 for(const candidate of products){
   const matching=found.some(p=>p.id===candidate.id||
     (p.sku&&p.sku===candidate.sku)||
     normalizeTitle(p.title)===normalizeTitle(candidate.title));
   if(matching)continue;
   const key="products/"+candidate.id;
   if(await handle.get(key,{type:"json",consistency:"strong"}))continue;
   await handle.setJSON(key,{
     ...candidate,imageId:"",squarePaymentUrl:"",createdAt:now,updatedAt:now
   });
 }
 await handle.setJSON(MARKER,{completedAt:now,version:1});
}
module.exports={MARKER,products,seedAdditionalCatalog};
