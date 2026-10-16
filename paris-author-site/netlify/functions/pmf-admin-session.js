const auth=require("../lib/pmf-admin-auth");
exports.handler=async(event)=>{
 const method=event.httpMethod;
 if(method==="GET")return auth.json(200,{signedIn:auth.authorized(event),configured:auth.ready()});
 if(method!=="POST")return auth.json(405,{error:"Method not allowed"});
 if(!auth.sameOrigin(event))return auth.json(403,{error:"Invalid request origin"});
 if(!auth.ready())return auth.json(503,{error:"The administrator login has not been configured in Netlify."});
 let input={};
 try {if((event.body||"").length>1200)throw Error();input=JSON.parse(event.body||"{}");}
 catch{return auth.json(400,{error:"Invalid request"})}
 if(input.action==="logout")return auth.json(200,{signedIn:false},{"Set-Cookie":auth.clearCookie()});
 if(input.action!=="login")return auth.json(400,{error:"Invalid action"});
 if(!auth.verifyPassword(input.password))return auth.json(401,{error:"Incorrect password."});
 return auth.json(200,{signedIn:true},{"Set-Cookie":auth.createCookie()});
};
