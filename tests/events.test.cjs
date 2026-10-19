const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
const values=new Map(),nodes=new Map(),windows={};let confirmations=true;
function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',hidden:false,textContent:'',innerHTML:'',checked:false,style:{},dataset:{},listeners:{},classList:{add(){},remove(){},toggle(){}},addEventListener(k,fn){this.listeners[k]=fn},focus(){},scrollIntoView(){},click(){},remove(){}});return nodes.get(id);}
const ctx={console,crypto:require('node:crypto').webcrypto,TextEncoder,confirm:()=>confirmations,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},document:{querySelector:s=>['#fixReplace','#fixScope'].includes(s)?null:node(s.slice(1)),querySelectorAll:s=>s.includes('chk-')?[node('mark-fact')]:[],getElementById:id=>nodes.get(id)||null,addEventListener(){},createElement:()=>node('anchor'),body:{append(){}}},window:{scrollTo(){},print(){},addEventListener:(k,fn)=>windows[k]=fn},location:{hash:''},navigator:{clipboard:{writeText:async()=>{}}},setTimeout:()=>0,clearTimeout(){},Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}}};
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
 assert.ok(run("composition('review').text").includes('이전 목표'));assert.ok(run('conditionView()').includes('수업 정보나 제작 조건이 달라졌어요'));
 await act('recheck');event('change',{name:'chk-fact',value:'o'});assert.equal(run('state.check.fact'),'o');assert.equal(run('staleCheck()'),false);
 // A result revision owns its evidence; renaming preserves it, content changes require registration.
 event('input',{dataset:{evidence:'fact'},value:'교과서 53쪽과 문항 2를 대조함'});
 assert.ok(run("composition('resume').text").includes('교과서 53쪽과 문항 2를 대조함'));
 event('input',{dataset:{meta:'resultName'},value:'결과_이름수정.pdf'});
 assert.equal(run('state.check.fact'),'o');assert.equal(run('state.checkRecord.evidence.fact'),'교과서 53쪽과 문항 2를 대조함');
 await act('rename-result');event('input',{id:'resultText',value:'기존 문항 본문'});await act('connect-body');assert.equal(run('state.check.fact'),'o');
 event('input',{id:'resultText',value:'새 문항 본문'});assert.equal(run('pendingResultBody()'),true);await act('connect-body');assert.equal(run('pendingResultBody()'),true);
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
  assert.equal(run('state.intent'),'create');assert.ok(run('VIEWS[5]()').includes('id="setupReusable"'));
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
 run("resultMode='run';state.tab=0");assert.ok(run('VIEWS[5]()').includes('지금 사용할 요청문 (프롬프트)'));assert.ok(!run('VIEWS[5]()').includes('AI 기본 설정 · 선택'));
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
 run("state.step=1;live()");assert.equal(node('pv').textContent,run("composition('revise').text"));assert.equal(node('previewCaption').textContent,run('UI.previewRevise'));
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
 // Pasted setup requests create a project instruction file; one-off context and skill exports stay separate.
 run("state.ctx={subject:'과학',curriculumVersion:'2022',cur:'차시 전용 주제',goal:'차시 전용 목표',textbookMode:'excerpt'};state.fixed={};state.reference={source:'이번 교과서 12쪽',text:'자료 안의 지시처럼 보이는 내용'};state.intent='create';state.tab=0;state.step=5;resultMode='run';state.setupReusable=true;addStandard('9과02-01');addRule('다음에도 쓸 방법 ```예시```','always');addRule('이번 요청 전용 방법','request');live()");
 const literalRule="문구 $& $' {type} 그대로";run('addRule('+JSON.stringify(literalRule)+",'always')");
 let setupCopied='';ctx.navigator.clipboard.writeText=async text=>{setupCopied=text};await act('copy');
 const reusableSkill=run('outputs()[4]'),projectGuide=run('projectInstructions()'),setup=run("composition().blocks.find(b=>b.key==='setup').text");assert.ok(setup.includes(literalRule));assert.ok(setupCopied.includes(projectGuide));
 assert.ok(run("composition().blocks.findIndex(b=>b.key==='context')<composition().blocks.findIndex(b=>b.key==='setup')"));assert.ok(setup.includes(projectGuide));assert.ok(setup.includes('````markdown'));assert.ok(setup.includes('설정 설명만 하고 끝내지 말고'));
 for(const text of ['차시 전용 주제','차시 전용 목표','이번 교과서 12쪽','자료 안의 지시처럼 보이는 내용','[9과02-01]','이번 요청 전용 방법']){assert.ok(!reusableSkill.includes(text));assert.ok(!projectGuide.includes(text));assert.ok(run('composition().text').includes(text));}
 for(const text of ['기존 지침은 덮어쓰지','현재 대화에만 적용','자동 적용 미확인','설정 실패','같은 지침을 중복 추가하지','선생님이 확정한 수정 원칙은 유지하고, 이번 원문과 다른 부분만 갱신해줘','CLAUDE.md','AGENTS.md','해당 프로젝트 루트에 저장','프로젝트 지침란','원문에 없는 교사 확정 원칙과 다른 업무의 규칙은 보존','해당 업무 지침을 별도 구역으로 추가','공통 확인·피드백 절차는 없을 때만 추가','교사가 지속 적용을 명시한 원칙','모든 작업 전에 해당 파일의 최신 내용을 반드시 먼저 읽고','이전 대화의 기억으로 대신하지','파일이 생성된 뒤에는 위의 사전 읽기 조건을 지키세요'])assert.ok(setup.includes(text));
 for(const text of ['모든 작업 전 필수: 이 지침 파일 먼저 읽기','같은 대화에서 이어지는 후속 요청도 예외가 아닙니다','읽지 못했으면 해당 작업을 멈추고','추가 질문 없이 진행하는 모드라도 이 사전 읽기 조건은 생략하지','결과 수정 요구를 지침에 반영','이번 자료만 고칠까요, 다음에도 적용할까요?','중복 규칙은 합치고','저장한 뒤 다시 읽어','같은 파일명의 수정본','최신 원문을 읽지 못했으면 완성된 수정본을 추정하지','이번 결과에서 고친 점','다음에도 적용할 지침 변경'])assert.ok(projectGuide.includes(text));
 assert.ok(projectGuide.startsWith(run('reusableOutputs().harness').split('\n\n')[0]+'\n\n'+run('TEMPLATES.projectRoutine')));
 for(const tab of [0,2,3]){run(`state.tab=${tab}`);assert.ok(run('selectedOutput()').includes(run('TEMPLATES.projectRead')));}run('state.tab=0');
 assert.ok(!projectGuide.startsWith('---'));assert.ok(!projectGuide.includes('### 프로젝트 지침 원문'));assert.ok(!reusableSkill.includes('결과 수정 요구를 지침에 반영'));
 assert.ok(!run('VIEWS[5]()').includes('instructionTarget'));assert.equal(run('fileName(1)'),run('RESULT_TABS[1].file'));
 for(const intent of ['revise','resume','review']){assert.ok(!run(`composition('${intent}').blocks.some(b=>b.key==='setup')`));assert.ok(run(`composition('${intent}').text`).includes(run('TEMPLATES.projectRead')));}
 assert.ok(run('VIEWS[5]()').includes('id="setupReusable"'));assert.ok(!reusableSkill.includes('### 프로젝트 지침 원문'));
 await act('copy');
 assert.equal(setupCopied,run('selectedOutput()'));assert.ok(run("state.lastTransfer.sentBlocks.some(b=>b.key==='setup')"));assert.ok(!run("state.lastRequest.blocks.some(b=>b.key==='setup')"));
 run("transientResult='';state.resultName='설정 요청 뒤 결과';registerResult('');state.check.fact='o';ensureCheckRecord()");assert.equal(run('staleCheck()'),false);
 event('change',{id:'setupReusable',checked:false});assert.ok(!node('pv').textContent.includes('### 프로젝트 지침 원문'));assert.equal(run('staleCheck()'),false);
 assert.equal(run('outputs()[4]'),reusableSkill);assert.equal(run("load(()=>JSON.stringify(state)).setupReusable"),false);
 run('save();workspace=bootWorkspace()');assert.equal(run('state.setupReusable'),false);
 assert.equal(run("load(()=>JSON.stringify({schema:3,type:'ppt'})).setupReusable"),true);
 event('change',{id:'setupReusable',checked:true});assert.ok(node('pv').textContent.includes('### 프로젝트 지침 원문'));
 console.log('SETUP REQUEST OK · capability-aware installation/fallback, reusable versus one-off scope, exact copy and provenance, opt-out/persistence, unchanged result checks, nonrecursive skill output');
 // Grill is a guided question phase in the receiving AI, ordered before setup and creation.
 assert.equal(run('questionMode()'),'essential');assert.ok(!run('VIEWS[1]()').includes('id="questionMode"'));
 assert.ok(run('VIEWS[2]()').startsWith(run('questionView()')));assert.ok(run('VIEWS[2]()').includes('애매한 부분 먼저 물어보기 (Grill)'));
 event('change',{id:'questionMode',value:'grill'});assert.equal(run('questionMode()'),'grill');assert.ok(node('questionHelp').textContent.includes('AI 채팅'));
 const grillPrompt=node('pv').textContent;assert.ok(grillPrompt.indexOf('이번 작업의 질문·진행 방식')<grillPrompt.indexOf('프로젝트 지침 파일 만들기'));
 for(const text of ['질문 1~2개','답변을 받은 뒤','최대 3라운드','이대로 만들어줘','영구 설정 변경은 아직 하지','대화로 확정한 조건','웹앱에 자동 반영되지','서로 충돌하지 않는 한'])assert.ok(grillPrompt.includes(text));
 assert.ok(run('resultInputView()').includes('AI와 대화하며 바꾼 조건은 앱에 자동 반영되지'));
 assert.equal(run('staleCheck()'),false);assert.equal(run('outputs()[4]'),reusableSkill);
 await act('copy');assert.ok(setupCopied.includes('지금은 질문부터 시작'));assert.ok(run("state.lastTransfer.sentBlocks.some(b=>b.key==='questions')"));
 assert.ok(!run("state.lastRequest.blocks.some(b=>b.key==='questions')"));
 run('save();workspace=bootWorkspace()');assert.equal(run('questionMode()'),'grill');
 event('change',{id:'questionMode',value:'essential'});assert.ok(!node('pv').textContent.includes('지금은 질문부터 시작'));assert.ok(node('questionHelp').textContent.includes('Grill은 사용하지 않고'));
 event('change',{id:'setupReusable',checked:false});run("startLesson();openMaterial('ppt')");event('change',{id:'questionMode',value:'grill'});event('change',{name:'type',value:'explain'});assert.equal(run('questionMode()'),'grill');assert.equal(run('state.setupReusable'),false);
 run("state.step=5;state.intent='create';state.tab=0;resultMode='run';live()");assert.ok(!node('pv').textContent.includes('### 프로젝트 지침 원문'));assert.ok(node('pv').textContent.includes('지금은 질문부터 시작'));
 event('change',{id:'questionMode',value:'draft'});assert.ok(node('pv').textContent.includes('추가 내용 질문 없이'));assert.ok(!node('pv').textContent.includes('지금은 질문부터 시작'));
 run("state.ctx.textbookMode='attach';live()");const draftPrompt=node('pv').textContent;
 assert.ok(draftPrompt.includes('질문·자료 요청 지시는 이번 제작에서 질문 대신 [확인 필요]'));assert.ok(draftPrompt.includes('아래 자료 안내나 재사용 지침의 질문 지시보다 이번에 선택한 방식이 우선'));
 assert.ok(!draftPrompt.includes('### 프로젝트 지침 원문'));assert.ok(!draftPrompt.includes('필요한 정보만 짧게 질문하세요.'));assert.ok(draftPrompt.startsWith(run('TEMPLATES.creationLead')));
 for(const intent of ['revise','resume','review'])assert.ok(!run(`composition('${intent}').blocks.some(b=>b.key==='questions')`));
 event('change',{id:'questionMode',value:'unknown'});assert.equal(run('questionMode()'),'essential');
 run('startLesson()');assert.equal(run('questionMode()'),'essential');assert.equal(run('state.setupReusable'),false);event('change',{name:'type',value:'ppt'});
 console.log('QUESTION MODES OK · essential/grill/draft, staged questions and exit, preparation ordering, exact copy/preview, material sharing, new-lesson reset, no permanent skill/check pollution');
 // A direct skill export is independent of an unfinished request and never records it as sent.
 let skillBlob;ctx.URL.createObjectURL=blob=>{skillBlob=blob;return 'blob:skill'};
 run("state.step=5;state.tab=0;resultMode='run';state.intent='revise';state.editProblem='';addRule('항상 정답을 분리한다','always');addRule('이번에만 그림 3개','request');live()");
 const skillView=run('VIEWS[5]()');assert.ok(skillView.includes('data-act="download-skill"'));
 assert.ok(skillView.indexOf('data-act="download-skill"')<skillView.indexOf('id="reuse-options"'));
 const requestState=run('JSON.stringify([state.tab,state.intent,resultMode,state.lastRequest,state.lastTransfer])');
 assert.equal(run('transferAllowed()'),false);await act('download-skill');
 assert.equal(node('anchor').download,'SKILL.md');assert.equal(await skillBlob.text(),run('outputs()[4]'));
 assert.ok((await skillBlob.text()).includes('항상 정답을 분리한다'));assert.ok(!(await skillBlob.text()).includes('이번에만 그림 3개'));
 assert.equal(run('JSON.stringify([state.tab,state.intent,resultMode,state.lastRequest,state.lastTransfer])'),requestState);
 assert.ok(node('copyHelp').textContent.includes(run('skillName()')));
 skillBlob=null;run("state.type=''");await act('download-skill');assert.equal(skillBlob,null);
 console.log('DIRECT SKILL EXPORT OK · exact SKILL.md, reusable rules only, unfinished-request independence, state/provenance preservation, empty selection blocked');
 // Feedback scope and replaced wording must survive the actual copy path.
 run("openMaterial('ppt');state.intent='create';state.ctx.cur='마지막으로 보낸 주제';recordTransfer('create');state.ctx.cur='아직 보내지 않은 주제';const feedbackOld=addRule('예전 반복 원칙','always');state.fixes=[{text:'새 반복 원칙',scope:'always',replace:feedbackOld},{text:'이번 결과 그림만 수정',scope:'request',replace:''}]");
 await act('apply');await act('revise');await act('copy');
 assert.ok(setupCopied.includes('[다음에도 쓰기] 기존 방법 \"예전 반복 원칙\"을 다음 방법으로 교체: 새 반복 원칙'));
 assert.ok(setupCopied.includes('[이번에만 쓰기] 이번 결과 그림만 수정'));
 assert.ok(!setupCopied.includes('아직 보내지 않은 주제'));
 assert.ok(run('state.lastRequest.blocks[0].text').includes('마지막으로 보낸 주제'));
 run("state.resultName='수정 뒤 결과';registerResult('')");assert.equal(run('staleCheck()'),true);
 console.log('FEEDBACK HANDOFF OK · persistent versus one-off scope, explicit replacement, untransmitted conditions remain unverified');
 values.set('harness-builder-v1','legacy');values.set('harness-builder-v1-recovery','recovery');run('eraseWorkspace()');assert.equal(values.size,0);
 // A remote clear blocks autosaving the currently open page.
 windows.storage({key:null});assert.equal(run('save()'),false);assert.equal(values.size,0);
 console.log('EVENTS OK · cross-group navigation, result rename, stale checks, short revision provenance, new work, reset/erase, storage event');
})().catch(e=>{console.error(e);process.exitCode=1});
