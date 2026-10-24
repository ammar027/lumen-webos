#!/bin/bash
# Adds one release's .ipk to the Homebrew Channel repository: the hbc-repo branch, stable/apps.json (see tools/gen_hbc_repo.py).
# Usage: hbc_publish.sh <ipk> <tag>   (run in CI, in a checkout of the repository)
set -e
IPK=$1; TAG=$2
BASE="https://raw.githubusercontent.com/$GITHUB_REPOSITORY/hbc-repo/stable"
URL="https://github.com/$GITHUB_REPOSITORY/releases/download/$TAG/$(basename "$IPK")"
git config user.name github-actions; git config user.email github-actions@users.noreply.github.com
rm -rf hbc
if git fetch origin hbc-repo 2>/dev/null; then git worktree add hbc origin/hbc-repo
else git worktree add --detach hbc; git -C hbc checkout --orphan hbc-repo; git -C hbc rm -rfq . || true; fi
rm -rf hbc/stable
python3 tools/gen_hbc_repo.py "$IPK" "$URL" "$BASE" hbc/stable
cd hbc
git add -A
git commit -qm "stable: $TAG ${GITHUB_SHA:0:7}"
git push origin HEAD:hbc-repo
