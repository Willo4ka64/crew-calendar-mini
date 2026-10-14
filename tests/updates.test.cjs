const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
function backend(root){
 const props=new Map([['UNRELATED','untouched']]);let allowed=true,lockBusy=false,revokeDuringLock=false;
 const p={getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),getProperties:()=>Object.fromEntries(props)};
 const ctx={Date,JSON,String,Array,PropertiesService:{getScriptProperties:()=>p},LockService:{getScriptLock:()=>({tryLock(){if(revokeDuringLock)allowed=false;return !lockBusy},releaseLock(){}})},Utilities:{formatDate:()=> '2026-10-14'},timeMonthKey_:()=> '2026-10',timeOffRecords_:()=>[],timeDuration_:()=> '0:00'};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'WorkerMiniApp.js'),'utf8'),ctx);
 ctx.workerMiniPerson_=token=>{if(!allowed||!['A','A-device2','B'].includes(token))throw Error('Access denied');return {id:token==='B'?'workerB':'workerA',name:'Worker'}};
 const request=(token,method,data={})=>ctx.workerMiniApp_({initData:token,method,data});
 const first=request('A','snapshot',{includeHours:false});assert.equal(first.ok,true);const catalog=first.data.updates,latest=catalog.current;
 assert.equal(catalog.seen,'');assert.equal(request('A-device2','snapshot',{includeHours:false}).data.updates.seen,'');
 assert(catalog.releases.every((r,i,a)=>/^\d{4}-\d{2}-\d{2}\.\d{2}$/.test(r.version)&&(!i||a[i-1].version>r.version)&&r.items.every(x=>x.ru&&x.en)));
 const ack=request('A','ackRelease',{version:latest});assert.equal(ack.ok,true);assert.equal(ack.updates.seen,latest);
 assert.equal(request('A-device2','snapshot',{includeHours:false}).data.updates.seen,latest);assert.equal(request('B','snapshot',{includeHours:false}).data.updates.seen,'');
 assert.equal(request('A','ackRelease',{version:catalog.releases.at(-1).version}).updates.seen,latest); // no regression
 const before=JSON.stringify([...props]);assert.equal(request('A','ackRelease',{version:'2999-01-01.99'}).ok,false);assert.equal(JSON.stringify([...props]),before);
 assert.equal(request('invalid','ackRelease',{version:latest}).ok,false);assert.equal(JSON.stringify([...props]),before);
 lockBusy=true;assert.equal(request('B','ackRelease',{version:latest}).ok,false);lockBusy=false;
 revokeDuringLock=true;assert.equal(request('B','ackRelease',{version:latest}).ok,false);assert.equal(props.has('MINI_NEWS_SEEN_workerB'),false);revokeDuringLock=false;allowed=true;
 const releases=ctx.workerMiniReleases_();ctx.workerMiniReleases_=()=>[{...releases[0],version:'2026-10-15.01',date:'2026-10-15'},...releases];
 const update=request('A-device2','snapshot',{includeHours:false}).data.updates;assert.equal(update.current,'2026-10-15.01');assert.equal(update.seen,latest);assert.equal(props.get('UNRELATED'),'untouched');
 console.log('PASS: authenticated per-worker server acknowledgement, second-device persistence, worker isolation, immutable releases, new versions, no downgrade, invalid version, busy lock and revoked access.');
}
class El{constructor(tag,document){this.tag=tag;this.children=[];this.hidden=false;this.disabled=false;this.inert=false;this.isConnected=true;this.document=document;this.style={};}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}focus(){this.document.activeElement=this}}
async function client(file){
 const html=fs.readFileSync(file,'utf8'),source=html.slice(html.indexOf("let sessionSeenRelease="),html.indexOf('const cacheKey='));assert(source.includes('ackRelease'));
 const doc={body:{style:{overflow:'auto'}},activeElement:null,addEventListener(){}};const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new El(id,doc));return nodes.get(id)};doc.querySelector=s=>get(s);doc.createElement=tag=>new El(tag,doc);get('releaseDialog').hidden=true;get('fileViewer').hidden=true;
 const entry=(version)=>({version,date:version.slice(0,10),title:{ru:'Обновление',en:'Update'},items:[{ru:'Новое',en:'New'}]});
 const news={current:'2026-10-14.01',seen:'',releases:[entry('2026-10-14.01'),entry('2026-10-13.01')]};
 let calls=0,saves=0,response=async()=>({updates:{...news,seen:news.current}});
 const ctx={state:{updates:news},verified:false,busy:false,document:doc,$:get,CrewI18n:{t:s=>s,localized:r=>r,format:x=>x},text:(tag,value,cls)=>{const e=new El(tag,doc);e.textContent=value;e.className=cls;return e},tg:{BackButton:{show(){},hide(){}}},api:async(method,data)=>{assert.equal(method,'ackRelease');assert.equal(data.version,news.current);calls++;return response()},savePreview:()=>saves++};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 ctx.maybeShowUpdates();assert.equal(get('releaseDialog').hidden,true); // cached data cannot trigger
 ctx.verified=true;ctx.maybeShowUpdates();assert.equal(get('releaseDialog').hidden,false);assert.equal(get('releaseContent').children.length,2);assert.equal(get('main').inert,true);
 ctx.closeReleaseDialog();ctx.maybeShowUpdates();assert.equal(get('releaseDialog').hidden,true);assert.equal(calls,0);assert.equal(get('main').inert,false);assert.equal(doc.body.style.overflow,'auto');
 ctx.openReleaseDialog(true);assert.equal(get('releaseDialog').hidden,false);assert.equal(get('releaseAck').hidden,true);assert.equal(get('releaseLater').textContent,'Закрыть');ctx.closeReleaseDialog();assert.equal(calls,0);
 // New session: show again after Later, but not after successful Got it.
 vm.runInContext("sessionDismissedRelease='';",ctx);ctx.maybeShowUpdates();
 response=async()=>{throw Error('offline')};await ctx.acknowledgeRelease();assert.equal(get('releaseDialog').hidden,false);assert.equal(saves,0);assert.equal(ctx.state.updates.seen,'');assert.equal(get('releaseAck').disabled,false);
 let complete;response=()=>new Promise(resolve=>complete=resolve);const pending=ctx.acknowledgeRelease();await ctx.acknowledgeRelease();assert.equal(calls,2);complete({updates:{...news,seen:news.current}});await pending;
 assert.equal(get('releaseDialog').hidden,true);assert.equal(saves,1);assert.equal(ctx.state.updates.seen,news.current);ctx.maybeShowUpdates();assert.equal(get('releaseDialog').hidden,true);
 // A delayed pre-ack snapshot cannot reopen the same update in this session.
 ctx.state.updates={...news,seen:''};ctx.maybeShowUpdates();assert.equal(get('releaseDialog').hidden,true);
 const fresh=entry('2026-10-15.01');ctx.state.updates={current:fresh.version,seen:news.current,releases:[fresh,...news.releases]};ctx.maybeShowUpdates();assert.equal(get('releaseDialog').hidden,false);assert.equal(get('releaseContent').children.length,1);
 assert(!html.slice(html.indexOf('function restorePreview'),html.indexOf('function load(')).includes('maybeShowUpdates'));
 assert(html.includes('id="releaseHistory"'));assert(!source.includes('innerHTML'));assert(html.includes('localized = (ru,en)'));
 console.log('PASS: automatic unread-only popup after verified load, history, Later without acknowledgement, focus/scroll restoration, network retry, double-click prevention, successful acknowledgement, stale snapshot suppression and next release.');
}
(async()=>{if(process.argv[2]==='--mini')await client(process.argv[3]||'index.html');else backend(process.argv[2]||'.')})().catch(e=>{console.error(e);process.exitCode=1});
