export type DocLevel = "root" | "domain" | "leaf";

/**
 * 파일 경로를 보고 문서 레벨을 자동 분류해요.
 * 자동 분류가 틀릴 때는 overrideLevel 로 직접 지정할 수 있어요.
 */
export function classifyDocLevel(
  filePath: string,
  overrideLevel?: DocLevel,
): DocLevel {
  if (overrideLevel) return overrideLevel;

  const normalized = filePath.replace(/\\/g, "/");

  // src/ 없이 루트에 위치하거나, 경로 세그먼트가 1개 이하이면 루트 레벨
  const hasSrcPrefix = /(?:^|\/)src\//.test(normalized);
  if (!hasSrcPrefix) {
    const depth = normalized.split("/").filter(Boolean).length;
    if (depth <= 1) return "root";
  }

  // 말단 컴포넌트 패턴: components/X/Y, hooks/X/Y 처럼 중간 폴더가 1개 더 있는 경우
  const leafPattern =
    /(?:^|\/)(?:components|hooks|features|modules)\/[^/]+\/[^/]+(?:\/|$)/;
  if (leafPattern.test(normalized)) return "leaf";

  // 나머지는 도메인/기능 폴더 레벨
  return "domain";
}

const ROOT_GUIDELINE = `# AI 정책 문서 평가 기준 (루트 레벨)

다음 기준으로 각 문서를 평가하고, 각 항목마다 problem / warning / good 중 하나로 상태를 표기해요.

## 명령어·워크플로
빌드·테스트·배포 같은 핵심 명령어가 코드 펜스로 실행 가능한 형태로 적혀 있는지 봐요.
명령어가 없거나 산문으로만 설명돼 있으면 problem, 일부만 있으면 warning.

## 아키텍처 명료성
폴더 구조·레이어·의존 방향 등 코드베이스의 큰 그림을 한눈에 알 수 있는지 봐요.
구조 설명이 아예 없으면 problem, 일부 레이어만 설명됐으면 warning.

## 숨겨진 패턴
코드만 봐선 알기 어려운 함정·금지 사항·예외 규칙이 명시됐는지 봐요.
이런 내용이 전혀 없으면 warning. 문서 목적상 불필요한 경우 good으로 처리.

## 간결성
핵심만 담겨 있고 반복·중복 없이 압축됐는지 봐요.
300줄 이하 권장. 500줄 초과이거나 같은 내용이 반복되면 problem.

## 최신성
lastModified 기준으로 판단해요.
30일 이내면 good, 30~90일이면 warning, 90일 초과면 problem.
단, 최근 세션에서 해당 문서가 다루는 영역의 작업이 집중됐는데 문서가 오래됐다면 problem으로 상향.

## 실행 가능성
"무엇을 하라"는 구체적인 행동 지침이 단계·동사형으로 적혀 있는지 봐요.
지침이 모호하거나 수동태·명사형으로만 쓰여 있으면 warning.

## AI 맥락 친화성
AI가 세션 초반에 읽고 바로 행동할 수 있도록 구성됐는지 봐요.
중요 규칙이 앞쪽에 배치됐는지, 명시적 금지 표현("절대 ~하지 말 것")이 있는지,
예시 코드나 패턴이 포함됐는지를 기준으로 판단해요.
세 항목 중 두 개 이상 없으면 warning.`;

const DOMAIN_GUIDELINE = `# AI 정책 문서 평가 기준 (도메인/기능 폴더 레벨)

다음 기준으로 문서를 평가해요. 이 문서는 특정 도메인·기능 폴더에 위치하므로
명령어·워크플로보다 폴더의 책임 범위와 레이어 관계에 집중해요.

## 명령어·워크플로
이 폴더에 국한된 실행 명령어(예: 테스트 스크립트, 개별 dev 서버 등)가 있으면 코드 펜스로 적혀 있는지 봐요.
없어도 문서 목적상 불필요한 경우 good으로 처리. 있어야 하는데 산문으로만 설명됐으면 warning.

## 아키텍처 명료성
이 폴더(모듈)의 책임 범위, 다른 레이어와의 관계, 외부 의존 방향이 설명됐는지 봐요.
폴더 목적과 경계가 전혀 설명되지 않으면 problem, 일부만 설명됐으면 warning.

## 숨겨진 패턴
이 도메인·기능 영역에서 코드만 봐선 알기 어려운 함정·금지 사항·예외 규칙이 명시됐는지 봐요.
이런 내용이 전혀 없으면 warning. 문서 목적상 불필요한 경우 good으로 처리.

## 간결성
핵심만 담겨 있고 반복·중복 없이 압축됐는지 봐요.
200줄 이하 권장. 400줄 초과이거나 같은 내용이 반복되면 problem.

## 최신성
lastModified 기준으로 판단해요.
30일 이내면 good, 30~90일이면 warning, 90일 초과면 problem.

## 실행 가능성
이 폴더에서 작업할 때 "무엇을 하라"는 구체적인 행동 지침이 단계·동사형으로 적혀 있는지 봐요.
지침이 모호하거나 수동태·명사형으로만 쓰여 있으면 warning.

## AI 맥락 친화성
AI가 이 폴더의 작업을 시작할 때 바로 행동할 수 있도록 구성됐는지 봐요.
중요 규칙이 앞쪽에 배치됐는지, 명시적 금지 표현이 있는지,
예시 코드나 패턴이 포함됐는지를 기준으로 판단해요.
세 항목 중 두 개 이상 없으면 warning.`;

const LEAF_GUIDELINE = `# AI 정책 문서 평가 기준 (컴포넌트/단일 모듈 레벨)

이 문서는 단일 컴포넌트 또는 훅 수준에 위치해요.
명령어·워크플로, 전체 아키텍처는 평가하지 않고
아래 3가지만 집중적으로 봐요.

## 숨겨진 패턴
이 컴포넌트·모듈을 사용할 때 코드만 봐선 알기 어려운 주의사항·금지 사항·예외 케이스가 명시됐는지 봐요.
Props나 인터페이스의 비직관적인 동작, 사용 시 자주 실수하는 패턴이 적혀 있으면 good.
이런 내용이 전혀 없으면 warning.

## 실행 가능성
"이 컴포넌트를 이렇게 써라"는 구체적인 예시나 사용 지침이 있는지 봐요.
Props 설명, 사용 예시 코드, 주의사항이 동사형으로 적혀 있으면 good.
설명이 추상적이거나 누락됐으면 warning.

## AI 맥락 친화성
AI가 이 컴포넌트를 처음 볼 때 바로 올바르게 사용할 수 있도록 구성됐는지 봐요.
책임 범위(무엇을 하는 컴포넌트인지), 사용 시 금지 사항, Props·인터페이스 설명이
앞쪽에 명확하게 있으면 good. 두 개 이상 없으면 warning.`;

export function getDefaultAiSpecGuideline(level: DocLevel): string {
  switch (level) {
    case "root":
      return ROOT_GUIDELINE;
    case "domain":
      return DOMAIN_GUIDELINE;
    case "leaf":
      return LEAF_GUIDELINE;
  }
}

/** 설정 UI 플레이스홀더 — 루트 레벨 기준 유지. */
export const DEFAULT_AI_SPEC_GUIDELINE = ROOT_GUIDELINE;
