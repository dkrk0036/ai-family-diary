const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS',label)}
function harness(confirmDelete=true,initialOverride=null,fixedNow=null){
  const now=new Date();
  const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const initial=[{id:11,date:today,time:'08:00',title:'기존 일정',cat:'me',place:'',memo:'',checklist:[true,false,false]}];
  const data=new Map([['afd-events-v3',JSON.stringify(initialOverride||initial)]]);
  const alerts=[];
  const localStorage={getItem:key=>data.get(key)||null,setItem:(key,val)=>data.set(key,val)};
  const grid={children:[],set innerHTML(v){if(v==='')this.children=[]},appendChild(x){this.children.push(x)}};
  const nodes=new Map();
  const panel={classList:{add(){},remove(){}}};
  const dialog={open:false,showModal(){this.open=true},close(){this.open=false}};
  const boxes=Array.from({length:3},()=>({checked:false,addEventListener(name,cb){this.onchange=cb}}));
  function node(sel){
    if(sel==='#grid')return grid;
    if(sel==='#detail'||sel==='#aiDialog')return dialog;
    if(sel==='.detailPanel')return panel;
    if(!nodes.has(sel))nodes.set(sel,{value:'',textContent:'',onclick:null,classList:{add(){},remove(){}}});
    return nodes.get(sel);
  }
  const document={
    querySelector:node,
    querySelectorAll:()=>boxes,
    createElement:()=>({children:[],className:'',textContent:'',onclick:null,appendChild(x){this.children.push(x)},set innerHTML(v){this._html=v}})
  };
  const Clock=fixedNow===null?Date:class extends Date{static now(){return fixedNow}};
  const context={document,localStorage,Date:Clock,console,innerWidth:500,alert:s=>alerts.push(s),confirm:()=>confirmDelete};
  vm.runInNewContext(source,context,{filename:'app.js'});
  function events(){return JSON.parse(data.get('afd-events-v3'))}
  function clickEvent(){const btn=grid.children.flatMap(x=>x.children).find(x=>x.className.startsWith('event'));assert.ok(btn,'calendar event button exists');btn.onclick()}
  return {node,boxes,dialog,alerts,events,clickEvent,grid};
}
check('blank title is rejected without mutating stored event',()=>{
  const h=harness();h.clickEvent();h.node('#panelEdit').onclick();h.node('#dtitle').value='   ';h.node('#save').onclick();
  assert.equal(h.events()[0].title,'기존 일정');assert.equal(h.dialog.open,true);assert.equal(h.alerts.length,1);
});
check('impossible calendar date is rejected',()=>{
  const h=harness();h.clickEvent();h.node('#panelEdit').onclick();h.node('#ddate').value='2026-02-30';h.node('#save').onclick();
  assert.notEqual(h.events()[0].date,'2026-02-30');assert.equal(h.dialog.open,true);assert.equal(h.alerts.length,1);
});
check('invalid time is rejected without saving',()=>{
  const h=harness();h.clickEvent();h.node('#panelEdit').onclick();h.node('#dtime').value='19:75';h.node('#save').onclick();
  assert.equal(h.events()[0].time,'08:00');assert.equal(h.dialog.open,true);assert.equal(h.alerts.length,1);
});
check('valid edit persists and moves calendar to edited month',()=>{
  const h=harness();h.clickEvent();h.node('#panelEdit').onclick();
  h.node('#dtitle').value='  수정한 일정  ';h.node('#ddate').value='2028-02-29';h.node('#dtime').value='20:05';
  h.node('#dplace').value='  도서관 ';h.node('#save').onclick();
  const ev=h.events()[0];assert.equal(ev.title,'수정한 일정');assert.equal(ev.date,'2028-02-29');assert.equal(ev.time,'20:05');
  assert.equal(ev.place,'도서관');assert.equal(h.node('#monthTitle').textContent,'2028년 2월');
  assert.equal(h.dialog.open,false);assert.equal(h.node('#pTitle').textContent,'수정한 일정 ♥');
});
check('deletion clears detail fields and checkboxes',()=>{
  const h=harness();h.clickEvent();assert.equal(h.boxes[0].checked,true);
  h.node('#panelEdit').onclick();h.node('#delete').onclick();
  assert.equal(h.events().length,0);assert.equal(h.dialog.open,false);
  assert.equal(h.node('#pTitle').textContent,'일정을 선택해 주세요');
  assert.equal(h.node('#pDate').textContent,'날짜 미정');
  assert.equal(h.node('#pTime').textContent,'시간 미정');
  assert.equal(h.node('#pCat').textContent,'-');
  assert.equal(h.node('#pPlace').textContent,'-');
  assert.equal(h.boxes.some(x=>x.checked),false);
});
check('cancelled deletion retains event',()=>{
  const h=harness(false);h.clickEvent();h.node('#panelDelete').onclick();assert.equal(h.events().length,1);
});
check('two quick additions in the same millisecond receive distinct ids',()=>{
  const h=harness(true,null,555);
  for(const title of ['회의','운동']){
    h.node('#natural').value='내일 7시 '+title;
    h.node('#quick').onsubmit({preventDefault(){}});
  }
  const ids=h.events().map(e=>e.id);
  assert.equal(h.events().length,3);
  assert.equal(new Set(ids).size,3);
});
check('copies created in the same millisecond have unique ids',()=>{
  const h=harness(true,null,555);h.clickEvent();
  h.node('#panelCopy').onclick();h.node('#panelCopy').onclick();
  const ids=h.events().map(e=>e.id);
  assert.equal(ids.length,3);assert.equal(new Set(ids).size,3);
});
check('deleting one legacy event does not remove another with the same id',()=>{
  const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const initial=[
    {id:11,date:today,time:'08:00',title:'삭제할 일정',cat:'me'},
    {id:11,date:today,time:'09:00',title:'남길 일정',cat:'me'}
  ];
  const h=harness(true,initial);h.clickEvent();h.node('#panelDelete').onclick();
  assert.equal(h.events().length,1);assert.equal(h.events()[0].title,'남길 일정');
});
check('evening appointment shows only the stored start time, not an invented end time',()=>{
  const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const initial=[{id:11,date:today,time:'18:30',title:'저녁 약속',cat:'me'}];
  const h=harness(true,initial);h.clickEvent();
  assert.equal(h.node('#pTime').textContent,'18:30');
});
check('untimed evening appointment remains marked as time unspecified',()=>{
  const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
  const initial=[{id:11,date:today,time:'',title:'저녁 약속',cat:'me'}];
  const h=harness(true,initial);h.clickEvent();
  assert.equal(h.node('#pTime').textContent,'시간 미정');
});
check('quick add selects the new event and shows its correct details',()=>{
  const h=harness();
  h.node('#natural').value='2028년 2월 29일 오후 7시 가족 모임';
  h.node('#quick').onsubmit({preventDefault(){}});
  assert.equal(h.events().length,2);
  assert.equal(h.node('#monthTitle').textContent,'2028년 2월');
  assert.equal(h.node('#pTitle').textContent,'가족 모임 ♥');
  assert.equal(h.node('#pTime').textContent,'19:00');
  h.node('#panelEdit').onclick();
  assert.equal(h.node('#dtitle').value,'가족 모임');
});
check('quick add changes selection so deleting affects only the new event',()=>{
  const h=harness();h.clickEvent();
  h.node('#natural').value='2028년 2월 29일 오후 7시 새 일정';
  h.node('#quick').onsubmit({preventDefault(){}});
  h.node('#panelDelete').onclick();
  assert.equal(h.events().length,1);
  assert.equal(h.events()[0].title,'기존 일정');
});
check('copy immediately selects the copied event for editing',()=>{
  const h=harness();h.clickEvent();
  h.node('#panelCopy').onclick();
  assert.equal(h.events().length,2);
  assert.equal(h.node('#pTitle').textContent,'기존 일정 (복사) ♥');
  h.node('#panelEdit').onclick();
  assert.equal(h.node('#dtitle').value,'기존 일정 (복사)');
  h.node('#dtitle').value='복사본 수정';
  h.node('#save').onclick();
  assert.equal(h.events()[0].title,'기존 일정');
  assert.equal(h.events()[1].title,'복사본 수정');
});
check('deleting the selected copy preserves its original',()=>{
  const h=harness();h.clickEvent();
  h.node('#panelCopy').onclick();
  h.node('#panelDelete').onclick();
  assert.equal(h.events().length,1);
  assert.equal(h.events()[0].title,'기존 일정');
  assert.equal(h.node('#pTitle').textContent,'일정을 선택해 주세요');
});
check('copying from the edit dialog closes stale fields and selects the copy',()=>{
  const h=harness();h.clickEvent();h.node('#panelEdit').onclick();
  assert.equal(h.dialog.open,true);
  h.node('#copy').onclick();
  assert.equal(h.dialog.open,false);
  assert.equal(h.events().length,2);
  assert.equal(h.node('#pTitle').textContent,'기존 일정 (복사) ♥');
  h.node('#panelEdit').onclick();
  assert.equal(h.node('#dtitle').value,'기존 일정 (복사)');
});
console.log('Event editor regression checks:',checks);
