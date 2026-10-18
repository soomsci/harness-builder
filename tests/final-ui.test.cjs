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
 // Empty first visit is guidance only, with no misleading copyable generic request.
 reset();run("state=blank();workspace=newWorkspace(state);live()");assert.ok(node('pv').textContent.includes('왼쪽에서'));assert.ok(run('transferIssue()').includes('만들 자료'));
 // Old stored file-tool choices cannot override any explicit reference mode, across exports.
 reset();run("state.tools=['file','web'];state.reference={source:'자료 A',text:'발췌 A'};save();workspace=bootWorkspace()");
 for(const mode of ['none','attach','excerpt']){
  run(`state.ctx.textbookMode='${mode}'`);
  for(const intent of ['create','review','resume']){
   const toolBlock=run(`composition('${intent}').blocks.find(b=>b.key==='tools').text`);
   assert.ok(toolBlock.includes('웹 검색'));assert.ok(!toolBlock.includes('첨부한 파일'));
  }
  for(const output of run('outputs()'))assert.ok(!output.includes('첨부한 파일(작년 자료 등)'));
 }
 run("state.ctx.textbookMode='none'");assert.equal(run('referenceText()'),'');assert.ok(!run('toolView()').includes('tool-file'));
 run('old=conditionSnapshot();old.procedureVersion=1');assert.equal(run('conditionDifference(old,conditionSnapshot())'),'same');run("old.blocks.push({key:'tools-old',label:'옛 파일 도구',text:'첨부 파일을 참고한다'})");assert.equal(run('conditionDifference(old,conditionSnapshot())'),'app');
 // Important choices are reachable before nested extra context; direct custom values remain available.
 run("openMaterial('ppt');state.ctx.out='슬라이드 10장'");const lesson=run('VIEWS[1]()');assert.ok(lesson.indexOf('id="f-out"')<lesson.indexOf('id="extra-context"'));assert.equal((lesson.match(/id="f-out"/g)||[]).length,1);assert.ok(lesson.includes('직접 입력하기'));
 run("openMaterial('notice')");const doc=run('VIEWS[1]()');assert.ok(doc.indexOf('id="f-decided"')<doc.indexOf('id="extra-context"'));assert.equal((doc.match(/id="f-decided"/g)||[]).length,1);
 // Copy comes before optional mode choices, but active revision/resume inputs stay above it.
 reset();run("state.step=5;state.tab=0;state.intent='create';resultMode='run'");let html=run('VIEWS[5]()');assert.ok(html.indexOf('id="copy"')<html.indexOf('id="request-intent"'));assert.ok(html.indexOf('id="copy"')<html.indexOf('id="reuse-options"'));assert.ok(html.includes('<details id="reuse-options">'));
 for(const intent of ['revise','resume']){run(`state.intent='${intent}'`);html=run('VIEWS[5]()');assert.ok(html.indexOf('id="intent"')<html.indexOf('id="copy"'));assert.ok(html.includes('id="meta-editProblem"'));}
 run("state.intent='resume';transientResult='연결할 결과';state.ctx.textbookMode='none'");assert.ok(!run('handoffSteps()').includes('최신 결과 파일도'));
 // Suggested names never register a result without an explicit action; old history stays intact.
 reset();run("state.ctx.cur='보일의 법칙';go(6)");assert.equal(run('state.resultName'),'');assert.ok(run('resultInputView()').includes('보일의 법칙'));assert.ok(!run('state.resultRecord'));
 run("state.resultName=''");await act('new-result');assert.equal(run('state.resultRecord.version'),1);assert.ok(run('state.resultRecord.name').includes('보일의 법칙'));assert.equal(run('needsRecheck()'),false);
 assert.ok(run('VIEWS[6]()').includes('id="recheck" data-act="recheck" hidden'));assert.ok(run('resultInputView()').includes('<details id="result-input">'));
 run("state.check.fact='o';ensureCheckRecord();state.checkRecord.evidence.fact='근거 1';archiveCheck()");assert.equal(run('needsRecheck()'),true);assert.ok(!run('VIEWS[6]()').includes('id="recheck" data-act="recheck" hidden'));await act('recheck');assert.equal(run('needsRecheck()'),false);assert.equal(run('state.checkHistory[0].evidence.fact'),'근거 1');
 run("state.ctx.goal='바뀐 목표'");assert.equal(run('needsRecheck()'),true);
 // Display dates are readable; exported provenance retains exact ISO timestamps.
 const iso=run('state.checkRecord.snapshot.at');assert.ok(run('checkNotes()').includes(iso));assert.ok(!run('checkNotes(state.checkRecord,true)').includes(iso));
 // A natural-language law name has an explicit recovery hint, without changing the official catalogue.
 run("state.ctx.subject='과학';state.ctx.curriculumVersion='2022';curriculumQuery='보일'");assert.ok(run('standardsResults()').includes('압력'));run("curriculumQuery='압력'");assert.ok(run('standardsResults()').includes('9과06-02'));
 // Suggestions stay fresh until an explicit registration and advance across rounds; cancel keeps the old draft.
 reset();run("state.ctx.cur='첫 주제';go(6);state.ctx.cur='새 주제';go(6)");assert.equal(run('state.resultName'),'');await act('new-result');assert.ok(run('state.resultRecord.name').includes('새 주제'));assert.ok(run('state.resultRecord.name').endsWith('1차'));
 confirmations=false;const originalName=run('state.resultName');await act('new-result');assert.equal(run('state.resultName'),originalName);assert.equal(run('state.resultRecord.version'),1);
 confirmations=true;await act('new-result');assert.equal(run('state.resultRecord.version'),2);assert.ok(run('state.resultRecord.name').endsWith('2차'));assert.equal(run('state.resultHistory[0].name'),originalName);assert.equal(run('(state.checkHistory||[]).length'),0);
 // Preserve legacy file intent only where no explicit mode or excerpt exists.
 reset();run("openMaterial('notice');state.tools=['file'];state.reference={source:'',text:''};delete state.ctx.textbookMode;save();workspace=bootWorkspace()");assert.equal(run('referenceMode()'),'attach');assert.equal(run('loadIssue'),'');
 run("state.ctx.textbookMode='none';save();workspace=bootWorkspace()");assert.equal(run('referenceMode()'),'none');assert.ok(!run('referenceView()').includes('파일은 AI 채팅에 직접 첨부해요'));
 run("delete state.ctx.textbookMode;state.reference.text='남겨 둔 발췌';save();workspace=bootWorkspace()");assert.equal(run('referenceMode()'),'excerpt');assert.ok(run('referenceText()').includes('남겨 둔 발췌'));
 // Keyboard focus follows the visible heading on mode changes and the summary on result registration.
 let focused='';node('pageTitle').focus=()=>{focused='heading'};
 await node('card').listeners.click({target:{closest:s=>s==='[data-mode]'?{id:'mode-reuse',dataset:{mode:'reuse'}}:null}});assert.equal(focused,'heading');
 reset();node('feedback-checks').tagName='DETAILS';node('feedback-checks').querySelector=()=>node('checks-summary');node('checks-summary').focus=()=>{focused='checks-summary'};await act('new-result');assert.equal(focused,'checks-summary');assert.equal(node('feedback-checks').open,true);
 console.log('FINAL UI OK · reference modes/legacy tools/all exports, app procedure change, primary choices, copy-first/active edits, explicit suggested result, recheck recovery, exact provenance/readable dates, curriculum search recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
