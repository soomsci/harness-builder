const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('/Users/minsu/dev/harnes/index.html','utf8').split('<script>')[1].split('</script>')[0];
const values=new Map(),nodes=new Map(),windows={};let confirmations=true;
function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',hidden:false,textContent:'',innerHTML:'',checked:false,style:{},dataset:{},listeners:{},classList:{add(){},remove(){},toggle(){}},addEventListener(k,fn){this.listeners[k]=fn},focus(){},scrollIntoView(){},click(){},remove(){}});return nodes.get(id);}
const ctx={console,confirm:()=>confirmations,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},document:{querySelector:s=>['#fixReplace','#fixScope'].includes(s)?null:node(s.slice(1)),querySelectorAll:s=>s.includes('chk-')?[node('mark-fact')]:[],getElementById:id=>nodes.get(id)||null,addEventListener(){},createElement:()=>node('anchor'),body:{append(){}}},window:{scrollTo(){},print(){},addEventListener:(k,fn)=>windows[k]=fn},location:{hash:''},navigator:{clipboard:{writeText:async()=>{}}},setTimeout:()=>0,clearTimeout(){},Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const run=s=>vm.runInContext(s,ctx),event=(kind,t)=>node('card').listeners[kind]({target:{id:'',name:'',dataset:{},...t}});
const act=async(act,rest={})=>node('card').listeners.click({target:{closest:s=>s==='[data-mode]'?null:{dataset:{act,...rest}}}});

(async()=>{
 run("openMaterial('sheet');state.resultName='결과1.pdf';registerResult();state.check.fact='o';ensureCheckRecord();state.checkRecord.evidence.fact='이전 근거'");
 event('input',{dataset:{meta:'resultName'},value:'결과2.pdf'});await act('new-result');
 assert.equal(run('state.resultHistory[0].name'),'결과2.pdf');assert.equal(run('state.checkHistory[0].resultName'),'결과2.pdf');
 console.log('CONFIRMED 1: entering next result name rewrites archived prior result/check names');
 run("state.check.fact='d';ensureCheckRecord();state.checkRecord.evidence.fact='수정 근거'");
 event('input',{id:'resultText',value:'등록한 결과의 첫 본문 첨부'});
 assert.equal(run('state.checkRecord'),null);assert.equal(run('state.resultRecord.bodyChanged'),true);
 run("state.tab=3");assert.equal(run('transferAllowed()'),true);assert.ok(run('selectedOutput()').includes('2차 결과'));assert.ok(!run('selectedOutput()').includes('수정 근거'));
 console.log('CONFIRMED 2: first body paste archives checks; changed body export still allowed with old revision');
 run("transientResult='';state.resultName='결과';registerResult();state.check.fact='o';ensureCheckRecord();state.checkRecord.evidence.fact='보존 근거';state.ctx.goal='변경 목표'");
 event('input',{dataset:{evidence:'fact'},value:'저장하려던 새 근거'});assert.equal(run('state.checkRecord.evidence.fact'),'보존 근거');
 console.log('CONFIRMED 7: stale evidence edit silently ignored');
 run("state.ctx.ref='이전 교과서 40쪽';state.reference={source:'',text:''};state.ctx.textbookMode='none'");
 event('input',{dataset:{reference:'source'},value:''});assert.ok(run('referenceText()').includes('이전 교과서 40쪽'));assert.ok(run('referenceText()').includes('파일이 없거나'));
 console.log('CONFIRMED 5/6: old source cannot be cleared; no-textbook still demands attachment');
 run("state.ctx.subjectMode='custom';state.ctx.subject='과학';state.ctx.curriculumVersion='2022';addStandard('9과02-01');save()");
 event('input',{id:'customSubject',dataset:{ctx:'subject'},value:'보건'});
 const stored=JSON.parse(values.get('harness-builder-v2'));const lesson=stored.lessons.find(x=>x.id===stored.activeLesson);
 assert.equal(lesson.ctx.subject,'보건');assert.equal(JSON.parse(lesson.ctx.standardArchive).subject,'과학');
 run("loadIssue='';workspace=bootWorkspace()");assert.ok(run('loadIssue'));assert.equal(run('save()'),false);
 console.log('CONFIRMED 3: custom subject change persists mismatched archive; reboot sets loadIssue and blocks saves');
})().catch(e=>{console.error(e);process.exitCode=1});
