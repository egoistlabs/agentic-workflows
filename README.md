# Agentic Workflows

Staged, agent-driven workflows that run in your own AI coding agent (Claude Code, Codex, or any agent that reads `SKILL.md` skills). Each job is a folder of numbered stages. Every stage has its own `INSTRUCTIONS.md`, a router tells the agent what to do next, and you approve the work at fixed checkpoints. Nothing moves past a checkpoint without your yes.

## Apps

| App | Folder | Ask your agent to… | Does |
| --- | --- | --- | --- |
| agentic-image | [apps/image](apps/image/) | "make a carousel about X" | Carousels and single images in your brand's real font and design tokens |
| agentic-video | [apps/video](apps/video/) | "make a reel about X", "edit this footage" | Reels, talking-head and explainer videos on Remotion |
| agentic-smm | [apps/smm](apps/smm/) | "plan next month's content" | Social content planning for one Facebook Page; hands pieces to image and video |
| agentic-research | [apps/research](apps/research/) | "run a pain study on X" | Audience-first pain-point research to decide who to build for |

They work alone or together. They share one brand pack (`brand/` in your project) and one learnings file. agentic-smm takes audience words from agentic-research and has its carousels and reels made by agentic-image and agentic-video ([producer contract](docs/producer-contract.md)).

## Setup

### The easy way: one prompt to your agent

Paste this into Claude Code, Codex or any other AI coding agent:

> Download https://github.com/egoistlabs/agentic-workflows into ~/agentic-workflows, then set it up for me by following its AGENTS.md.

Or download the ZIP yourself, unzip it somewhere permanent, open the folder in your agent and say **"Set this up for me."** Either way the agent follows [AGENTS.md](AGENTS.md):
1. it checks Node 22+ and offers to install it
2. it asks which apps you want
3. it runs the setup script, which installs everything else the apps need (Chromium for images included)
4. it tells you what's left

It asks before anything that needs admin rights. The apps run from that folder, so keep it.

### By hand

Needs [Node 22+](https://nodejs.org).

```sh
npm run setup                     # links skills for the agents it finds (~/.claude, ~/.agents)
npm run setup -- --agent claude   # Claude Code only
npm run setup -- --agent codex    # Codex (and other agents that read ~/.agents/skills)
npm run setup -- --skills-dir <your agent's skills folder>
npm run setup -- --apps image,research   # only some apps
```

Setup installs and builds everything, puts the commands (`agentic-image`, `agentic-video`, …) on PATH with `npm link`, links each skill into your agent's skills folder, and installs Chromium for agentic-image if none is found (`--no-browser` skips it). It never overwrites a skill you already have; `--force` points an existing link here. Rerunning it is safe. `npm run setup -- --remove` undoes it.

API keys are optional and unlock extra features (cloud transcription, more research sources). Copy [`.env.example`](.env.example) to `.env` in this folder and fill in the ones you want.

To update, replace the folder with a newer download (or `git pull`) and run `npm run setup` again.

## Build your own

Every app follows the same pattern, so it's a template for your own staged workflow:

```
apps/<app>/
  template/            stage folders (00-brief, 01-…), each with an INSTRUCTIONS.md
  template/stages.json stage order and checkpoints (a file that needs an "approved: yes" line)
  skills/<skill>/      SKILL.md: when the agent should use the app, and the loop it runs
  src/core/            functions that return data (job state, router, checks)
  src/cli/             a thin command over src/core: new, route, …
```

The agent's loop is always the same: run `route`, do the stage it prints, update `STATUS.md`, route again, and stop at every checkpoint for the human.

## Development

| Command | Does |
| --- | --- |
| `npm run build` | Builds every app |
| `npm run lint` | Prettier check and typecheck in every app |
| `npm test` | Tests in every app that has them |
| `npm run <script> -w apps/<app>` | One script in one app |

Each app documents itself in its own `README.md`. Read [AGENTS.md](AGENTS.md) before changing files.

## Licence

[MIT](LICENSE). The bundled fonts, Geist and Instrument Serif, are under the SIL Open Font License (their `OFL` files sit next to them). agentic-video renders with [Remotion](https://www.remotion.dev/license), which has its own licence: free for individuals and small companies, paid above that.
