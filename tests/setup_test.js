#!/usr/bin/env node
// Copyright 2026 Google LLC
// Licensed under the Apache License, Version 2.0

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_DIR = path.join('.gemini', 'ralph');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

function setup() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
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

function assertExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`FAIL: ${filePath} does not exist`);
    process.exit(1);
  }
}

function assertJsonValue(key, expected) {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  // Navigate to nested key (e.g., ".active" -> state.active)
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

function runSetup(args) {
  execSync(`node scripts/setup.js ${args}`, { stdio: 'inherit' });
}

// Ensure cleanup on exit
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

try {
  console.log('Running Test 1: Basic setup...');
  setup();
  runSetup('"Task"');
  assertExists(STATE_FILE);
  assertJsonValue('.active', true);
  assertJsonValue('.current_iteration', 1);
  // Check if started_at is a valid ISO 8601 timestamp
  const state1 = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}T/.test(state1.started_at)) {
    console.log('FAIL: started_at is missing or not a valid ISO 8601 timestamp');
    process.exit(1);
  }

  console.log('Running Test 2: Argument parsing (individual)...');
  setup();
  runSetup('"Task" --max-iterations 5 --completion-promise "DONE"');
  assertJsonValue('.max_iterations', 5);
  assertJsonValue('.completion_promise', 'DONE');

  console.log('Running Test 3: Argument parsing (combined string workaround)...');
  setup();
  runSetup('"/ralph:loop Task --max-iterations 10 --completion-promise FINISHED"');
  assertJsonValue('.max_iterations', 10);
  assertJsonValue('.completion_promise', 'FINISHED');

  console.log('Running Test 4: Complex prompt with spaces and quotes...');
  setup();
  runSetup(`"\\"Solve 'The Riddle'\\" --max-iterations 3"`);
  assertJsonValue('.original_prompt', "Solve 'The Riddle'");
  assertJsonValue('.max_iterations', 3);

  console.log('PASS: All tests passed!');
} catch (err) {
  console.error('Test failed with error:', err.message);
  process.exit(1);
}
