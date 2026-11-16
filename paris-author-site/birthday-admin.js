(() => {
  const $ = id => document.getElementById(id);
  let config, busy = false;
  const feedback = message => $('gift-feedback').textContent = message;
  const el = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
  async function api(body) {
    const response = await fetch('/.netlify/functions/pmf-giveaway?admin=1', {
      cache: 'no-store', credentials: 'same-origin',
      ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {})
    });
    const value = await response.json();
    if (!response.ok) throw Error(value.error);
    return value;
  }
  function collect() {
    config.locked = $('gift-locked').checked;
    config.message = $('gift-message').value;
    return config;
  }
  async function save(action = 'save', extra = {}) {
    if (busy) return;
    busy = true;
    $('gift-admin').querySelectorAll('button').forEach(button => button.disabled = true);
    try {
      config = (await api({action,config:collect(),...extra})).config;
      render();
      feedback(action === 'schedule' ? 'Saved. This novella will appear in your bookstore on its release date.' : action === 'cancelSchedule' ? 'Pending bookstore release canceled. Your novella stays in the giveaway.' : config.locked ? 'Saved. The collection is locked.' : 'Saved. The collection is unlocked.');
    } catch (error) { feedback(error.message); }
    finally { busy = false; $('gift-admin').querySelectorAll('button').forEach(button => button.disabled = false); }
  }
  function inputField(parent, title, type, value) {
    const label = el('label', title), input = el(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.value = value ?? '';
    label.append(input); parent.append(label); return input;
  }
  function releaseEditor(box, book) {
    const section = el('section'); section.className = 'gift-release';
    section.append(el('h3','Add to my bookstore automatically'));
    section.append(el('p','Choose a release date or a number of days after a start date. Release is at midnight Eastern. Scheduling also saves your current giveaway edits.'));
    const saved = book.storeRelease;
    if (saved) {
      const pending = Date.parse(saved.publishAt) > Date.now();
      const status = el('p', (pending ? 'Scheduled: ' : 'Release date reached: ') + new Date(saved.publishAt).toLocaleDateString('en-US',{timeZone:'America/New_York',year:'numeric',month:'long',day:'numeric'}) + ' · ' + (saved.priceCents/100).toLocaleString('en-US',{style:'currency',currency:'USD'}));
      status.className = 'gift-release-status';section.append(status);
      if (pending) {
        const cancel = el('button','Cancel scheduled release');cancel.type='button';
        cancel.onclick = () => save('cancelSchedule',{bookId:book.id});section.append(cancel);
      }
    }
    const modeLabel = el('label','When should this novella join the bookstore?'), mode=el('select');
    for (const [value,text] of [['date','On a specific date'],['days','After a number of days']]) { const option=el('option',text);option.value=value;mode.append(option); }
    mode.value=saved?.mode||'days'; modeLabel.append(mode);section.append(modeLabel);
    const dateWrap=el('div'), daysWrap=el('div');daysWrap.className='gift-release-grid';
    const date=inputField(dateWrap,'Bookstore release date','date',saved?.date||'');
    const start=inputField(daysWrap,'Count days from','date',saved?.startDate||'2026-11-21');
    const days=inputField(daysWrap,'Number of days','number',saved?.days||15);days.min='1';days.max='3650';days.step='1';
    const updateMode=()=>{dateWrap.hidden=mode.value!=='date';daysWrap.hidden=mode.value!=='days';};mode.onchange=updateMode;updateMode();section.append(dateWrap,daysWrap);
    const details=el('div');details.className='gift-release-grid';
    const price=inputField(details,'Ebook price (USD)','number',saved? (saved.priceCents/100).toFixed(2):'');price.min='0.01';price.max='10000';price.step='0.01';price.placeholder='e.g. 2.99';
    const payment=inputField(details,'Square payment link for this ebook','url',saved?.squarePaymentUrl||'');payment.placeholder='https://square.link/u/…';section.append(details);
    section.append(el('small','Use the Square payment link set up for selling and delivering this ebook. The free giveaway download link is not shown in the bookstore.'));
    const preview=el('p');preview.className='gift-release-status';
    function updatePreview(){if(mode.value==='days'&&start.value&&Number.isInteger(+days.value)&&+days.value>0){const end=new Date(Date.parse(start.value+'T12:00:00Z')+(+days.value)*86400000);preview.textContent=Number.isFinite(end.getTime())?'Bookstore release: '+end.toLocaleDateString('en-US',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'})+' at midnight Eastern.':'';}else preview.textContent=date.value?'Bookstore release: '+date.value+' at midnight Eastern.':'';}
    for(const field of [mode,start,days,date]){field.addEventListener('change',updatePreview);field.addEventListener('input',updatePreview);}updatePreview();section.append(preview);
    const schedule=el('button',saved?'Update bookstore release':'Schedule bookstore release');schedule.type='button';schedule.className='gift-primary';
    schedule.onclick=()=>{
      if(!$('gift-settings').reportValidity())return;
      if(!(Number(price.value)>0)){feedback('Enter the price you want to charge in your bookstore.');price.focus();return;}
      if(!payment.value){feedback('Add the Square payment link for this ebook.');payment.focus();return;}
      if(mode.value==='date'&&!date.value){feedback('Choose a release date.');date.focus();return;}
      save('schedule',{bookId:book.id,release:{mode:mode.value,date:date.value,startDate:start.value,days:Number(days.value),priceCents:Math.round(Number(price.value)*100),squarePaymentUrl:payment.value}});
    };
    section.append(schedule);box.append(section);
  }
  function render() {
    const root=$('gift-editors');root.replaceChildren();
    config.books.forEach(book=>{
      const box=el('fieldset');box.className='gift-editor'+(book.deleted?' gift-deleted':'');box.append(el('legend',book.title+(book.deleted?' · Deleted':'')));
      if(book.deleted){
        box.append(el('p','Removed from the giveaway. Previous readers can still download the book they claimed.'));
        const restore=el('button','Restore novella');restore.type='button';restore.onclick=()=>{book.deleted=false;book.enabled=false;render();feedback('Restored as hidden. Check Show in collection and save when ready.');};box.append(restore);root.append(box);return;
      }
      for(const [key,title] of [['title','Title'],['description','Description'],['coverUrl','Cover image HTTPS link'],['downloadUrl','Ebook download HTTPS link']]){
        const input=inputField(box,title,key==='description'?'textarea':key.endsWith('Url')?'url':'text',book[key]);
        if(key==='title')input.required=true;
        input.maxLength=key==='description'?4000:key==='title'?150:2048;
        input.oninput=()=>book[key]=input.value;
      }
      const label=el('label'),check=el('input');check.type='checkbox';check.checked=book.enabled;check.onchange=()=>book.enabled=check.checked;label.append(check,document.createTextNode('Show in collection'));box.append(label);
      const remove=el('button','Delete novella');remove.type='button';remove.className='gift-delete';
      remove.onclick=()=>{if(!confirm('Delete '+book.title+' from the giveaway? A pending bookstore release will be canceled when you save. You can restore this novella.'))return;book.deleted=true;book.enabled=false;render();feedback('Novella marked for deletion. Click Save giveaway to apply. You can restore it below.');};box.append(remove);
      releaseEditor(box,book);root.append(box);
    });
  }
  $('gift-load').onclick=async()=>{try{config=(await api()).config;$('gift-locked').checked=config.locked;$('gift-message').value=config.message;$('gift-settings').hidden=false;render();feedback('Settings loaded. Delete buttons are available on each novella.');}catch(error){feedback(error.message);}};
  $('gift-add').onclick=()=>{config.books.push({id:'book-'+crypto.randomUUID(),title:'New novella',description:'',coverUrl:'',downloadUrl:'',enabled:false,deleted:false});render();};
  $('gift-settings').onsubmit=event=>{event.preventDefault();save();};
  $('gift-batch').onclick=async()=>{
    const button=$('gift-batch');button.disabled=true;
    try{
      const {cards}=await api({action:'batch',bookstore:$('gift-bookstore').value});
      const csv='Bookstore,Redemption URL\r\n'+cards.map(card=>[card.bookstore,card.url].map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
      const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),link=el('a','Download 21 card links (CSV)');link.href=url;link.download='birthday-bookstore-cards.csv';$('gift-cards').replaceChildren(link);link.click();feedback('21 unique card links created. Keep this CSV for your QR cards.');
    }catch(error){feedback(error.message);}finally{button.disabled=false;}
  };
})();
