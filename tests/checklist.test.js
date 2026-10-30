// Run: node tests/checklist.test.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app.js','utf8');

function mount(storage){
  const nodes=new Map();
  let count=0;
  function node(key){
    if(!nodes.has(key))nodes.set(key,{
      value:'',textContent:'',innerHTML:'',checked:false,open:false,
      classList:{add(){},remove(){}},
      appendChild(){},
      showModal(){this.open=true},
      close(){this.open=false},
      addEventListener(type,fn){this.listeners??={};this.listeners[type]=fn}
    });
    return nodes.get(key);
  }
  const boxes=Array.from({length:3},(_,i)=>node('checkbox-'+i));
  const document={
    querySelector:node,
    querySelectorAll(selector){
      assert.equal(selector,'.detailPanel .check input[type="checkbox"]');
      return boxes;
    },
    createElement:tag=>node('created-'+tag+'-'+count++)
  };
  const localStorage={
    getItem:key=>storage[key]??null,
    setItem(key,value){storage[key]=value}
  };
  const ctx=vm.createContext({document,localStorage,console,Date,innerWidth:0,confirm:()=>true,alert:()=>{}});
  vm.runInContext(source,ctx,{filename:'app.js'});
  const run=code=>vm.runInContext(code,ctx);
  const saved=()=>JSON.parse(storage['afd-events-v3']);
  return {boxes,run,saved};
}
const storage={'afd-events-v3':JSON.stringify([
  {id:1,date:'2026-11-04',time:'19:00',cat:'spouse',title:'가족 모임',checklist:[true,false,true]},
  {id:2,date:'2026-11-05',time:'',cat:'me',title:'개인 일정'}
])};
const app=mount(storage);
let count=0;
function check(condition,message){assert.ok(condition,message);count++}
app.run('showPanel(events[0])');
check(app.boxes.map(b=>b.checked).join(',')==='true,false,true','saved checklist renders for first event');
app.boxes[1].checked=true;
app.boxes[1].listeners.change();
check(app.saved()[0].checklist.join(',')==='true,true,true','checkbox change persists to localStorage');
app.run('showPanel(events[1])');
check(app.boxes.every(b=>!b.checked),'switching to event without checklist resets checkboxes');
app.boxes[2].checked=true;
app.boxes[2].listeners.change();
check(app.saved()[1].checklist[2]===true,'second event has its own saved checklist');
app.run('showPanel(events[0])');
check(app.boxes.every(b=>b.checked),'switching back restores first event');
app.run('showPanel(events[1]);copy()');
check(app.saved().length===3,'copy adds event');
check(app.saved()[2].checklist[2]===true,'copy retains checklist values');
app.run('showPanel(events[2])');
app.boxes[2].checked=false;
app.boxes[2].listeners.change();
check(app.saved()[1].checklist[2]===true,'editing copied checklist does not modify original');
check(app.saved()[2].checklist[2]===false,'copied checklist change is saved independently');
app.run('del()');
check(app.saved().length===2,'delete removes selected copy');
const reloaded=mount(storage);
reloaded.run('showPanel(events[0])');
check(reloaded.boxes.every(b=>b.checked),'reload restores persisted checklist');
reloaded.run('showPanel(events[1])');
check(reloaded.boxes.map(b=>b.checked).join(',')==='false,false,true','reload keeps per-event separation');
console.log('Checklist persistence: '+count+' regression checks passed');
