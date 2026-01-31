#!/usr/bin/env node
// Copyright 2026 Google LLC
// Licensed under the Apache License, Version 2.0

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_DIR = path.join('.gemini', 'ralph');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const HOOK = 'node hooks/stop-hook.js';

function setup() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const state = {
    active: true,
    current_iteration: 1,
    max_iterations: 5,
    completion_promise: '',
    original_prompt: 'Task',
    started_at: '2026-01-27T12:00:00Z'
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function cleanup() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
  if (fs.existsSync(STATE_DIR)) {
    try {
      fs.rmdirSync(STATE_DIR);
    } catch {
      // Directory not empty, ignore
    }
  }
}

function assertJsonValue(key, expected) {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const keys = key.replace(/^\./, '').split('.');
  let actual = state;
  for (const k of keys) {
    actual = actual[k];
  }
  if (String(actual) !== String(expected)) {
    console.log(`FAIL: Expected ${key} to be ${expected}, but got ${actual}`);
    process.exit(1);
  }
}

function assertExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`FAIL: ${filePath} does not exist`);
    process.exit(1);
  }
}

function assertNotExists(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`FAIL: ${filePath} still exists`);
    process.exit(1);
  }
}

function runHook(input) {
  const result = execSync(HOOK, {
    input: JSON.stringify(input),
    encoding: 'utf8'
  });
  return JSON.parse(result.trim());
}

function updateState(updates) {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  Object.assign(state, updates);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Ensure cleanup on exit
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

try {
  console.log('Running Test 1: Iteration increment...');
  setup();
  // Simulate initial command invocation with flags (Iteration 1)
  let response = runHook({ prompt_response: 'Some response', prompt: '/ralph:loop --max-iterations 5 Task' });
  assertExists(STATE_FILE);
  assertJsonValue('.current_iteration', 2);
  if (response.systemMessage !== '🔄 Ralph is starting iteration 2...') {
    console.log(`FAIL: Expected systemMessage to be '🔄 Ralph is starting iteration 2...', but got '${response.systemMessage}'`);
    process.exit(1);
  }

  console.log('Running Test 2: Termination (Max Iterations)...');
  setup();
  // Set current_iteration to 5, max_iterations is 5
  updateState({ current_iteration: 5 });
  // Subsequent iterations use the exact ORIGINAL_PROMPT
  response = runHook({ prompt_response: 'Last response', prompt: 'Task' });
  assertNotExists(STATE_FILE);
  if (response.decision !== 'allow') {
    console.log("FAIL: Expected decision to be 'allow' upon termination");
    process.exit(1);
  }

  console.log('Running Test 3: Termination (Completion Promise)...');
  setup();
  // Set completion_promise
  updateState({ completion_promise: 'DONE' });
  // Agent provides the promise
  response = runHook({ prompt_response: 'I am finished. <promise>DONE</promise>', prompt: 'Task' });
  assertNotExists(STATE_FILE);
  if (response.decision !== 'allow') {
    console.log("FAIL: Expected decision to be 'allow' upon promise fulfillment");
    process.exit(1);
  }

  console.log('Running Test 4: Ghost Loop Cleanup (Unrelated Prompt)...');
  setup();
  // User asks something else while a loop is technically "active" on disk
  response = runHook({ prompt_response: 'Paris', prompt: 'What is the capital of France?' });
  assertNotExists(STATE_FILE);
  if (response.decision !== 'allow') {
    console.log("FAIL: Expected decision to be 'allow' for unrelated prompt");
    process.exit(1);
  }
  const expectedMsg = "🚨 Ralph detected a prompt mismatch.\nExpected: 'Task'\nGot:      'What is the capital of France?'";
  if (response.systemMessage !== expectedMsg) {
    console.log('FAIL: Ghost loop cleanup should show mismatch message');
    process.exit(1);
  }

  console.log('Running Test 5: Hijack Prevention (Different Loop Command)...');
  setup();
  // state.json contains "Task" (from an orphaned loop A)
  // User now runs a NEW loop B with a different prompt
  response = runHook({ prompt_response: 'New Task response', prompt: '/ralph:loop Different Task' });
  assertNotExists(STATE_FILE);
  if (response.decision !== 'allow') {
    console.log("FAIL: Expected decision to be 'allow' when a different loop command is detected");
    process.exit(1);
  }

  console.log('Running Test 6: Automated Retry (Empty Prompt)...');
  setup();
  // Iteration 2+ often has an empty prompt in the hook input
  response = runHook({ prompt_response: 'Iteration 2 response', prompt: '' });
  assertExists(STATE_FILE);
  assertJsonValue('.current_iteration', 2);
  if (response.decision !== 'deny') {
    console.log("FAIL: Expected decision to be 'deny' to continue the loop");
    process.exit(1);
  }

  console.log('PASS: All tests passed!');
} catch (err) {
  console.error('Test failed with error:', err.message);
  process.exit(1);
}
