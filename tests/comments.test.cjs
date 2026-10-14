const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const html=fs.readFileSync('index.html','utf8'),source=html.slice(html.indexOf('  const jobCommentDrafts ='),html.indexOf('function renderTrips(target)'));
class El{constructor(tag){this.tag=tag;this.children=[];this.style={};this.value='';}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}setAttribute(){}}
const ctx={document:{createElement:t=>new El(t)},CrewI18n:{t:x=>x,locale:'ru-RU'},crypto,Uint8Array,Date};vm.createContext(ctx);vm.runInContext(source,ctx);
const flatten=n=>[n,...n.children.flatMap(flatten)];
(async()=>{
 const root=new El('div');let reads=0,writes=0,fail=true,keys=[];
 const row={author:'Worker',at:'2026-10-14T18:00:00Z',text:'<script>bad()</script>\nДоложить кабель'};
 ctx.mountJobComments(root,'trip',async()=>{reads++;return {comments:[row],total:1}},async data=>{writes++;keys.push(data.requestId);if(fail)throw Error('Network');return {comments:[row,{...row,text:data.text}],total:2}});
 assert.equal(reads,0,'closed section must not read');const section=root.children[0];section.open=true;section.ontoggle();await new Promise(setImmediate);assert.equal(reads,1);
 const nodes=flatten(root),input=nodes.find(n=>n.tag==='textarea'),form=nodes.find(n=>n.tag==='form');assert(nodes.some(n=>n.textContent===row.text));
 input.value='Доложить 2 LAN';input.oninput();await form.onsubmit({preventDefault(){}});assert.equal(input.value,'Доложить 2 LAN');
 fail=false;await form.onsubmit({preventDefault(){}});assert.equal(keys[0],keys[1],'network retry keeps id');assert.equal(input.value,'');assert.equal(writes,2);
 input.value='Сохранить черновик';input.oninput();const root2=new El('div');ctx.mountJobComments(root2,'trip',async()=>({comments:[]}),async()=>({comments:[]}));assert.equal(flatten(root2).find(n=>n.tag==='textarea').value,input.value);
 assert(!source.includes('innerHTML'));console.log('PASS: lazy discussion reads, safe multiline user text, post/retry, stable request IDs, draft retention, draft restore and clear after success.');
})().catch(e=>{console.error(e);process.exitCode=1});
