const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2]||'mini-live.html','utf8');
const source=html.slice(html.indexOf('let viewerEpoch='),html.indexOf('function render(){'));
class Element{constructor(tag='div'){this.tag=tag;this.children=[];this.style={};this.hidden=false;this.clientWidth=640;}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}focus(){}querySelector(tag){return this.children.find(x=>x.tag===tag)||null;}}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};get('fileViewer').hidden=true;
const calls=[],created=[],revoked=[];
const text=(tag,value)=>{const el=new Element(tag);el.textContent=value;return el;};
const ctx={CrewI18n:{t:x=>x,html:x=>x},Uint8Array,Blob,TextDecoder,atob,Math,Boolean,Promise,document:{activeElement:new Element(),body:{style:{overflow:''}},createElement:tag=>new Element(tag)},window:{devicePixelRatio:1},location:{href:'https://example.test/'},URL:{createObjectURL:()=>{const id='blob:'+created.length;created.push(id);return id;},revokeObjectURL:url=>revoked.push(url)},tg:{BackButton:{show(){},hide(){}}},verified:true,busy:false,$:get,text,button:(label,fn)=>{const b=text('button',label);b.onclick=fn;return b;},note(){},act(){},api:async(method,data)=>{calls.push(data.index);return {file:{kind:'image',name:'schema.png',mimeType:'image/png',base64:'iVBORw0KGgo='}};}};
vm.createContext(ctx);vm.runInContext(source,ctx);
(async()=>{
 const trip={id:'trip',version:'v1',title:'Project',attachments:[{name:'one.png'},{name:'list.xlsx'},{name:'two.png'},{name:'three.png'},{name:'four.png'}]};
 await ctx.previewTripFiles(trip);
 assert.deepEqual(calls,[0,2,3,4]);assert.equal(get('viewerContent').children.length,4);
 assert(get('viewerContent').children.every(card=>card.children[3].children[0].tag==='img'));
 assert.equal(get('viewerFileNext').hidden,true);assert.equal(get('viewerSend').hidden,true);
 const card=get('viewerContent').children[0];card.children[2].children[1].onclick();assert.equal(card.children[3].children[0].style.width,'125%');
 ctx.closeFileViewer();assert.deepEqual(revoked,created);assert.equal(get('viewerContent').children.length,0);assert.equal(ctx.document.body.style.overflow,'');
 let resolve;ctx.api=()=>new Promise(r=>resolve=r);const pending=ctx.previewTripFiles(trip);ctx.closeFileViewer();resolve({file:{kind:'image',name:'late.png',mimeType:'image/png',base64:'iVBORw0KGgo='}});await pending;
 assert.equal(created.length,4);assert.equal(get('viewerContent').children.length,0);
 const attempted=[];ctx.api=async(method,data)=>{attempted.push(data.index);if(data.index===0)throw Error('failed');return {file:{kind:'text',base64:Buffer.from('<script>safe</script>').toString('base64')}};};
 await ctx.previewTripFiles(trip);assert.deepEqual(attempted,[0,2,3,4]);assert.equal(get('viewerContent').children[1].children[3].children[0].textContent,'<script>safe</script>');ctx.closeFileViewer();
 console.log('PASS: four PNGs in one scrollable view, Excel excluded, independent zoom, cleanup, close race, one file failure does not block others, safe text.');
})().catch(error=>{console.error(error);process.exitCode=1;});
