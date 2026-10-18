const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
const values=new Map(),nodes=new Map(),windows={};let confirmations=true;
function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',hidden:false,textContent:'',innerHTML:'',checked:false,style:{},dataset:{},listeners:{},classList:{add(){},remove(){},toggle(){}},addEventListener(k,fn){this.listeners[k]=fn},focus(){},scrollIntoView(){},click(){},remove(){}});return nodes.get(id);}
const ctx={console,confirm:()=>confirmations,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},document:{querySelector:s=>['#fixReplace','#fixScope'].includes(s)?null:node(s.slice(1)),querySelectorAll:s=>s.includes('chk-')?[node('mark-fact')]:[],getElementById:id=>nodes.get(id)||null,addEventListener(){},createElement:()=>node('anchor'),body:{append(){}}},window:{scrollTo(){},print(){},addEventListener:(k,fn)=>windows[k]=fn},location:{hash:''},navigator:{clipboard:{writeText:async()=>{}}},setTimeout:()=>0,clearTimeout(){},Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const run=s=>vm.runInContext(s,ctx),event=(kind,t)=>node('card').listeners[kind]({target:{id:'',name:'',dataset:{},...t}});
const act=async(act,rest={})=>node('card').listeners.click({target:{closest:s=>s==='[data-mode]'?null:{dataset:{act,...rest}}}});
(async()=>{
 event('input',{dataset:{task:''},value:'학부모 안내'});event('change',{name:'type',value:'notice'});
 assert.equal(run('state.task'),'학부모 안내');assert.equal(run('workspace.lessons.length'),1);assert.equal(run('group()'),'doc');
 event('input',{dataset:{ctx:'reader'},value:'중1 학부모'});event('input',{dataset:{ctx:'purpose'},value:'체험 안내'});
 event('change',{name:'type',value:'sheet'});const sheet=run('state.materialId');event('change',{name:'type',value:'notice'});
 assert.equal(run('state.ctx.purpose'),'체험 안내');assert.equal(run('workspace.lessons.length'),2);
 event('change',{name:'type',value:'sheet'});assert.equal(run('state.materialId'),sheet);assert.equal(run('workspace.lessons.length'),2);
 event('input',{dataset:{ctx:'goal'},value:'이전 목표'});run("recordTransfer('create')");
 event('input',{dataset:{meta:'resultName'},value:'결과1.pdf'});event('change',{name:'chk-fact',value:'o'});node('mark-fact').checked=true;
 event('input',{dataset:{meta:'resultName'},value:'결과2.pdf'});assert.equal(node('mark-fact').checked,false);assert.equal(run('Object.keys(state.check).length'),0);assert.equal(run('state.checkHistory.length'),1);
 event('input',{dataset:{ctx:'goal'},value:'새 목표'});event('change',{name:'chk-fact',value:'o'});assert.equal(run('Object.keys(state.check).length'),0);
 assert.ok(run("composition('review').text").includes('이전 목표'));assert.ok(run('conditionView()').includes('마지막 제작 요청 이후'));
 await act('recheck');event('change',{name:'chk-fact',value:'o'});assert.equal(run('state.check.fact'),'o');assert.equal(run('staleCheck()'),false);
 // A short revision must not pretend it resent the full new conditions.
 run("state.intent='revise';state.editProblem='문항 간격 변경';state.tab=0");await act('copy');assert.ok(run('state.lastRequest.blocks[0].text').includes('이전 목표'));assert.equal(run('state.lastTransfer.intent'),'revise');
 // New documents keep the correct group and do not spawn an extra lesson on first selection.
 event('change',{name:'type',value:'notice'});run("state.ctx.caution='준비물 확인';state.fixed.caution=true;save()");await act('new-lesson');const n=run('workspace.lessons.length');assert.equal(run('group()'),'doc');event('change',{name:'type',value:'doc'});assert.equal(run('workspace.lessons.length'),n);assert.equal(run('state.ctx.caution'),'준비물 확인');
 // Reset only the active material; cancellation and total erasure have distinct boundaries.
 const count=run('workspace.lessons.length');confirmations=false;run('eraseWorkspace()');assert.equal(run('workspace.lessons.length'),count);
 confirmations=true;run('resetAll()');assert.equal(run('workspace.lessons.length'),count);
 // Every example opens separately through the actual button and leaves existing work intact.
 const originalLessons=run('JSON.stringify(workspace.lessons)'),originalCount=run('workspace.lessons.length');
 const examples=run('Object.keys(PRESETS)');
 for(const type of examples){
  node('exampleType').value=type;node('exampleType').onchange();assert.ok(node('exampleTask').textContent);
  node('loadExample').onclick();assert.equal(run('state.type'),type);assert.equal(run('state.step'),1);
  assert.equal(run('group()'),['notice','doc'].includes(type)?'doc':'lesson');
  assert.ok(run('state.activity.length')>0);assert.ok(run('state.skills.length')>0);
  assert.ok(run("composition('create').text.includes(state.activity)"));
 }
 assert.equal(run('workspace.lessons.length'),originalCount+9);
 assert.equal(run(`JSON.stringify(workspace.lessons.slice(0,${originalCount}))`),originalLessons);
 run("state.ctx.goal='사용자 수정';state.skills[0]='사용자 방법';save();loadExample('custom')");
 assert.notEqual(run('state.ctx.goal'),'사용자 수정');assert.notEqual(run('state.skills[0]'),'사용자 방법');
 const beforeInvalid=run('workspace.lessons.length');run("loadExample('unknown')");assert.equal(run('workspace.lessons.length'),beforeInvalid);
 console.log('EXAMPLES OK · 9 types, button flow, context/activity output, original work preservation, independent copies');
 // Curriculum controls use the same delegated event path as the visible UI.
 event('change',{name:'type',value:'sheet'});
 event('change',{id:'subjectSelect',value:'과학'});event('change',{id:'curriculumVersion',value:'2022'});
 event('input',{id:'standardSearch',value:'지권'});assert.ok(node('standardsResults').innerHTML.includes('9과09-01'));assert.ok(!node('standardsResults').innerHTML.includes('9수'));
 await act('standard-add',{code:'9과02-01'});assert.equal(run('selectedStandards().length'),1);
 event('change',{name:'type',value:'ppt'});assert.equal(run('selectedStandards().length'),1);
 confirmations=false;event('change',{id:'curriculumVersion',value:'2015'});assert.equal(run('state.ctx.curriculumVersion'),'2022');
 confirmations=true;event('change',{id:'curriculumVersion',value:'2015'});assert.equal(run('selectedStandards().length'),0);
 await act('standard-add',{code:'9과01-01'});assert.ok(run('curriculumText()').includes('지구계'));
 await act('standard-remove',{code:'9과01-01'});assert.equal(run('selectedStandards().length'),0);
 event('input',{id:'standardSearch',value:'존재하지않는검색어'});assert.ok(node('standardsResults').innerHTML.includes('찾은 기준이 없어요'));
 event('change',{id:'subjectSelect',value:'__custom'});assert.equal(run('state.ctx.subjectMode'),'custom');
 event('input',{id:'customSubject',dataset:{ctx:'subject'},value:'보건'});assert.equal(run('state.ctx.subject'),'보건');assert.equal(run('curriculumRows().length'),0);
 // Corrupt/legacy stored criteria must block transfers even when the subject is empty.
 run("state.ctx.subject='';state.ctx.curriculumVersion='2022';state.ctx.standardCodes='9과02-01';state.intent='create';state.tab=0");
 assert.equal(run('curriculumText()'),'');assert.ok(run('curriculumIssue()'));assert.equal(run('transferAllowed()'),false);
 const priorTransfer=run('JSON.stringify(state.lastTransfer)');
 for(const tab of [0,3]){run(`state.tab=${tab}`);await act('copy');await act('dl');assert.equal(run('JSON.stringify(state.lastTransfer)'),priorTransfer);}
 console.log('CURRICULUM EVENTS OK · search, add/remove, material switch, version change cancellation, empty search, custom subject, empty-subject transfer blocking');
 values.set('harness-builder-v1','legacy');values.set('harness-builder-v1-recovery','recovery');run('eraseWorkspace()');assert.equal(values.size,0);
 // A remote clear blocks autosaving the currently open page.
 windows.storage({key:null});assert.equal(run('save()'),false);assert.equal(values.size,0);
 console.log('EVENTS OK · cross-group navigation, result rename, stale checks, short revision provenance, new work, reset/erase, storage event');
})().catch(e=>{console.error(e);process.exitCode=1});
