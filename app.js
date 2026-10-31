const $=s=>document.querySelector(s),grid=$('#grid'),dlg=$('#detail');const KEY='afd-events-v3';let selected=null,view=new Date();view.setDate(1);let events=[];try{const raw=localStorage.getItem(KEY)||localStorage.getItem('afd-events-v2');const stored=raw?JSON.parse(raw):[];if(Array.isArray(stored))events=stored.filter(e=>e&&typeof e.date==='string'&&typeof e.title==='string')}catch(err){console.warn('일정 데이터 읽기 실패',err)}
const pad=n=>String(n).padStart(2,'0'),iso=(y,m,d)=>y+'-'+pad(m+1)+'-'+pad(d),names={work:'어린이집',kid:'아이',me:'내 일정',spouse:'배우자/가족'};function persist(){localStorage.setItem(KEY,JSON.stringify(events))}
function nextEventId(){let id=Date.now();const used=new Set(events.map(e=>String(e.id)));while(used.has(String(id)))id++;return id}
function validateEventEdit(input){
  const title=String(input.title||'').trim();
  if(!title)return {error:'일정 제목을 입력해 주세요.'};
  const date=String(input.date||'');
  const parts=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if(!parts)return {error:'날짜를 올바르게 입력해 주세요.'};
  const y=+parts[1],m=+parts[2],d=+parts[3],actual=new Date(y,m-1,d);
  if(y<1000||actual.getFullYear()!==y||actual.getMonth()!==m-1||actual.getDate()!==d)return {error:'실제로 존재하는 날짜를 입력해 주세요.'};
  const time=String(input.time||'').trim();
  if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return {error:'시간은 00:00~23:59 사이로 입력해 주세요.'};
  const cat=String(input.cat||'');
  if(!Object.prototype.hasOwnProperty.call(names,cat))return {error:'일정 분류를 선택해 주세요.'};
  return {title,date,time,cat,place:String(input.place||'').trim(),memo:String(input.memo||'').trim()};
}const checklistBoxes=[...document.querySelectorAll('.detailPanel .check input[type="checkbox"]')];
function renderChecklist(e){const flags=Array.isArray(e.checklist)?e.checklist:[];checklistBoxes.forEach((box,i)=>{box.checked=flags[i]===true})}
checklistBoxes.forEach((box,i)=>box.addEventListener('change',()=>{if(!selected)return;const flags=Array.isArray(selected.checklist)?[...selected.checklist]:[];flags[i]=box.checked;selected.checklist=flags;persist()}));
function showPanel(e){selected=e;renderChecklist(e);$('#pTitle').textContent=e.title+' ♥';const dt=new Date(e.date+'T00:00:00'),wd='일월화수목금토'[dt.getDay()];$('#pDate').textContent=dt.getFullYear()+'년 '+(dt.getMonth()+1)+'월 '+dt.getDate()+'일 ('+wd+')';$('#pTime').textContent=e.time||'시간 미정';$('#pCat').textContent=names[e.cat]||'기타';$('#pPlace').textContent=e.place||'미정 (추후 확인)';$('#pMemo').textContent=e.memo||e.title;document.querySelector('.detailPanel').classList.add('open')}function draw(){const today=new Date(),todayISO=iso(today.getFullYear(),today.getMonth(),today.getDate());const n=events.filter(e=>e.date===todayISO).length;document.querySelector('.mascot b').textContent=n?'오늘 일정 '+n+'개가 있어요 ♥':'오늘 일정은 없어요 ♥';const y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate(),pl=new Date(y,m,0).getDate();$('#monthTitle').textContent=y+'년 '+(m+1)+'월';grid.innerHTML='';for(let i=0;i<42;i++){let d=i-first+1,yy=y,mm=m,other=false;if(d<1){d=pl+d;mm--;if(mm<0){mm=11;yy--}other=true}else if(d>last){d-=last;mm++;if(mm>11){mm=0;yy++}other=true}const date=iso(yy,mm,d),cell=document.createElement('div');cell.className='day'+(other?' other':'')+(date===todayISO?' current':'');cell.innerHTML='<span class="num">'+d+'</span>';events.filter(e=>e.date===date).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99')).forEach(ev=>{const b=document.createElement('button');b.className='event '+ev.cat;b.textContent=(ev.time?ev.time+' ':'')+ev.title;b.onclick=()=>showPanel(ev);cell.appendChild(b)});grid.appendChild(cell)}}function openEvent(e){selected=e;$('#dtitle').value=e.title;$('#ddate').value=e.date;$('#dtime').value=e.time||'';$('#dcat').value=e.cat;$('#dplace').value=e.place||'';$('#dmemo').value=e.memo||'';dlg.showModal()}// Keep tabs on the same browser and origin in sync without claiming cross-device sync.
function syncOtherTab(event){
  if(event.key!==KEY&&event.key!==null)return;
  let incoming;
  try{
    const raw=localStorage.getItem(KEY);
    incoming=raw?JSON.parse(raw):[];
    if(!Array.isArray(incoming)||incoming.some(e=>!e||typeof e.date!=='string'||typeof e.title!=='string'))return;
  }catch(err){console.warn('다른 탭 일정 읽기 실패',err);return}
  const previous=selected;
  const panel=document.querySelector('.detailPanel');
  const panelWasOpen=panel.classList.contains('open');
  events=incoming;
  draw();
  if(previous){
    const matches=events.filter(e=>String(e.id)===String(previous.id));
    let current=matches.length===1?matches[0]:null;
    if(matches.length>1){
      const exact=matches.filter(e=>e.date===previous.date&&e.title===previous.title&&e.time===previous.time);
      if(exact.length===1)current=exact[0];
    }
    if(current){
      showPanel(current);
      if(!panelWasOpen)panel.classList.remove('open');
    }else{
      selected=null;
      panel.classList.remove('open');
      $('#pTitle').textContent='일정을 선택해 주세요';
      $('#pDate').textContent='날짜 미정';
      $('#pTime').textContent='시간 미정';
      $('#pCat').textContent='-';
      $('#pPlace').textContent='-';
      $('#pMemo').textContent='달력에서 일정을 선택하면 자세한 내용이 표시돼요.';
      checklistBoxes.forEach(box=>{box.checked=false});
    }
  }
  if(dlg.open){
    dlg.close();
    alert('다른 탭에서 일정이 변경되어 수정 창을 닫았어요. 다시 열어 확인해 주세요.');
  }
}
if(typeof addEventListener==='function')addEventListener('storage',syncOtherTab);
function parse(s){
  const now=new Date();
  let y=now.getFullYear(),m=now.getMonth(),d=now.getDate();
  let dateToken='';
  if(/오늘/.test(s)){dateToken='오늘'}
  else if(/내일/.test(s)){
    now.setDate(now.getDate()+1);
    y=now.getFullYear();m=now.getMonth();d=now.getDate();
    dateToken='내일';
  }else{
    const md=s.match(/(?:\d{4}년\s*)?\d+월\s*\d+일/);
    const dd=s.match(/\d+일/);
    if(md){
      dateToken=md[0];
      const parts=md[0].match(/(?:(\d{4})년\s*)?(\d+)월\s*(\d+)일/);
      y=+(parts[1]||y);m=+parts[2]-1;d=+parts[3];
    }else if(dd){
      dateToken=dd[0];y=view.getFullYear();m=view.getMonth();d=parseInt(dd[0],10);
    }
  }
  const checkDate=new Date(y,m,d);
  if(checkDate.getFullYear()!==y||checkDate.getMonth()!==m||checkDate.getDate()!==d){
    return {error:'실제로 존재하는 날짜를 입력해 주세요.'};
  }
  let time='';
  const tm=s.match(/(오전|오후|아침|저녁|밤|새벽)?\s*(\d+)시(?:\s*(반|(\d+)분|(\d+)(?=\s|$)))?/) || s.match(/(오전|오후|아침|저녁|밤|새벽)?\s*(\d+):(\d+)/);
  if(tm){
    const period=tm[1]||'',rawHour=+tm[2],mi=tm[0].includes(':')?+tm[3]:tm[3]==='반'?30:+(tm[4]||tm[5]||0);
    if(mi>59||rawHour>23||(period&&(rawHour<1||rawHour>12))){
      return {error:'시간은 올바른 시각과 0~59분으로 입력해 주세요.'};
    }
    let h=rawHour;
    if(['오후','저녁','밤'].includes(period))h=rawHour===12?(period==='오후'?12:0):rawHour+12;
    if(['오전','아침','새벽'].includes(period)&&rawHour===12)h=0;
    time=pad(h)+':'+pad(mi);
  }
  const cat=/어린이집|보육|행사일지|관찰일지/.test(s)?'work':/아이|첫째|둘째|학교|학원|치과|정형외과/.test(s)?'kid':/배우자|남편|아내|가족|시댁|친정|장례/.test(s)?'spouse':'me';
  let title=s;
  if(dateToken)title=title.replace(dateToken+'에',' ').replace(dateToken,' ');
  if(tm)title=title.replace(tm[0]+'에',' ').replace(tm[0],' ');
  title=title.replace(/\s+/g,' ').trim();
  if(!title)return {error:'일정 내용을 함께 입력해 주세요.'};
  return {date:iso(y,m,d),time,cat,title};
}
$('#mobileAdd').onclick=()=>$('#aiDialog').showModal();$('#quick').onsubmit=e=>{e.preventDefault();const s=$('#natural').value.trim();if(!s)return;const p=parse(s);if(p.error){alert(p.error);return}const created={id:nextEventId(),...p,place:'',memo:''};events.push(created);persist();view=new Date(p.date+'T00:00:00');view.setDate(1);draw();$('#natural').value='';$('#aiDialog').close();showPanel(created)};$('#prev').onclick=()=>{view.setMonth(view.getMonth()-1);draw()};$('#next').onclick=()=>{view.setMonth(view.getMonth()+1);draw()};$('#today').onclick=()=>{view=new Date();view.setDate(1);draw()};$('#panelClose').onclick=()=>document.querySelector('.detailPanel').classList.remove('open');const edit=()=>selected&&openEvent(selected);$('#editBtn').onclick=edit;$('#panelEdit').onclick=edit;function del(){if(selected&&confirm('이 일정을 삭제할까요?')){events=events.filter(e=>e!==selected);persist();draw();document.querySelector('.detailPanel').classList.remove('open');if(dlg.open)dlg.close();selected=null;$('#pTitle').textContent='일정을 선택해 주세요';$('#pDate').textContent='날짜 미정';$('#pTime').textContent='시간 미정';$('#pCat').textContent='-';$('#pPlace').textContent='-';$('#pMemo').textContent='달력에서 일정을 선택하면 자세한 내용이 표시돼요.';checklistBoxes.forEach(box=>{box.checked=false})}}function copy(){if(selected){const copied={...selected,id:nextEventId(),checklist:Array.isArray(selected.checklist)?[...selected.checklist]:[],title:selected.title+' (복사)'};events.push(copied);persist();view=new Date(copied.date+'T00:00:00');view.setDate(1);draw();showPanel(copied);if(dlg.open)dlg.close()}}$('#panelDelete').onclick=del;$('#delete').onclick=del;$('#panelCopy').onclick=copy;$('#copy').onclick=copy;$('#close').onclick=()=>dlg.close();$('#save').onclick=()=>{if(!selected)return;const result=validateEventEdit({title:$('#dtitle').value,date:$('#ddate').value,time:$('#dtime').value,cat:$('#dcat').value,place:$('#dplace').value,memo:$('#dmemo').value});if(result.error){alert(result.error);return}Object.assign(selected,result);persist();view=new Date(result.date+'T00:00:00');view.setDate(1);draw();showPanel(selected);dlg.close()};draw();const first=events.find(e=>e.date===iso(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()))||events[0];if(first&&innerWidth>720)showPanel(first);