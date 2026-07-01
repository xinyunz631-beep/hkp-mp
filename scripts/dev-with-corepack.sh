#!/usr/bin/env zsh
set -e
cd "$(dirname "$0")/.."
corepack yarn --ignore-engines dev:weapp
