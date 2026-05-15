export function isLocalhostCallback(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:") return false;
  const host = parsed.hostname;
  return host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1";
}
