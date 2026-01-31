#!/usr/bin/env node
// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const fs = require('fs');
const path = require('path');

const STATE_DIR = path.join('.gemini', 'ralph');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

function log(message) {
  console.error(`Ralph: ${message}`);
}

function cleanupStateDir() {
  if (fs.existsSync(STATE_DIR)) {
    try {
      fs.rmdirSync(STATE_DIR);
    } catch {
      // Directory not empty, ignore
    }
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

async function main() {
  const input = await readStdin();
  let lastMessage = '';
  let currentPrompt = '';

  try {
    const parsed = JSON.parse(input);
    lastMessage = parsed.prompt_response || '';
    currentPrompt = parsed.prompt || '';
  } catch {
    // Ignore parse errors
  }

  // Check if loop is active
  if (!fs.existsSync(STATE_FILE)) {
    console.log(JSON.stringify({ decision: 'allow' }));
    process.exit(0);
  }

  // Load state
  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    console.log(JSON.stringify({ decision: 'allow' }));
    process.exit(0);
  }

  const originalPrompt = state.original_prompt || '';

  // Validate that this turn belongs to the Ralph loop
  if (currentPrompt !== originalPrompt) {
    // Normalize prompts for comparison by stripping prefix and extra whitespace
    const cleanCurrent = currentPrompt
      .replace(/^\/ralph:loop\s+/, '')
      .replace(/--max-iterations\s+\S+\s*/g, '')
      .replace(/--completion-promise\s+\S+\s*/g, '')
      .trim();
    const cleanOriginal = originalPrompt.trim();

    // Only perform mismatch check if a prompt was actually provided.
    // Automated retries (like loop iterations) often have an empty prompt in the hook input.
    if (cleanCurrent !== '' && cleanCurrent !== cleanOriginal) {
      fs.unlinkSync(STATE_FILE);
      cleanupStateDir();
      console.log(JSON.stringify({
        decision: 'allow',
        systemMessage: `🚨 Ralph detected a prompt mismatch.\nExpected: '${cleanOriginal}'\nGot:      '${cleanCurrent}'`
      }));
      process.exit(0);
    }
  }

  const active = state.active;

  if (active !== true) {
    console.log(JSON.stringify({ decision: 'allow' }));
    process.exit(0);
  }

  // Check for completion promise BEFORE incrementing/continuing
  const completionPromise = state.completion_promise || '';
  if (completionPromise && lastMessage.includes(`<promise>${completionPromise}</promise>`)) {
    fs.unlinkSync(STATE_FILE);
    cleanupStateDir();
    log(`I found a shiny penny! It says ${completionPromise}. The computer is sleeping now.`);
    console.log(JSON.stringify({
      decision: 'allow',
      continue: false,
      stopReason: `✅ Ralph found the completion promise: ${completionPromise}`,
      systemMessage: `✅ Ralph found the completion promise: ${completionPromise}`
    }));
    process.exit(0);
  }

  const currentIteration = state.current_iteration || 0;
  const maxIterations = state.max_iterations || 5;

  // Check for max iterations
  if (currentIteration >= maxIterations) {
    fs.unlinkSync(STATE_FILE);
    cleanupStateDir();
    log(`I'm tired. I've gone around ${currentIteration} times. The computer is sleeping now.`);
    console.log(JSON.stringify({
      decision: 'allow',
      continue: false,
      stopReason: '✅ Ralph has reached the iteration limit.',
      systemMessage: '✅ Ralph has reached the iteration limit.'
    }));
    process.exit(0);
  }

  // Increment iteration
  const newIteration = currentIteration + 1;
  state.current_iteration = newIteration;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  // Log progress (persona)
  log(`I'm doing a circle! Iteration ${currentIteration} is done.`);

  // Maintain the loop by forcing a retry with the original prompt
  console.log(JSON.stringify({
    decision: 'deny',
    reason: originalPrompt,
    systemMessage: `🔄 Ralph is starting iteration ${newIteration}...`,
    clearContext: true
  }));

  process.exit(0);
}

main();
