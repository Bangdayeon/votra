# Issue tracker

This repository uses **GitHub Issues** as the source of truth for issue tracking.

## Location

- Tracker: GitHub Issues on the repository remote
- Repo: `Bangdayeon/votra`
- CLI: `gh`

## Operational rules for agent skills

Skills that create/read/update issues (for example: `to-issues`, `triage`, `to-prd`, `qa`) should:

1. Use GitHub Issues via the `gh` CLI.
2. Prefer existing issues over creating duplicates.
3. Preserve issue context (title, body, labels, links) when moving between workflows.
4. Link related artifacts (PRs, docs, ADRs) back to the relevant issue.

## Common command patterns

- List open issues:
  - `gh issue list --state open`
- View an issue:
  - `gh issue view <number>`
- Create an issue:
  - `gh issue create --title "<title>" --body-file <file>`
- Edit labels:
  - `gh issue edit <number> --add-label <label>`
