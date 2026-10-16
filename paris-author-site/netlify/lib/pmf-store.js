"use strict";
const crypto = require("node:crypto");
const CATEGORIES=["book","merchandise","collectible","bundle","other"];
const FORMATS=["Paperback","Hardcover","Ebook","Signed edition","Special edition","Physical product","Digital product","Other"];
const SHIPPING=["free-us","square-calculated","digital"];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const uuid=()=>crypto.randomUUID();
const validId=s=>typeof s==="string" && UUID.test(s);
const str=(value,max)=>typeof value==="string"?value.trim().slice(0,max):"";
const squareUrl=s=>{
  if(!s) return "";
  try{
    const url=new URL(s);
    const h=url.hostname.toLowerCase();
    if(url.protocol!=="https:" || url.username || url.password ||
       !(h==="square.link"||h.endsWith(".square.link")||h==="square.site"||h.endsWith(".square.site")||h==="squareup.com"||h.endsWith(".squareup.com"))) return null;
    return url.toString();
  }catch{return null;}
};
function normalize(input,prior){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Invalid product");
 const title=str(input.title,150),description=str(input.description,4000);
 const cents=Number(input.priceCents);
 if(title.length<2||title.length>150)throw Error("Enter a product title (2–150 characters).");
 if(!Number.isSafeInteger(cents)||cents<0||cents>1000000)throw Error("Price must be between $0 and $10,000.");
 const category=input.category,format=input.format,shipping=input.shipping;
 if(!CATEGORIES.includes(category)||!FORMATS.includes(format)||!SHIPPING.includes(shipping))throw Error("Invalid product type, format, or shipping method.");
 const tracked=input.trackStock===true, stock=Number(input.stock);
 if(tracked && (!Number.isSafeInteger(stock)||stock<0||stock>1000000))throw Error("Enter a valid stock quantity.");
 const pay=squareUrl(input.squarePaymentUrl);
 if(pay===null)throw Error("Enter a valid HTTPS Square payment link or leave it blank.");
 const imageId=str(input.imageId,40);
 if(imageId&&!validId(imageId))throw Error("Invalid uploaded image.");
 const sku=str(input.sku,60);
 if(sku && !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,59}$/.test(sku))throw Error("SKU must use letters, numbers, hyphens or dots.");
 const published=input.published===true,preorder=input.preorder===true;
 return {
  id:prior?.id||uuid(),title,description,category,format,sku,
  author:str(input.author,120),priceCents:cents,shipping,
  trackStock:tracked,stock:tracked?stock:null,preorder,
  published,squarePaymentUrl:pay,imageId,
  createdAt:prior?.createdAt||new Date().toISOString(),
  updatedAt:new Date().toISOString()
 };
}
async function store(){
  const {getStore,getDeployStore}=await import("@netlify/blobs");
  // Branch/deploy previews must never write to live product records.
  if(process.env.CONTEXT==="production")return getStore({name:"pmf-catalog-live",consistency:"strong"});
  return getDeployStore({name:"pmf-catalog-preview",consistency:"strong"});
}
async function list(storeHandle,{publicOnly=false}={}){
  let cursor,items=[],pages=0;
  do {
    const response=await storeHandle.list({prefix:"products/",...(cursor?{cursor}:{})});
    for(const b of response.blobs||[]){
      if(items.length>=500) break;
      const value=await storeHandle.get(b.key,{type:"json",consistency:"strong"});
      if(value && (!publicOnly||value.published))items.push(value);
    }
    if(items.length>=500)break;
    cursor=response.cursor||undefined;
    pages+=1;
  }while(cursor && pages<15);
  items.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return items;
}
const display=p=>({
  id:p.id,title:p.title,description:p.description,category:p.category,format:p.format,
  author:p.author,priceCents:p.priceCents,sku:p.sku,shipping:p.shipping,
  preorder:p.preorder,stock:p.trackStock?p.stock:null,trackStock:p.trackStock,published:p.published,
  squarePaymentUrl:p.squarePaymentUrl,
  imageUrl:p.imageId?"/.netlify/functions/pmf-store-image?id="+encodeURIComponent(p.imageId):null,
  imageId:p.imageId,createdAt:p.createdAt,updatedAt:p.updatedAt,
  // Preorders are information-only until an inventory-safe sale flow is approved.
  canBuy:p.published&&!p.preorder&&(!p.trackStock||p.stock>0)&&Boolean(p.squarePaymentUrl)
});
module.exports={uuid,validId,normalize,store,list,display};
