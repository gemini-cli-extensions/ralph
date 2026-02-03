#!/bin/bash
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Bump version in gemini-extension.json

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <new_version>"
    echo "Example: $0 1.1.0"
    exit 1
fi

NEW_VERSION="$1"

if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in format X.Y.Z"
    exit 1
fi

jq --arg version "$NEW_VERSION" '.version = $version' gemini-extension.json > gemini-extension.json.tmp || {
    echo "❌ Error: jq command failed" >&2
    rm -f gemini-extension.json.tmp
    exit 1
}
mv gemini-extension.json.tmp gemini-extension.json

echo "✅ Version bumped to $NEW_VERSION"
