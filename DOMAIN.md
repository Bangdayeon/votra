# Haema — 도메인 비즈니스 문서 (에이전트용)

AI 에이전트가 이 코드베이스의 비즈니스 로직을 빠르게 파악하기 위한 레퍼런스.
코드 스타일/아키텍처 규칙은 `AGENTS.md` 참고.

---

## 서비스 개요

Haema는 **개발자 팀을 위한 AI 기반 프로젝트 관리 플랫폼**이다.

- 웹 대시보드 (Next.js) + CLI MCP 서버 양방향 동기화
- 태스크 추적, 핵심 결정 기록, AI 프로젝트 분석
- Google Gemini 2.5-flash 기반 요약/추천
- 한국어 전용 UI

---

## 핵심 엔터티

### User
```
id, email, name
passwordHash (bcrypt, nullable — axhub/Google SSO 가입자는 null)
axhubUserId (axhub SSO 연동)
googleId (Google OAuth 연동)
profileColor | profileImage (프로필 표시, 둘 중 하나만 사용)
```

### Project
```
id, title, description
cwd: string | null       — 로컬 폴더 절대경로 (Git 커밋 조회, 경로 표시용)
structure: Json | null   — 폴더 트리/아키텍처 자유형 JSON
settings: ProjectSettings — AI 분석 설정 (아래 참고)
ownerId
```

**ProjectSettings** (`src/domain/project/settings/types.ts`):
```typescript
{
  ai: {
    analysisInstruction: string  // AI 요약 시 추가 지시 (max 8000자)
    nextTaskPrompt: string       // 다음 작업 추천 커스텀 프롬프트 (max 1000자)
    autoRefreshHour: 0–23 | null // KST 기준 매일 자동 갱신 시각. null=비활성
  }
}
```

### Task
```
seq: Int (autoincrement, 전역 고유)  — UI에서 #N 형태로 참조
title (max 80자), description (max 2000자, nullable)
status: PENDING | IN_PROGRESS | DONE | CANCELLED
module: string | null   — 스킬 slug (예: "backend", "frontend")
priority: Int (0–10+)   — 0=없음, 1=Low, 2-3=Medium, 4-6=High, 7+=Critical
sortOrder: Float        — 드래그&드롭 수동 정렬. 0=미설정(맨 뒤)
keyDecisions: string[]  — 완료 시 LLM이 추출한 핵심 결정. recall 검색 대상
outcome: string | null  — 완료 시 "실제로 무엇을 했는지" 자유 서술
doneAt: DateTime | null — DONE/CANCELLED 전환 시각
deletedAt: DateTime | null — 휴지통 이동 시각. 12일 후 자동 영구 삭제
```

**우선도 레벨 매핑** (`src/domain/memory/getTaskPriorityLevel.ts`):
| priority 값 | 레벨 | 표시 색상 |
|------------|------|---------|
| 0 | None (0) | 배지 없음 |
| 1 | Low (1) | green |
| 2–3 | Medium (2) | yellow |
| 4–6 | High (3) | orange |
| 7+ | Critical (4) | red |

### TaskFolder
```
name, icon (lucide 아이콘명), color (gray/red/orange/yellow/green/blue/purple/pink/cyan)
sortOrder: Float  — 드래그&드롭 정렬
```
folderId=null인 태스크 = "미분류" 그룹.

### PlatformSkill / ProjectSkillConfig
```
PlatformSkill: slug(PK), name, description, category(coding|process|analysis),
               contextHint, content(MD 본문), isActive(Haema 팀 전체 비활성화 가능)

ProjectSkillConfig: (projectId, skillSlug) → enabled(사용자 토글, 기본 true)
```
스킬은 태스크의 `module` 필드 값으로 사용되며, CLI `brief` 응답에 활성 스킬 목록이 포함된다.

### ProjectAiSummary / ProjectAiNextTask
```
ProjectAiSummary:
  summary: string (한국어)
  warnings: [{ message, agentCommand }]
  suggestions: [{ message, agentCommand }]
  refreshedAt: DateTime

ProjectAiNextTask:
  tasks: string[]  — 1~3개의 추천 작업 문자열
  refreshedAt: DateTime
```
두 캐시 모두 사용자가 "업데이트" 버튼을 누를 때만 갱신 (토큰 절약).
`autoRefreshHour` 설정 시 cron `/api/cron/auto-refresh`가 매일 자동 갱신.

### ProjectMember / ProjectInvite
```
ProjectMember: role(OWNER | MEMBER), joinedAt
ProjectInvite: token, email?, expiresAt, acceptedAt — 링크 기반 초대
```

### ApiKey
```
hashedSecret: sha256(plaintext) hex
평문은 생성 시 1회만 노출. CLI가 Bearer 토큰으로 사용.
```

