# agentic-image

Read README.md before any work in this app: it describes the behaviour and the roadmap. The rules the agent follows at run time live in `skills/make-image/SKILL.md` and each stage's `template/*/INSTRUCTIONS.md`; keep those the source of truth for approvals.

- The producer contract (`piece.json`, `asset.json`) is owned by agentic-smm and lives in `../../docs/producer-contract.md`. Change it there first.
- Match the conventions of the sibling apps (`../video`, `../smm`, `../research`): staged `template/` folders, `route`, `STATUS.md`, a thin `src/cli` over `src/core` functions that return data, and an agent skill in `skills/<name>/SKILL.md`.
- Layout CSS reads only design tokens (`var(--…)`): no colour literals, px sizes or fonts of its own.
- Never mark copy or visuals approved without the human's approval in the conversation.
- Run `npm run lint` and `npm test` before handing work back.
