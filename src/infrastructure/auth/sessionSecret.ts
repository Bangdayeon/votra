export function sessionSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error(
      "AUTH_SECRET 환경변수가 설정돼 있지 않거나 너무 짧아요. 16자 이상의 무작위 값을 .env 에 넣어주세요.",
    );
  }
  return new TextEncoder().encode(raw);
}
