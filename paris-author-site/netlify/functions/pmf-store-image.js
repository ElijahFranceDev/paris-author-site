const {store,validId}=require("../lib/pmf-store");
exports.handler=async(event)=>{
 if(event.httpMethod!=="GET")return{statusCode:405,body:"Method not allowed"};
 const id=event.queryStringParameters?.id;
 if(!validId(id))return{statusCode:400,body:"Invalid image"};
 try{
   const handle=await store(event);
   const image=await handle.get("images/"+id,{type:"arrayBuffer"});
   if(!image)return{statusCode:404,body:"Image not found"};
   const bytes=Buffer.from(image);
   let type="application/octet-stream";
   if(bytes[0]===0xff&&bytes[1]===0xd8)type="image/jpeg";
   else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))type="image/png";
   else if(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP")type="image/webp";
   else return{statusCode:415,body:"Unsupported image"};
   return{statusCode:200,headers:{"Content-Type":type,"Cache-Control":"public, max-age=3600","X-Content-Type-Options":"nosniff"},body:bytes.toString("base64"),isBase64Encoded:true};
 }catch(err){console.error("Image read error",err);return{statusCode:503,body:"Image temporarily unavailable"}}
};
