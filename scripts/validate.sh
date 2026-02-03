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

# Validate Ralph prerequisites

echo "🔍 Validating Ralph prerequisites..."

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed."
    echo "   Install it with:"
    echo "   - macOS: brew install jq"
    echo "   - Debian/Ubuntu: sudo apt-get install jq"
    echo "   - Fedora/RHEL: sudo dnf install jq"
    echo "   - Arch: sudo pacman -S jq"
    exit 1
fi

# Check for bash version (need 4.0+)
if [[ "${BASH_VERSINFO[0]}" -lt 4 ]]; then
    echo "⚠️  Warning: Bash version ${BASH_VERSION} detected. Bash 4.0+ recommended."
fi

# Check hooks configuration
SETTINGS_FILE="$HOME/.gemini/settings.json"
if [[ -f "$SETTINGS_FILE" ]]; then
    HOOKS_ENABLED=$(jq -r '.hooksConfig.enabled // false' "$SETTINGS_FILE")
    if [[ "$HOOKS_ENABLED" != "true" ]]; then
        echo "⚠️  Warning: Hooks are not enabled in ~/.gemini/settings.json"
        echo "   Add: \"hooksConfig\": { \"enabled\": true }"
    fi
else
    echo "⚠️  Warning: ~/.gemini/settings.json not found"
fi

echo "✅ Validation complete!"
