import catalog from "../lib/pmf-store.js";
import pricing from "../lib/pmf-square-cart.js";
import inventory from "../lib/pmf-inventory.js";
const {store,list,isProductionDeploy}=catalog;
const {CartError,parseCart,calculateOrder,squareRequest}=pricing;

const response=(status,data)=>new Response(JSON.stringify(data),{
  status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
const squareCheckoutUrl=(raw,environment)=>{
  try{
    const url=new URL(raw);
    const host=url.hostname.toLowerCase();
    const valid=host==="square.link"||host.endsWith(".square.link")||
      host==="checkout.square.site"||host==="square.site"||
      host.endsWith(".square.site")||host==="squareup.com"||host.endsWith(".squareup.com");
    if(url.protocol==="https:"&&valid&&url.username===""&&url.password===""){
      if(environment==="sandbox"&&!host.startsWith("sandbox."))return null;
      return url.toString();
    }
  }catch{}
  return null;
};
export default async function handler(request,context){
  if(request.method!=="POST")return response(405,{error:"Method not allowed."});
  if(!inventory.databaseReady()||!process.env.PMF_SQUARE_WEBHOOK_SIGNATURE_KEY||!process.env.PMF_SQUARE_WEBHOOK_NOTIFICATION_URL)return response(503,{error:"Inventory/payment protection has not been configured."});
  if(process.env.PMF_SQUARE_CART_ENABLED!=="true")
    return response(503,{error:"Combined checkout is not open yet. Please check back shortly."});
  const environment=(process.env.SQUARE_ENVIRONMENT||"").toLowerCase();
  if(!["production","sandbox"].includes(environment))
    return response(503,{error:"The merchant payment environment is not configured."});
  // A Netlify Deploy Preview must never send real charges.
  const deployment={deployContext:context?.deploy?.context||""};
  const production=isProductionDeploy(deployment);
  if(!production && environment!=="sandbox")
    return response(503,{error:"Use Square Sandbox for checkout tests on preview sites."});
  const token=process.env.SQUARE_ACCESS_TOKEN,locationId=process.env.SQUARE_LOCATION_ID;
  if(!token||!locationId)return response(503,{error:"The merchant payment connection is incomplete."});
  try{
    const originHeader=request.headers.get("origin");
    const origin=new URL(request.url).origin;
    if(originHeader!==origin)return response(403,{error:"Request origin was not accepted."});
    if(Number(request.headers.get("content-length")||0)>10000)return response(413,{error:"Cart is too large."});
    const rawText=await request.text();
    if(rawText.length>10000)return response(413,{error:"Cart is too large."});
    const input=JSON.parse(rawText);
    const cart=parseCart(input.cart);
    const products=await list(await store(deployment),{publicOnly:true,production});
    // This is the only authoritative price and stock source; the browser never sets price.
    const flat=process.env.PMF_STANDARD_US_SHIPPING_CENTS;
    // Merchant-approved default: a single $3.99 U.S. shipping fee per order
    // containing at least one paid-shipping item, never $3.99 per item.
    const shipping=flat===undefined||flat===""?399:Number(flat);
    const order=calculateOrder(cart,products,{flatShippingCents:shipping,atomicStock:true});
    if(order.totalCents<1)throw new CartError("Free orders need a separate fulfillment process.",400);
    const hostname=new URL(request.url).hostname;
    const siteOrigin=(!production&&/^(?:deploy-preview-\d+--)?parismfrancebooks\.netlify\.app$/.test(hostname))
      ? origin:"https://parisfrance.shop";
    const reservationId=await inventory.reserve(order,products);
    const checkoutPayload=squareRequest(order,locationId,siteOrigin,reservationId);
    const endpoint=environment==="sandbox"
      ?"https://connect.squareupsandbox.com/v2/online-checkout/payment-links"
      :"https://connect.squareup.com/v2/online-checkout/payment-links";
    const gateway=await fetch(endpoint,{method:"POST",headers:{
       "Square-Version":"2026-09-16","Authorization":"Bearer "+token,"Content-Type":"application/json"
    },body:JSON.stringify(checkoutPayload)});
    const square=await gateway.json().catch(()=>({}));
    if(!gateway.ok){
      console.error("Square multi-item checkout",gateway.status,(square.errors||[]).map(e=>e.code));
      return response(502,{error:"Square checkout is temporarily unavailable. You have not been charged."});
    }
    const checkoutUrl=squareCheckoutUrl(square.payment_link?.url,environment);
    if(!checkoutUrl)return response(502,{error:"Square did not return a recognized secure checkout link."});
    await inventory.attachSquareLink(reservationId,square.payment_link.order_id,square.payment_link.id);
    return response(200,{url:checkoutUrl,items:order.items.length,
      subtotalCents:order.subtotalCents,shippingCents:order.shippingCents,totalCents:order.totalCents});
  }catch(error){
    if(error instanceof inventory.InventoryError)return response(error.status,{error:error.message});
    if(error instanceof CartError)return response(error.status,{error:error.message});
    if(error instanceof SyntaxError)return response(400,{error:"Invalid cart request."});
    console.error("Square cart checkout error",error);
    return response(503,{error:"Checkout could not be prepared. Please try again."});
  }
}
