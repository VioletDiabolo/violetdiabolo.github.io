#!/usr/bin/env sh

# abort on errors
set -e

env PUBLIC_URL=https://violetdiabolo.github.io/ npm run build

cd build

git init
git add -A
git commit -m 'deploy'

# deploying to https://{USERNAME}.github.io (see https://pages.github.com for instructions)
git push -f git@github.com:violetdiabolo/violetdiabolo.github.io.git main:gh-pages

# deploying to https://{USERNAME}.github.io/{REPO}
# git push -f git@github.com:TomHerman11/host-react-app-on-github-pages.git main:gh-pages