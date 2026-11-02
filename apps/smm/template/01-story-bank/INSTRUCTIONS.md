# 01 Story bank

Collect true stories from the human. Pieces may only use what is here: the tool never invents stories, numbers, testimonials or quotes.

1. Read `<brand>/story-bank.md` if it exists, and the repo's `content/backlog.md` for ideas marked `needs-story`. Ask only about gaps.
2. Interview the human, a few questions at a time, about the themes in the brief and the pains they know the audience has. Ask for specifics: the exact number, the date, the moment, what they felt, what they did next.
3. Draft new stories in `stories.md`, written for the human to read easily:
   - Start with a summary table: `# | Story | The number | OK to share?` (share: **Yes**, numbers included / **Yes, without numbers** / **Private** / Not decided).
   - Then one section per story: `## s<nn> · <short name>`, a `**When:** … · **Source:** …` line, the story as a short plain paragraph in second person ("you…"), then bullets: **The number**, **The lesson** (if known), **Still missing** (what to ask next). Leave out anything unknown rather than writing blank fields.
   Ask the human for each share level; never assume it's shareable.
4. Stop when the themes have enough material (at least one story per theme, with a number where there is one).

`agentic-smm story add|list` arrives in build step 2; until then edit the files by hand.

CHECKPOINT: show the human `stories.md` and stop. After approval, add `approved: yes`, log their words in STATUS.md, merge the new stories into `<brand>/story-bank.md` (create it if missing), and set the next stage.
