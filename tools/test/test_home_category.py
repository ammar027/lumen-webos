"""Test the branding script without a TV or the upstream app checkout."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / 'apply_branding.py'


class HomeCategoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        # The existing patch script resolves its app directory through HOME.
        self.app = self.home / 'Developer/webos-launcher-tvos/app'
        for directory in ('public', 'src/config', 'src/theme'):
            (self.app / directory).mkdir(parents=True)
        (self.app / 'src/config/constants.ts').write_text(
            "export const APP_ID = 'works.partridge.webos-launcher';\n")
        (self.app / 'src/theme/global.css').write_text('/* fixture */\n')
        self.manifest = self.app / 'public/appinfo.json'
        self.original = {
            'id': 'works.partridge.webos-launcher',
            'title': 'Launcher',
            'vendor': 'works.partridge.webos-launcher',
            'version': '1.0.0',
            'largeIcon': 'largeIcon.png',
            'main': 'index.html',
            'type': 'web',
        }

    def apply(self):
        subprocess.run(
            [sys.executable, str(SCRIPT)],
            env={**os.environ, 'HOME': str(self.home), 'APP_NAME': 'Lumen'},
            check=True, capture_output=True, text=True,
        )
        return json.loads(self.manifest.read_text())

    def test_generated_manifest_is_eligible_for_native_home(self):
        self.manifest.write_text(json.dumps(self.original, indent=2))
        result = self.apply()
        self.assertEqual(result.get('appCategory'), ['home'])
        self.assertEqual(result['id'], 'com.ammar027.lumen')
        self.assertEqual(result['title'], 'Lumen')
        self.assertEqual(result['main'], 'index.html')
        self.assertEqual(result['type'], 'web')

    def test_existing_categories_and_permissions_are_preserved(self):
        self.original['appCategory'] = ['other']
        self.original['requiredPermissions'] = ['time.query']
        self.original['customField'] = {'keep': True}
        self.manifest.write_text(json.dumps(self.original, indent=2))
        result = self.apply()
        self.assertEqual(result['appCategory'], ['other', 'home'])
        self.assertEqual(result['requiredPermissions'], ['time.query'])
        self.assertEqual(result['customField'], {'keep': True})

    def test_repeated_patch_does_not_duplicate_home(self):
        self.original['appCategory'] = ['home', 'other']
        self.manifest.write_text(json.dumps(self.original, indent=2))
        first = self.apply()
        second = self.apply()
        self.assertEqual(first, second)
        self.assertEqual(second['appCategory'], ['home', 'other'])

    def test_patch_does_not_add_permissions(self):
        self.manifest.write_text(json.dumps(self.original, indent=2))
        self.assertNotIn('requiredPermissions', self.apply())


if __name__ == '__main__':
    unittest.main()
