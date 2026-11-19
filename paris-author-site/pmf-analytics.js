(()=>{
const $=id=>document.getElementById(id);let authenticated=false,busy=false,generation=0;
const date=at=>at?new Date(at).toLocaleString('en-US',{timeZone:'America/New_York'})+' ET':'—';
const text=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;return n;};
const money=c=>(c/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
function clear(){for(const id of ['analytics-orders','analytics-revenue','analytics-downloads'])$(id).textContent='—';for(const id of ['analytics-books','analytics-order-list','analytics-download-list'])$(id).replaceChildren();$('analytics-order-note').textContent='';$('analytics-status').textContent='Sign in to view activity.';}
async function load(){if(!authenticated||busy)return;busy=true;const current=generation;$('analytics-refresh').disabled=true;
try{const r=await fetch('/.netlify/functions/pmf-admin-analytics',{credentials:'same-origin',cache:'no-store'});const d=await r.json();if(!authenticated||current!==generation)return;if(!r.ok)throw Error(d.error||'Unable to load analytics.');
$('analytics-orders').textContent=d.orders.available?d.orders.total:'Unavailable';$('analytics-revenue').textContent=d.orders.available?money(d.orders.revenueCents):'—';$('analytics-downloads').textContent=d.downloads.downloads;
$('analytics-order-note').textContent=d.orders.message;
const books=$('analytics-books');books.replaceChildren();for(const b of d.downloads.books){const row=text('p',b.title+' · '+b.downloads+' downloads · '+b.uniqueSelections+' unique selections · Last: '+date(b.lastDownload));books.append(row);}if(!d.downloads.books.length)books.append(text('p','No books or downloads yet.'));
const orders=$('analytics-order-list');orders.replaceChildren();for(const o of d.orders.recent){const row=document.createElement('article');row.className='pmf-admin-item';row.append(text('h4',date(o.at)+' · '+money(o.totalCents)),text('p','Order '+o.id),text('p',o.items.map(i=>i.title+' × '+i.quantity).join(', ')));orders.append(row);}if(!d.orders.recent.length)orders.append(text('p',d.orders.available?'No confirmed paid website orders yet.':'Order activity unavailable.'));
const downloads=$('analytics-download-list');downloads.replaceChildren();for(const e of d.downloads.recent)downloads.append(text('p',date(e.at)+' · '+e.title));if(!d.downloads.recent.length)downloads.append(text('p','No tracked downloads yet.'));
$('analytics-status').textContent='Updated '+date(d.updatedAt)+'. Refreshes every 60 seconds while signed in.'+(d.downloads.truncated?' Download totals are partial; activity exceeds this report’s scan limit.':'');
}catch(e){if(authenticated&&current===generation)$('analytics-status').textContent=e.message;}finally{busy=false;$('analytics-refresh').disabled=false;}}
document.addEventListener('pmf-auth',e=>{authenticated=e.detail.authenticated;generation++;if(authenticated)load();else clear();});$('analytics-refresh').addEventListener('click',load);setInterval(()=>{if(!document.hidden)load();},60000);
})();
