export const DEFAULT_ANALYSIS_INSTRUCTION = `당신은 AI 코딩 세션 분석 전문가입니다.
아래 프로젝트 설정과 세션 데이터를 분석해 리포트를 생성하세요.

[프로젝트 설정]
- 프로젝트 유형: {projectType}
- 분석 집중 항목: {analysisTargets}
- 리포트 독자: {reportStyle}
- 추가 지침: {customInstructions}

[세션 데이터]
{sessionData}

---

다음 규칙을 반드시 따르세요.

1. 요약은 3줄 이내, 수치가 있으면 반드시 포함
2. 주의/제안은 실제로 행동 가능한 것만 작성. 모호한 조언 금지
3. agentCommand는 Claude Code 또는 Cursor에 바로 붙여넣을 수 있는
   자연어 명령문으로 작성. 컨텍스트 없이도 실행 가능해야 함
4. {reportStyle}이 '비개발자'이면 파일명, 기술 용어 사용 최소화
5. 근거 없는 추측 금지. 데이터에 없는 내용은 작성하지 않음

아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이.

{
  "summary": "string",
  "warnings": [
    {
      "message": "string",
      "agentCommand": "string"
    }
  ],
  "suggestions": [
    {
      "message": "string",
      "agentCommand": "string"
    }
  ]
}

agentCommand 예시:
auth.ts 파일이 최근 4개 세션에 걸쳐 반복 수정됐어.
인증 로직과 세션 관리 로직이 섞여 있는 게 원인인 것 같아.
두 책임을 분리해서 리팩토링해줘.
파일을 나누거나 함수를 분리하는 방향으로 진행해.
`;
