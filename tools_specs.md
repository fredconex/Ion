Ion Tool Specification (specs.md)

This document outlines the architecture, constraints, API specifications, and
conventions for developing tools for Ion.

1. Overview & Architecture

Ion executes tools within a multi-tiered sandboxed environment:

┌────────────────────────────────────────────────────────┐
│  Ion Main Application (index.html)                    │
│  - File System Access API & IndexedDB                  │
│  - UI Rendering & Monaco Editors                       │
│  - Security Permission Guard & Protected Paths         │
│  - Model Endpoint Gateway (api.callModel / httpPost)   │
└──────────────────────────┬─────────────────────────────┘
                           │ postMessage (API RPC)
┌──────────────────────────▼─────────────────────────────┐
│  Sandboxed IFRAME (sandbox="allow-scripts")            │
│  - Opaque Origin (null origin)                         │
│  - Blocks access to localStorage / indexedDB / cookies │
└──────────────────────────┬─────────────────────────────┘
                           │ Web Worker
┌──────────────────────────▼─────────────────────────────┐
│  Tool Worker Context (TOOL_WORKER_SOURCE)              │
│  - Evaluates tool code via Function factory            │
│  - Isolated from DOM (No `window`, `document`)        │
│  - Communicates via `api` interface with host          │
└────────────────────────────────────────────────────────┘

Key Execution Characteristics

  - File Location: Tools reside in .agent/tools/<tool_name>.js. The filename
    without extension must match TOOL_META.name.
  - Execution Sandbox: Runs inside a nested Web Worker hosted by an
    opaque-origin sandbox iframe.
  - Worker Environment: There is no DOM access inside the tool handler (document
    and window are undefined). Visual interfaces must be emitted via
    string-based HTML (displayHtml or api.showUI).
  - Timeout: Configurable per user settings (default: 120s, bounds: 5s–3600s).
    Tools with interactive: true receive an extended 5-minute timeout window.

2. File Anatomy

Every tool file is a standalone ECMAScript file containing two required
top-level symbols:

1.  TOOL_META: Plain JavaScript object defining schema, permissions, settings,
    and behavior.
2.  handler(args, api): An asynchronous function executing the tool's business
    logic.

// .agent/tools/sample_tool.js

const TOOL_META = {
    name: "sample_tool",
    description: "Briefly explain what the tool does and when the model should call it.",
    parameters: {
        type: "object",
        properties: {
            target: { type: "string", description: "Target identifier." }
        },
        required: ["target"]
    },
    modes: ["plan", "ask", "code"],
    permission: "ask",
    toolBox: 1
};

async function handler(args, api) {
    const { target } = args;
    // Implementation logic here
    return `Processed ${target}`;
}

3. TOOL_META Specification

| Property         | Type       | Default                              | Description                                                                                 |
| :--------------- | :--------- | :----------------------------------- | :------------------------------------------------------------------------------------------ |
| `name`           | `string`   | **Required**                         | Tool identifier. Must match `^[a-zA-Z_][a-zA-Z0-9_]*$` and the file stem.                   |
| `description`    | `string`   | `""`                                 | The prompt instruction provided to the LLM detailing usage and rules.                       |
| `parameters`     | `object`   | `{ type: "object", properties: {} }` | JSON Schema definition of parameters accepted by `handler`.                                 |
| `modes`          | `string[]` | `["plan", "ask", "code"]`            | Subset of modes where the tool is active: `"plan"`, `"ask"`, `"code"`.                      |
| `permission`     | `string`   | `"ask"`                              | Default permission: `"always"` (silent run), `"ask"` (prompts user), `"never"` (disabled).  |
| `toolBox`        | `number`   | `1`                                  | `1`: Output rendered in a collapsible tool card. `0`: Output injected raw into chat stream. |
| `expanded`       | `boolean`  | `false`                              | When `true`, the finished tool card defaults to expanded in the chat UI.                    |
| `interactive`    | `boolean`  | `false`                              | Marks the tool as waiting for user interactions; extends timeout to 5 minutes.              |
| `require_vision` | `boolean`  | `false`                              | Restricts tool visibility to models with `vision: true`.                                    |
| `settings`       | `object[]` | `[]`                                 | List of user-configurable settings rendered in Ion's Settings UI.                           |

