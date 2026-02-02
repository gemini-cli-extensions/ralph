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

# Functions
die() {
  echo "❌ Error: $1" >&2
  exit 1
}

# Setup paths
STATE_DIR=".gemini/ralph"
STATE_FILE="$STATE_DIR/state.json"

# Ensure directory exists
mkdir -p "$STATE_DIR" || die "Could not create state directory: $STATE_DIR"

# Defaults
MAX_ITERATIONS=5
COMPLETION_PROMISE=""
PROMPT=""

# Workaround for LLM tool invocation passing all args as a single string
if [[ $# -eq 1 ]]; then
  if [[ "$1" =~ ^- ]] || [[ "$1" =~ " --" ]]; then
     eval set -- "$1"
  fi
fi

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-iterations)
      [[ "${2:-}" =~ ^[0-9]+$ ]] || die "Invalid iteration limit: '${2:-}'"
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --completion-promise)
      [[ -n "${2:-}" ]] || die "Missing promise text."
      COMPLETION_PROMISE="$2"
      shift 2
      ;;
    *)
      PROMPT_ARGS+=("$1")
      shift
      ;;
  esac
done
PROMPT="${PROMPT_ARGS[*]:-}"

# Ensure a prompt was provided
[[ -n "$PROMPT" ]] || die "No task specified. Run /ralph:help for usage."

# Initialize state.json
jq -n \
    --arg max "$MAX_ITERATIONS" \
    --arg promise "$COMPLETION_PROMISE" \
    --arg prompt "$PROMPT" \
    --arg started_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{
        active: true,
        current_iteration: 1,
        max_iterations: ($max | tonumber),
        completion_promise: $promise,
        original_prompt: $prompt,
        started_at: $started_at
    }' > "$STATE_FILE" || die "Failed to initialize state file: $STATE_FILE"

# Ralph-style summary for the user and agent
echo ""
cat <<EOF
Ralph is helping! I'm going in a circle!

>> Config:
   - Max Iterations: $MAX_ITERATIONS
   - Completion Promise: $COMPLETION_PROMISE
   - Original Prompt: $PROMPT

I'm starting now! I hope I don't run out of paste!

⚠️  WARNING: This loop will continue until the task is complete,
    the iteration limit ($MAX_ITERATIONS) is reached, or a promise is fulfilled.
EOF

if [[ -n "$COMPLETION_PROMISE" ]]; then
  echo ""
  echo "⚠️  RALPH IS LISTENING FOR A PROMISE TO EXIT"
  echo "   You must OUTPUT: <promise>$COMPLETION_PROMISE</promise>"
fi

# Output for persona (stderr)
echo ""
echo "Ralph is helping! I'm setting up my toys." >&2
