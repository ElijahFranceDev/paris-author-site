// Temporary deploy-preview-only inventory diagnostic.
// Returns only boolean readiness checks; never outputs environment variable values.
export default async function handler(request) {
  if (process.env.CONTEXT === "production") {
    return new Response("Not found", { status: 404 });
  }
  const result = { stage: "load", moduleLoaded: false, databaseConfigured: false, databaseConnected: false };
  try {
    const { default: inventory } = await import("../lib/pmf-inventory.js");
    result.moduleLoaded = true;
    result.databaseConfigured = inventory.databaseReady();
    if (result.databaseConfigured) {
      result.stage = "connect";
      await inventory.db().query("SELECT 1 AS ok");
      result.databaseConnected = true;
    }
    result.stage = "complete";
    return new Response(JSON.stringify(result), {status:200,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  } catch (error) {
    console.error("Inventory preview diagnostic:",error?.name || "Error",error?.code || "unknown");
    const detail=String(error?.message||"");
    const category=(detail.includes("Cannot find module") || detail.includes("Cannot find package") || detail.includes("Could not resolve") || detail.includes("MODULE_NOT_FOUND") || detail.includes("ERR_MODULE_NOT_FOUND"))
      ? "missing dependency"
      : (detail.includes("Unexpected token") || detail.includes("Unexpected .")) ? "parse error"
      : (detail.includes("CommonJS") || detail.includes("ESM")) ? "module format error"
      : "other import or connection error";
    const packageName=detail.includes("'pg'")||detail.includes('"pg"')?"pg"
      :detail.includes("pmf-inventory.js")?"inventory-file":"other";
    const code=["MODULE_NOT_FOUND","ERR_MODULE_NOT_FOUND"].includes(error?.code)?error.code:"other";
    return new Response(JSON.stringify({...result,errorStage:result.stage,failed:true,errorCategory:category,missingPackage:packageName,errorCode:code}),{
       status:200,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
    });
  }
}
