const {test}=require('node:test');
const assert=require('node:assert/strict');
const releases=require('../netlify/lib/pmf-bookstore-release');
const catalog=require('../netlify/lib/pmf-store');
const gift=require('../netlify/lib/pmf-giveaway');
function memory(){const values=new Map();return {values,get:async key=>values.get(key)||null,setJSON:async(key,value)=>values.set(key,value),list:async({prefix})=>({blobs:[...values.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))})};}
test('15 and 20 day delays use the chosen starting date',()=>{
 assert.equal(releases.plan({mode:'days',startDate:'2026-11-21',days:15}).publishAt,'2026-12-06T05:00:00.000Z');
 assert.equal(releases.plan({mode:'days',startDate:'2026-11-21',days:20}).date,'2026-12-11');
});
test('release date honors Eastern midnight in summer, winter and DST transitions',()=>{
 assert.equal(releases.releaseInstant('2027-07-01'),'2027-07-01T04:00:00.000Z');
 assert.equal(releases.releaseInstant('2027-01-01'),'2027-01-01T05:00:00.000Z');
 assert.equal(releases.releaseInstant('2027-03-14'),'2027-03-14T05:00:00.000Z');
 assert.equal(releases.releaseInstant('2026-11-01'),'2026-11-01T04:00:00.000Z');
 assert.throws(()=>releases.releaseInstant('2026-02-30'));
 assert.throws(()=>releases.plan({mode:'days',startDate:'2026-11-21',days:1.5}));
});
test('scheduled listing is hidden before release and available exactly at release',()=>{
 const product={published:true,publishAt:'2026-12-06T05:00:00.000Z'};
 assert.equal(releases.visible(product,Date.parse('2026-12-06T04:59:59Z')),false);
 assert.equal(releases.visible(product,Date.parse('2026-12-06T05:00:00Z')),true);
 assert.equal(releases.visible({...product,published:false},Date.parse('2026-12-07')),false);
 assert.equal(releases.visible({...product,deletedAt:'deleted'},Date.parse('2026-12-07')),false);
});
test('repeated scheduling updates the same ebook without exposing its free download link',async()=>{
 const store=memory(),book={id:'birthday-1',title:'Now or Never',description:'Story',coverUrl:'https://parisfrance.shop/images/birthday-1.jpg',downloadUrl:'https://private.example/free.epub'};
 const raw={mode:'date',date:'2099-12-01',priceCents:299,squarePaymentUrl:'https://square.link/u/test'};
 const first=await releases.schedule(store,book,raw,catalog);await releases.schedule(store,book,{...raw,priceCents:399},catalog);
 assert.equal(store.values.size,1);const product=store.values.get('products/'+first.productId);
 assert.equal(product.format,'Ebook');assert.equal(product.shipping,'digital');assert.equal(product.priceCents,399);assert.equal(product.trackStock,false);
 assert.equal(product.downloadUrl,undefined);assert.equal(product.imagePath,book.coverUrl);
 assert.equal((await catalog.list(store,{publicOnly:true})).length,0);
 assert.equal((await catalog.list(store)).length,1);
 await store.setJSON('products/'+first.productId,{...product,publishAt:'2000-01-01T05:00:00Z'});
 assert.equal((await catalog.list(store,{publicOnly:true})).length,1);
});
test('canceling a pending release keeps its product as an unpublished draft',async()=>{
 const store=memory(),book=gift.defaults().books[0];const release=await releases.schedule(store,book,{mode:'date',date:'2099-01-01',priceCents:299,squarePaymentUrl:'https://square.link/u/test'},catalog);
 await releases.cancel(store,book);const product=await store.get('products/'+release.productId);
 assert.equal(product.published,false);assert.equal(product.publishAt,null);assert.equal((await catalog.list(store,{publicOnly:true})).length,0);
});
test('deleted products are excluded from catalog and retained for restoration',async()=>{
 const store=memory();await store.setJSON('products/deleted',{id:'deleted',title:'Deleted',published:true,deletedAt:'2026-11-16'});
 assert.equal((await catalog.list(store)).length,0);assert.equal((await catalog.list(store,{includeDeleted:true})).length,1);
});
test('giveaway deletion retains claim information and cannot forge release settings',()=>{
 const original=gift.defaults();original.books[0].storeRelease={productId:'existing',publishAt:'2099-01-01'};
 const changed=structuredClone(original);changed.books[0].deleted=true;changed.books[0].storeRelease={productId:'forged'};
 const result=gift.normalize(changed,original);assert.equal(result.books[0].enabled,false);assert.equal(result.books[0].deleted,true);assert.equal(result.books[0].storeRelease.productId,'existing');
 assert.equal(result.books.length,5);
});
test('a release requires a valid price and merchant payment link',async()=>{
 const store=memory(),book=gift.defaults().books[0],base={mode:'date',date:'2099-01-01',priceCents:299,squarePaymentUrl:'https://square.link/u/test'};
 await assert.rejects(()=>releases.schedule(store,book,{...base,priceCents:0},catalog));
 await assert.rejects(()=>releases.schedule(store,book,{...base,squarePaymentUrl:'https://evil.example'},catalog));
 assert.equal(store.values.size,0);
});
