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
- **Configurable Tool Permissions:** Every tool provides granular permission levels (`always`, `ask`, `never`). Destructive actions and file modifications require manual user approval by default.
- **Sensitive Shielding:** Private settings and API keys (`.agent/models.json`, `.agent/config.json` sensitive folders like `.venv` or folders/files included on `.gitignore`) are blocked from model tools, preventing key leakage in prompts.
- **Web Worker Execution:** Custom and built-in tools execute inside isolated Web Workers to prevent execution hangs from blocking the primary UI thread.

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
| **Web** | `duckduckgo_search` | Queries DuckDuckGo for live documentation and snippets | Ask |
| | `fetch_url` | Extracts text from URLs directly or through proxy fallbacks | Ask |

---

## Core Capabilities

- **Integrated Monaco Editor & Diff Viewer:** Syntax-highlighted code editor with live HTML preview, side-by-side/inline diff inspection, and hunk navigation.
- **Automatic Checkpoint Engine:** Creates rollback states per prompt and tool execution. Revert entire prompt batches or inspect file timelines at any point.
- **Multi-Session Workspaces:** Run isolated conversation sessions against the same workspace with independent baselines and state history.
- **Context Attachment System:** Attach files, line ranges, images, or large text snippets to prompts using `@` syntax or clipboard paste.
- **Extensible Tool Registry:** Define, test, lock, and customize new tools directly within `.agent/tools/` using JavaScript.

---

## Quick Start

1. Open `agent.html` in any supported Chromium browser.
2. Click **Open Folder** to grant access to your target project directory.
3. Configure your endpoint in **Settings** or select a model preset.
4. Select an operation mode (**Ask**, **Plan**, or **Code**) and submit your task.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

# Support development
<a href="https://www.paypal.com/donate/?hosted_button_id=24CJHH95X3AQS"><img width=256px src="https://raw.githubusercontent.com/stefan-niedermann/paypal-donate-button/master/paypal-donate-button.png" alt="Donate with PayPal" /></a>
