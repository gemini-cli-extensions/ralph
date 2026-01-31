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
log() {
  echo "Ralph: $1" >&2
}

die() {
  echo "❌ Error: $1" >&2
  exit 1
}

# Setup paths
STATE_DIR=".gemini/ralph"
STATE_FILE="$STATE_DIR/state.json"

# Read hook input from stdin
INPUT=$(cat)
LAST_MESSAGE=$(echo "$INPUT" | jq -r '.prompt_response')
CURRENT_PROMPT=$(echo "$INPUT" | jq -r '.prompt')

# Check if loop is active
if [[ ! -f "$STATE_FILE" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# Validate that this turn belongs to the Ralph loop
ORIGINAL_PROMPT=$(jq -r '.original_prompt' "$STATE_FILE")

if [[ "$CURRENT_PROMPT" != "$ORIGINAL_PROMPT" ]]; then
    # Normalize prompts for comparison by stripping prefix and extra whitespace
    # 1. Strip "/ralph:loop" prefix if present
    # 2. Strip common flags like --max-iterations and --completion-promise
    # 3. Trim whitespace
    CLEAN_CURRENT=$(echo "$CURRENT_PROMPT" | sed -E 's/^\/ralph:loop[[:space:]]+//' | sed -E 's/--max-iterations[[:space:]]+[^[:space:]]+[[:space:]]*//' | sed -E 's/--completion-promise[[:space:]]+[^[:space:]]+[[:space:]]*//' | xargs)
    CLEAN_ORIGINAL=$(echo "$ORIGINAL_PROMPT" | xargs)

    # Only perform mismatch check if a prompt was actually provided.
    # Automated retries (like loop iterations) often have an empty prompt in the hook input.
    if [[ -z "$CLEAN_CURRENT" ]]; then
        : # Allow empty prompts (likely a Ralph-triggered iteration)
    elif [[ "$CLEAN_CURRENT" != "$CLEAN_ORIGINAL" ]]; then
        rm -f "$STATE_FILE"
        # Only remove directory if it is empty
        if [[ -d "$STATE_DIR" ]]; then
            rmdir "$STATE_DIR" 2>/dev/null || true
        fi
        echo "{\"decision\": \"allow\", \"systemMessage\": \"🚨 Ralph detected a prompt mismatch.\\nExpected: '$CLEAN_ORIGINAL'\\nGot:      '$CLEAN_CURRENT'\"}"
        exit 0
    fi
fi

ACTIVE=$(jq -r '.active' "$STATE_FILE")

if [[ "$ACTIVE" != "true" ]]; then
    echo '{"decision": "allow"}'
    exit 0
fi

# Check for completion promise BEFORE incrementing/continuing
COMPLETION_PROMISE=$(jq -r '.completion_promise' "$STATE_FILE")
if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$LAST_MESSAGE" == *"<promise>$COMPLETION_PROMISE</promise>"* ]]; then
    rm -f "$STATE_FILE"
    # Only remove directory if it is empty
    if [[ -d "$STATE_DIR" ]]; then
        rmdir "$STATE_DIR" 2>/dev/null || true
    fi
    log "I found a shiny penny! It says $COMPLETION_PROMISE. The computer is sleeping now."
    echo '{"decision": "allow", "continue": false, "stopReason": "✅ Ralph found the completion promise: '"$COMPLETION_PROMISE"'", "systemMessage": "✅ Ralph found the completion promise: '"$COMPLETION_PROMISE"'"}'
    exit 0
fi

# Load state
STATE=$(cat "$STATE_FILE")
CURRENT_ITERATION=$(echo "$STATE" | jq -r '.current_iteration')
MAX_ITERATIONS=$(echo "$STATE" | jq -r '.max_iterations')

# Check for max iterations
if [[ $CURRENT_ITERATION -ge $MAX_ITERATIONS ]]; then
    rm -f "$STATE_FILE"
    # Only remove directory if it is empty
    if [[ -d "$STATE_DIR" ]]; then
        rmdir "$STATE_DIR" 2>/dev/null || true
    fi
    log "I'm tired. I've gone around $CURRENT_ITERATION times. The computer is sleeping now."
    echo '{"decision": "allow", "continue": false, "stopReason": "✅ Ralph has reached the iteration limit.", "systemMessage": "✅ Ralph has reached the iteration limit."}'
    exit 0
fi

# Increment iteration
NEW_ITERATION=$((CURRENT_ITERATION + 1))
TMP_STATE=$(mktemp)
jq ".current_iteration = $NEW_ITERATION" "$STATE_FILE" > "$TMP_STATE" || die "Failed to increment iteration"
mv "$TMP_STATE" "$STATE_FILE"

# Log progress (persona)
log "I'm doing a circle! Iteration $CURRENT_ITERATION is done."

# Maintain the loop by forcing a retry with the original prompt
ORIGINAL_PROMPT=$(jq -r '.original_prompt' "$STATE_FILE")

# Clear conversation history (LLM memory)
cat <<EOF
{
  "decision": "deny",
  "reason": "$ORIGINAL_PROMPT",
  "systemMessage": "🔄 Ralph is starting iteration $NEW_ITERATION...",
  "hookSpecificOutput": {
    "clearContext": true
  }
}
EOF

exit 0
