-- Add category column to PlatformSkill
ALTER TABLE "PlatformSkill" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'coding';

-- Seed default platform skills
INSERT INTO "PlatformSkill" ("slug", "name", "description", "category", "contextHint", "content", "isActive", "createdAt", "updatedAt")
VALUES
(
  'planner',
  'Planner',
  '작업 시작 전 계획 수립 및 태스크 분해',
  'coding',
  '복잡한 작업 요청 시 planner 스킬을 먼저 로드해 계획을 세우세요.',
  E'# Planner — 작업 계획 수립\n\n코드 작업 시작 전 반드시 이 스킬을 따르세요.\n\n## 체크리스트\n\n1. **목표 한 문장 정의** — "X를 구현/수정하여 Y를 달성한다" 형태로 명확히 합니다.\n2. **서브태스크 분해** — 2시간 이내 완료 가능한 단위로 쪼갭니다.\n3. **순서 결정** — 의존성 파악 후 실행 순서를 정합니다.\n4. **리스크 목록** — 불확실한 부분·잠재적 블로커를 미리 나열합니다.\n5. **유저 보고** — 실행 전 계획을 2-5문장으로 보고합니다.\n\n## 규칙\n\n- 계획이 3개 이상의 서브태스크라면 add_task로 먼저 등록합니다.\n- 불확실한 요구사항은 코드 작업 전 명확히 질문합니다.\n- 계획 중 더 간단한 방법이 있다면 제안합니다.',
  true,
  NOW(),
  NOW()
),
(
  'reviewer',
  'Code Reviewer',
  '코드 품질·보안·성능 리뷰 체크리스트',
  'coding',
  '코드 변경 완료 후 reviewer 스킬로 셀프 리뷰를 진행하세요.',
  E'# Code Reviewer — 코드 리뷰 체크리스트\n\n## 정확성\n- [ ] 엣지 케이스(null, 빈 배열, 0, 음수)를 처리하는가?\n- [ ] 비동기 에러가 적절히 처리되는가?\n- [ ] 레이스 컨디션 가능성은 없는가?\n\n## 보안\n- [ ] 사용자 입력이 검증/이스케이프되는가?\n- [ ] 민감 정보가 로그에 노출되지 않는가?\n- [ ] 권한 체크가 올바르게 되는가?\n\n## 성능\n- [ ] N+1 쿼리가 없는가?\n- [ ] 불필요한 렌더링/재계산이 없는가?\n- [ ] 큰 데이터셋 처리 시 페이지네이션이 있는가?\n\n## 유지보수성\n- [ ] 함수가 단일 책임을 갖는가?\n- [ ] 네이밍이 명확한가?\n- [ ] 주석 없이도 이해 가능한가?\n\n각 체크리스트 항목에서 문제 발견 시 구체적인 코드 위치와 수정 방법을 제시합니다.',
  true,
  NOW(),
  NOW()
),
(
  'debugger',
  'Debugger',
  '버그 추적 및 근본 원인 분석',
  'coding',
  '재현되지 않는 버그나 원인 불명의 에러를 만나면 debugger 스킬을 로드하세요.',
  E'# Debugger — 버그 추적 및 진단\n\n## 진단 순서\n\n1. **증상 재현** — 버그를 최소한의 단계로 재현합니다.\n2. **범위 좁히기** — 이분 탐색으로 문제 코드를 좁힙니다.\n3. **가설 수립** — 원인 후보를 3개 이내로 나열합니다.\n4. **가설 검증** — 각 가설을 체계적으로 검증합니다.\n5. **근본 원인 파악** — 증상이 아닌 근본 원인을 찾습니다.\n6. **수정 후 검증** — 수정 후 동일 조건에서 재현 안 됨을 확인합니다.\n\n## 자주 놓치는 부분\n\n- 비동기 타이밍 문제 (Promise 체이닝, race condition)\n- 클로저에 의한 예상치 못한 값 캡처\n- 타입 강제 변환 (`==` vs `===`, null vs undefined)\n- 환경 차이 (개발 vs 프로덕션, OS별 경로 구분자)\n- 캐시/메모이제이션에 의한 스테일 데이터\n\nrecall로 유사 버그의 과거 해결 사례를 먼저 검색합니다.',
  true,
  NOW(),
  NOW()
),
(
  'git-commit',
  'Git Commit',
  '커밋 메시지 작성 가이드',
  'process',
  '커밋 전 git-commit 스킬로 메시지 형식을 확인하세요.',
  E'# Git Commit — 커밋 메시지 작성\n\n## 형식\n\n```\n<type>(<scope>): <subject>\n\n[body - 선택사항]\n```\n\n## Type 목록\n\n- `feat` — 새 기능\n- `fix` — 버그 수정\n- `refactor` — 기능 변경 없는 리팩터\n- `perf` — 성능 개선\n- `test` — 테스트 추가/수정\n- `docs` — 문서 변경\n- `chore` — 빌드·설정 변경\n- `style` — 코드 포맷팅\n\n## 규칙\n\n- subject는 한국어, 50자 이내, 마침표 없음\n- 명령문 형태 ("추가했다" ✗ → "추가" ✓)\n- WHY가 자명하지 않으면 body에 설명 추가\n- 하나의 커밋 = 하나의 논리적 변경\n\n## 예시\n\n```\nfeat(auth): 소셜 로그인 GitHub OAuth 연동\nfix(tasks): 태스크 삭제 후 목록 미갱신 수정\nrefactor(domain): filterTasks 순수 함수로 분리\n```',
  true,
  NOW(),
  NOW()
),
(
  'pr-writer',
  'PR Writer',
  'Pull Request 설명 작성 템플릿',
  'process',
  'PR 생성 전 pr-writer 스킬로 본문을 작성하세요.',
  E'# PR Writer — Pull Request 작성\n\n## PR 제목\n\n`<type>: <변경 내용 요약>` (70자 이내)\n\n## PR 본문 템플릿\n\n```markdown\n## 변경 사항\n- \n\n## 이유\n<!-- 왜 이 변경이 필요한가? -->\n\n## 테스트 방법\n- [ ] \n- [ ] \n\n## 스크린샷 (UI 변경 시)\n\n## 관련 태스크\n<!-- #태스크번호 -->\n```\n\n## 체크리스트\n\n- [ ] 변경 범위가 PR 제목과 일치하는가?\n- [ ] 불필요한 파일(.env, 로그)이 포함되지 않았는가?\n- [ ] 마이그레이션이 필요한 경우 포함됐는가?\n- [ ] 테스트가 추가/업데이트됐는가?',
  true,
  NOW(),
  NOW()
),
(
  'perf-audit',
  'Performance Audit',
  '성능 병목 분석 및 최적화 체크리스트',
  'analysis',
  '응답이 느리거나 번들이 크다면 perf-audit 스킬로 점검하세요.',
  E'# Performance Audit — 성능 분석\n\n## 프론트엔드\n\n### 렌더링\n- 불필요한 리렌더링 원인: props 참조 동일성, useCallback/useMemo 의존성 배열\n- React DevTools Profiler로 렌더링 횟수 확인\n- 큰 리스트: 가상화 적용 여부 검토\n\n### 번들\n- 다이나믹 임포트로 코드 스플리팅 가능한지 확인\n- 무거운 라이브러리 대체재 검토\n\n### 네트워크\n- Waterfall 분석: 직렬 요청 → 병렬로 전환\n- 캐시 전략: staleTime/revalidate 설정\n\n## 백엔드\n\n### 쿼리\n- EXPLAIN ANALYZE로 느린 쿼리 분석\n- N+1 패턴: 중첩 루프 내 DB 호출 찾기\n- 인덱스 누락: 자주 조회되는 컬럼 확인\n\n### API\n- 필요한 컬럼만 SELECT하는가?\n- 페이지네이션 없이 전체 조회하는가?\n\n## 원칙\n\n최적화 전 반드시 측정합니다. 추측으로 최적화하지 않습니다.',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "contextHint" = EXCLUDED."contextHint",
  "content" = EXCLUDED."content",
  "updatedAt" = NOW();
