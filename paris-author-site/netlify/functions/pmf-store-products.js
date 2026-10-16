const {store,list,display}=require("../lib/pmf-store");
const {json}=require("../lib/pmf-admin-auth");
exports.handler=async(event)=>{
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 try{
   const products=(await list(await store(),{publicOnly:true})).map(display);
   return json(200,{products},{ "Cache-Control":"public, max-age=0, must-revalidate"});
 }catch(err){
   console.error("Store catalog",err);
   return json(503,{error:"Our catalog is temporarily unavailable. Please try again."});
 }
};
