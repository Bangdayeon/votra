export const DEFAULT_AGENT_CONTEXT_FLOW_PROMPT = `아래 입력을 분석해 AI 프롬프트의 문제와 개선안을 진단하세요.

<team_policy>{{team_policy}}</team_policy>
<project_policy>{{project_policy}}</project_policy>
<context_files>{{context_files}}</context_files>
<session_stats>{{session_stats}}</session_stats>
<conversation_patterns>{{conversation_patterns}}</conversation_patterns>

평가 기준:
- 정책 불일치, 문서 간 중복·충돌
- 반복 요청·설명 패턴에서 감지된 누락 컨텍스트

규칙:
- 진단 항목 최대 2개, 제안 항목 최대 2개
- 각 항목은 반드시 1줄 (한 문장)
- 코드블록·예시·부가 설명 금지
- 문제 없는 항목은 출력하지 않음

아래 형식으로만 응답하세요.

🩺 진단 내용

* [가장 심각한 문제]
* [두 번째 문제 — 없으면 생략]

💬 제안 내용

* [구체적 개선 행동 1줄]
* [두 번째 제안 — 없으면 생략]`;
