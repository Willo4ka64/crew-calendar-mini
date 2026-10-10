const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class TextNode {
  constructor(value){this.nodeType=3;this.nodeValue=value;this.parentElement=null;}
  get isConnected(){return !!this.parentElement?.isConnected;}
}
class Element {
  constructor(tag){this.nodeType=1;this.tag=tag;this.attrs={};this.childNodes=[];this.parentElement=null;this.value='';}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.childNodes.push(node);}}
  matches(selector){return selector.split(',').some(x=>x.startsWith('[')?Object.hasOwn(this.attrs,x.slice(1,-1)):this.tag===x);}
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector);}
  getAttribute(k){return this.attrs[k]??null;}setAttribute(k,v){this.attrs[k]=String(v);}
  get isConnected(){return this.tag==='body'||this.tag==='title'||!!this.parentElement?.isConnected;}
  get textContent(){return this.childNodes.map(n=>n.nodeValue??n.textContent).join('');}
  set textContent(v){for(const n of this.childNodes)n.parentElement=null;this.childNodes=[];this.append(new TextNode(String(v)));}
}
function run(file,blocked=false){
 const html=fs.readFileSync(file,'utf8'),engine=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const body=new Element('body'),title=new Element('title');title.textContent=html.includes('id="name"')?'Моя команда':'Выезды команды';
 const label=new Element('label');label.append(new TextNode('Часы работы'));const input=new Element('input');input.value='Сцена — Руслан';input.setAttribute('placeholder','Необязательно');body.append(label,input);
 const data=new Element('h3');data.textContent='Сцена';body.append(data); // appended after initial scan below
 body.childNodes.pop();data.parentElement=null;
 const textarea=new Element('textarea');textarea.textContent='Часы работы';textarea.value='Моё сообщение сотрудникам';body.append(textarea);
 const picker=new Element('label');picker.setAttribute('data-language-picker','');const select=new Element('select');picker.append(select);body.append(picker);
 let observer,dialog='',printed='';const storage=new Map();
 const window={confirm:s=>{dialog=s;return true;},alert(){},prompt(){},print:()=>{printed=body.textContent;}};
 const document={body,documentElement:{lang:'ru'},querySelector:s=>s==='title'?title:null,querySelectorAll:()=>[select]};
 const context={window,document,Intl,Map,Set,WeakMap,NodeFilter:{SHOW_TEXT:4},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k)},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}},MutationObserver:class{constructor(fn){observer=fn}observe(){}}};
 vm.createContext(context);vm.runInContext(engine,context);const i=window.CrewI18n;
 body.append(data);const line=new Element('p');line.textContent=i.t(html.includes('id="name"')?'Команда: ':'Проект: ')+'Сцена';body.append(line);
 i.setLanguage('en');assert.equal(label.textContent,'Work hours');assert.equal(data.textContent,'Сцена');assert.match(line.textContent,/^(Team|Project): Сцена$/);
 assert.equal(input.value,'Сцена — Руслан');assert.equal(textarea.value,'Моё сообщение сотрудникам');assert.equal(textarea.textContent,'Часы работы');assert.equal(document.documentElement.lang,'en');assert.equal(select.value,'en');
 assert.match(title.textContent,/^(My team|Team jobs)$/);
 const late=new Element('button');late.textContent=i.t('Закрыть');body.append(late);observer([{type:'childList',addedNodes:[late]}]);assert.equal(late.textContent,'Close');
 const time=new Element('p');time.textContent=i.format('2026-10-10T12:00:00Z',{timeZone:'Asia/Jerusalem',month:'long'});body.append(time);i.flush();assert.equal(time.textContent,'October');
 window.confirm(i.t('Закрыть')+' · Сцена');assert.equal(dialog,'Close · Сцена');
 i.setLanguage('ru');assert.equal(label.textContent,'Часы работы');assert.equal(late.textContent,'Закрыть');assert.equal(time.textContent,'октябрь');assert.equal(data.textContent,'Сцена');assert.match(line.textContent,/Сцена$/);
 late.textContent='Имя пользователя';i.setLanguage('en');assert.equal(late.textContent,'Имя пользователя');
 const instant=new Element('p');instant.textContent=i.t('Закрыть');body.append(instant);window.print();assert(!/[\uE000\uE001]/.test(printed));assert.equal(instant.textContent,'Close');
 if(!blocked)assert.equal(storage.get('crew.interface.language'),'en');
 assert(html.includes('data-language-picker'));assert(html.includes('name="endDate"'));assert(!html.includes('location.reload'));
 console.log('PASS:',file,blocked?'blocked storage':'storage enabled','— live switch, dynamic cards, month, title, form preservation, user data, dialogs and print');
}
for(const file of (process.argv.length>2?process.argv.slice(2):['index.html'])) {run(file);run(file,true);}