4. Parameter Validation & Custom Extensions

Ion validates tool arguments against TOOL_META.parameters before invoking
handler.

Custom Schema Extension: allowEmpty

By default, required string parameters in Ion reject blank strings ("" or
whitespace only). To permit empty strings (e.g. for creating empty files or code
deletions), declare "allowEmpty": true:

parameters: {
    type: "object",
    properties: {
        filepath: { type: "string" },
        content: {
            type: "string",
            description: "Full content or empty string.",
            allowEmpty: true // Prevents validation failure on ""
        }
    },
    required: ["filepath", "content"]
}

Note: Ion strips allowEmpty before sending the tool schema to external LLM APIs.

5. Tool Settings System (TOOL_META.settings)

Tools can define customizable configuration fields displayed in Settings →
Tools:

settings: [
    {
        key: "maxItems",
        label: "Maximum Items",
        type: "number",
        default: 50,
        min: 1,
        max: 500,
        description: "Ceiling for extracted items."
    },
    {
        key: "enableCache",
        label: "Enable Cache",
        type: "boolean",
        default: true,
        description: "Store intermediate results."
    },
    {
        key: "outputFormat",
        label: "Output Format",
        type: "select",
        options: ["json", "csv", "text"],
        default: "json",
        description: "Data export format."
    },
    {
        key: "modelHelper",
        label: "Evaluation Model",
        type: "model",
        default: "",
        description: "Assigned model for helper tasks."
    }
]

Supported Setting Types

| Type        | Options / Properties              | Return Type via `api.getSetting(key)`    |
| :---------- | :-------------------------------- | :--------------------------------------- |
| `"text"`    | `default`                         | `string`                                 |
| `"number"`  | `default`, `min`, `max`           | `number`                                 |
| `"boolean"` | `default`                         | `boolean`                                |
| `"select"`  | `options` (`string[]`), `default` | `string`                                 |
| `"model"`   | `default`                         | `string` (Model UUID from `models.json`) |

6. The api Context Object

The api argument passed to handler(args, api) exposes the following methods:

File System Operations

All paths are workspace-relative (e.g., src/index.js):

  - api.readFile(filepath) -> Promise<string> Reads text file. Returns string
    content, or "ERROR: ..." if inaccessible or binary.
  - api.readFileBytes(filepath) -> Promise<Uint8Array | string> Reads binary
    data (up to 64MB). Returns Uint8Array or "ERROR: ..." string.
  - api.readImage(filepath, crop?) -> Promise<Object> Reads and crops an image
    file. crop accepts normalized coordinates: { x: 0.0-1.0, y: 0.0-1.0,
    width: 0.0-1.0, height: 0.0-1.0 }. Returns { dataUrl, width, height,
    sourceWidth, sourceHeight, crop } or { error }.
  - api.writeFile(filepath, content) -> Promise<string | null> Writes string or
    Uint8Array to workspace. Returns null on success or an error string.
  - api.renameFile(oldPath, newPath) -> Promise<string | null> Renames a file
    within the same directory. Returns null on success or an error string.
  - api.listFiles() -> Promise<string[]> Returns array of relative paths of all
    accessible files in the workspace.
  - api.fileExists(filepath) -> Promise<boolean> Checks if a file exists and is
    accessible.
  - api.isBinary(filepath) -> Promise<boolean> Checks whether a file contains
    binary bytes.

Context & Configuration

  - api.mode string Active execution mode: "plan", "ask", or "code".
  - api.planFile string Path to implementation plan file (".agent_plan.md").
  - api.getSetting(key) -> Promise<any> Retrieves setting value defined in
    TOOL_META.settings.
  - api.cleanupText(text) -> string Helper that truncates lines exceeding 2000
    chars and caps string to 100k characters.

