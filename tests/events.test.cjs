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
 event('input',{dataset:{meta:'resultName'},value:'결과1.pdf'});await act('new-result');event('change',{name:'chk-fact',value:'o'});node('mark-fact').checked=true;
 event('input',{dataset:{meta:'resultName'},value:'결과2.pdf'});assert.equal(run('state.check.fact'),'o');assert.equal(run('state.resultRecord.version'),1);await act('new-result');assert.equal(run('Object.keys(state.check).length'),0);assert.equal(run('state.checkHistory.length'),1);
 event('input',{dataset:{ctx:'goal'},value:'새 목표'});event('change',{name:'chk-fact',value:'o'});assert.equal(run('Object.keys(state.check).length'),0);
 assert.ok(run("composition('review').text").includes('이전 목표'));assert.ok(run('conditionView()').includes('이전 조건에서 확인'));
 await act('recheck');event('change',{name:'chk-fact',value:'o'});assert.equal(run('state.check.fact'),'o');assert.equal(run('staleCheck()'),false);
 // A result revision owns its evidence; renaming preserves it, content changes require registration.
 event('input',{dataset:{evidence:'fact'},value:'교과서 53쪽과 문항 2를 대조함'});
 assert.ok(run("composition('resume').text").includes('교과서 53쪽과 문항 2를 대조함'));
 event('input',{dataset:{meta:'resultName'},value:'결과_이름수정.pdf'});
 assert.equal(run('state.check.fact'),'o');assert.equal(run('state.checkRecord.evidence.fact'),'교과서 53쪽과 문항 2를 대조함');
 event('input',{id:'resultText',value:'새 문항 본문'});assert.equal(run('state.checkRecord'),null);
 await act('recheck');assert.equal(run('state.checkRecord'),null);
 await act('new-result');assert.equal(run('state.resultRecord.version'),3);assert.equal(run('transientResult'),'새 문항 본문');
 assert.equal(run('Object.keys(state.checkRecord.evidence).length'),0);
 await act('recheck');event('change',{name:'chk-fact',value:'d'});event('input',{dataset:{evidence:'fact'},value:'문항 2의 정답 근거가 없음'});
 run("state.editProblem=''");await act('revise');assert.ok(run('state.editProblem').includes('문항 2의 정답 근거가 없음'));
 await act('resume-work');assert.equal(run('state.intent'),'resume');assert.ok(run('selectedOutput()').includes('3차 결과'));
 run('save()');assert.ok(!values.get('harness-builder-v2').includes('새 문항 본문'));
 console.log('WORKFLOW OK · explicit result revision, rename, evidence, content invalidation, revision/resume, body not persisted');
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
 // Dropdowns store actual wording, preserve legacy custom values and never save the UI sentinel.
 event('change',{name:'type',value:'sheet'});
 event('change',{id:'f-grade',dataset:{choiceCtx:'grade'},value:'중학교 2학년'});
 assert.equal(run('state.ctx.grade'),'중학교 2학년');assert.ok(run('composition().text').includes('중학교 2학년'));
 event('change',{id:'f-grade',dataset:{choiceCtx:'grade'},value:'__custom'});
 assert.equal(node('f-grade-custom').hidden,false);assert.equal(run('state.ctx.grade'),'중학교 2학년');
 event('input',{id:'f-grade-text',dataset:{ctx:'grade'},value:'중1·2 통합반'});
 assert.ok(run("field(fieldsNow().find(f=>f.k==='grade'))").includes('value="__custom" selected'));
 event('change',{id:'f-grade',dataset:{choiceCtx:'grade'},value:''});assert.equal(run('state.ctx.grade'),'');
 assert.equal(node('f-grade-custom').hidden,true);
 event('change',{id:'activity',dataset:{choiceMeta:'activity'},value:'자료 관찰 → 관계 찾기 → 근거 설명'});
 const dropdownMaterial=run('state.materialId');assert.ok(run('composition().text').includes('자료 관찰 → 관계 찾기 → 근거 설명'));
 event('change',{name:'type',value:'ppt'});event('change',{name:'type',value:'sheet'});
 assert.equal(run('state.materialId'),dropdownMaterial);assert.equal(run('state.activity'),'자료 관찰 → 관계 찾기 → 근거 설명');
 assert.equal(JSON.parse(values.get('harness-builder-v2')).schema,4);
 for(const type of run('Object.keys(PRESETS)')){
  run(`openMaterial('${type}')`);assert.ok(run('activityView()').includes('data-choice-meta="activity"'));
  assert.ok(run('VIEWS[1]()').includes('data-choice-ctx='));
 }
 run("resultMode='run';state.tab=0");assert.ok(run('VIEWS[5]()').includes('이번 자료 만들기'));assert.ok(!run('VIEWS[5]()').includes('AI 기본 설정 · 선택'));
 run("resultMode='reuse';state.tab=1");assert.ok(run('VIEWS[5]()').includes('반복할 작업의 규칙 저장'));assert.ok(run('VIEWS[5]()').includes('직접 저장하는 규칙'));
 run("resultMode='run';state.tab=0");
 console.log('DROPDOWNS OK · values, custom fallback, skip, persistence, material isolation, 9 types, handoff wording');
 // Each middle-school subject has its own activity examples; no activity is silently replaced.
 for(const subject of run('SCHOOL_SUBJECTS')){
  for(const type of ['webapp','ppt','sheet','exam','explain','visual','custom']){
   run(`openMaterial('${type}');state.ctx.subject=${JSON.stringify(subject)}`);
   const optionCount=3+run('UI.activityChoices[state.type].length');assert.equal(run('activityOptions().length'),optionCount);assert.equal(run('new Set(activityOptions()).size'),optionCount);
   assert.equal(run('activityOptions()[0]'),run(`UI.subjectActivities[state.ctx.subject].${type==='webapp'?'webapp':'lesson'}[0]`));
  }
 }
 event('change',{name:'type',value:'webapp'});event('change',{id:'subjectSelect',value:'과학'});
 const scienceActivity=run('activityOptions()[0]');event('change',{id:'activity',dataset:{choiceMeta:'activity'},value:scienceActivity});
 event('change',{id:'subjectSelect',value:'국어'});assert.equal(run('state.activity'),scienceActivity);
 assert.ok(run('activityView()').includes('value="__custom" selected'));assert.ok(run('activityOptions()[0]').includes('문단'));
 event('change',{id:'subjectSelect',value:'__custom'});event('input',{id:'customSubject',dataset:{ctx:'subject'},value:'보건'});
 assert.deepEqual(Array.from(run('activityOptions()')),Array.from(run('UI.activityChoices.webapp')));
 event('change',{name:'type',value:'notice'});assert.deepEqual(Array.from(run('activityOptions()')),Array.from(run('UI.activityChoices.notice')));
 // The prominent custom-method form adds, edits and removes a real rule with the chosen scope.
 run("state.step=2");const methodsView=run('VIEWS[2]()');
 assert.equal((methodsView.match(/id="newSkill"/g)||[]).length,1);assert.ok(methodsView.indexOf('원하는 방법 직접 추가하기')<methodsView.indexOf('고른 방법의 문장·순서 바꾸기'));
 node('newSkill').value='질문 뒤에 생각할 시간을 안내한다';node('newScope').value='request';await act('add');
 const addedIndex=run('state.skills.length-1');assert.equal(run(`scopeAt(${addedIndex})`),'request');
 assert.ok(run('composition().text').includes('질문 뒤에 생각할 시간을 안내한다'));assert.ok(!run('outputs()[1]').includes('질문 뒤에 생각할 시간을 안내한다'));
 event('input',{dataset:{skill:String(addedIndex)},value:'질문 뒤에 10초 생각할 시간을 안내한다'});
 assert.ok(run('composition().text').includes('10초 생각할 시간'));await act('del',{i:String(addedIndex)});
 assert.ok(!run('composition().text').includes('10초 생각할 시간'));
 console.log('SUBJECT ACTIVITIES / METHODS OK · 12 subjects × 7 lesson types, web interactions, preserved activity, fallback, custom method add/edit/remove/scope');
 // The persistent right-hand preview follows input immediately and the actual selected export.
 run("state.step=1;state.tab=1;resultMode='reuse'");
 event('input',{dataset:{ctx:'purpose'},value:'실시간 미리보기 확인'});
 assert.ok(node('pv').textContent.includes('실시간 미리보기 확인'));assert.equal(node('previewTitle').textContent,'작성 중인 요청문');
 event('change',{id:'activity',dataset:{choiceMeta:'activity'},value:'안내 사항 → 신청 방법 → 제출 기한'});
 assert.ok(node('pv').textContent.includes('안내 사항 → 신청 방법 → 제출 기한'));
 run("state.step=5;state.tab=1;live()");assert.equal(node('pv').textContent,run('selectedOutput()'));assert.equal(node('previewTitle').textContent,run('RESULT_TABS[1].name'));
 run("state.tab=0;state.intent='revise';state.editProblem='실시간 수정 요청';live()");assert.equal(node('pv').textContent,run('selectedOutput()'));assert.ok(node('pv').textContent.includes('실시간 수정 요청'));
 run("state.intent='create';state.step=1;render()");assert.equal(node('previewUse').hidden,false);
 console.log('LIVE PREVIEW OK · immediate input/select changes, creation versus reuse/revision output, persistent panel');
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
