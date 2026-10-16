const auth=require("../lib/pmf-admin-auth");
const {store,uuid}=require("../lib/pmf-store");
exports.handler=async(event)=>{
 const denied=auth.reject(event);if(denied)return denied;
 if(event.httpMethod!=="POST")return auth.json(405,{error:"Method not allowed"});
 try{
   if(!event.body||event.body.length>4300000)return auth.json(413,{error:"Image must be under 3 MB."});
   const input=JSON.parse(event.body);
   if(typeof input.base64!=="string" || input.base64.length>4200000||!/^[-A-Za-z0-9+/=]+$/.test(input.base64))
     return auth.json(400,{error:"Invalid image"});
   const bytes=Buffer.from(input.base64,"base64");
   if(bytes.length<50||bytes.length>3*1024*1024)return auth.json(400,{error:"Image must be under 3 MB."});
   let type;
   if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)type="image/jpeg";
   else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))type="image/png";
   else if(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP")type="image/webp";
   else return auth.json(400,{error:"Use a JPG, PNG or WebP image."});
   const id=uuid();
   const handle=await store(event);
   await handle.set("images/"+id,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),{metadata:{type}});
   return auth.json(200,{imageId:id,imageUrl:"/.netlify/functions/pmf-store-image?id="+id});
 }catch(err){console.error("Image upload error",err);return auth.json(500,{error:"Upload failed. Please try again."})}
};
