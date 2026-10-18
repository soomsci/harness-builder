const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../index.html','utf8').split('<script>')[1].split('</script>')[0];
const values=new Map(),status={textContent:'',classList:{toggle(){}}};let allow=true;
const env={console,confirm:()=>allow,toast(){},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},document:{querySelector:()=>status}};
vm.createContext(env);vm.runInContext(source.split('/* ---------- 화면 ---------- */')[0],env);const run=s=>vm.runInContext(s,env);
const rows=JSON.parse(run('JSON.stringify(CURRICULUM_DATA)'));
assert.equal(rows.length,1040);assert.equal(new Set(rows.map(r=>r[0]+':'+r[1]+':'+r[2])).size,rows.length);
for(const year of ['2015','2022'])for(const subject of run('SCHOOL_SUBJECTS'))assert.ok(rows.some(r=>r[0]===year&&r[1]===subject));
for(const r of rows){assert.match(r[2],/^9[^\s]+\d{2}-\d{2}$/);assert.ok(r[3].endsWith('다.'));assert.ok(run(`CURRICULUM_SOURCES[${JSON.stringify(r[4])}].url.startsWith('https://')`));assert.ok(!/[\u0000-\u001f]/.test(r[3]));}
run("openMaterial('ppt');setCurriculumContext('subject','과학');setCurriculumContext('curriculumVersion','2022');state.ctx.goal='교사 목표';addStandard('9과02-01');save()");
assert.ok(run('composition().text').includes('[9과02-01]'));assert.ok(run('composition().text').includes('출처: 교육부 고시 제2022-33호'));
assert.equal(run("addStandard('9수01-01')"),false);assert.equal(run("addStandard('9과02-01');curriculumCodes().length"),1);
run("state.resultName='PPT1';state.check.fact='o';ensureCheckRecord();save();openMaterial('sheet')");assert.equal(run('state.ctx.standardCodes'),'9과02-01');assert.ok(run('composition().text').includes('교사 목표'));
run("addStandard('9과02-02');save();openMaterial('ppt')");assert.equal(run('staleCheck()'),true);
const saved=values.get('harness-builder-v2');run("workspace=bootWorkspace()");assert.equal(run('selectedStandards().length'),2);
assert.ok(!run('outputs()[1]').includes('[9과02-01]'));assert.ok(!run('outputs()[4]').includes('[9과02-01]'));assert.ok(run('outputs()[2]').includes('교육과정·성취기준'));
allow=false;assert.equal(run("setCurriculumContext('curriculumVersion','2015')"),false);assert.equal(run('selectedStandards().length'),2);
allow=true;run("setCurriculumContext('curriculumVersion','2015')");assert.equal(run('selectedStandards().length'),0);assert.equal(run('state.ctx.goal'),'교사 목표');
run("addStandard('9과01-01')");assert.ok(run('curriculumText()').includes('지구계'));assert.ok(!run('curriculumText()').includes('과학적 탐구 방법'));
run("startLesson()");assert.equal(run('state.ctx.standardCodes'),undefined);assert.equal(run('state.ctx.curriculumVersion'),undefined);
run("openMaterial('notice')");assert.equal(run('curriculumText()'),'');assert.ok(!run('composition().text').includes('성취기준'));
run("openMaterial('sheet');state.ctx.subject='과학';state.ctx.curriculumVersion='2022';state.ctx.standardCodes='9과99-99'");assert.ok(run('curriculumIssue()'));
console.log('CURRICULUM OK · 1,040 rows, 24 subject/version pairs, provenance, duplicate prevention, shared context, stale checks, migration, cancellation, new lesson isolation');
const provenance=JSON.parse(fs.readFileSync(__dirname+'/curriculum/sources.json','utf8'));
for(const [id,s] of Object.entries(provenance)){
 assert.equal(rows.filter(r=>r[4]===id).length,s.count,id+' source count');
 assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(!s.url.includes('result_more.do'));
 assert.equal(run(`CURRICULUM_SOURCES[${JSON.stringify(id)}].url`),s.url);
}
const domains=new Map();for(const r of rows){const key=r[0]+':'+r[1]+':'+r[2].split('-')[0];if(!domains.has(key))domains.set(key,[]);domains.get(key).push(+r[2].split('-')[1]);assert.ok(r[3].length>=8&&r[3].length<=350);assert.ok(!/\[9|성취기준 해설|과 교육과정|\n|^-|^[은는] /.test(r[3]));}
for(const [key,nums] of domains){nums.sort((a,b)=>a-b);assert.deepEqual(nums,Array.from({length:nums.length},(_,i)=>i+1),key+' missing standard');}
assert.ok(run('curriculumGuidance(new Date(2026,1,28))').includes('2025학년도'));
assert.ok(run('curriculumGuidance(new Date(2026,2,1))').includes('중1·2는 2022'));
assert.ok(run('curriculumGuidance(new Date(2027,2,1))').includes('중1~3 모두 2022'));
console.log('CATALOGUE INTEGRITY OK · source counts/hashes, stable notice links, code continuity, merged-text detection, school-year boundaries');
