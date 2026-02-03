# Ralph 🔄

Ralph is a self-referential development loop for the Gemini CLI. It allows an agent to iteratively work on a task, self-correcting and refining its output over multiple turns without manual user intervention.

### Core Concept

The loop happens **across agent turns**, explicitly controlled by the extension's hook.

1.  **You run ONCE**: `/ralph:loop "Your task description" --completion-promise "DONE"`
2.  **Gemini CLI works**: The agent performs actions (modifies files, runs tests).
3.  **Hook intercepts**: When the agent finishes its turn, the `AfterAgent` hook intercepts the exit.
4.  **Loop Continuation**: The hook evaluates state (max iterations, promises) and instructs the CLI to start a new turn using the **original prompt** and clears the agent's memory from the previous turn.
5.  **Repeat**: This continues autonomously until completion (max iterations, promises) or user interruption.

The `AfterAgent` hook in `hooks/stop-hook.sh` creates a **self-referential feedback loop** where:
-   **Stable Context & No Compaction**: The prompt never changes between iterations, and the **previous turn's conversational context is cleared**. This forces the agent to rely on the current state of the files rather than potentially stale or "compacted" chat history, ensuring maximum focus and reliability.
-   **Persistent State**: The agent's previous work persists in files and git history.
-   **Autonomous Improvement**: Each iteration allows the agent to see the current state of the codebase and improve upon its past work.
-   **Ghost Protection**: If you interrupt the loop and start a new task, the hook detects the prompt mismatch and silently cleans up so it doesn't hijack your new conversation.

Inspired by Geoffrey Huntley's article *[Ralph](https://ghuntley.com/ralph/)* this extension provides a robust framework for persistent, multi-turn agentic workflows.

## Installation

Install the extension directly from GitHub:

```bash
gemini extensions install https://github.com/gemini-cli-extensions/ralph --auto-update
```

### Verify Installation

After installing, validate your setup:

```bash
bash ~/.gemini/extensions/ralph/scripts/validate.sh
```

## Configuration

To use Ralph, you must enable hooks and preview features in your `~/.gemini/settings.json`:

```json
{
  "hooksConfig": {
    "enabled": true
  },
  "context": {
    "includeDirectories": ["~/.gemini/extensions/ralph"]
  }
}
```

> **Note**: `includeDirectories` is required so that the Gemini CLI can access and execute Ralph's internal scripts (`setup.sh`, `cancel.sh`) and hook logic located in the extension's installation directory.

## Usage

Start a loop by using the `/ralph:loop` command followed by your task.

```bash
/ralph:loop "Build a Python CLI task manager with full test coverage." --max-iterations 10
```

### Options

- `--max-iterations <N>`: Set a hard limit on how many times Ralph will loop (Default: 5).
- `--completion-promise <TEXT>`: Ralph will watch the agent's output. The loop will terminate immediately if the agent outputs `<promise>TEXT</promise>`.

### Manual Controls

- `/ralph:status`: Check the current status of an active loop.
- `/ralph:cancel`: Stops an active loop and cleans up all state files.
- `/ralph:help`: Displays detailed usage information and configuration tips.

## Prompt Writing Best Practices

The success of the Ralph technique depends heavily on well-crafted prompts.

### 1. Clear Completion Criteria

Provide a clear, verifiable definition of "done." The `--completion-promise` is crucial for this.

**Good:**
```bash
/ralph:loop "Build a REST API for todos. When all CRUD endpoints are working and all tests pass with >80% coverage, you're complete." --completion-promise "TASK_COMPLETE"
```

### 2. Use Safety Hatches

Always use `--max-iterations` as a safety net to prevent infinite loops if a task is unclear or impossible.

```bash
# Set a reasonable iteration limit
/ralph:loop "Attempt to refactor the authentication module." --max-iterations 20
```

### 3. Encourage Self-Correction

Structure your prompt to guide the agent through a cycle of work, verification, and debugging.

**Good:**
```text
Implement feature X by following TDD:
1. Write failing tests for the feature.
2. Implement the code to make the tests pass.
3. Run the test suite.
4. If any tests fail, analyze the errors and debug the code.
5. Refactor for clarity and efficiency.
6. Repeat until all tests are green.
7. When complete, output the phrase '<promise>TESTS_PASSED</promise>'.
```

## Launch Safely 🛡️

**Always run in sandbox mode for safety.** Enabling YOLO mode (`-y`) prevents constant prompts for tool execution during the loop:

```bash
gemini -s -y
```

### Recommended Security Settings

To prevent the agent from accidentally pushing code or performing destructive git operations during a loop, we recommend explicitly defining allowed tools in your project's `.gemini/settings.json`:

```json
{
  "tools": {
    "exclude": ["run_shell_command(git push)"],
    "allowed": [
      "run_shell_command(git commit)",
      "run_shell_command(git add)",
      "run_shell_command(git diff)",
      "run_shell_command(git status)"
    ]
  }
}
```

## Uninstallation

To uninstall Ralph, run:

```bash
gemini extensions uninstall ralph
```

### ⚠️ IMPORTANT: Cleanup Required

After uninstalling, you **MUST** manually remove the following entry from your `~/.gemini/settings.json` file:

```json
  "context": {
    "includeDirectories": ["~/.gemini/extensions/ralph"]
  }
```

**If you fail to do this, the Gemini CLI will encounter an error on startup (as it will attempt to read a directory that no longer exists) and may not be able to finish initializing.**

## Future Ideas 🚀

- **Rich Task Lists & Specs**: Support for structured specification files and rich task lists with metadata (priority, dependencies) per task.
- **Iteration Progress Log**: Maintain a single, persistent progress file that is appended to in each iteration to track the agent's reasoning over time.
- **Multi-Agent Orchestration**: Coordinate multiple specialized Ralph loops working on different parts of a larger system.
- **Git-Native Loops**: Require the use of Git for every iteration, ensuring that the agent commits work incrementally and maintains a clean working directory before proceeding.
- **Stricter Iteration Boundaries**: Implement more formal rules for when an iteration is considered "complete" (e.g., must pass a specific linter or test suite before the next turn is allowed).
- **Clean State Enforcement**: Automatically revert or clean up temporary files/artifacts at the end of each iteration to prevent state pollution.

## Special Thanks

- **Geoffrey Huntley**: For the original ["Ralph Wiggum" technique]((https://ghuntley.com/ralph/) and the fundamental insight that "Ralph is a Bash loop."
- **Anthropic Engineering**: For their research on [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), which informs the design of stable agentic loops.
- **Inspiration & Reference Implementations**:
    - [galz10/pickle-rick-extension](https://github.com/galz10/pickle-rick-extension)
    - [AsyncFuncAI/ralph-wiggum-extension](https://github.com/AsyncFuncAI/ralph-wiggum-extension)
    - [jackwotherspoon/gemini-cli-ralph-wiggum](https://github.com/jackwotherspoon/gemini-cli-ralph-wiggum)
    - [evanotero/gemini-cli-ralph-wiggum](https://github.com/evanotero/gemini-cli-ralph-wiggum)
