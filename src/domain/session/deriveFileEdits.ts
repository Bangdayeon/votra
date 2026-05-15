export type FileEditChange = { before: string; after: string };

/**
 * Edit / Write / MultiEdit / NotebookEdit toolInput → 좌(원본)/우(편집본) 페어.
 * 의미 있는 값이 없으면 undefined.
 */
export function deriveFileEdits(
  toolName: string,
  toolInput: unknown,
): FileEditChange[] | undefined {
  if (!toolInput || typeof toolInput !== "object") return undefined;
  const obj = toolInput as Record<string, unknown>;

  switch (toolName) {
    case "Edit": {
      const before = readStr(obj, "old_string");
      const after = readStr(obj, "new_string");
      if (before === null && after === null) return undefined;
      return [{ before: before ?? "", after: after ?? "" }];
    }
    case "Write": {
      const after = readStr(obj, "content");
      if (after === null) return undefined;
      return [{ before: "", after }];
    }
    case "MultiEdit": {
      const edits = Array.isArray(obj.edits) ? obj.edits : [];
      const out: FileEditChange[] = [];
      for (const e of edits) {
        if (!e || typeof e !== "object") continue;
        const eo = e as Record<string, unknown>;
        const before = readStr(eo, "old_string");
        const after = readStr(eo, "new_string");
        if (before === null && after === null) continue;
        out.push({ before: before ?? "", after: after ?? "" });
      }
      return out.length > 0 ? out : undefined;
    }
    case "NotebookEdit": {
      const after = readStr(obj, "new_source");
      if (after === null) return undefined;
      return [{ before: "", after }];
    }
  }
  return undefined;
}

function readStr(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" ? v : null;
}
