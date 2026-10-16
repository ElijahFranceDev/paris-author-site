const auth=require("../lib/pmf-admin-auth");
const {store,list,normalize,display,validId}=require("../lib/pmf-store");
exports.handler=async(event)=>{
 const denied=event.httpMethod==="GET" ? (!auth.authorized(event)?auth.json(401,{error:"Sign in to your bookstore dashboard."}):null) : auth.reject(event);
 if(denied)return denied;
 const method=event.httpMethod;
 if(!["GET","POST"].includes(method))return auth.json(405,{error:"Method not allowed"});
 try{
   const handle=await store();
   if(method==="GET")return auth.json(200,{products:(await list(handle)).map(display)});
   if((event.body||"").length>19000)return auth.json(413,{error:"Product data is too large."});
   const body=JSON.parse(event.body||"{}");
   if(body.action==="archive"){
     if(!validId(body.id))return auth.json(400,{error:"Invalid product ID."});
     const previous=await handle.get("products/"+body.id,{type:"json",consistency:"strong"});
     if(!previous)return auth.json(404,{error:"Product not found"});
     const archived={...previous,published:false,updatedAt:new Date().toISOString()};
     await handle.setJSON("products/"+body.id,archived);
     return auth.json(200,{product:display(archived)});
   }
   if(body.action!=="save")return auth.json(400,{error:"Invalid request"});
   const raw=body.product||{};
   let previous=null;
   if(raw.id){
      if(!validId(raw.id))return auth.json(400,{error:"Invalid product ID"});
      previous=await handle.get("products/"+raw.id,{type:"json",consistency:"strong"});
      if(!previous)return auth.json(404,{error:"Product not found"});
   }
   const product=normalize(raw,previous);
   await handle.setJSON("products/"+product.id,product);
   return auth.json(200,{product:display(product)});
 }catch(err){
   if(err.message&&/^(Invalid |Enter |Price |SKU )/.test(err.message))return auth.json(400,{error:err.message});
   console.error("Bookstore admin products",err);
   return auth.json(500,{error:"Unable to save products. Check Netlify Blobs configuration."});
 }
};
