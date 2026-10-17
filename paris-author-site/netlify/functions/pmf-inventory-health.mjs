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
    return new Response(JSON.stringify({...result,errorStage:result.stage}),{
       status:503,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
    });
  }
}
