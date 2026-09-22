# Ion

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Browser: Chromium](https://img.shields.io/badge/browser-Chromium%20Required-brightgreen.svg)](#requirements)
[![Architecture: Pure Client--Side](https://img.shields.io/badge/architecture-Client--Side%20Web-orange.svg)](#security-and-isolation)

Ion is a zero-install, browser-native autonomous coding agent. It connects to any OpenAI-compatible LLM endpoint (local or remote) and provides an integrated development environment featuring multi-file edits, integrated Monaco diff inspection, checkpoint versioning, and tool execution directly inside the browser.

# 
<img width="2541" height="1258" alt="image" src="https://github.com/user-attachments/assets/df28914f-dc30-497c-a0c7-4a6395e4dc2a" />

## Security and Isolation

Ion operates entirely within the client-side browser sandbox:

- **Strict Directory Sandboxing:** Ion utilizes the standard Web File System Access API. It can only read, write, or enumerate files within the specific directory explicitly granted by the user via the browser's directory picker. It has no access to the rest of the file system or system binaries.
- **No Background Daemon or Native Binary:** There is no local Node.js server, Python backend, or native daemon executing system commands. All file modifications and workspace state persist locally via browser IndexedDB.
- **Configurable Tool Permissions:** Every tool provides granular permission levels (`always`, `ask`, `never`), plus a per-tool **lock** (prevents the model from modifying that tool's file) and per-tool **settings** declared in `TOOL_META.settings`.
- **Sensitive Shielding:** Private settings and API keys (`.agent/models.json`, `.agent/config.json`) and paths matched by `PROTECTED_PATTERNS` (`.env`, `*.pem`, `.ssh/`, `*.sqlite`, etc.) or by `.gitignore` rules are blocked from model tools, preventing key leakage in prompts.
- **Web Worker Execution:** Custom and built-in tools execute inside isolated Web Workers with a 30-second timeout, preventing execution hangs from blocking the primary UI thread.

---

## Requirements

- **Chromium-based Browser:** Google Chrome, Microsoft Edge, Brave, Opera, Arc, or Chromium (version 86+) is required for File System Access API directory handle support.
- **Model Provider:** An OpenAI-compatible API endpoint (e.g., local endpoints such as `llama.cpp`, `LM Studio`, `Ollama`, or cloud APIs such as OpenRouter, OpenAI, Groq, DeepSeek, or Mistral).

---

## Operational Modes

| Mode | Purpose | Capabilities & Restrictions |
|---|---|---|
| **ASK** | Read-only analysis | Queries codebase, explains architecture, and runs read-only search tools. All file modifications are blocked. |
| **PLAN** | Task preparation | Formulates architecture and step-by-step implementation plans. Restricted strictly to writing `.agent_plan.md`. |
| **CODE** | Autonomous implementation | Full editing capability. Performs targeted search-and-replace edits or file creations with automatic checkpointing. |

Mode prompts are editable as virtual files under `.agent/prompts/` (`plan.md`, `ask.md`, `code.md`, `llm_gen.md`).

---

## Tool Matrix

| Category | Tool | Description | Default Permission |
|---|---|---|---|
| **File I/O** | `read` | Reads target ranges or evenly samples long files | Always |
| | `edit` | Applies surgical block replacements | Ask |
| | `write` | Creates or overwrites files (`.agent_plan.md` only in Plan mode) | Ask |
| | `rename` | Renames files within the permitted directory | Ask |
| **Search** | `find` | Matches files by name pattern or file extension | Always |
| | `grep` | Regular expression and plain-text search across files | Always |
| **Vision** | `preview_image` | Renders an image (or crop region) back to the model as vision input | Always |

Custom tools can be authored blank, imported as a `.js` file, or installed from the community repo `fredconex/Ion-tools` directly from **Settings → Tools → +**.

---

## Core Capabilities

- **Integrated Monaco Editor & Diff Viewer:** Syntax-highlighted editor with live HTML preview (`Edit` / `Preview` toggle), side-by-side/inline diff inspection, hunk navigation, and gutter markers against the session baseline.
- **Automatic Checkpoint Engine (Git-graph style):** Every prompt and tool operation is recorded in an op log. The **Changes** panel shows a commit-style timeline with per-file drill-down, checkpoint diffs, and revert-to-before-prompt or revert-to-checkpoint actions.
- **Multi-Session Workspaces:** Run isolated conversation sessions against the same workspace with independent baselines, message history, attachments, and running-time tracking. Includes LLM-generated session titles and prompt queuing.
- **Context Compression:** Auto-compression when the context window crosses a configurable threshold (default 75%), preserving the last N messages. Manual `/compact` renders a metrics card with pre/post token savings.
- **Context Attachment System:** Attach files, line ranges, images, or large text snippets to prompts using `@` syntax, `Ctrl+R` snippet capture, or clipboard paste. Attachments materialize into the read-only virtual `.agent/attachments/` directory so tools can reference them by path.
- **Thinking Control:** Configurable thinking timeout, per-turn **Skip Thinking** button (optionally preserving partial reasoning), and collapsible thought boxes with live timers.
- **Multi-Provider Model Settings:** Provider/model config stored in `.agent/models.json` with a friendly two-pane editor or raw JSON. Each model carries its own `context_window`. Built-in "browse models from API" picker queries the provider's `/models` endpoint.
- **Prompt Rail:** Right-edge scroll gutter with a tick per prompt — click to jump and highlight.
- **Slash Commands:** `/plan`, `/ask`, `/code`, `/execute-plan`, `/continue`, `/compact`, `/new`, `/session`, `/clear`, `/restore`, `/help`.
- **Selective Data Clearing:** Settings → Danger Zone clears checkpoints, sessions, model settings, custom tools, and app settings independently.
- **Extensible Tool Registry:** Define, test, lock, customize, and delete new tools directly within `.agent/tools/` using JavaScript.

---

## Quick Start

1. Open `agent.html` in any supported Chromium browser.
2. Click **Open Folder** (or pick from **Recent Workspaces**) to grant access to your target project directory.
3. Configure your endpoint via **Settings → Models** (or the model dropdown above the prompt).
4. Select an operation mode (**Ask**, **Plan**, or **Code**) and submit your task.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

# Support development
<a href="https://www.paypal.com/donate/?hosted_button_id=24CJHH95X3AQS"><img width=256px src="https://raw.githubusercontent.com/stefan-niedermann/paypal-donate-button/master/paypal-donate-button.png" alt="Donate with PayPal" /></a>