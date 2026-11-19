const crypto=require('node:crypto');
async function recordDownload(store,book,claimKey){
 const id=crypto.randomUUID(),at=new Date().toISOString();
 await store.setJSON('birthday/download-events/'+at.slice(0,10)+'/'+id,{id,at,bookId:book.id,title:book.title,claimKey});
}
async function downloadSummary(store){
 const events=[];let cursor,pages=0,truncated=false;
 do{const page=await store.list({prefix:'birthday/download-events/',...(cursor?{cursor}:{})});
 for(const b of page.blobs||[]){const event=await store.get(b.key,{type:'json'});if(event)events.push(event);}
 cursor=page.cursor;pages++;if(pages>=100&&cursor){truncated=true;break;}
 }while(cursor);
 const books=new Map(),readers=new Set();
 for(const e of events){const b=books.get(e.bookId)||{bookId:e.bookId,title:e.title,downloads:0,readers:new Set(),lastDownload:e.at};b.downloads++;b.readers.add(e.claimKey);readers.add(e.claimKey);if(e.at>b.lastDownload)b.lastDownload=e.at;books.set(e.bookId,b);}
 return {downloads:events.length,uniqueSelections:readers.size,truncated,books:[...books.values()].map(b=>({...b,uniqueSelections:b.readers.size,readers:undefined})).sort((a,b)=>b.downloads-a.downloads),recent:events.sort((a,b)=>b.at.localeCompare(a.at)).slice(0,50).map(({at,bookId,title})=>({at,bookId,title}))};
}
module.exports={recordDownload,downloadSummary};
