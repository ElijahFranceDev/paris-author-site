import {toLegacyEvent,fromLegacyResponse} from '../lib/pmf-v2-bridge.mjs';
import auth from '../lib/pmf-admin-auth.js';
import catalog from '../lib/pmf-store.js';
import gift from '../lib/pmf-giveaway.js';
import analytics from '../lib/pmf-analytics.js';
export default async function(request,context){
 const reply=(s,error)=>fromLegacyResponse(auth.json(s,{error},{'Referrer-Policy':'no-referrer'}));
 if(request.method!=='GET')return reply(405,'Method not allowed.');
 const u=new URL(request.url),code=u.searchParams.get('code')||'',reader=u.searchParams.get('reader')||'';
 if(!/^[a-f0-9]{36}$/.test(code)||!/^[a-f0-9]{32}$/.test(reader))return reply(400,'Scan your card and choose a book first.');
 try{
 const store=await catalog.store(await toLegacyEvent(request,context)),config=await store.get('birthday/config',{type:'json'})||gift.defaults();
 if(config.locked)return reply(423,config.message);
 if(!await store.get('birthday/cards/'+gift.hash(code),{type:'json'}))return reply(404,'Card not found.');
 const key=gift.claimKey(code,reader),chosen=await store.get(key,{type:'json',consistency:'strong'});
 const book=config.books.find(b=>b.id===chosen?.bookId);
 if(!book?.downloadUrl)return reply(404,'Choose your book on the birthday page first.');
 const target=new URL(book.downloadUrl);if(target.protocol!=='https:')return reply(409,'Download unavailable.');
 await analytics.recordDownload(store,book,key);
 return new Response(null,{status:302,headers:{Location:target.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch(e){console.error('Gift download tracking',e?.name);return reply(503,'Download temporarily unavailable. Please try again.');}
}
