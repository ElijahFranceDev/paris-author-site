(() => {
 "use strict";
 const byId=id=>document.getElementById(id);
 const notice=byId("admin-notice");
 const endpoint="/.netlify/functions/";
 let products=[],uploadedImageId="";
 const show=(message,isError=false)=>{notice.textContent=message;notice.className="pmf-notice"+(isError?" pmf-error":"");};
 const money=cents=>(cents/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
 async function api(name,options={}){
  const response=await fetch(endpoint+name,{credentials:"same-origin",cache:"no-store",...options});
  let body={};try{body=await response.json()}catch{}
  if(!response.ok)throw Error(body.error||"Request failed ("+response.status+")");
  return body;
 }
 const loginPane=byId("admin-login"),workspace=byId("admin-workspace");
 function setAuthenticated(yes){loginPane.hidden=!!yes;workspace.hidden=!yes;}
 const field=(id)=>byId("product-"+id);
 function reset(){
  byId("product-form").reset();field("id").value="";uploadedImageId="";
  byId("editor-heading").textContent="Add a product";
  byId("stock-wrap").hidden=true;field("price").value="0.00";
  field("image-preview").hidden=true;field("image-preview").removeAttribute("src");
  field("image-placeholder").hidden=false;byId("image-status").textContent="Upload the image before saving your product.";
 }
 function imagePreview(url){
  field("image-preview").src=url;
  field("image-preview").hidden=false;field("image-placeholder").hidden=true;
 }
 function selectProduct(p){
  field("id").value=p.id;field("title").value=p.title;
  field("category").value=p.category;field("format").value=p.format;
  field("price").value=(p.priceCents/100).toFixed(2);
  field("sku").value=p.sku||"";field("author").value=p.author||"";
  field("description").value=p.description||"";field("shipping").value=p.shipping;
  field("track-stock").checked=!!p.trackStock;field("stock").value=p.stock||0;
  byId("stock-wrap").hidden=!p.trackStock;field("preorder").checked=!!p.preorder;
  field("square").value=p.squarePaymentUrl||"";field("published").checked=!!p.published;
  field("image").value="";uploadedImageId=p.imageId||"";
  byId("editor-heading").textContent="Edit product";
  if(p.imageUrl)imagePreview(p.imageUrl);
  else {field("image-preview").hidden=true;field("image-placeholder").hidden=false;}
  byId("image-status").textContent=p.imageId?"Image already uploaded. Choose another to replace it.":"No image uploaded.";
  byId("editor-panel").scrollIntoView({behavior:"smooth",block:"start"});
 }
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function render(){
  byId("stat-total").textContent=String(products.length);
  const published=products.filter(p=>p.published).length;
  byId("stat-published").textContent=String(published);
  byId("stat-drafts").textContent=String(products.length-published);
  const root=byId("admin-products");root.replaceChildren();
  if(!products.length){root.append(el("p","pmf-muted","You haven't added any products yet. Start with your next book!"));return;}
  products.forEach(p=>{
   const card=el("article","pmf-admin-item");
   const upper=el("div","pmf-admin-item-head");
   if(p.imageUrl){const img=el("img","pmf-thumb");img.src=p.imageUrl;img.alt="Cover for "+p.title;upper.append(img);}
   const info=el("div","pmf-admin-item-main");
   info.append(el("h3","",p.title),el("p","pmf-muted",money(p.priceCents)+" · "+p.category+" · "+(p.published?"Published":"Draft")));
   if(p.preorder) info.append(el("p","pmf-emphasis","Preorder • checkout closed"));
   else if(!p.squarePaymentUrl)info.append(el("p","pmf-muted","Square link required until combined-cart checkout is activated"));
   upper.append(info);card.append(upper);
   const buttons=el("div","pmf-actions");
   const edit=el("button","btn secondary","Edit");edit.type="button";edit.addEventListener("click",()=>selectProduct(p));
   const archive=el("button","pmf-minor","Unpublish");archive.type="button";
   archive.disabled=!p.published;
   archive.addEventListener("click",async()=>{
    if(!confirm("Unpublish "+p.title+" from the store?"))return;
    archive.disabled=true;try{
      await api("pmf-admin-products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"archive",id:p.id})});
      show("Product unpublished.");await loadProducts();
    }catch(err){show(err.message,true);}finally{archive.disabled=false;}
   });
   buttons.append(edit,archive);card.append(buttons);root.append(card);
  });
 }
 async function loadProducts(){const result=await api("pmf-admin-products");products=result.products||[];render();}
 async function loadSession(){
  try{
    const state=await api("pmf-admin-session");
    setAuthenticated(state.signedIn);
    if(state.signedIn){await loadProducts();show("Bookstore manager is ready.");}
    else if(!state.configured)show("Admin password and session secret are not yet configured in Netlify.",true);
    else show("Sign in to manage your bookstore.");
  }catch(err){setAuthenticated(false);show(err.message,true);}
 }
 byId("login-form").addEventListener("submit",async(e)=>{
  e.preventDefault();const password=byId("admin-password").value;
  try{
   await api("pmf-admin-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",password})});
   byId("admin-password").value="";setAuthenticated(true);await loadProducts();show("Welcome back. Your bookstore is ready.");
  }catch(err){show(err.message,true);}
 });
 byId("admin-logout").addEventListener("click",async()=>{
  try{await api("pmf-admin-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});}
  catch(err){show(err.message,true);return;}
  products=[];reset();setAuthenticated(false);show("Signed out securely.");
 });
 field("track-stock").addEventListener("change",()=>{byId("stock-wrap").hidden=!field("track-stock").checked;});
 byId("reset-editor").addEventListener("click",reset);
 byId("cancel-edit").addEventListener("click",reset);
 byId("refresh-products").addEventListener("click",async()=>{try{await loadProducts();show("Products refreshed.");}catch(err){show(err.message,true);}});
 byId("upload-image").addEventListener("click",async()=>{
   const file=field("image").files?.[0];
   if(!file){show("Choose a cover or product photo first.",true);return;}
   if(file.size>3*1024*1024){show("Use an image smaller than 3 MB.",true);return;}
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)){show("Choose a PNG, JPEG or WebP image.",true);return;}
   const button=byId("upload-image");button.disabled=true;byId("image-status").textContent="Uploading image…";
   try{
    const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(Error("Unable to read file"));r.onload=()=>resolve(String(r.result).split(",")[1]);r.readAsDataURL(file);});
    const result=await api("pmf-admin-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64})});
    uploadedImageId=result.imageId;imagePreview(result.imageUrl);
    byId("image-status").textContent="Image uploaded successfully.";show("Cover image is ready. Save the product to attach it.");
   }catch(err){byId("image-status").textContent="Upload failed.";show(err.message,true);}
   finally{button.disabled=false;}
 });
 byId("product-form").addEventListener("submit",async(e)=>{
  e.preventDefault();const button=byId("save-product");
  const price=Number(field("price").value);
  if(!Number.isFinite(price)||price<0||Math.round(price*100)>1000000){show("Enter a valid price.",true);return;}
  const p={
    id:field("id").value||undefined,title:field("title").value,
    category:field("category").value,format:field("format").value,
    priceCents:Math.round(price*100),sku:field("sku").value,author:field("author").value,
    description:field("description").value,shipping:field("shipping").value,
    trackStock:field("track-stock").checked,stock:Number(field("stock").value),
    preorder:field("preorder").checked,squarePaymentUrl:field("square").value,
    published:field("published").checked,imageId:uploadedImageId
  };
  button.disabled=true;button.textContent="Saving…";
  try{
   await api("pmf-admin-products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",product:p})});
   reset();await loadProducts();show("Product saved. Published items appear in the public store.");
  }catch(err){show(err.message,true);}finally{button.disabled=false;button.textContent="Save Product";}
 });
 loadSession();
})();