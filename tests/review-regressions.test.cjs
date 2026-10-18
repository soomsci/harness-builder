const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
const values=new Map(),nodes=new Map(),windows={};let confirmations=true;
function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',hidden:false,textContent:'',innerHTML:'',checked:false,style:{},dataset:{},listeners:{},classList:{add(){},remove(){},toggle(){}},addEventListener(k,fn){this.listeners[k]=fn},focus(){},scrollIntoView(){},click(){},remove(){}});return nodes.get(id);}
const ctx={console,crypto:require('node:crypto').webcrypto,TextEncoder,confirm:()=>confirmations,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},document:{querySelector:s=>['#fixReplace','#fixScope'].includes(s)?null:node(s.slice(1)),querySelectorAll:s=>s.includes('chk-')?[node('mark-fact')]:[],getElementById:id=>nodes.get(id)||null,addEventListener(){},createElement:()=>node('anchor'),body:{append(){}}},window:{scrollTo(){},print(){},addEventListener:(k,fn)=>windows[k]=fn},location:{hash:''},navigator:{clipboard:{writeText:async()=>{}}},setTimeout:()=>0,clearTimeout(){},Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const run=s=>vm.runInContext(s,ctx),event=(kind,t)=>node('card').listeners[kind]({target:{id:'',name:'',dataset:{},...t}});
const act=async(act,rest={})=>node('card').listeners.click({target:{closest:s=>s==='[data-mode]'?null:{dataset:{act,...rest}}}});

