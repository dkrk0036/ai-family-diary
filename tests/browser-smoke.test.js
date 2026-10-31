// Browser smoke checks for the actual desktop/mobile UI, not a mocked DOM.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filename = path.resolve(root, '.' + (pathname==='/'?'/index.html':pathname));
  if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(filename,(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream'});
    res.end(data);
  });
});
const listen=()=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const close=()=>new Promise(resolve=>server.close(resolve));
async function reset(page,url){
  await page.goto(url);
  await page.evaluate(()=>{localStorage.removeItem('afd-events-v3');localStorage.removeItem('afd-events-v2')});
  await page.reload();
}
async function count(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('afd-events-v3')||'[]').length)}
async function run(){
  await listen();
  const url='http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({headless:true});
  fs.mkdirSync(path.join(root,'screenshots'),{recursive:true});
  try{
    const desktopContext=await browser.newContext({viewport:{width:1440,height:900}});
    const desktop=await desktopContext.newPage();
    const desktopErrors=[];desktop.on('pageerror',e=>desktopErrors.push(e.message));
    await reset(desktop,url);
    assert.match(await desktop.locator('#monthTitle').textContent(),/^\d{4}년 \d{1,2}월$/);
    await desktop.locator('#aiOpen').click();
    await desktop.locator('#natural').fill('2028년 2월 29일 오후 7시 가족 모임');
    await desktop.locator('#quick button').click();
    assert.equal(await desktop.locator('#pTitle').textContent(),'가족 모임 ♥');
    assert.equal(await desktop.locator('#pTime').textContent(),'19:00');
    assert.equal(await count(desktop),1);
    await desktop.locator('#panelEdit').click();
    await desktop.locator('#dtitle').fill('수정한 가족 모임');
    await desktop.locator('#save').click();
    assert.equal(await desktop.locator('#pTitle').textContent(),'수정한 가족 모임 ♥');
    await desktop.locator('#panelCopy').click();
    assert.equal(await count(desktop),2);
    assert.equal(await desktop.locator('#pTitle').textContent(),'수정한 가족 모임 (복사) ♥');
    desktop.on('dialog',dialog=>dialog.accept());
    await desktop.locator('#panelDelete').click();
    assert.equal(await count(desktop),1);
    await desktop.screenshot({path:path.join(root,'screenshots','desktop.png'),fullPage:true});
    await desktop.reload();
    assert.equal(await count(desktop),1);
    assert.deepEqual(desktopErrors,[]);
    console.log('PASS desktop: real browser load, add, edit, copy, delete, reload and persistence');

    // Two same-origin tabs must not silently overwrite each other's schedules.
    const otherTab=await desktop.context().newPage();
    await otherTab.goto(url);
    assert.equal(await otherTab.locator('#pTitle').textContent(),'수정한 가족 모임 ♥');
    await otherTab.locator('#panelCopy').click();
    await desktop.waitForFunction(()=>JSON.parse(localStorage.getItem('afd-events-v3')||'[]').length===2);
    await desktop.locator('#panelEdit').click();
    await desktop.locator('#dtitle').fill('다른 탭 일정 보존');
    await desktop.locator('#save').click();
    assert.equal(await count(desktop),2,'editing from a stale tab must not erase the other tab copy');
    assert.equal(await otherTab.locator('#pTitle').textContent(),'수정한 가족 모임 (복사) ♥');
    otherTab.on('dialog',dialog=>dialog.accept());
    await otherTab.locator('#panelDelete').click();
    assert.equal(await count(desktop),1);
    await otherTab.locator('#grid .event').first().click();
    assert.equal(await otherTab.locator('#pTitle').textContent(),'다른 탭 일정 보존 ♥');
    await otherTab.locator('#panelDelete').click();
    await desktop.locator('#pTitle').waitFor({state:'visible'});
    assert.equal(await desktop.locator('#pTitle').textContent(),'일정을 선택해 주세요');
    assert.equal(await count(desktop),0);
    await otherTab.close();
    console.log('PASS two tabs: cross-tab refresh, no stale overwrite, remote deletion clears selection');

    // Verify that a relative Korean date becomes the intended calendar day in the rendered app.
    await desktop.locator('#aiOpen').click();
    await desktop.locator('#natural').fill('모레 오후 4시 아이 치과');
    await desktop.locator('#quick button').click();
    assert.equal(await desktop.locator('#pTitle').textContent(),'아이 치과 ♥');
    assert.equal(await desktop.locator('#pTime').textContent(),'16:00');
    const expectedRelativeDate=await desktop.evaluate(()=>{
      const date=new Date();date.setDate(date.getDate()+2);
      const pad=n=>String(n).padStart(2,'0');
      return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
    });
    const relativeEvents=await desktop.evaluate(()=>JSON.parse(localStorage.getItem('afd-events-v3')||'[]'));
    assert.equal(relativeEvents.length,1);
    assert.equal(relativeEvents[0].date,expectedRelativeDate);
    await desktop.screenshot({path:path.join(root,'screenshots','relative-date-desktop.png'),fullPage:true});
    console.log('PASS relative date: 모레 resolves to the correct day and is visible in the calendar');


    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mobileErrors=[];mobile.on('pageerror',e=>mobileErrors.push(e.message));
    await reset(mobile,url);
    assert.equal(await mobile.locator('#mobileAdd').isVisible(),true);
    await mobile.locator('#mobileAdd').click();
    await mobile.locator('#natural').fill('2028년 3월 1일 오전 9시 아이 학교');
    await mobile.locator('#quick button').click();
    assert.equal(await mobile.locator('#pTitle').textContent(),'아이 학교 ♥');
    assert.equal(await mobile.locator('#pTime').textContent(),'09:00');
    assert.equal(await count(mobile),1);
    await mobile.locator('#panelEdit').click();
    await mobile.locator('#dtime').fill('10:15');
    await mobile.locator('#save').click();
    assert.equal(await mobile.locator('#pTime').textContent(),'10:15');

    // Touch-screen checklist and copy/delete flows must preserve the original.
    const firstCheck=mobile.locator('.detailPanel .check input[type="checkbox"]').first();
    await firstCheck.check();
    assert.equal(await firstCheck.isChecked(),true);
    assert.equal((await mobile.evaluate(()=>JSON.parse(localStorage.getItem('afd-events-v3'))))[0].checklist[0],true);
    await mobile.locator('#panelCopy').click();
    assert.equal(await count(mobile),2);
    assert.equal(await mobile.locator('#pTitle').textContent(),'아이 학교 (복사) ♥');
    assert.equal(await firstCheck.isChecked(),true);
    await firstCheck.uncheck();
    assert.equal(await firstCheck.isChecked(),false);
    const savedPair=await mobile.evaluate(()=>JSON.parse(localStorage.getItem('afd-events-v3')));
    assert.equal(savedPair[0].checklist[0],true);
    assert.equal(savedPair[1].checklist[0],false);
    mobile.on('dialog',dialog=>dialog.accept());
    await mobile.locator('#panelDelete').click();
    assert.equal(await count(mobile),1);
    assert.equal(await mobile.locator('#monthTitle').textContent(),'2028년 3월');
    assert.equal(await mobile.locator('#grid .event').count(),1);
    await mobile.locator('#grid .event').first().click();
    assert.equal(await mobile.locator('#pTitle').textContent(),'아이 학교 ♥');
    assert.equal(await firstCheck.isChecked(),true);

    await mobile.screenshot({path:path.join(root,'screenshots','mobile.png'),fullPage:true});
    await mobile.reload();
    assert.equal(await count(mobile),1);
    // Reload opens the current month, so navigate back to the saved 2028 event.
    for(let i=0;i<36 && await mobile.locator('#monthTitle').textContent()!=='2028년 3월';i++){
      await mobile.locator('#next').click();
    }
    assert.equal(await mobile.locator('#monthTitle').textContent(),'2028년 3월');
    await mobile.locator('#grid .event').first().click();
    assert.equal(await firstCheck.isChecked(),true);
    assert.deepEqual(mobileErrors,[]);
    console.log('PASS mobile: real browser add, edit, checklist, copy, delete, reload and persistence');
  }finally{await browser.close();}
}
run().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>close());
