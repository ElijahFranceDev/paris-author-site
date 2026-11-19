const {test}=require('node:test');const assert=require('node:assert/strict');
const analytics=require('../netlify/lib/pmf-analytics');
const catalog=require('../netlify/lib/pmf-store');
const gift=require('../netlify/lib/pmf-giveaway');
test('download totals include repeats while selections are distinct and pagination is read',async()=>{
 const data=new Map(),store={setJSON:async(k,v)=>data.set(k,v),get:async k=>data.get(k),list:async({cursor})=>{const keys=[...data.keys()];return cursor?{blobs:keys.slice(1).map(key=>({key}))}:{blobs:keys.slice(0,1).map(key=>({key})),cursor:'next'};}};
 await analytics.recordDownload(store,{id:'one',title:'One'},'reader-one');await analytics.recordDownload(store,{id:'one',title:'One'},'reader-one');await analytics.recordDownload(store,{id:'two',title:'Two'},'reader-two');
 const result=await analytics.downloadSummary(store);assert.equal(result.downloads,3);assert.equal(result.uniqueSelections,2);assert.equal(result.books.find(b=>b.bookId==='one').downloads,2);assert.equal(result.books.find(b=>b.bookId==='one').uniqueSelections,1);assert.equal(result.recent.length,3);assert(!JSON.stringify(result.recent).includes('reader-one'));
});
test('analytics is private before accessing storage',async()=>{const {default:handler}=await import('../netlify/functions/pmf-admin-analytics.mjs');assert.equal((await handler(new Request('https://parisfrance.shop/.netlify/functions/pmf-admin-analytics'),{})).status,401);});
test('gift delivery honors lock and requires a claim, then counts each delivery without claiming another book',async()=>{
 const original=catalog.store,code='a'.repeat(36),reader='b'.repeat(32),data=new Map();let locked=true,claimed=false;
 const store={get:async key=>key==='birthday/config'?{locked,message:'Locked',books:[{id:'one',title:'One',downloadUrl:'https://example.org/one.epub'}]}:key==='birthday/cards/'+gift.hash(code)?{}:key===gift.claimKey(code,reader)?(claimed?{bookId:'one'}:null):data.get(key),setJSON:async(k,v)=>data.set(k,v)};
 catalog.store=async()=>store;
 try{const {default:handler}=await import('../netlify/functions/pmf-gift-download.mjs');const request=()=>new Request('https://parisfrance.shop/.netlify/functions/pmf-gift-download?code='+code+'&reader='+reader);
 assert.equal((await handler(request(),{})).status,423);assert.equal(data.size,0);locked=false;assert.equal((await handler(request(),{})).status,404);assert.equal(data.size,0);claimed=true;const res=await handler(request(),{});assert.equal(res.status,302);assert.equal(res.headers.get('location'),'https://example.org/one.epub');assert.equal(res.headers.get('cache-control'),'no-store');await handler(request(),{});assert.equal(data.size,2);
 }finally{catalog.store=original;}
});
