import {toLegacyEvent,fromLegacyResponse} from '../lib/pmf-v2-bridge.mjs';
import auth from '../lib/pmf-admin-auth.js';
import catalog from '../lib/pmf-store.js';
import gift from '../lib/pmf-giveaway.js';
import crypto from 'node:crypto';
import releases from '../lib/pmf-bookstore-release.js';
export default async function(request,context){
const event=await toLegacyEvent(request,context), u=new URL(request.url), admin=u.searchParams.get('admin')==='1';
const reply=(s,b)=>fromLegacyResponse(auth.json(s,b,{'Referrer-Policy':'no-referrer'}));
if(!['GET','POST'].includes(request.method))return reply(405,{error:'Method not allowed.'});
if(admin){const denied=request.method==='GET'?(!auth.authorized(event)?auth.json(401,{error:'Sign in through your author portal first.'}):null):auth.reject(event);if(denied)return fromLegacyResponse(denied);}
else if(request.method==='POST'&&!auth.sameOrigin(event))return reply(403,{error:'Invalid origin.'});
try{
 const store=await catalog.store(event), config=await store.get('birthday/config',{type:'json'})||gift.defaults();
 if(admin){
  if(request.method==='GET')return reply(200,{config});
  if((event.body||'').length>350000)return reply(413,{error:'Request too large.'});
  const body=JSON.parse(event.body||'{}');
  if(['save','schedule','cancelSchedule'].includes(body.action)){
   const next=gift.normalize(body.config,config);
   // Deleted entries stay in the record so previously claimed cards keep working.
   if(config.books.some(old=>!next.books.some(b=>b.id===old.id)))return reply(400,{error:'Use the Delete novella button to remove a title. Deleted titles can be restored.'});
   if(body.action!=='save') {
     const book=next.books.find(b=>b.id===body.bookId);
     if(!book)return reply(404,{error:'Novella not found.'});
     if(body.action==='schedule')book.storeRelease=await releases.schedule(store,book,body.release||{},catalog);
     else {await releases.cancel(store,book);book.storeRelease=null;}
   }
   for(const b of next.books)if(b.deleted){await releases.cancel(store,b);b.storeRelease=null;}
   await store.setJSON('birthday/config',next);return reply(200,{config:next});
  }
  if(body.action==='batch'){
   const bookstore=String(body.bookstore||'').trim().slice(0,150);if(!bookstore)return reply(400,{error:'Enter the bookstore name.'});
   const cards=[];for(let i=0;i<21;i++){const code=crypto.randomBytes(18).toString('hex');await store.setJSON('birthday/cards/'+gift.hash(code),{bookstore,createdAt:new Date().toISOString()},{onlyIfNew:true});cards.push({bookstore,url:u.origin+'/birthday.html#'+code});}
   return reply(200,{cards});
  }return reply(400,{error:'Unknown action.'});
 }
 const publicConfig={locked:config.locked,message:config.message,books:config.books.filter(b=>b.enabled&&!b.deleted).map(b=>({id:b.id,title:b.title,description:b.description,coverUrl:b.coverUrl,ready:!!b.downloadUrl}))};
 if(request.method==='GET')return reply(200,publicConfig);
 if((event.body||'').length>2000)return reply(413,{error:'Request too large.'});
 const body=JSON.parse(event.body||'{}'), code=String(body.code||'');
 if(!/^[a-f0-9]{36}$/.test(code))return reply(400,{error:'Scan the QR code on your bookstore card.'});
 if(!/^[a-f0-9]{32}$/.test(String(body.readerId||'')))return reply(400,{error:'Reload this page to start your personal gift selection.'});
 if(config.locked)return reply(423,{error:config.message});
 if(!await store.get('birthday/cards/'+gift.hash(code),{type:'json'}))return reply(404,{error:'This card was not found. Check your QR code.'});
 let chosen=await store.get(gift.claimKey(code,body.readerId),{type:'json'});
 if(!chosen&&body.action==='claim'){
  const book=config.books.find(b=>b.id===body.bookId&&b.enabled&&!b.deleted&&b.downloadUrl);if(!book)return reply(409,{error:'This book is not ready to download yet.'});
  chosen=await gift.claim(store,code,book.id,body.readerId);
 }
 if(!chosen)return reply(200,{claimed:false});
 const book=config.books.find(b=>b.id===chosen.bookId);
 if(!book?.downloadUrl)return reply(409,{error:'Your book is reserved. Its download is temporarily unavailable.'});
 return reply(200,{claimed:true,book:{id:book.id,title:book.title,downloadUrl:u.origin+'/.netlify/functions/pmf-gift-download?'+new URLSearchParams({code,reader:body.readerId})}});
}catch(err){console.error('Birthday giveaway',err);return reply(500,{error:admin?String(err.message):'The collection could not be loaded. Please try again.'});}
}
