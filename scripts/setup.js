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

function die(message) {
  console.error(`❌ Error: ${message}`);
  process.exit(1);
}

// Ensure directory exists
try {
  fs.mkdirSync(STATE_DIR, { recursive: true });
} catch (err) {
  die(`Could not create state directory: ${STATE_DIR}`);
}

// Defaults
let maxIterations = 5;
let completionPromise = '';
const promptArgs = [];

// Parse arguments
// Workaround for LLM tool invocation passing all args as a single string
let args = process.argv.slice(2);
if (args.length === 1 && (args[0].startsWith('-') || args[0].includes(' --'))) {
  // Split the single string into arguments, respecting quotes
  args = args[0].match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  args = args.map(arg => arg.replace(/^"|"$/g, ''));
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--max-iterations') {
    const value = args[++i];
    if (!/^\d+$/.test(value)) {
      die(`Invalid iteration limit: '${value || ''}'`);
    }
    maxIterations = parseInt(value, 10);
  } else if (arg === '--completion-promise') {
    const value = args[++i];
    if (!value) {
      die('Missing promise text.');
    }
    completionPromise = value;
  } else {
    promptArgs.push(arg);
  }
}

const prompt = promptArgs.join(' ');

// Ensure a prompt was provided
if (!prompt) {
  die('No task specified. Run /ralph:help for usage.');
}

// Initialize state.json
const state = {
  active: true,
  current_iteration: 1,
  max_iterations: maxIterations,
  completion_promise: completionPromise,
  original_prompt: prompt,
  started_at: new Date().toISOString()
};

try {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
} catch (err) {
  die(`Failed to initialize state file: ${STATE_FILE}`);
}

// Ralph-style summary for the user and agent
console.log('');
console.log(`Ralph is helping! I'm going in a circle!

>> Config:
   - Max Iterations: ${maxIterations}
   - Completion Promise: ${completionPromise}
   - Original Prompt: ${prompt}

I'm starting now! I hope I don't run out of paste!

⚠️  WARNING: This loop will continue until the task is complete,
    the iteration limit (${maxIterations}) is reached, or a promise is fulfilled.`);

if (completionPromise) {
  console.log('');
  console.log('⚠️  RALPH IS LISTENING FOR A PROMISE TO EXIT');
  console.log(`   You must OUTPUT: <promise>${completionPromise}</promise>`);
}

// Output for persona (stderr)
console.log('');
console.error("Ralph is helping! I'm setting up my toys.");
