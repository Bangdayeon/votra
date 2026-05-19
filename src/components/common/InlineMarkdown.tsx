import type { ReactNode } from "react";

/** `**bold**` 와 `` `code` `` 를 인라인 렌더링합니다. */
export function InlineMarkdown({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      parts.push(<strong key={key++}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]"
        >
          {m[3]}
        </code>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
