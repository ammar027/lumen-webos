#!/usr/bin/env python3
"""Generate or check SHA256SUMS.txt for the final release IPKs."""
import argparse
import hashlib
import os
from pathlib import Path
import tempfile


def manifest_text(directory):
    directory = Path(directory)
    packages = sorted(directory.glob('*.ipk'))
    if not packages:
        raise ValueError('No IPK files in ' + str(directory))
    lines = []
    for package in packages:
        if any(char in package.name for char in ('\n', '\r', '\\')):
            raise ValueError('Unsupported IPK filename: ' + repr(package.name))
        digest = hashlib.sha256()
        with package.open('rb') as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b''):
                digest.update(chunk)
        lines.append(digest.hexdigest() + '  ' + package.name + '\n')
    return ''.join(lines)


def verify_checksums(directory):
    directory = Path(directory)
    expected = manifest_text(directory)
    actual = (directory / 'SHA256SUMS.txt').read_text(encoding='utf-8')
    if actual != expected:
        raise ValueError('SHA256SUMS.txt does not match the release IPKs')


def write_checksums(directory):
    directory = Path(directory)
    content = manifest_text(directory)
    target = directory / 'SHA256SUMS.txt'
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='w', encoding='utf-8', newline='\n', dir=directory,
            prefix='.SHA256SUMS-', delete=False,
        ) as output:
            temporary = Path(output.name)
            output.write(content)
        os.replace(temporary, target)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
    verify_checksums(directory)
    return target


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        'directory', nargs='?', type=Path,
        default=Path(__file__).resolve().parents[1] / 'release',
    )
    parser.add_argument('--check', action='store_true', help='Check without changing files')
    args = parser.parse_args()
    try:
        if args.check:
            verify_checksums(args.directory)
            print('Release checksums match.')
        else:
            print(write_checksums(args.directory))
    except (OSError, ValueError) as error:
        parser.exit(1, str(error) + '\n')


if __name__ == '__main__':
    main()
