"""Build the reviewed inline catalogue from official sources kept outside Hosting.
Usage: python3 tests/curriculum/extract.py
Requires downloaded MOE/NCIC files under /private/tmp; provenance recorded in sources.json.
PDF: pdftotext -layout; HWP paragraph extraction is performed before this script.
Never synthesize missing standards or substitute explanatory paragraphs.
"""
import pathlib,re,json,subprocess,hashlib,collections
root=pathlib.Path('/private/tmp'); rows=[]
sources=json.loads(pathlib.Path('tests/curriculum/sources.json').read_text())
inputs=[]
for sid,meta in sources.items():
 year,annex=sid.split('-');p=root/f'curriculum-{year}'/meta['file']
 if not p.exists():p=root/'ncic-source'/meta['file']
 assert hashlib.sha256(p.read_bytes()).hexdigest()==meta['sha256'],sid+' source changed; review provenance first'
 inputs.append((year,annex,p,meta['url'],meta['notice']))
for year,annex,p,url,notice in inputs:
 sid=year+'-'+annex; actual=p
 if p.suffix=='.pdf':text=subprocess.check_output(['pdftotext','-layout',str(p),'-']).decode()
 else:text=p.with_suffix('.txt').read_text()
 text=text.replace('\x01',' ')
 # Page furniture can split a standard across pages; retain only body lines.
 text='\n'.join(line for line in text.splitlines() if not re.fullmatch(r'\s*(?:\d+|(?:국어|도덕|사회|수학|과학|체육|음악|미술|영어)과 교육과정)\s*',line))
 found={}
 for m in re.finditer(r'^[ \t]*\[(9[^\]\n]+)\][ \t]*(.*)',text,re.M):
  code=m[1].replace(' ','')
  if not re.fullmatch(r'9[^\d\s]+\d{2}-\d{2}',code):continue # grouped codes occur in explanations
  if code in found:continue
  if actual.suffix=='.hwp': val=m[2].strip()
  else:
   tail=text[m.start(2):];end=re.search(r'다\.',tail)
   if not end:raise ValueError(code)
   val=re.sub(r'\s+',' ',tail[:end.end()]).strip()
  if len(val)>400 or '[' in val or not val.endswith('다.'):raise ValueError((sid,code,val))
  # Three page-boundary word joins, checked against the following source page.
  if year=='2015':
   for broken,joined in {'맞 게 전략':'맞게 전략','가 꾸기 위한':'가꾸기 위한','병 렬연결':'병렬연결'}.items():val=val.replace(broken,joined)
  found[code]=val
 for code,val in found.items():
  prefix=re.match(r'9([^0-9]+)',code)[1]
  subject={'국':'국어','도':'도덕','사(지리)':'사회','사(일사)':'사회','역':'역사','수':'수학','과':'과학','기가':'기술·가정','정':'정보','체':'체육','음':'음악','미':'미술','영':'영어'}[prefix]
  rows.append([year,subject,code,val,sid])
 assert len(found)==sources[sid]['count'],sid+' unexpected count; review before publishing'
rows.sort(key=lambda r:(r[0],r[1],r[2]))
(root/'curriculum-data.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))

for year in ['2015','2022']:print(year,dict(collections.Counter(r[1] for r in rows if r[0]==year)))
print('Total',len(rows))
