import { getDeployStore } from "@netlify/blobs";
// A harmless read-only probe. Never returns product data, secrets, paths or IDs.
// Disabled for production: only the isolated Deploy Preview is testable here.
export default async function handler(_request, context) {
  if (context?.deploy?.context !== "deploy-preview" && process.env.CONTEXT !== "deploy-preview") {
    return new Response("Not found", {status:404});
  }
  try {
    const handle=getDeployStore({name:"pmf-catalog-preview", consistency:"strong"});
    const data=await handle.list({prefix:"products/"});
    return Response.json({storageReady:true, handler:"modern", productKeyCount:(data.blobs||[]).length});
  } catch(error) {
    console.error("PMF preview Blob probe",error);
    return Response.json({storageReady:false,handler:"modern",errorType:String(error?.name||"UnknownError")},{status:503});
  }
}