Dynamic UI & Status

  - api.setHeaderMsg(msg) -> Promise<null> Updates the tool execution status
    line in real-time in the UI header.
  - api.showUI(html, opts?) -> Promise<Object> Interacts with the chat UI:
      - Static UI: Sets the current display HTML.
      - Live Stream: If opts.live: true, streams a transient HTML frame into the
        active running box.
      - Interactive Wait: If html contains elements with data-choice="value",
        halts execution until the user clicks a button, resolving to { choice:
        "value", cancelled: boolean }.
  - api.validateDisplayHtml(html, opts?) -> Promise<{ ok: boolean, error?:
    string }> Pre-flights HTML in an offscreen sandbox to test for uncaught
    exceptions or rendering failures before showing it to the user.

Networking & Model Delegation

  - api.httpPost(url, opts?) -> Promise<{ ok: boolean, status: number, text:
    string } | { error: string }> Performs HTTP POST from the host origin to
    bypass local network / CORS limitations of the worker. opts: { headers?:
    object, body?: string, timeoutMs?: number }.
  - api.listModels() -> Promise<Array<{ id: string, provider: string, name:
    string }>> Returns all configured models with sanitized IDs (UUIDs). Never
    exposes credentials.
  - api.callModel(modelId, opts) -> Promise<{ ok: boolean, status: number, text:
    string } | { error: string }> Executes a model call via host authorization
    for a model assigned via a "model" setting. opts: { path: string, body:
    string, timeoutMs?: number }.

7. Handler Return Values

The handler function can return either a plain string or a structured response
object:

1. Primitive String

return "Task completed successfully.";

2. Structured Output Object (Recommended)

return {
    output: "Clean text data sent to the LLM context window.",
    displayHtml: "<div style='color: var(--green);'>Rich visual card for user UI</div>",
    summary: "Optional label overriding the tool card header",
    image: "data:image/png;base64,..." // Optional visual input for vision models
};

  - Separation of Concerns: output is returned to the model context. displayHtml
    is only shown in the frontend UI. Always keep large HTML/SVG trees in
    displayHtml to prevent context pollution.
  - Header Summary: summary overrides the default arg-based header in the UI
    card.
  - Multimodal Feedback: If image is set (data URL) and the current model
    supports vision, Ion feeds the image back into the conversation context as a
    user message turn.

8. Interactive Tools & Live UI

A. Waiting for User Choice (show_options pattern)

Mark tool as interactive: true in TOOL_META. Embed data-choice attributes in
clickable buttons:

const html = `
<div style="display: flex; gap: 8px;">
    <button type="button" data-choice="accept" style="padding: 6px 12px; cursor: pointer;">Accept</button>
    <button type="button" data-choice="reject" style="padding: 6px 12px; cursor: pointer;">Reject</button>
</div>
`;

const res = await api.showUI(html);
if (res.cancelled) {
    return "User dismissed the action.";
}
return `User clicked: ${res.choice}`;

B. Live Terminal / Progress Streaming (py_run pattern)

Stream transient updates without cluttering final history:

for (let i = 0; i <= 100; i += 25) {
    await api.setHeaderMsg(`Processing ${i}%...`);
    await api.showUI(`
        <div data-live-scroll style="padding: 8px; font-family: var(--font-mono);">
            Progress: ${i}%
        </div>
    `, { live: true });
    await new Promise(r => setTimeout(r, 200));
}

9. Security, Paths & Sandboxing Rules

Path Isolation & Protection

Tools must never bypass path checks. The following boundaries are enforced by
host APIs:

  - Protected Files: .git, .env, id_rsa, *.pem, *.key, *.sqlite, and files
    matched by .gitignore are blocked from tool reads and writes.
  - Internal .agent/ Workspace:
      - .agent/models.json and .agent/config.json are user-owned private files.
        Tools cannot read or edit them.
      - .agent/prompts/ files are read-only to tools.
      - .agent/attachments/ files are virtual read-only session resources.
      - .agent/tools/ scripts can only be modified by the edit/write tools if
        the tool is explicitly unlocked by the user in the UI.

