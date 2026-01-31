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

if (fs.existsSync(STATE_FILE)) {
  fs.unlinkSync(STATE_FILE);
  console.error("Ralph: I've stopped my loop and cleaned up my toys.");
} else {
  console.error("Ralph: I wasn't doing anything anyway!");
}

// Only remove directory if it is empty
if (fs.existsSync(STATE_DIR)) {
  try {
    fs.rmdirSync(STATE_DIR);
  } catch {
    // Directory not empty, ignore
  }
}
