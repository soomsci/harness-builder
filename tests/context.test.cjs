const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0];
new vm.Script(source);
const model=source.split('/* ---------- 화면 ---------- */')[0];
function boot(entries=[]){
 const values=new Map(entries),status={textContent:'',classList:{toggle(){}}};
 const env={console,confirm:()=>true,toast:()=>{},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},document:{querySelector:()=>status}};
 vm.createContext(env);vm.runInContext(model,env);
 return {values,env,run:code=>vm.runInContext(code,env)};
}
let e=boot();e.run('runSelfTests()');
e.run("openMaterial('webapp');state.ctx.grade='중1';state.ctx.goal='해저확장 설명';state.ctx.out='HTML 파일 1개';state.activity='슬라이더 조작';state.reference={source:'교과서 52쪽',text:'해령에서 멀수록 해양지각의 나이가 많다'};save()");
const webId=e.run('state.materialId');
assert.ok(e.run('composition().text').includes('슬라이더 조작'));
assert.ok(e.run('composition().text').includes('교과서 52쪽'));
assert.ok(e.run('composition().text').includes('JSON 문자열'));
e.run("openMaterial('sheet')");
assert.equal(e.run('state.ctx.goal'),'해저확장 설명');
assert.equal(e.run('state.ctx.out'),undefined);
assert.ok(!e.run('composition().text').includes('슬라이더'));
assert.ok(!e.run('composition().text').includes('버튼·입력'));
assert.ok(e.run('composition().text').includes('정답과 해설'));
assert.ok(e.run('transitionNote').includes('정보 유지'));
e.run("state.ctx.out='A4 2쪽';state.resultName='학습지1.pdf';state.check.fact='o';ensureCheckRecord();save();openMaterial('webapp')");
assert.equal(e.run('state.materialId'),webId);
assert.equal(e.run('state.ctx.out'),'HTML 파일 1개');
assert.equal(e.run('state.activity'),'슬라이더 조작');
e.run("state.ctx.goal='새로운 학습목표';save();openMaterial('sheet')");
assert.equal(e.run('state.ctx.out'),'A4 2쪽');
assert.equal(e.run('staleCheck()'),true);
assert.ok(e.run('state.checkRecord.snapshot.blocks[0].text').includes('해저확장 설명'));
e.run("state.intent='revise';state.editProblem='표 너비 수정';state.editKeep='문항 유지'");
assert.ok(!e.run("composition('revise').text").includes('교과서'));
assert.ok(e.run("composition('revise').text").includes('문항 유지'));
assert.ok(e.run("composition('resume').text").includes('학습지1.pdf'));
assert.ok(e.run("composition('resume').text").includes('별도로 첨부'));
e.run("archiveCheck();ensureCheckRecord()");
assert.equal(e.run('state.checkHistory.length'),1);
assert.equal(e.run('Object.keys(state.check).length'),0);
e.run("save()");
let restored=boot([...e.values]);
assert.equal(restored.run('state.ctx.goal'),'새로운 학습목표');
assert.equal(restored.run('state.ctx.out'),'A4 2쪽');
assert.equal(restored.run('workspace.lessons[0].materials.length'),2);
restored.run('startLesson()');
assert.equal(restored.run('state.ctx.grade'),'중1');
assert.equal(restored.run('state.ctx.goal'),undefined);
assert.equal(restored.run('state.reference.text'),'');
assert.equal(restored.run('workspace.lessons.length'),2);
restored.run("openMaterial('ppt')");
assert.ok(!restored.run('composition().text').includes('A4 2쪽'));
// New lessons inherit type rules, but earlier material snapshots stay unchanged.
e.run("addRule('항상 큰 글씨','always');rememberMethods();save();startLesson();openMaterial('sheet')");
assert.ok(e.run('state.skills.includes("항상 큰 글씨")'));
// An old saved task migrates once without changing its selected rules or source.
const legacy=JSON.stringify({schema:3,type:'ppt',ctx:{grade:'중2',goal:'기존 목표',out:'10장'},skills:['직접 고른 방법'],ruleIds:['rlegacy'],ruleScope:{rlegacy:'always'}});
e=boot([['harness-builder-v1',legacy]]);assert.equal(e.run('state.skills.length'),1);
e.run('save()');assert.equal(e.values.get('harness-builder-v1'),legacy);
restored=boot([...e.values]);assert.equal(restored.run('workspace.lessons.length'),1);assert.equal(restored.run('state.ctx.out'),'10장');
restored.run('save()');assert.equal(restored.values.get('harness-builder-v1'),legacy);
// Quota errors keep in-memory input and do not claim a successful save.
restored.env.localStorage.setItem=()=>{throw Error('quota')};restored.run("state.task='저장 실패해도 남는 초안'");assert.equal(restored.run('save()'),false);assert.equal(restored.run('state.task'),'저장 실패해도 남는 초안');
// Broken current workspace must not fall back silently to an older task.
e=boot([['harness-builder-v2','{broken'],['harness-builder-v1',legacy]]);assert.ok(e.run('loadIssue'));assert.equal(e.run('save()'),false);assert.equal(e.values.get('harness-builder-v2'),'{broken');
console.log('CONTEXT OK · material isolation, shared context, stale evidence, references, intent, migration, quota, recovery');
// A delayed clipboard response belongs to the source material and original conditions.
e=boot();e.run("openMaterial('webapp');state.ctx.goal='복사 당시 목표';save();receipt=transferReceipt('create');openMaterial('sheet');recordTransfer('create',receipt)");
assert.equal(e.run('state.lastRequest'),undefined);
assert.ok(e.run("workspace.lessons[0].materials.find(m=>m.type==='webapp').lastRequest.blocks[0].text").includes('복사 당시 목표'));
// Detect concurrent writes even before the browser dispatches its storage event.
e.values.set('harness-builder-v2',JSON.stringify({otherTab:true}));assert.equal(e.run('save()'),false);assert.ok(e.run('externalUpdate'));assert.equal(e.values.get('harness-builder-v2'),'{"otherTab":true}');
// A legacy empty/customized methods selection is not silently replaced by recommendations.
e=boot([['harness-builder-v1',JSON.stringify({schema:3,type:'sheet',skills:[]})]]);e.run("save();startLesson();openMaterial('sheet')");assert.equal(e.run('state.skills.length'),0);
// Malformed nested metadata blocks rather than producing a blank state that overwrites it.
const invalid=JSON.stringify({schema:4,activeLesson:'l',activeMaterial:'m',lessons:[{id:'l',ctx:{},fixed:{},reference:{text:8,source:''},materials:[{materialId:'m'}]}],typeMethods:{}});
e=boot([['harness-builder-v2',invalid]]);assert.ok(e.run('loadIssue'));assert.equal(e.run('save()'),false);assert.equal(e.values.get('harness-builder-v2'),invalid);
// Views use the same composition as output and enforce input size without truncation.
e=boot();e.run(source.slice(source.indexOf('/* ---------- 화면 ---------- */'),source.indexOf('function render(')));
for(const type of ['webapp','ppt','sheet','exam','explain','visual','notice','doc','custom']){
 e.run(`openMaterial('${type}')`);
 for(const step of [0,1,2,3,5,6])assert.ok(!e.run(`state.step=${step};VIEWS[${step}]()`).includes('undefined'));
}
e.run("state.tab=0;state.intent='revise';state.editProblem=''");assert.equal(e.run('transferAllowed()'),false);
e.run("state.editProblem='문항 간격 늘리기';state.editKeep='내용 유지'");assert.equal(e.run('outputSummary()'),'고칠 점 + 유지할 점');assert.equal(e.run('transferAllowed()'),true);
e.run("state.intent='create';state.reference={text:'가'.repeat(6001),source:'교과서'}");assert.equal(e.run('transferAllowed()'),false);assert.equal(e.run('state.reference.text.length'),6001);
e.run("state.reference.text='가';state.resultName='결과.html';state.check.fact='o';ensureCheckRecord();state.activity='활동 변경'");assert.equal(e.run('staleCheck()'),true);
console.log('BOUNDARIES OK · async copy binding, stale tab writes, preserved choices, nested corruption, 54 views, output summary, input limits');
// Temporary result bodies never cross material/lesson boundaries or persist in storage.
e=boot();e.run("openMaterial('webapp');transientResult='비공개 임시 결과';save();openMaterial('sheet')");assert.equal(e.run('transientResult'),'');assert.ok(!e.values.get('harness-builder-v2').includes('비공개 임시 결과'));
e.run(source.slice(source.indexOf('/* ---------- 화면 ---------- */'),source.indexOf('function render(')));
assert.ok(e.run('VIEWS[6]()').includes('data-act="recheck"'));
assert.ok(e.run('VIEWS[6]()').includes('현재 조건으로 다시 점검'));
console.log('REVIEW FOLLOW-UP OK · reachable recheck control, temporary result isolation');
// Textbook handoff is an external attachment, never a claim of an uploaded/read file.
e=boot();e.run("openMaterial('sheet');state.ctx.subject='과학';state.ctx.curriculumVersion='2022';addStandard('9과02-01')");
const pinned=e.run('curriculumText()');e.run("CURRICULUM_DATA.find(r=>r[0]==='2022'&&r[1]==='과학'&&r[2]==='9과02-01')[3]='갱신된 본문'");
assert.equal(e.run('curriculumText()'),pinned);e.run('save()');restored=boot([...e.values]);assert.equal(restored.run('curriculumText()'),pinned);
assert.ok(e.run('composition().text').includes('이 요청문만으로 파일이 전달된 것은 아닙니다'));
assert.ok(e.run('composition().text').includes('문항과 정답을 대조'));
e.run("state.ctx.textbookMode='none';state.reference={text:'',source:''}");assert.equal(e.run('referenceText()'),'');
e.run("state.reference.source='교과서 52~55쪽';state.ctx.textbookMode='attach'");assert.ok(e.run('referenceText()').includes('52~55쪽'));
assert.ok(!e.run('outputs()[4]').includes('52~55쪽'));assert.ok(e.run('outputs()[4]').includes('작업 절차와 확인 한계'));
e.run("state.resultName='학습지.pdf';registerResult();state.check.fact='o';ensureCheckRecord();state.checkRecord.evidence.fact='교과서 53쪽 대조';save()");
restored=boot([...e.values]);assert.equal(restored.run('state.resultRecord.version'),1);assert.equal(restored.run('state.checkRecord.evidence.fact'),'교과서 53쪽 대조');
restored.run('registerResult()');assert.equal(restored.run('state.resultRecord.version'),2);assert.equal(restored.run('state.checkHistory[0].evidence.fact'),'교과서 53쪽 대조');assert.equal(restored.run('Object.keys(state.check).length'),0);
assert.ok(restored.run("composition('resume').text").includes('2차 결과'));assert.ok(!restored.run("composition('resume').text").includes('교과서 53쪽 대조'));
restored.run("state.check.fact='o';ensureCheckRecord()");assert.ok(!restored.run('workflowText()').includes('점검이 끝났어요'));
console.log('TEACHER WORKFLOW OK · frozen curriculum, external textbook handoff, opt-out, reusable scope, result/evidence restore, new revision clears marks, no false completion');
