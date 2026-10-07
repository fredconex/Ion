# Ion

[![Live Demo](https://img.shields.io/badge/%E2%96%B6%20Launch-Ion%20Live-brightgreen?style=for-the-badge)](https://fredconex.github.io/Ion/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/fredconex/ion?filter=*&color=brightgreen)](https://github.com/fredconex/ion/releases)

Ion is a zero-install, browser-native coding agent. It runs as a single HTML file, connects to any OpenAI-compatible endpoint (local or cloud), and gives the model tools to read, search and edit your project, with an integrated editor, diff viewer and checkpoint history.

<img width="2554" height="1259" alt="Ion main view" src="https://github.com/user-attachments/assets/36368b02-6380-4b89-8281-aea2c6ab516a" />
<img width="1657" height="1232" alt="Ion diff and changes view" src="https://github.com/user-attachments/assets/092ab433-728a-4bc4-a518-40f23ae14721" />

## Quick Start

1. Open the [live demo](https://fredconex.github.io/Ion/) or `index.html` in your browser.
2. Open a workspace: **Open Folder** (Chromium) or **New Virtual Workspace** (any browser).
3. Add a provider and model under **Settings → Models**.
4. Pick a mode (**Ask**, **Plan**, **Code**) and send a task.

## Requirements

- **Model provider:** any OpenAI-compatible API, such as llama.cpp, LM Studio, Ollama, OpenRouter, OpenAI, Groq, DeepSeek or Mistral.
- **Browser:** Chromium-based (Chrome, Edge, Brave, Opera, Arc; v86+) to work directly on a local folder through the File System Access API. Other browsers (Firefox, Safari) can use virtual workspaces.

## Workspaces

| Type | How it works |
|---|---|
| **Folder** | Reads and writes a directory you grant through the browser picker. Chromium only. |
| **Virtual** | Files are imported (drag and drop or file picker) and stored in the browser. Works in any modern browser and is never evicted from the recent list. Export anytime with **Download all as .zip**. |

Recent workspaces are listed on the start screen.

## Modes

| Mode | Purpose | Restrictions |
|---|---|---|
| **ASK** | Read-only analysis and Q&A | No file modifications |
| **PLAN** | Architecture and step-by-step plans | Can only write `.agent_plan.md` |
| **CODE** | Autonomous implementation | Full editing with automatic checkpoints |

Mode prompts are editable virtual files in `.agent/prompts/` (`plan.md`, `ask.md`, `code.md`, `llm_gen.md` for session titles).

## Built-in Tools

| Tool | Description | Modes | Default |
|---|---|---|---|
| `read` | Reads a line range; long ranges are evenly sampled instead of truncated | all | Always |
| `find` | Finds files by name pattern or extension | all | Always |
| `grep` | Regex or plain-text search with line numbers | all | Always |
| `preview_image` | Returns an image, or a cropped region, as vision input (vision models only) | all | Always |
| `edit` | Exact search-and-replace block edits | Code | Ask |
| `write` | Creates or overwrites files | Plan, Code | Ask |
| `rename` | Renames a file | Code | Ask |

Permissions are `always`, `ask` or `never` per tool. Hold **Ctrl** over a permission to preview it for a whole group (Built-in or Custom), and **Ctrl+click** to apply it to all. Each tool can also be locked so the model cannot modify its file, and exposes its own settings (read limits, preview sizes, and so on).

### Custom Tools

Create a tool from scratch, import a `.js` file, or install one from the community repo [`fredconex/Ion-tools`](https://github.com/fredconex/Ion-tools) via **Settings → Tools → +**. Tools live in `.agent/tools/` and describe themselves with a `TOOL_META` object:

- `settings`: user-configurable values of type `number`, `boolean`, `select`, `text` or `model` (a model picker, so a tool can call a different model).
- `interactive`: lets the tool render UI cards and wait for the user (5 minute timeout instead of 30 seconds).
- `require_vision`: tool is only available when the selected model supports images.
- `expanded`: open the tool's output box by default.

Tool handlers receive an `api` object with file access (`readFile`, `writeFile`, `renameFile`, `listFiles`, `fileExists`, `isBinary`, `readImage`), `getSetting`, `showUI`, `setHeaderMsg`, `httpPost`, and model lookup (`listModels`, `getModelInfo`).

## Features

**Editing and review**
- Monaco editor with syntax highlighting, Save / Save As (`Ctrl+S` / `Ctrl+Shift+S`) and a live HTML preview toggle.
- Side-by-side or inline diffs with hunk navigation and gutter markers against the session baseline.
- Workspace-wide **Search** panel and a file explorer with drag and drop, new file/folder, per-file download, per-folder zip, restore to default and attach-to-prompt.

**History and sessions**
- **Checkpoints:** every prompt and tool call is logged. The Changes panel shows a commit-style timeline with per-file drill-down, checkpoint diffs, and revert to before a prompt or to any checkpoint.
- **Message actions:** edit or delete any message, optionally reverting the file changes it caused.
- **Multi-session:** isolated conversations per workspace with their own baselines, history, attachments and timers, LLM-generated titles, and prompt queuing.

**Context management**
- **Auto-compression** at a configurable threshold (default 75%), keeping the last N messages. `/compact` runs it manually and reports token savings.
- **Attachments:** add files, line ranges, images or large pasted text with `@`, `Ctrl+R` snippet capture or clipboard paste. They appear under the read-only `.agent/attachments/` path so tools can read them.
- **Vision:** mark models with `vision: true` to send attached images directly; non-vision models are told the image was not sent.
- **Thinking control:** configurable timeout, a per-turn **Skip Thinking** button (optionally keeping partial reasoning), and collapsible thought boxes with live timers.

**Models**
- Providers and models are stored in `.agent/models.json`, editable through a two-pane editor or raw JSON.
- Per-model `context_window` and `vision` flags, plus a picker that queries the provider's `/models` endpoint.

**Interface**
- Status bar with mode, model and context usage, plus a prompt rail with one tick per prompt for quick navigation.
- Accent color and status glow options, and a responsive layout for small screens.

## Commands and Shortcuts

| Command | Action |
|---|---|
| `/plan`, `/ask`, `/code` | Switch mode |
| `/execute-plan` | Run `.agent_plan.md` in Code mode |
| `/continue` | Resume a paused run |
| `/compact` | Compress conversation history |
| `/new`, `/session` | New session, open session list |
| `/clear` | Reset the session (messages, chat, modified files) |
| `/restore` | Discard all modified files back to the original |
| `/help` | Show commands and shortcuts |

`Esc` cancels generation. `Ctrl+S` saves, `Ctrl+Shift+S` saves as, `Ctrl+R` captures a snippet, and `@` attaches files.

## Security and Isolation

Ion is entirely client-side. There is no server, daemon or native binary.

- **Directory sandbox:** access is limited to the folder (or virtual workspace) you provide. Nothing else on the system is reachable.
- **Local storage only:** workspace state, sessions and checkpoints persist in browser IndexedDB. The only network traffic is to the model endpoint you configure.
- **Tool isolation:** tools run in Web Workers with a 30 second timeout (5 minutes for interactive tools), so a hung tool cannot block the UI.
- **Protected paths:** `.agent/models.json`, `.agent/config.json`, anything matching your `.gitignore` rules, and built-in patterns (`.git`, `.env*`, `*.key`, `*.pem`, `id_*`, `.ssh/`, `.aws/`, `.gnupg/`, `*credentials*`, `*secret*`, `*.sqlite`, `*.db`, and more) are blocked from model tools, so keys never reach prompts.
- **Data control:** Settings → Danger Zone clears checkpoints, sessions, model settings, custom tools and app settings independently.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

# Support development
<a href="https://www.paypal.com/donate/?hosted_button_id=24CJHH95X3AQS"><img width=256px src="https://raw.githubusercontent.com/stefan-niedermann/paypal-donate-button/master/paypal-donate-button.png" alt="Donate with PayPal" /></a>
