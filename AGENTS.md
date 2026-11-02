# Agentic Workflows workspace

This folder holds staged, agent-driven apps: `apps/image`, `apps/video`, `apps/smm` and `apps/research`. Each app is a CLI plus one or more agent skills (`apps/<app>/skills/<skill>/SKILL.md`). The root [README.md](README.md) describes them.

## Setting it up for a user

When the user asks you to set up, install or "get this working", do this and report each result in plain words. The user may not be technical: explain what you need from them, and never ask them to paste a secret into the chat. Install whatever the apps need yourself when it goes into the user's own account (npm packages, the browser, models). Ask first before anything that needs admin rights or changes the whole system (`sudo`, a system package manager, a Node installer).

0. **Get the folder** if you aren't already in it: when the user gave you a link, download it (`git clone`, or the ZIP) into a permanent place such as `~/agentic-workflows`, then work from there. The apps run from this folder, so it must not be a temporary one.
1. **Node 22 or later.** Run `node --version`. If Node is missing or older, help the user install the current LTS from https://nodejs.org (or their package manager), then continue.
2. **Ask which apps they want** if it isn't clear: image (carousels and images), video (reels and edited footage), smm (social content planning) or research (pain-point studies). All four is fine.
3. **Run setup from this folder:** `npm run setup -- --agent <you>`, where `<you>` is `claude` for Claude Code or `codex` for Codex (Codex and several other agents read `~/.agents/skills`). For any other agent, pass the folder it loads personal skills from: `npm run setup -- --skills-dir <folder>`. Add `--apps image,video` to set up only some apps. The script installs and builds, puts the commands on PATH with `npm link`, links the skills, installs Chromium for the image app if none is found (`--no-browser` skips it), and checks optional tools.
4. **Read the summary.**
   - `SKIPPED … already links to …`: an older copy of a skill is installed. Ask the user before rerunning with `--force`, which points it here.
   - `NOT LINKED`: the global npm folder isn't writable. That's fine: the skills fall back to `node <app>/dist/cli/main.js`. Don't use `sudo`.
   - `Chromium … not found` (image): the automatic install failed; run `npx playwright-core install chromium` and show the user any error.
   - `ffmpeg … not found` (video): optional. Offer to install it with the system package manager, with the user's OK.
   - If your agent has no skills folder at all, tell the user to point it at the `SKILL.md` files instead, for example by adding them to its instructions file.
5. **API keys are optional** (`.env.example` lists them). Tell the user which features they unlock and where to get them. The user copies `.env.example` to `.env` and fills it in themselves.
6. **Tell the user to restart the agent** so it loads the new skills, then suggest a first request, such as "make a carousel about X" or "run a pain study on X". If they want to start without restarting, read the matching `apps/<app>/skills/<skill>/SKILL.md` yourself and follow it.

To undo it, run `npm run setup -- --remove` (with the same `--agent` or `--skills-dir`). It removes only the links that point into this folder.

## Working on the apps

- Each app documents itself in `apps/<app>/README.md`, and some have an `AGENTS.md` with contributor notes. The contract between agentic-smm and the apps that make its pieces is [docs/producer-contract.md](docs/producer-contract.md).
- `npm run build`, `npm run lint` and `npm test` at the root run every app; `-w apps/<app>` runs one.
- Examples, fixtures and docs use synthetic data. Never add a real person, creator, company or brand, a personal story, or a local path.

## Sensitive-file guardrails

Apply these rules to every Agentic Workflows task, including context gathering, Git history inspection, debugging, and external tool use. Follow stricter repository-specific rules where present.

### Protected material

* Do not read, create, edit, copy, upload, or commit secret-bearing files: `.env`, `.env.*`, `.envrc`, `.npmrc`, `.pypirc`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `credentials.json`, `secrets.json`, or `service-account*.json`.
* Also protect credentials regardless of filename: SSH private keys, cloud credentials, database connection strings, API keys, passwords, access/refresh tokens, session cookies, browser authentication state, and database exports or logs containing sensitive user or account data.
* Use explicitly sanitized configuration templates such as `.env.example` or `example.env`, schema documentation, and synthetic fixtures. These templates are the exception to the filename rule only when they contain placeholders rather than real credentials. A tracked file is not automatically safe.

### Read and search safely

* Select relevant source paths before searching file contents. Avoid recursive content dumps, unrestricted `git show`/`git diff`, or broad searches that can include protected material. Apply exclusions to every search method, including Git searches and remote history; ignored files can still exist in commits.
* Never print the process environment, credential-store contents, authentication headers, cookies, or secret values. Do not run commands with debug tracing that could expose them.
* Existing Git or tool authentication may be used through its normal authenticated interface without opening, extracting, or displaying credentials. Missing authentication should be configured by the team member outside the agent conversation.
* Do not send protected material to connectors, external services, model prompts, screenshots, logs, documentation, patches, tests, or PRs. Never ask a teammate to paste a real secret into chat.

### If sensitive material appears

Stop the operation that exposed it. Do not repeat, summarize, transform, or persist the value. Report only the affected path or operation and the kind of material encountered. Continue independent work with sanitized sources; if the blocked work needs configuration details, request a schema or fully redacted example. If exposure occurred, tell the owner so they can assess revocation or rotation; do not rotate credentials or rewrite history without authorization.

Before staging changes, inspect the intended file list and use explicit paths. Do not stage the entire workspace. Review only safe diffs, and ensure new examples use placeholders or synthetic data.

#### Enforcement boundary

These are agent instructions, not filesystem access controls. `.gitignore` also does not prevent a tool from reading a file. For enforced protection, keep real secrets outside the agent-accessible checkout and restrict access using the team's execution environment or permission controls. This document does not install sandbox rules or configure either coding tool.
