const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'index.html','utf8');
const source=html.slice(html.indexOf('  const jobCommentDrafts ='),html.indexOf('function renderHours()'));
class El{constructor(tag){this.tag=tag;this.children=[];this.style={};}setAttribute(){}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new El('div'));return elements.get(id)};
const text=(tag,value,cls='')=>{const n=new El(tag);n.textContent=value;n.className=cls;return n};
const state={today:'2026-10-13',trips:[]},calls=[],links=[];
const ctx={state,$:get,text,button:(label,fn,cls)=>{const b=text('button',label,cls);b.onclick=fn;return b},statuses:{accepted:'confirmed',pending:'pending',declined:'declined'},types:{screen:'Screens'},CrewI18n:{t:s=>s,weekdays:s=>s},document:{createElement:tag=>new El(tag)},tg:{openLink:url=>links.push(url)},act:(...args)=>calls.push(args),encodeURIComponent,isExcelFile:()=>false};
vm.createContext(ctx);vm.runInContext(source,ctx);
const flatten=n=>[n,...n.children.flatMap(flatten)];
for(const status of ['pending','accepted','declined']){
 state.trips=[{id:'trip',version:'v1',date:'2026-10-13',status,title:'Expo Beitan 14',when:'13.10.2026',location:'Expo & תל אביב',car:'Isuzu',types:['screen'],names:[],attachments:[]}];
 for(const target of [undefined,get('homeTrip')]){
  const sheet='https://docs.google.com/spreadsheets/d/ABCDEFGHIJKLMNO/edit#gid=42';
  state.trips[0].schemeLinks=[sheet, sheet.replace('ABCDEFGHIJKLMNO','PQRSTUVWXYZABCD'),'javascript:alert(1)'];
  ctx.renderTrips(target);const nodes=flatten(target||get('tripList'));
  const sheets=nodes.filter(n=>n.tag==='a'&&n.className.includes('sheet-link'));assert.equal(sheets.length,2);
  assert.equal(sheets[0].href,sheet);assert(sheets[0].textContent.endsWith('1'));assert(sheets[1].textContent.endsWith('2'));
  sheets[0].onclick({preventDefault(){}});assert.equal(links.at(-1),sheet);
  const confirm=nodes.filter(n=>n.tag==='button'&&n.textContent==='✅ Подтвердить');assert.equal(confirm.length,status==='accepted'?0:1);
  assert(nodes.some(n=>n.tag==='summary'&&n.textContent==='❌ Не могу')); // allow changing an accepted response
  if(confirm.length){confirm[0].onclick();assert.equal(calls.at(-1)[1].status,'accepted')}
  const route=nodes.find(n=>n.tag==='a');assert(route.className.includes('waze-link'));
  const url=new URL(route.href);assert.equal(url.hostname,'waze.com');assert.equal(url.searchParams.get('q'),state.trips[0].location);
  let prevented=false;route.onclick({preventDefault(){prevented=true}});assert(prevented);assert.equal(links.at(-1),route.href);
 }
}
assert(/\.waze-link\{[^}]*text-decoration:none!important/.test(html));
assert(/\.waze-link:visited[^}]*text-decoration:none!important/.test(html));
console.log('PASS: accepted jobs hide confirmation on Home and Jobs; pending/declined can confirm; decline remains available; Waze uses button styling without underlining and preserves encoded address and Telegram opening.');

