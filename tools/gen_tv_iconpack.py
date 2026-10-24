"""Local adaptation of Lumen's generator: TV icons, Pillow renderer, workspace paths."""
import argparse,json,re
from pathlib import Path
from PIL import Image,ImageOps,ImageFilter
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--icons',type=Path,required=True,help='directory exported by tools/tv/export-icons.py')
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'app/public/iconpack')
args=parser.parse_args()
OUT=args.output;OUT.mkdir(parents=True,exist_ok=True)
ICONS=args.icons.resolve()
rows=json.loads((ICONS/'manifest.json').read_text())
for row in rows:
 try:
  path=(ICONS/row['file']).resolve()
  if path.parent != ICONS: raise ValueError('icon path escapes export directory')
  icon=Image.open(path).convert('RGBA')
  samples=[icon.getpixel((min(6,icon.width-1),min(6,icon.height-1))),icon.getpixel((max(0,icon.width-7),min(6,icon.height-1))),icon.getpixel((min(6,icon.width-1),max(0,icon.height-7)))]
  flat=all(p[3]>240 for p in samples) and all(max(abs(p[i]-samples[0][i]) for i in range(3))<18 for p in samples)
  if flat:
   tile=Image.new('RGB',(800,480),samples[0][:3])
  elif icon.getextrema()[3][0]<240:
   color=row.get('color') or '#171b25'
   try:tile=Image.new('RGB',(800,480),color)
   except ValueError:tile=Image.new('RGB',(800,480),'#171b25')
  else:
   tile=ImageOps.fit(icon.convert('RGB'),(800,480)).filter(ImageFilter.GaussianBlur(32))
   tile=Image.blend(tile,Image.new('RGB',(800,480),'#111111'),0.45)
  logo=ImageOps.contain(icon,(640,365),Image.Resampling.LANCZOS)
  tile.paste(logo,((800-logo.width)//2,(480-logo.height)//2),logo)
  filename=re.sub('[^a-z0-9]','',row['id'].lower())+'.png'
  tile.save(OUT/filename,optimize=True)
 except (OSError,ValueError) as e: print('Skipped',row['id'],str(e))
print(len(list(OUT.glob('*.png'))),'tiles generated')