Theme & Styling Conventions

When building displayHtml, always inherit Ion theme CSS variables:

  - Backgrounds: var(--bg-main), var(--bg-panel), var(--bg-input)
  - Borders: var(--border), var(--border-highlight)
  - Typography: var(--fg), var(--dim), var(--font-mono)
  - Accent & Status: var(--primary), var(--accent), var(--green), var(--red),
    var(--yellow), var(--blue)

10. Reference Tool Implementations

Example 1: Pure Computation Tool

// .agent/tools/hash_check.js
const TOOL_META = {
    name: "hash_check",
    description: "Computes SHA-256 hash of a file in the workspace.",
    parameters: {
        type: "object",
        properties: {
            filepath: { type: "string", description: "Target file." }
        },
        required: ["filepath"]
    },
    modes: ["plan", "ask", "code"],
    permission: "always",
    toolBox: 1
};

async function handler(args, api) {
    const bytes = await api.readFileBytes(args.filepath);
    if (typeof bytes === "string") return bytes; // Passes through "ERROR: ..."

    const digestBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digestBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    return {
        output: `${args.filepath} SHA-256: ${hash}`,
        summary: `SHA-256: ${args.filepath}`,
        displayHtml: `
            <div style="font-family: var(--font-mono); padding: 8px; background: var(--bg-input); border-radius: 6px;">
                <div style="color: var(--dim); font-size: 11px;">${args.filepath}</div>
                <div style="color: var(--primary); font-weight: 600; font-size: 12px; margin-top: 4px;">${hash}</div>
            </div>
        `
    };
}

Example 2: Interactive Configuration Tool

// .agent/tools/prompt_confirm.js
const TOOL_META = {
    name: "prompt_confirm",
    description: "Ask the user to confirm an action before proceeding.",
    interactive: true,
    toolBox: 1,
    parameters: {
        type: "object",
        properties: {
            message: { type: "string", description: "Confirmation question." }
        },
        required: ["message"]
    },
    modes: ["code"]
};

async function handler(args, api) {
    await api.setHeaderMsg("Awaiting confirmation...");

    const card = `
        <div style="padding: 10px; background: var(--bg-panel); border: 1px solid var(--border); border-radius: 6px;">
            <div style="font-size: 12px; color: var(--fg); margin-bottom: 8px;">${args.message}</div>
            <div style="display: flex; gap: 6px;">
                <button type="button" data-choice="yes" style="padding: 4px 10px; background: var(--primary); color: #000; font-weight: 600; border: none; border-radius: 4px; cursor: pointer;">Confirm</button>
                <button type="button" data-choice="no" style="padding: 4px 10px; background: var(--bg-input); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">Cancel</button>
            </div>
        </div>
    `;

    const res = await api.showUI(card);
    const confirmed = !res.cancelled && res.choice === "yes";

    return {
        output: confirmed ? "User confirmed the action." : "User cancelled the action.",
        summary: confirmed ? "Confirmed" : "Cancelled",
        displayHtml: `<div style="font-size: 11px; color: ${confirmed ? 'var(--green)' : 'var(--red)'}; padding: 4px;">${confirmed ? '✓ Action approved' : '✗ Action rejected'}</div>`
    };
}

11. Authoring Checklist

Before deploying a tool:

- [ ] Does TOOL_META.name exactly match the file stem (<name>.js)?
- [ ] Are all required parameters listed in TOOL_META.parameters.required?
- [ ] If a string parameter can accept "", is "allowEmpty": true set on that property?
- [ ] Does handler handle binary files using api.isBinary or api.readFileBytes?
- [ ] Is heavy visualization markup returned via displayHtml rather than embedded in output?
- [ ] Are all user-visible strings sanitized against XSS when generating displayHtml?
- [ ] Does interactive UI use data-choice attributes and set interactive: true in metadata?
- [ ] Are theme colors using CSS variables (var(--fg), var(--primary), etc.)?
