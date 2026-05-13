# AGENTS.md — Votra Code Style

Shared rules for humans and AI agents. Precedence: user instruction > this doc > existing code.

---

## 1. Principles

- Prefer three plain lines over one clever one.
- No options, flags, or shims you don't need today. Delete dead code.
- Extract only on real domain duplication. Similar shape isn't duplication. Abstract on the third repeat.
- One responsibility per module. Higher layers depend on abstractions, never import implementations directly.

---

## 2. Folder Layout (Light DDD)

```
src/
├─ domain/          pure domain. zero external deps.
├─ application/     use cases (one scenario = one function).
├─ infrastructure/  Prisma, auth, fetch, etc.
├─ app/             Next.js routes + server actions.
├─ components/      React UI.
├─ shared/          framework-agnostic utils/types.
```

**Dependency direction (one-way)**:
`app, components → application → domain`
`app, components → infrastructure → application/domain`
`shared` depends on nothing.

Forbidden:
- React / Next / Prisma imports inside `domain/`.
- Prisma calls inside `components/` (go through a server action).
- Importing `infrastructure/` implementations from `application/` (use port interfaces).

Use path aliases: `@/...`, `@domain/...`, etc. No `../../` relative imports.

---

## 3. One File = One Function

- One exported function per file. **Filename == function name** (camelCase).
- Allowed in the same file: private helpers used only there, and the function's input/output types.
- The moment a private helper is needed elsewhere, move it to its own file.
- Split by responsibility, not length. Split when a function changes for two reasons, or when intermediate steps deserve names.

Examples: `domain/session/parseLine.ts`, `domain/session/buildSession.ts`, `application/listProjects.ts`.

Exceptions:
- React component: `PascalCase.tsx`
- React hook: `useCamelCase.ts`
- Type bundles: `types.ts`
- Registries/constants: `registry.ts`

---

## 4. Types & Functions

- No `any`. Use `unknown` and narrow.
- Guard all external input (`JSON.parse`, fetch, form data) before use.
- Fallible functions return `Result<T, E>` (`@/shared/lib/result`) or a `{ ok: true | false }` union. Don't throw for expected failure.
- Use `import type { ... }` for type-only imports.
- Three or more parameters → take an options object.

---

## 5. Per-Layer Essentials

- **domain/** Pure functions only. No side effects. New agent: add types in `types.ts`, add adapter file, register in `registry.ts`.
- **application/** One use case per file. Transaction boundary lives here. Use cases don't call other use cases.
- **infrastructure/** Only place that reads `process.env`. DB client is a singleton.
- **app/actions/** Thin adapter. First line `"use server"`. Validate input, then call a use case. No business logic.
- **components/** No direct Prisma, fs, or env access. Fetch in server components or via server actions.

---

## 6. Working Rules

- Before editing: identify the layer; grep for an existing function that already does this.
- Default to zero comments. Add one line only when **why** isn't obvious from the code. Never explain **what**.
- No `TODO`, `FIXME`, or `console.log` left behind.
- User-facing strings are Korean and friendly.
- Before finishing: `npm run typecheck && npm run lint` must pass.
- New dependencies require user approval.
