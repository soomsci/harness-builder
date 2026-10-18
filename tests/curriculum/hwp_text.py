"""Extract HWP paragraph text locally: python3 hwp_text.py DIRECTORY (requires olefile)."""
import sys, pathlib, struct,zlib,re
import olefile
for p in pathlib.Path(sys.argv[1]).glob('*.hwp'):
 o=olefile.OleFileIO(p);flag=struct.unpack_from('<I',o.openstream('FileHeader').read(),36)[0];paras=[]
 for s in sorted(o.listdir()):
  if len(s)!=2 or s[0]!='BodyText':continue
  b=o.openstream(s).read();b=zlib.decompress(b,-15) if flag&1 else b;pos=0
  while pos+4<=len(b):
   h=struct.unpack_from('<I',b,pos)[0];pos+=4;tag=h&1023;n=h>>20
   if n==4095:n=struct.unpack_from('<I',b,pos)[0];pos+=4
   rec=b[pos:pos+n];pos+=n
   if tag!=67:continue
   # HWP inline/extended control characters occupy 8 UTF-16 code units.
   chars=[];i=0
   while i+2<=len(rec):
    c=struct.unpack_from('<H',rec,i)[0]
    if c in [1,2,3,4,5,6,7,8,9,11,12,14,15,16,17,18,19,20,21,22,23]:i+=16;chars.append(' ');continue
    if c>=32:chars.append(chr(c))
    i+=2
   paras.append(''.join(chars).encode('utf-16-le','surrogatepass').decode('utf-16-le','replace'))
 text='\n'.join(paras);p.with_suffix('.txt').write_text(text)
 codes=re.findall(r'\[9[^\]\n]+\]',text)
 print(p.name,len(codes),len(set(codes)))
