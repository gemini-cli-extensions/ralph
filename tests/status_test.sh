#!/bin/bash
# Copyright 2026 Google LLC
# Licensed under the Apache License, Version 2.0

STATE_FILE=".gemini/ralph/state.json"
STATE_DIR=".gemini/ralph"
STATUS_SCRIPT="./scripts/status.sh"

setup() {
    mkdir -p "$STATE_DIR"
}

cleanup() {
    rm -f "$STATE_FILE"
    if [[ -d "$STATE_DIR" ]]; then
        rmdir "$STATE_DIR" 2>/dev/null || true
    fi
}

# Cleanup before each test and on exit
trap cleanup EXIT

echo "Running Test 1: No active loop..."
cleanup
setup
OUTPUT=$("$STATUS_SCRIPT" 2>&1)
if [[ "$OUTPUT" != *"not doing anything"* ]]; then
    echo "FAIL: Expected 'not doing anything' message"
    exit 1
fi

echo "Running Test 2: Active loop status..."
cleanup
setup
jq -n '{
    active: true,
    current_iteration: 3,
    max_iterations: 10,
    completion_promise: "DONE",
    original_prompt: "Test task",
    started_at: "2026-01-27T12:00:00Z"
}' > "$STATE_FILE"

OUTPUT=$("$STATUS_SCRIPT" 2>&1)
if [[ "$OUTPUT" != *"Active"* ]] || [[ "$OUTPUT" != *"3 / 10"* ]]; then
    echo "FAIL: Expected active status with iteration count"
    exit 1
fi

echo "PASS: All tests passed!"
