import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/infrastructure/db/prisma";

export type UpdateProjectInput = {
  /** 빈 문자열이면 무시 (이름은 비울 수 없음) */
  title?: string;
  /** null 명시 시 DB 의 description 제거 */
  description?: string | null;
  /** null 명시 시 thumbnail 제거 */
  thumbnailUrl?: string | null;
  /** undefined: 변경 없음, null: 트리 제거, { tree }: 새 트리로 교체 */
  structure?: { tree?: unknown } | null;
};

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<void> {
  const data: Prisma.ProjectUpdateInput = {};
  if (input.title !== undefined && input.title.length > 0) {
    data.title = input.title;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.thumbnailUrl !== undefined) {
    data.thumbnailUrl = input.thumbnailUrl;
  }
  if (input.structure !== undefined) {
    data.structure =
      input.structure === null
        ? Prisma.JsonNull
        : (input.structure as Prisma.InputJsonValue);
  }
  await prisma.project.update({ where: { id }, data });
}