---

## 상태 머신

### Task 상태 전이
```
PENDING ──── start ───→ IN_PROGRESS ──── finish ───→ DONE
   ↑                         │                         │
   └──────── undo ────────────┘                         │
                              └──── cancel ──→ CANCELLED │
                                                         │
                              (soft delete) ─────────────┘
                              deletedAt 설정 → 12일 후 purge
```

- `finishTask`: status=DONE + doneAt 설정 + (선택) keyDecisions/outcome LLM 추출
- UI에서 상태 아이콘 클릭 시 NEXT_STATUS 매핑으로 순환: PENDING→IN_PROGRESS→DONE→PENDING

---

## 핵심 워크플로우

### 태스크 완료 + keyDecisions 추출
1. `updateTaskStatus(seq, "DONE")`
2. `finishTask` 호출 → LLM에게 "이 태스크의 핵심 결정 3가지" 요청
3. `Task.keyDecisions[]` 저장
4. `recall` API로 키워드 검색 가능

### AI 프로젝트 분석
```
입력: 진행 중/대기/완료 태스크 + Git 커밋 히스토리(cwd 설정 시)
      + ProjectSettings.ai.analysisInstruction (커스텀 지시)
→ Gemini API → { summary, warnings[], suggestions[] }
→ ProjectAiSummary 캐시 저장
```

### CLI 브리핑 응답 구조 (`GET /api/memory/brief`)
```json
{
  "projectTitle": "...",
  "cwd": "/Users/...",
  "pendingTasks": [...],
  "inProgressTasks": [...],
  "recentDecisions": [...],    // keyDecisions가 있는 최근 완료 태스크
  "recentlyDone": [...],
  "recentlyModified": [...],
  "folders": [...],
  "availableSkills": [...],
  "recommendedNextTasks": [...],
  "aiSummary": { "summary": "...", "warnings": [...], "suggestions": [...] }
}
```

---

## CLI API 엔드포인트

인증: `Authorization: Bearer <api-key-plaintext>`
프로젝트 식별: `?projectId=<id>` 또는 `?cwd=<path>`

| 메서드 | 경로 | 설명 |
|-------|------|------|
| GET | `/api/memory/brief` | 프로젝트 현황 요약 |
| GET | `/api/memory/tasks` | 태스크 목록 조회 |
| POST | `/api/memory/tasks` | 태스크 생성 |
| GET | `/api/memory/tasks/:taskId` | 태스크 상세 |
| PATCH | `/api/memory/tasks/:taskId` | 태스크 수정 |
| POST | `/api/memory/tasks/start` | 태스크 생성 + IN_PROGRESS |
| POST | `/api/memory/tasks/:taskId/finish` | 태스크 완료 처리 |
| GET | `/api/memory/folders` | 폴더 목록 |
| POST | `/api/memory/folders` | 폴더 생성 |
| GET | `/api/memory/skills` | 활성 스킬 목록 |
| GET | `/api/memory/thoughts/search?q=` | keyDecisions 키워드 검색 |
| POST | `/api/memory/init-project` | 프로젝트 초기화 (cwd 기준) |
| GET | `/api/memory/resolve-project` | cwd로 프로젝트 ID 조회 |

---

## 인증 방식

| 방식 | 설명 |
|------|------|
| axhub SSO | `/auth/axhub` → x-apphub-user-* 헤더 또는 axhub API로 사용자 확인 |
| Google OAuth | `/api/auth/google` → `/api/auth/google/callback` |
| 이메일/비밀번호 | bcrypt 검증 → JWT 세션 쿠키 |
| API 키 (CLI) | sha256 해시 비교. 평문은 생성 시 1회 노출 |

세션: `jose` JWT → HttpOnly 쿠키. 서버 액션은 `currentUser()` 호출로 검증.
권한 검증 함수: `assertProjectOwner`, `assertProjectMember`, `assertOwnedProject`

---

## 레이어 의존 방향

```
app/ (routes, server actions)  ─┐
components/ (React UI)          ├─→ application/ → domain/
                                └─→ infrastructure/ → application/, domain/
shared/  (의존 없음)
```

금지:
- `domain/`에서 React / Next / Prisma import
- `components/`에서 직접 Prisma 호출 (server action 경유)
- `application/`에서 `infrastructure/` 구현체 직접 import (port 인터페이스 사용)

---

## 실시간 동기화

`src/infrastructure/events/projectEventBus.ts` — WebSocket 기반 프로젝트 이벤트 버스.
태스크/폴더 변경 시 같은 프로젝트를 보는 모든 클라이언트에 브로드캐스트.
클라이언트: `useProjectEvents` hook으로 구독.
