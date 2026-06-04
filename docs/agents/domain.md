# Domain docs

This repository uses a **single-context** domain documentation layout.

## Layout

- Primary domain context: repository-root context doc(s)
- ADR directory: `docs/adr/` (if/when present)

## Consumer rules for agent skills

Skills that need domain understanding (for example: `improve-codebase-architecture`, `diagnose`, `tdd`) should:

1. Read the root domain context documentation first.
2. Read ADRs in `docs/adr/` when architectural decisions are relevant.
3. Treat ADRs as decision records that can supersede earlier assumptions.
4. Prefer existing domain language and bounded-context terms from these docs in all outputs.
