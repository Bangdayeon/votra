/**
 * `<user-comment>어쩌구</user-comment>` 같은 태그 래퍼만 벗기고
 * 안쪽 텍스트는 그대로 노출.
 */
export function formatUserCommand(raw: string): string {
  const stripped = raw.replace(/<\/?[a-zA-Z][\w-]*\b[^>]*\/?>/g, "");
  return stripped.trim() || "(빈 메시지)";
}
