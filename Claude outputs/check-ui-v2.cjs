const fs=require('fs'),vm=require('vm');let count=0;const assert=new Proxy(require('node:assert/strict'),{get(target,key){const value=target[key];return typeof value==='function'?(...args)=>{count++;return value(...args)}:value;}});
const source=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8').split('<script>')[1].split('</script>')[0];
new vm.Script(source);
const model=source.split('/* ---------- 화면 ---------- */')[0];
function context(saved){
 const values=new Map(saved===undefined?[]:[['harness-builder-v1',saved]]),status={textContent:'',classList:{toggle(){}}};
 const ctx={console,toast:()=>{},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},document:{querySelector:()=>status}};vm.createContext(ctx);vm.runInContext(model,ctx);return {ctx,values,status,run:s=>vm.runInContext(s,ctx)};
}
let env=context();env.run('runSelfTests()');
const legacy={step:4,type:'sheet',ctx:{grade:'중학교 1학년',cur:'해저확장설'},skills:['항상 표로 정리한다'],log:[{ver:2,date:'10/12',items:['고친 방법']}],ver:2,tab:1,fixes:['어려운 낱말 풀이']};
env=context(JSON.stringify(legacy));assert.equal(env.run('state.step'),3);assert.equal(env.run('state.skills[0]'),legacy.skills[0]);assert.equal(env.run('state.fixes[0].scope'),'request');assert.equal(env.run('resultMode'),'reuse');assert.ok(env.run('outputs()[1]').includes(legacy.skills[0]));
env=context('{broken json');assert.ok(env.run('loadIssue'));assert.equal(env.run('save()'),false);assert.equal(env.values.get('harness-builder-v1'),'{broken json');assert.equal(env.run('unreadableSavedData'),'{broken json');assert.equal(env.values.get('harness-builder-v1-recovery'),'{broken json');env.run("loadIssue='';unreadableSavedData='';state=blank();save()");assert.equal(env.values.get('harness-builder-v1-recovery'),'{broken json');
env=context(JSON.stringify({type:'unrecognized',step:99,ctx:null,skills:[null,12,'usable'],drafts:null,qgText:{fact:22},log:[null,{}],fixed:{grade:'false'}}));assert.equal(env.run('state.type'),'');assert.equal(env.run('state.step'),0);assert.equal(env.run('state.skills.join()'),'usable');assert.equal(env.run('state.qgText.fact'),undefined);assert.equal(env.run('state.fixed.grade'),undefined);assert.doesNotThrow(()=>env.run('outputs()'));
env=context();env.ctx.localStorage.setItem=()=>{throw new Error('quota')};assert.equal(env.run('save()'),false);assert.ok(env.status.textContent.includes('저장하지 못했어요'));
env=context(JSON.stringify({drafts:{newSkill:'아직 추가하지 않은 규칙',newFix:'아직 담지 않은 피드백'}}));assert.equal(env.run('state.drafts.newSkill'),'아직 추가하지 않은 규칙');assert.ok(env.run('showResume'));
console.log('STATE OK · '+count+' migration, recovery, persistence assertions');
// Every view must build for both preset examples, for empty state, and after a feedback change.
const views=source.slice(source.indexOf('/* ---------- 화면 ---------- */'),source.indexOf('function render('));
env=context();env.run(views);
for(const key of ['lesson','doc','empty']){
 env.run(key==='empty'?'state=blank()':`state={...blank(),...JSON.parse(JSON.stringify(EXAMPLES.${key}))}`);
 for(const step of [0,1,2,3,5,6]){const html=env.run(`state.step=${step};VIEWS[${step}]()`);assert.ok(html.length>0);assert.ok(!html.includes('undefined'))}
 for(const tab of [0,1,2,3,4]){const html=env.run(`state.step=5;state.tab=${tab};resultMode=[1,2,4].includes(state.tab)?'reuse':'run';VIEWS[5]()`);assert.ok(!html.includes('undefined'))}
}
console.log('VIEWS OK · 33 preset / empty / export view builds');

