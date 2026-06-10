# Architecture Notes

Key decisions and constraints for AI agents working on this codebase.

---

## Real-time Updates (SSE)

**File**: `src/app/api/projects/[projectId]/events/route.ts`  
**Hook**: `src/hooks/useProjectEvents.ts`  
**Bus**: `src/infrastructure/events/projectEventBus.ts`

The client opens a Server-Sent Events connection. The server has two update paths:

| Path | Mechanism | Latency |
|------|-----------|---------|
| Same-instance | In-memory listener (`subscribeProject`) | Immediate |
| Cross-instance | DB poll on `Project.activityAt` every 4s | ≤ 4s |

When you call `emitProjectUpdate(projectId)`, it fires in-memory listeners AND updates `Project.activityAt` in the DB (best-effort, non-blocking). The SSE route polls `activityAt` to catch events from other instances.

**Rule**: Always call `emitProjectUpdate(projectId)` after any write that should refresh the UI. Never skip it even if you think the client will refetch — the SSE channel is the only real-time signal.

---

## Component Split: TasksTab

`src/components/memory/TasksTab.tsx` is the main task view. Its sub-components live in `src/components/memory/tasks/`:

| File | Contents |
|------|---------|
| `taskConstants.ts` | Shared constants, types, pure helpers (`fmtDate`, `getFolderColors`, etc.) |
| `FolderIconDisplay.tsx` | Folder icon renderer |
| `StatusIcon.tsx` | Task status icon (PENDING / IN_PROGRESS / DONE / CANCELLED) |
| `FilterDropdown.tsx` | Generic filter dropdown |
| `CreateTaskDialog.tsx` | New-task dialog with AI tool suggestion |
| `FolderDialogs.tsx` | Create + Edit folder dialogs |
| `FolderCard.tsx` | Folder card + sortable wrapper (drag-and-drop) |
| `TaskRow.tsx` | Expandable task row with inline actions |

When adding a new UI element to the task view, place it in the most specific sub-file above. Only add to `TasksTab.tsx` if it requires access to the top-level state machine.

---

## Security: API Key Routes

Routes under `/api/memory/*` and `/api/tools/*` authenticate via API key (`resolveUserFromApiKey`). After resolving the user, always call `assertApiKeyProjectAccess(userId, projectId)` before accessing project data:

```typescript
const access = await assertApiKeyProjectAccess(user.id, body.projectId);
if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
```

**File**: `src/infrastructure/auth/assertApiKeyProjectAccess.ts`

Skipping this check allows any valid API key holder to read/write any project.

---

## Application Layer: LLM Computation Helpers

AGENTS.md says "use cases don't call other use cases." There is an intentional exception for pure LLM computation helpers that have no transaction boundary and perform no DB operations:

| Helper | Called from | Role |
|--------|------------|------|
| `getProjectAiSummary` | `refreshProjectAiSummary` | Builds LLM prompt, calls `llm.complete`, parses JSON response |
| `getProjectNextTasks` | `refreshProjectNextTasks` | Same pattern for next-task recommendations |

These helpers are stateless functions that take data in and return computed results out. They are not use cases — they have no DB side effects and no transaction boundary. Extracting them keeps the LLM prompt logic independently testable without the DB setup that `refresh*` use cases require.

**Rule**: Do not add DB calls inside `getProjectAiSummary` or `getProjectNextTasks`. If you need to persist something, do it in the calling `refresh*` use case.

---

## Search: Hybrid Vector + Keyword (RRF)

Task recall uses Reciprocal Rank Fusion over two result sets:

1. **Vector search** — `Task.embedding` (768-dim, Gemini embedding-001, HNSW index)
2. **Keyword search** — ILIKE on title/description/keyDecisions (GIN index on keyDecisions array)

RRF formula: `score = Σ 1 / (60 + rank)`. Results sorted by combined score.

Embeddings are generated asynchronously after task completion (`/api/memory/tasks/[taskId]/finish`). New tasks have no embedding until their finish endpoint is called. The keyword fallback handles them in the meantime.

**Migration**: `prisma/migrations/20260610000000_add_task_embedding_gin_index/migration.sql`
