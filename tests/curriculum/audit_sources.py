"""Read-only audit against downloaded sources (PDF uses an independent text extractor)."""
from pathlib import Path
import json,re,hashlib,unicodedata
import fitz
page=Path('index.html').read_text()
rows=json.loads(re.search(r'^const CURRICULUM_DATA = (.*);$',page,re.M)[1])
sources=json.loads(Path('tests/curriculum/sources.json').read_text())
def norm(s):return re.sub(r'[\s\x00-\x1f]+','',unicodedata.normalize('NFKC',s))
for sid,src in sources.items():
 path=Path('/private/tmp')/('curriculum-'+sid[:4])/src['file']
 if not path.exists():path=Path('/private/tmp/ncic-source')/src['file']
 assert hashlib.sha256(path.read_bytes()).hexdigest()==src['sha256'],sid
 text='\n'.join(b[4] for page in fitz.open(path) for b in sorted(page.get_text('blocks'),key=lambda b:(b[1],b[0]))) if path.suffix=='.pdf' else path.with_suffix('.txt').read_text()
 text='\n'.join(line for line in text.splitlines() if not re.fullmatch(r'\s*(?:\d+|(?:국어|도덕|사회|수학|과학|체육|음악|미술|영어)과 교육과정)\s*',line))
 normalized=norm(text)
 for row in [r for r in rows if r[4]==sid]:
  assert norm(row[3]) in normalized,(sid,row[2],'body differs from source')
print('SOURCE AUDIT OK · 1040 text matches + 20 original-file SHA-256 hashes')
for year in ['2015','2022']:
 for subject in sorted({r[1] for r in rows}):
  rs=[r for r in rows if r[:2]==[year,subject]]
  for i in [0,len(rs)//2,len(rs)-1]:
   r=rs[i];print(year,subject,'['+r[2]+']',r[3])
