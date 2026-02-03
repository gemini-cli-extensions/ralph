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

STATE_FILE=".gemini/ralph/state.json"

if [[ ! -f "$STATE_FILE" ]]; then
    echo "Ralph: I'm not doing anything right now!" >&2
    exit 0
fi

echo "🔄 Ralph Loop Status" >&2
echo "===================" >&2
echo "" >&2

ACTIVE=$(jq -r '.active' "$STATE_FILE")
CURRENT=$(jq -r '.current_iteration' "$STATE_FILE")
MAX=$(jq -r '.max_iterations' "$STATE_FILE")
PROMISE=$(jq -r '.completion_promise' "$STATE_FILE")
PROMPT=$(jq -r '.original_prompt' "$STATE_FILE")
STARTED=$(jq -r '.started_at' "$STATE_FILE")

echo "Status: $([ "$ACTIVE" = "true" ] && echo "🟢 Active" || echo "🔴 Inactive")" >&2
echo "Iteration: $CURRENT / $MAX" >&2
echo "Started: $STARTED" >&2
echo "Task: $PROMPT" >&2

if [[ -n "$PROMISE" ]]; then
    echo "Completion Promise: $PROMISE" >&2
fi

echo "" >&2
