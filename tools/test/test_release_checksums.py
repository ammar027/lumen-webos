"""Test release checksums with local files and a simulated package build."""
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock


TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
import release_checksums


class ReleaseChecksumTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)

    def test_sorted_manifest_uses_final_bytes_and_relative_names(self):
        packages = {'z_all.ipk': b'final z', 'a_all.ipk': b'final a'}
        for name, content in packages.items():
            (self.directory / name).write_bytes(content)
        (self.directory / 'notes.txt').write_text('not a package')
        manifest = release_checksums.write_checksums(self.directory)
        expected = ''.join(
            hashlib.sha256(packages[name]).hexdigest() + '  ' + name + '\n'
            for name in sorted(packages)
        )
        self.assertEqual(manifest, self.directory / 'SHA256SUMS.txt')
        self.assertEqual(manifest.read_text(), expected)
        release_checksums.verify_checksums(self.directory)
        self.assertEqual(list(self.directory.glob('.SHA256SUMS-*')), [])

    def test_generation_replaces_a_stale_manifest(self):
        (self.directory / 'SHA256SUMS.txt').write_text('old hash  old.ipk\n')
        (self.directory / 'new.ipk').write_bytes(b'new release')
        release_checksums.write_checksums(self.directory)
        self.assertNotIn('old.ipk', (self.directory / 'SHA256SUMS.txt').read_text())
        release_checksums.verify_checksums(self.directory)

    def test_empty_release_fails_without_a_manifest(self):
        with self.assertRaisesRegex(ValueError, 'No IPK'):
            release_checksums.write_checksums(self.directory)
        self.assertFalse((self.directory / 'SHA256SUMS.txt').exists())

    def test_changed_package_fails_verification(self):
        package = self.directory / 'app.ipk'
        package.write_bytes(b'before')
        release_checksums.write_checksums(self.directory)
        package.write_bytes(b'after')
        with self.assertRaises(ValueError):
            release_checksums.verify_checksums(self.directory)

    def test_added_or_removed_package_fails_verification(self):
        package = self.directory / 'app.ipk'
        package.write_bytes(b'app')
        release_checksums.write_checksums(self.directory)
        extra = self.directory / 'extra.ipk'
        extra.write_bytes(b'extra')
        with self.assertRaises(ValueError):
            release_checksums.verify_checksums(self.directory)
        release_checksums.write_checksums(self.directory)
        extra.unlink()
        with self.assertRaises(ValueError):
            release_checksums.verify_checksums(self.directory)

    def test_wrong_filename_or_digest_fails_verification(self):
        (self.directory / 'app.ipk').write_bytes(b'app')
        manifest = release_checksums.write_checksums(self.directory)
        correct = manifest.read_text()
        for text in (correct.replace('app.ipk', 'old.ipk'), '0' * 64 + correct[64:]):
            with self.subTest(text=text):
                manifest.write_text(text)
                with self.assertRaises(ValueError):
                    release_checksums.verify_checksums(self.directory)

    def test_ambiguous_filenames_are_rejected(self):
        for name in ('line\nbreak.ipk', 'line\rbreak.ipk', 'back\\slash.ipk'):
            with self.subTest(name=name):
                package = self.directory / name
                package.write_bytes(b'app')
                try:
                    with self.assertRaises(ValueError):
                        release_checksums.write_checksums(self.directory)
                finally:
                    package.unlink()

    def test_check_command_returns_failure_for_a_stale_manifest(self):
        (self.directory / 'app.ipk').write_bytes(b'app')
        script = TOOLS / 'release_checksums.py'
        generated = subprocess.run(
            [sys.executable, str(script), str(self.directory)], capture_output=True)
        self.assertEqual(generated.returncode, 0, generated.stderr)
        command = [sys.executable, str(script), str(self.directory), '--check']
        self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)
        (self.directory / 'app.ipk').write_bytes(b'changed')
        self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)

    def test_build_release_checksums_the_copied_packages(self):
        root = self.directory / 'project'
        staging = self.directory / 'staging'
        app = root / 'app'
        for directory in ('public/wallpapers', 'src/config', 'node_modules'):
            (app / directory).mkdir(parents=True)
        (app / 'src/config/wallpapers.ts').write_text(
            'export const LOCAL_WALLPAPERS: LocalWallpaper[] = [\n];\n')
        output = root / 'release'
        output.mkdir()
        (output / 'old.ipk').write_bytes(b'old')
        (output / 'SHA256SUMS.txt').write_text('old hash  old.ipk\n')
        commands = []

        def run(args, **kwargs):
            commands.append(args)
            if args[0] == 'rsync':
                shutil.copytree(app, staging / 'app', ignore=shutil.ignore_patterns('node_modules'))
            elif args[:3] == ['npm', 'run', 'package']:
                build = staging / 'app/build'
                build.mkdir()
                (build / 'com.ammar027.lumen_1.0.9_all.ipk').write_bytes(b'final package bytes')
            return subprocess.CompletedProcess(args, 0, stdout='', stderr='')

        # Keep the existing script's fixed paths and all external commands in this sandbox.
        source = (TOOLS / 'build_release.py').read_text()
        replacements = {
            "ROOT = os.path.expanduser('~/Developer/webos-launcher-tvos')": f'ROOT = {str(root)!r}',
            "REL = '/tmp/lumen-release'": f'REL = {str(staging)!r}',
        }
        for original, replacement in replacements.items():
            self.assertEqual(source.count(original), 1, 'Build paths changed: update the sandbox first')
            source = source.replace(original, replacement)
        with mock.patch('subprocess.run', side_effect=run):
            exec(compile(source, str(TOOLS / 'build_release.py'), 'exec'), {'__name__': '__main__'})
        self.assertFalse((output / 'old.ipk').exists())
        expected = hashlib.sha256(b'final package bytes').hexdigest()
        self.assertEqual((output / 'SHA256SUMS.txt').read_text(),
                         expected + '  com.ammar027.lumen_1.0.9_all.ipk\n')
        self.assertIn(['npm', 'run', 'package'], commands)
        release_checksums.verify_checksums(output)


if __name__ == '__main__':
    unittest.main()
