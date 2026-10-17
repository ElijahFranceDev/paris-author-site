/* P.M. France cart: product IDs and quantities only. No prices or payment data are trusted. */
(() => {
  "use strict";
  const KEY="pmf_square_cart_v1";
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(KEY)||"[]");
      if(!Array.isArray(raw))return [];
      const seen=new Set();
      return raw.filter(x=>{
        if(!x||typeof x.id!=="string"||!/^[a-f0-9-]{36}$/i.test(x.id)||
          !Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>10||seen.has(x.id))return false;
        seen.add(x.id);return true;
      }).slice(0,20).map(x=>({id:x.id,quantity:x.quantity}));
    }catch{return [];}
  }
  function save(items){
    localStorage.setItem(KEY,JSON.stringify(items));
    document.dispatchEvent(new Event("pmf-cart-change"));
    return items;
  }
  function add(id,stock){
    const list=load(),found=list.find(x=>x.id===id);
    const max=Math.min(10,Number.isInteger(stock)?stock:10);
    if(max<1)return {ok:false,message:"Currently sold out."};
    if(found){
      if(found.quantity>=max)return {ok:false,message:"Maximum available quantity reached."};
      found.quantity++;
    }else{
      if(list.length>=20)return {ok:false,message:"Maximum of 20 different products per order."};
      list.push({id,quantity:1});
    }
    save(list);
    return {ok:true,message:"Added to cart."};
  }
  function setQuantity(id,quantity,stock){
    if(!Number.isSafeInteger(quantity)||quantity<0)throw Error("Invalid quantity");
    const max=Math.min(10,Number.isInteger(stock)?stock:10);
    if(quantity>max)throw Error("Available quantity is "+max+".");
    const list=load().filter(x=>x.id!==id);
    if(quantity>0)list.push({id,quantity});
    return save(list);
  }
  function count(){return load().reduce((s,x)=>s+x.quantity,0);}
  function clear(){save([]);}
  window.PMF_CART={load,add,setQuantity,count,clear};
  document.addEventListener("pmf-cart-change",()=>{
    document.querySelectorAll("[data-pmf-cart-count]").forEach(el=>el.textContent=String(count()));
  });
  document.addEventListener("DOMContentLoaded",()=>{
    document.querySelectorAll("[data-pmf-cart-count]").forEach(el=>el.textContent=String(count()));
  });
})();