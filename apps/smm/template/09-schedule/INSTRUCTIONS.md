# 09 Schedule

Get finished pieces onto the Facebook Page. **Nothing goes out without the human's approval.**

1. Write `batch.md`: for each ready piece (it passed the checks in `08-produce`), its format, files, caption, first comment and scheduled time. Posts are at least 12 hours apart.
2. Write `approval.md` listing the pieces in the batch.
3. Post by hand: `agentic-smm schedule` (Meta API uploads, `--dry-run`, `--now`) arrives in build step 7. Until then write `upload-sheet.md` (per piece: files, caption, first comment, time) for the human to schedule in Meta Business Suite. After they confirm, record each piece as `scheduled-manual` with its time in `batch.md`.

- Never post, schedule or upload a piece that is not in an approved batch.
- Never edit, delete or boost a live post.
- The Page token lives in `.env` only. Never write it into a plan file or a log.

From build step 7, each batch's approval goes into `approval.json` with the human's words, and `schedule` refuses any piece not in it. For now `approval.md` is the checkpoint.

CHECKPOINT: show the human `batch.md` and stop. After they approve, add `approved: yes` and their words to `approval.md`, log their words in STATUS.md, hand over the upload sheet, and set the next stage once the batch is scheduled.
