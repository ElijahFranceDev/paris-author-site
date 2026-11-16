"use strict";
const crypto = require('node:crypto');
const TIMEZONE = 'America/New_York';
function releaseInstant(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw Error('Enter a valid release date.');
  const midnight = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0,10) !== date) throw Error('Enter a valid release date.');
  let instant = midnight + 5 * 3600000;
  const format = new Intl.DateTimeFormat('en-CA', {timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  for (let i=0;i<3;i++) {
    const parts=Object.fromEntries(format.formatToParts(instant).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    const local=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
    instant += midnight-local;
  }
  return new Date(instant).toISOString();
}
function plan(raw) {
  let date=raw.date;
  if(raw.mode==='days') {
    releaseInstant(raw.startDate);
    const days=Number(raw.days);
    if(!Number.isInteger(days)||days<1||days>3650)throw Error('Enter a delay of 1 to 3,650 days.');
    date=new Date(Date.parse(raw.startDate+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
  } else if(raw.mode!=='date') throw Error('Choose a date or a number of days.');
  return {mode:raw.mode,date,startDate:raw.mode==='days'?raw.startDate:'',days:raw.mode==='days'?Number(raw.days):null,publishAt:releaseInstant(date),timezone:TIMEZONE};
}
function productId(bookId){const h=crypto.createHash('sha256').update('pmf-birthday-store:'+bookId).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32);}
function visible(product,now=Date.now()) {return !product.deletedAt && product.published===true && (!product.publishAt || Date.parse(product.publishAt)<=now);}
async function schedule(store,book,raw,catalog) {
  if(book.deleted)throw Error('Restore this novella before scheduling it.');
  const release=plan(raw),cents=Number(raw.priceCents);
  if(!Number.isSafeInteger(cents)||cents<1||cents>1000000)throw Error('Enter a bookstore price between $0.01 and $10,000.');
  if(!String(raw.squarePaymentUrl||'').trim())throw Error('Add the Square payment link for this ebook.');
  const id=productId(book.id),previous=await store.get('products/'+id,{type:'json',consistency:'strong'});
  if(previous && previous.sourceGiveawayBookId!==book.id)throw Error('This listing cannot be replaced by the giveaway.');
  const product=catalog.normalize({title:book.title,description:book.description,author:'P.M. France',category:'book',format:'Ebook',priceCents:cents,shipping:'digital',trackStock:false,published:true,preorder:false,comingSoon:false,squarePaymentUrl:raw.squarePaymentUrl,imageId:''},previous);
  Object.assign(product,{id,publishAt:release.publishAt,sourceGiveawayBookId:book.id,imagePath:book.coverUrl,deletedAt:null});
  await store.setJSON('products/'+id,product);
  return {...release,productId:id,priceCents:cents,squarePaymentUrl:product.squarePaymentUrl};
}
async function cancel(store,book) {
  const id=productId(book.id),product=await store.get('products/'+id,{type:'json',consistency:'strong'});
  if(product?.sourceGiveawayBookId===book.id && product.publishAt && Date.parse(product.publishAt)>Date.now()) {
    await store.setJSON('products/'+id,{...product,published:false,publishAt:null,updatedAt:new Date().toISOString()});
  }
}
module.exports={releaseInstant,plan,productId,visible,schedule,cancel};
