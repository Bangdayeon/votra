-- PlatformSkill 데이터를 ProjectCustomSkill로 마이그레이션 (프로젝트별, enabled 상태 보존)
INSERT INTO "ProjectCustomSkill" (
  "id", "slug", "name", "description", "folder", "content",
  "patternSummary", "contextHint", "isEnabled", "projectId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  ps.slug,
  ps.name,
  ps.description,
  CASE ps.category
    WHEN 'coding' THEN '개발'
    WHEN 'process' THEN '프로세스'
    ELSE '기타'
  END,
  ps.content,
  NULL,
  ps."contextHint",
  COALESCE(psc.enabled, true),
  p.id,
  NOW(),
  NOW()
FROM "Project" p
CROSS JOIN "PlatformSkill" ps
LEFT JOIN "ProjectSkillConfig" psc
  ON psc."projectId" = p.id AND psc."skillSlug" = ps.slug
WHERE ps."isActive" = true AND ps.slug != 'brief'
ON CONFLICT ("projectId", slug) DO NOTHING;

-- 구 테이블 제거
DROP TABLE IF EXISTS "ProjectSkillConfig";
DROP TABLE IF EXISTS "PlatformSkill";
