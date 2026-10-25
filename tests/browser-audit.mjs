import { chromium } from '@playwright/test';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base=process.env.TEST_BASE_URL||'http://127.0.0.1:5055';
const output=new URL('../test-results/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];const results=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
async function go(hash){await page.goto(base+'/'+hash);await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);}
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS:',name);}
try {
await check('Catalog: 2 sourced profiles, 8 covers, all supplied images load',async()=>{
 await go('#home');assert.equal(await page.locator('.product-card').count(),2);assert.equal(await page.locator('.gallery-card').count(),8);
 for(const image of await page.locator('.card-image>img,.gallery-card img').all()){
  await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());assert.ok(await image.evaluate(img=>img.naturalWidth>0));
 }
 await page.locator('.gallery-card').first().click();assert.match(await page.locator('#modal').innerText(),/Chỉ có ảnh bìa/);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').isVisible(),false);
 await page.screenshot({path:new URL('home-desktop.png',output).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
});
await check('Search, no results, reset and filters',async()=>{
 await go('#catalog');await page.locator('#search').fill('nothing-123');await page.locator('.search-form button').click();
 assert.match(await page.locator('#catalog-results').innerText(),/Không tìm thấy thông tin/);
 await page.locator('[data-reset-search]').click();assert.equal(await page.locator('.gallery-card').count(),8);
 await page.locator('[data-filter="profiles"]').click();assert.equal(await page.locator('.gallery-card').count(),0);
 await page.locator('#search').fill('kiwi');await page.locator('.search-form button').click();assert.equal(await page.locator('.product-card').count(),1);
 await page.locator('.product-card h3 a').click();await page.locator('.source-card').first().waitFor();assert.match(page.url(),/P-ZESPRI-VICHI-01/);
});
await check('Correct profile, sources, one scope block and original photo dialog',async()=>{
 assert.match(await page.locator('h1').innerText(),/4 quả/);assert.equal(await page.locator('.source-card').count(),3);
 assert.equal(await page.locator('.profile-main>.scope-box').count(),1);
 const text=await page.locator('main').innerText();assert.doesNotMatch(text,/META-|102384759201|PHYTO-2026-OK|BioViet/);
 await page.locator('.source-card [data-source]').first().click();await page.locator('.source-photo').evaluate(img=>img.decode());
 assert.match(await page.locator('#modal').innerText(),/Chưa xác minh theo lô/);await page.locator('#close-modal').click();
 await page.locator('.source-card [data-source]').nth(2).click();
 assert.equal(await page.locator('#modal a.button').getAttribute('href'),'https://www.zespri.com/en-NZ/zespri-system-assurance-program');await page.keyboard.press('Escape');
 await page.locator('.detail-disclosure summary').first().click();assert.match(await page.locator('.organic-compare').innerText(),/không phải hộp kiwi vàng 4 quả/);
 await page.locator('.detail-disclosure summary').nth(1).click();assert.equal(await page.locator('.detail-disclosure').nth(1).locator('.evidence-item').count(),7);
});
await check('Product-scoped assistant cites sources; unsafe/out-of-scope text stays text; navigation resets chat',async()=>{
 await page.locator('[data-question="QA-Z-04"]').click();await page.waitForFunction(()=>document.querySelector('.chat-answer')?.textContent.includes('Không có căn cứ'));
 assert.equal(await page.locator('.chat-answer [data-source]').count(),2);
 await page.locator('#question').fill('<img src=x onerror=alert(1)>');await page.locator('.chat-form button').click();
 await page.waitForFunction(()=>document.querySelectorAll('.chat-answer')[1]?.textContent.includes('Chưa đủ thông tin'));
 assert.equal(await page.locator('.chat-log img').count(),0);
 await go('#detail/P-ENVY-VICHI-01');assert.equal(await page.locator('.chat-turn').count(),0);
 await page.reload();await page.locator('.source-card').first().waitFor();assert.match(await page.locator('h1').innerText(),/ENVY/);
});
await check('Both QR PNGs decode to exact public HTTPS profile URLs',async()=>{
 for(const id of ['P-ENVY-VICHI-01','P-ZESPRI-VICHI-01']){
  const pixels=await page.evaluate(async id=>{const img=new Image();img.src='/api/generate-qr?product_id='+id;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return {data:Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data),width:canvas.width,height:canvas.height};},id);
  const decoded=jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height);
  assert.equal(decoded?.data,'https://xuatxu-web.onrender.com/#detail/'+id);
 }
});
await check('Hash simulation verifies, detects tampering and restores cleanly',async()=>{
 await go('#tech');assert.equal(await page.locator('.chain-record').count(),5);
 await page.locator('[data-verify]').click();await page.waitForFunction(()=>document.querySelector('.tech-result').textContent.startsWith('5/5'));
 await page.locator('[data-tamper]').click();await page.waitForFunction(()=>document.querySelector('.tech-result').classList.contains('fail'));
 assert.match(await page.locator('.tech-result').innerText(),/1\/5/);
 await page.locator('[data-reset-demo]').click();await page.locator('[data-verify]').click();await page.waitForFunction(()=>document.querySelector('.tech-result').textContent.startsWith('5/5'));
});
await check('Research explanation and 90-second links lead to real features',async()=>{
 await go('#about');assert.equal(await page.locator('.walkthrough a').count(),3);assert.match(await page.locator('.about-intro').innerText(),/nghiên cứu/);
 await page.locator('.walkthrough a').first().click();await page.locator('.source-card').first().waitFor();assert.match(page.url(),/ENVY/);
});
await check('Responsive: 49 combinations at 320–1440px, no horizontal overflow',async()=>{
 for(const width of [320,360,390,430,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of ['#home','#catalog','#detail/P-ENVY-VICHI-01','#detail/P-ZESPRI-VICHI-01','#about','#tech','#qr']){
   await go(route);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${route}`);
  }
 }
 await page.setViewportSize({width:390,height:844});await go('#home');await page.locator('.menu-button').click();assert.equal(await page.locator('nav').isVisible(),true);
 await page.locator('nav a[href="#about"]').click();await page.locator('.about-intro').waitFor();assert.equal(await page.locator('nav').isVisible(),false);
 await go('#home');await page.screenshot({path:new URL('home-mobile.png',output).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await go('#detail/P-ZESPRI-VICHI-01');await page.screenshot({path:new URL('profile-mobile.png',output).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await page.locator('[data-qr]').click();assert.equal(await page.locator('#modal').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.keyboard.press('Escape');
 await page.setViewportSize({width:1440,height:1000});await go('#home');await page.screenshot({path:new URL('home-desktop.png',output).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
 await go('#detail/P-ZESPRI-VICHI-01');await page.screenshot({path:new URL('profile-desktop.png',output).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
});
assert.deepEqual(errors,[]);
console.log('No browser or console errors.');
} catch(error){results.push({name:'Failure',status:'FAIL',message:error.message});throw error;}
finally{await writeFile(new URL('browser-audit.json',output),JSON.stringify({base,checkedAt:new Date().toISOString(),results,errors},null,2));await browser.close();}