// Exercise the reported replacement-scope regression through the UI functions with small DOM controls.
env=context();
const controls={
 '#fixReplace':{value:''},'#fixScope':{value:'request',disabled:false},'#newFix':{value:'수정할 방법'},'#replaceHelp':{hidden:true},
 '#saveStatus':{textContent:'',classList:{toggle(){}}}
};
env.ctx.document.querySelector=k=>controls[k]||null;env.ctx.render=()=>{};
env.run(source.slice(source.indexOf('function updateFixScope()'),source.indexOf("const card=$('#card');")));
env.run("addRule('기본 방법');state.drafts.fixScope='request'");
controls['#fixReplace'].value=env.run('state.ruleIds[0]');env.run('updateFixScope()');
assert.equal(controls['#fixScope'].value,'always');assert.equal(controls['#fixScope'].disabled,true);assert.equal(env.run('state.drafts.fixScope'),'request');
controls['#fixReplace'].value='';env.run('updateFixScope()');assert.equal(controls['#fixScope'].value,'request');
controls['#fixReplace'].value=env.run('state.ruleIds[0]');env.run('updateFixScope();addFix()');
assert.equal(env.run('state.fixes[0].scope'),'always');assert.equal(env.run('state.drafts.fixScope'),'request');assert.equal(controls['#fixScope'].value,'request');assert.equal(controls['#fixReplace'].value,'');
env.run('updateFixScope()');assert.equal(controls['#fixScope'].disabled,false);
console.log('REVIEW REGRESSION OK · replacement scope resets after deselect/add; recovery copy survives reset');
// Verify clipboard failure recovery and the exact downloadable/printable content without an OS dialog.
(async()=>{
 env=context();env.run(views);
 const ui={
  '#output-text':{open:false},'#copyHelp':{textContent:''},'#out':{focus(){this.focused=true}},
  '#copy':{focus(){}},'#sheet':{innerHTML:''},'#saveStatus':{textContent:'',classList:{toggle(){}}}
 };
 let copied='',downloaded,clicked=false,printed=0;
 const anchor={click(){clicked=true},remove(){},style:{},select(){}};
 env.ctx.document={querySelector:k=>ui[k]||null,createElement:()=>anchor,body:{append(){}},execCommand:()=>false};
 env.ctx.navigator={clipboard:{writeText:async()=>{throw Error('denied')}}};
 env.ctx.window={print(){printed++}};env.ctx.Blob=Blob;env.ctx.URL={createObjectURL(blob){downloaded=blob;return 'blob:test'},revokeObjectURL(){}};env.ctx.setTimeout=()=>0;
 env.run(source.slice(source.indexOf('async function copy('),source.indexOf('const hasInput=')));
 assert.equal(await env.run('copy("내용")'),false);assert.equal(ui['#output-text'].open,true);assert.ok(ui['#copyHelp'].textContent.includes('직접 선택'));assert.equal(ui['#out'].focused,true);
 env.ctx.navigator.clipboard.writeText=async text=>{copied=text};assert.equal(await env.run('copy("실제 복사할 내용")'),true);assert.equal(copied,'실제 복사할 내용');
 env.run("state={...blank(),...JSON.parse(JSON.stringify(EXAMPLES.lesson)),tab:1};download(outputs()[1],fileName(1))");
 assert.equal(clicked,true);assert.equal(anchor.download,'2_기본설정.md');assert.equal(await downloaded.text(),env.run('outputs()[1]'));
 env.run('printOutput()');assert.equal(printed,1);assert.ok(ui['#sheet'].innerHTML.includes('나의 AI 업무 설정'));assert.ok(!ui['#sheet'].innerHTML.includes('해저확장설'));
 env.run('printOutput(true)');assert.equal(printed,2);assert.ok(ui['#sheet'].innerHTML.includes('결과 점검표'));
 console.log('EXPORT OK · clipboard failure recovery, exact Blob contents, print-only content');
})().catch(error=>{console.error(error);process.exitCode=1});
