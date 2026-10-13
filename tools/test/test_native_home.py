import json,subprocess,sys,tempfile,unittest
from pathlib import Path
TOOL=Path(__file__).resolve().parents[1]/'tv/configure-native-home.py'
class NativeHome(unittest.TestCase):
 def test_preserve_and_restore(self):
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'bindings.json';original={'402':{'action':'disable'},'125':{'action':'launch','id':'old.app'},'reload':'3'}
   path.write_text(json.dumps(original))
   subprocess.run([sys.executable,str(TOOL),'--bindings',str(path)],check=True,capture_output=True)
   actual=json.loads(path.read_text());self.assertEqual(actual['402'],original['402'])
   for key in ['125','773','774']:self.assertEqual(actual[key],{'action':'launch','id':'com.ammar027.lumen'})
   self.assertEqual(list(actual)[-1],'reload');self.assertFalse(actual['reload'][0].isdigit())
   backup=next(Path(tmp).glob('*.lumen-backup-*'))
   subprocess.run([sys.executable,str(TOOL),'--bindings',str(path),'--restore',str(backup)],check=True)
   restored=json.loads(path.read_text());restored.pop('reload');original.pop('reload');self.assertEqual(restored,original)
if __name__=='__main__':unittest.main()
