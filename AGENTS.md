# AGENTS.md — Haema Code Style

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

---

## 7. 툴(Tool) vs 커맨드(Command) — 절대 혼용 금지

이 두 개념은 완전히 다른 엔티티입니다. 혼용하면 잘못된 코드가 생성됩니다.

| 구분 | Tool (`ProjectTool`) | Command (`ProjectCommand`) |
|---|---|---|
| **DB 테이블** | `ProjectTool` | `ProjectCommand` |
| **사용 주체** | AI 에이전트 내부 | 유저 직접 호출 |
| **생성 주체** | AI 리플렉션 자동 생성 | **유저만** 생성 가능 |
| **슬래시 명령** | 없음 | `/command-name` 형태로 호출 |
| **hookEvent/hookScript** | 있음 | **없음** |
| **AI 자동 생성** | ✅ 허용 (`applyToolSuggestions`) | ❌ **절대 금지** |

**규칙**:
- `applyToolSuggestions` / `applyToolEnrichments` 는 AI 리플렉션 트리거에 연결 → OK
- `applyCommandSuggestions` 는 AI 리플렉션 트리거에 절대 연결하지 않음
- Command 관련 코드 수정 시 `prismaToolRepository` 를 참조하지 않음
- Tool 관련 코드 수정 시 `prismaCommandRepository` 를 참조하지 않음

---

## 8. Brain / MCP 개발 규칙

- `brief` 응답에는 태스크 통계(진행중·대기·완료)·활성 폴더 목록 포함 필수
- `start_task` 응답에는 `matchedSkills` 포함 필수
- 새 엔티티·중요 메타데이터 추가 시 `brief`·`start_task` 응답에도 함께 반영
- CLI/MCP 확장 정보는 에이전트가 읽을 수 있도록 명확히 출력

---

## 9. Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for this repository via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Domain docs use a single-context layout at the repository root. See `docs/agents/domain.md`.