function reset(){values.clear();confirmations=true;run("loadIssue='';externalUpdate=false;state=blank();workspace=newWorkspace(state);lastWorkspaceText=null;transientResult='';boundResultText='';boundResultVersion=0;undoFix=null;openMaterial('sheet')");}
(async()=>{
 reset();run("state.resultName='결과1.pdf';registerResult();state.check.fact='o';ensureCheckRecord();state.checkRecord.evidence.fact='1번 근거'");
 event('input',{dataset:{meta:'resultName'},value:'결과2.pdf'});run('state.tab=3');assert.ok(run('transferIssue()'));await act('new-result');
 assert.equal(run('state.resultHistory[0].name'),'결과1.pdf');assert.equal(run('state.checkHistory[0].resultName'),'결과1.pdf');
 event('input',{dataset:{meta:'resultName'},value:'결과2_오타수정.pdf'});await act('rename-result');assert.equal(run('state.resultRecord.version'),2);assert.equal(run('state.resultRecord.name'),'결과2_오타수정.pdf');assert.equal(run('state.resultHistory[0].name'),'결과1.pdf');
 run("state.check.fact='d';ensureCheckRecord();state.checkRecord.evidence.fact='검토 근거'");
 event('input',{id:'resultText',value:'첫 본문'});assert.ok(run('transferIssue()'));assert.equal(run('state.check.fact'),'d');await act('connect-body');
 assert.equal(run('state.resultRecord.version'),2);assert.equal(run('state.checkRecord.evidence.fact'),'검토 근거');assert.ok(run('selectedOutput()').includes('검토 근거'));assert.equal(run('state.resultRecord.bodyHash.length'),64);
 run("save();workspace=bootWorkspace();transientResult='';boundResultText='';boundResultVersion=0");event('input',{id:'resultText',value:'첫 본문'});await act('connect-body');
 assert.equal(run('state.resultRecord.version'),2);assert.equal(run('state.checkRecord.evidence.fact'),'검토 근거');
 event('input',{id:'resultText',value:'바뀐 본문'});await act('connect-body');assert.ok(run('transferIssue()'));assert.ok(!run('selectedOutput()').includes('2차 결과'));
 const before=run('JSON.stringify(state.lastTransfer)');await act('copy');await act('dl');assert.equal(run('JSON.stringify(state.lastTransfer)'),before);
 await act('new-result');assert.equal(run('state.resultRecord.version'),3);assert.equal(run('Object.keys(state.check).length'),0);assert.equal(run('state.checkHistory.at(-1).evidence.fact'),'검토 근거');assert.equal(run('transferIssue()'),'');
 assert.ok(!values.get('harness-builder-v2').includes('바뀐 본문'));
 // Direct-subject cancellation and save/reload use the same clearing boundary as a dropdown.
 reset();event('change',{id:'subjectSelect',value:'__custom'});event('input',{id:'customSubject',dataset:{ctx:'subject'},value:'과학'});event('change',{id:'curriculumVersion',value:'2022'});await act('standard-add',{code:'9과02-01'});
 const archive=run('state.ctx.standardArchive');confirmations=false;event('input',{id:'customSubject',dataset:{ctx:'subject'},value:'보건'});assert.equal(run('state.ctx.subject'),'과학');assert.equal(run('state.ctx.standardArchive'),archive);
 confirmations=true;event('input',{id:'customSubject',dataset:{ctx:'subject'},value:'보건'});run('workspace=bootWorkspace()');assert.equal(run('loadIssue'),'');assert.equal(run('state.ctx.subject'),'보건');assert.equal(run('selectedStandards().length'),0);
 // Previously persisted mismatches are recoverable warnings; reading must not rewrite an archive.
 run(`state.ctx.standardArchive=${JSON.stringify(archive)};state.ctx.standardCodes='9과02-01';state.ctx.curriculumVersion='2022';save();workspace=bootWorkspace()`);
 assert.equal(run('loadIssue'),'');assert.ok(run('curriculumIssue()'));run('composition()');assert.equal(run('state.ctx.standardArchive'),archive);assert.equal(run('save()'),true);
 // Modern snapshots ignore label-only edits, but real inputs and procedure versions differ.
 reset();run('snapshot=conditionSnapshot();snapshot.blocks[0].label="표시용 이름 변경"');assert.equal(run('conditionsEqual(snapshot,conditionSnapshot())'),true);
 run('snapshot.procedureVersion=0');assert.equal(run('conditionDifference(snapshot,conditionSnapshot())'),'app');assert.ok(run('conditionMessage(snapshot)').includes('교사 입력은 같지만'));
 run('snapshot=conditionSnapshot();delete snapshot.inputs;delete snapshot.procedureVersion;snapshot.blocks=snapshot.blocks.filter(b=>b.key!=="procedure")');assert.equal(run('conditionDifference(snapshot,conditionSnapshot())'),'legacy');assert.ok(run('conditionMessage(snapshot)').includes('앱 개편 전 기록'));
 run("state.ctx.goal='새 목표'");assert.equal(run('conditionDifference(snapshot,conditionSnapshot())'),'changed');
 // Legacy reference migration happens once at the shared lesson level, including old material ctx.
 reset();run("stashMaterial();currentLesson().ctx.ref='이전 출처';currentLesson().materials[0].ctx.ref='이전 출처'");values.set('harness-builder-v2',run('JSON.stringify(workspace)'));run('workspace=bootWorkspace()');assert.equal(run('state.reference.source'),'이전 출처');
 event('input',{dataset:{reference:'source'},value:''});run('save();workspace=bootWorkspace()');assert.equal(run('state.reference.source'),'');assert.ok(!run('referenceText()').includes('이전 출처'));
 event('input',{dataset:{reference:'source'},value:'교과서 52쪽'});event('input',{dataset:{reference:'text'},value:'발췌 본문'});
 event('change',{id:'textbookMode',value:'none'});assert.equal(run('referenceText()'),'');assert.ok(!run('handoffSteps()').includes('파일을 AI'));
 event('change',{id:'textbookMode',value:'excerpt'});assert.ok(run('referenceText()').includes('발췌 본문'));assert.ok(!run('referenceText()').includes('교사가 이 AI 채팅에 직접 첨부'));
 event('change',{name:'type',value:'notice'});assert.ok(!run('referenceView()').includes('단원·쪽수'));
 // Stale evidence remains visible but read-only; no silent apparent successful editing.
 reset();run("state.resultName='결과';registerResult();state.check.fact='o';ensureCheckRecord();state.checkRecord.evidence.fact='이전 근거';state.ctx.goal='변경된 목표';state.step=6");
 assert.ok(run('VIEWS[6]()').includes('readonly'));event('input',{dataset:{evidence:'fact'},value:'저장되지 않을 입력'});assert.equal(run('state.checkRecord.evidence.fact'),'이전 근거');assert.ok(node('toast').textContent.includes('확정한 뒤'));
 await act('recheck');event('change',{name:'chk-fact',value:'x'});event('input',{dataset:{evidence:'fact'},value:'자료를 못 읽어 확인 못함'});run("state.editProblem=''");await act('revise');assert.ok(run('state.editProblem').includes('확인 요청 · 오류로 단정하지 마세요'));
 run("state.check.fact='o';state.checkRecord.evidence={}");assert.ok(run('workflowText()').includes('근거가 1개'));
 assert.equal((run('VIEWS[5]()').match(/data-go="6"/g)||[]).length,1);

 // Follow-up: a connected old body must not silently travel with a new result name.
 reset();run("state.resultName='본문1';registerResult();state.tab=3");event('input',{id:'resultText',value:'이전 회차 본문 A'});await act('connect-body');
 event('input',{dataset:{meta:'resultName'},value:'본문2'});await act('new-result');
 assert.equal(run('state.resultRecord.bodyHash'),'');assert.equal(run('transientResult'),'');assert.ok(!run('selectedOutput()').includes('이전 회차 본문 A'));assert.ok(run('selectedOutput()').includes('2차 결과'));
 run("state.reference={source:'출처',text:'저장된 발췌'};state.ctx.textbookMode='attach'");assert.equal(run("composition().blocks.find(b=>b.key==='reference').label"),'참고자료 첨부 안내');assert.ok(!run('composition().text').includes('저장된 발췌'));
 run("state.ctx.textbookMode='excerpt';state.reference.text=''");assert.ok(run('transferIssue()').includes('발췌 본문'));assert.ok(!run('handoffSteps()').includes('발췌가 요청문에 포함'));
 assert.equal(run('conditionDifference({blocks:[]},conditionSnapshot())'),'legacy');
 run("state.ctx.textbookMode='none';archiveCheck()");event('change',{name:'chk-fact',value:'o'});assert.ok(node('toast').textContent.includes('현재 조건으로 다시 점검'));
 // IME input is committed once after composition; partial Korean syllables cannot clear standards.
 reset();run("state.ctx.subjectMode='custom';state.ctx.subject='과학';state.ctx.curriculumVersion='2022';addStandard('9과02-01')");
 node('card').listeners.input({isComposing:true,target:{id:'customSubject',dataset:{ctx:'subject'},value:'보'}});assert.equal(run('state.ctx.subject'),'과학');assert.equal(run('selectedStandards().length'),1);
 node('card').listeners.compositionend({target:{id:'customSubject',value:'보건'}});assert.equal(run('state.ctx.subject'),'보건');assert.equal(run('selectedStandards().length'),0);
 node('card').innerHTML='입력 중인 카드 보존';for(const value of ['진','진로','진로와 직업'])node('card').listeners.compositionend({target:{id:'customSubject',value}});assert.equal(node('card').innerHTML,'입력 중인 카드 보존');assert.equal(run('state.ctx.subject'),'진로와 직업');
 console.log('FOLLOW-UP OK · old-body carryover prevented, actual reference label, empty excerpt guard, legacy empty snapshot, recheck action, IME boundary');
 // Invalid active nested data must preserve the entire workspace, not just a material.
 run("state.resultName='손상 검사용';registerResult();stashMaterial();currentLesson().materials[0].checkRecord.snapshot.blocks=null");const bad=run('JSON.stringify(workspace)');values.set('harness-builder-v2',bad);run('workspace=bootWorkspace()');assert.ok(run('loadIssue'));assert.equal(values.get('harness-builder-v1-recovery'),bad);
 console.log('CLAUDE REGRESSIONS OK · history names, explicit rename, first/same/changed body, export guard, custom subject/cancel/reload, archive preservation, semantic/app/legacy comparison, reference migration/modes, read-only evidence, uncertainty, missing evidence, one entry, full recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
