# agentic-smm

Read README.md before any work in this app: it describes the behaviour and the roadmap. Build one roadmap step at a time. The rules the agent follows at run time live in `skills/plan-content/SKILL.md` and each stage's `template/*/INSTRUCTIONS.md`; keep those the source of truth for approvals and checks.

- The producer contract (`piece.json`, `brief.md`, `asset.json`) is owned by this app and lives in `../../docs/producer-contract.md`. agentic-video (`../video`) and agentic-image (`../image`) follow it; change it there first.
- Match the conventions of the sibling apps: staged `template/` folders, `route`, `STATUS.md`, a thin `src/cli` over pure `src/core`, format manifests, and an agent skill in `skills/<name>/SKILL.md`. Network access (Meta, trends) is planned to live only in `src/adapters`, which doesn't exist yet.
- Never mark a checkpoint, batch or post approved without the human's approval in the conversation.
- Run `npm run lint` and `npm test` before handing work back.
