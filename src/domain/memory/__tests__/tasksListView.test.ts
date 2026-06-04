import { describe, expect, it } from "vitest";

import { filterTasks } from "@/domain/memory/filterTasks";
import { sortTasks } from "@/domain/memory/sortTasks";
import type { TaskFilterOptions, TaskRecord } from "@/domain/memory/types";

const defaultFilter: TaskFilterOptions = {
  hideDone: true,
  status: "ALL",
  userId: "ALL",
  priorityLevel: null,
  searchQuery: "",
  dateField: "createdAt",
};

function makeTask(overrides: Partial<TaskRecord> & { id: string }): TaskRecord {
  return {
    seq: 1,
    projectId: "project-1",
    userId: "user-1",
    userName: "민지",
    userProfileImage: null,
    userProfileColor: null,
    title: "태스크",
    description: null,
    status: "PENDING",
    module: null,
    priority: 0,
    sortOrder: 0,
    keyDecisions: [],
    outcome: null,
    folderId: null,
    memoryTier: "ACTIVE",
    accessCount: 0,
    lastAccessedAt: null,
    isPinned: false,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
    doneAt: null,
    deletedAt: null,
    ...overrides,
  };
}

describe("task list filtering", () => {
  it("완료와 취소 태스크를 기본 목록에서 숨긴다", () => {
    const tasks = [
      makeTask({ id: "pending", status: "PENDING" }),
      makeTask({ id: "done", status: "DONE" }),
      makeTask({ id: "cancelled", status: "CANCELLED" }),
    ];

    const filtered = filterTasks(tasks, defaultFilter);

    expect(filtered.map((task) => task.id)).toEqual(["pending"]);
  });

  it("중요도 필터는 priority 숫자를 레벨로 묶어서 비교한다", () => {
    const tasks = [
      makeTask({ id: "low", priority: 1 }),
      makeTask({ id: "medium", priority: 3 }),
      makeTask({ id: "high", priority: 6 }),
      makeTask({ id: "critical", priority: 7 }),
    ];

    const filtered = filterTasks(tasks, { ...defaultFilter, priorityLevel: 3 });

    expect(filtered.map((task) => task.id)).toEqual(["high"]);
  });

  it("기간 필터는 시작일 00:00부터 종료일 23:59:59까지 포함한다", () => {
    const tasks = [
      makeTask({ id: "before", createdAt: new Date(2026, 4, 9, 23, 59, 59) }),
      makeTask({ id: "start", createdAt: new Date(2026, 4, 10, 0, 0, 0) }),
      makeTask({ id: "end", createdAt: new Date(2026, 4, 12, 23, 59, 59) }),
      makeTask({ id: "after", createdAt: new Date(2026, 4, 13, 0, 0, 0) }),
    ];

    const filtered = filterTasks(tasks, {
      ...defaultFilter,
      dateFrom: new Date(2026, 4, 10),
      dateTo: new Date(2026, 4, 12),
    });

    expect(filtered.map((task) => task.id)).toEqual(["start", "end"]);
  });

  it("검색어는 제목, 설명, 생성자 이름에 적용된다", () => {
    const tasks = [
      makeTask({ id: "title", title: "릴리즈 준비" }),
      makeTask({ id: "description", description: "배포 노트 정리" }),
      makeTask({ id: "user", userName: "지훈" }),
      makeTask({ id: "miss", title: "문서 정리", description: "체크리스트" }),
    ];

    const filtered = filterTasks(tasks, { ...defaultFilter, searchQuery: "릴리즈" });

    expect(filtered.map((task) => task.id)).toEqual(["title"]);
  });
});

describe("task list sorting", () => {
  it("중요도순은 서버가 내려준 수동 순서를 유지한다", () => {
    const tasks = [
      makeTask({ id: "first", sortOrder: 20 }),
      makeTask({ id: "second", sortOrder: 10 }),
    ];

    const sorted = sortTasks(tasks, "priority");

    expect(sorted.map((task) => task.id)).toEqual(["first", "second"]);
    expect(sorted).not.toBe(tasks);
  });

  it("등록일순과 수정일순은 최신 항목부터 보여준다", () => {
    const tasks = [
      makeTask({ id: "old", createdAt: new Date("2026-05-01T00:00:00Z"), updatedAt: new Date("2026-05-03T00:00:00Z") }),
      makeTask({ id: "new", createdAt: new Date("2026-05-02T00:00:00Z"), updatedAt: new Date("2026-05-02T00:00:00Z") }),
    ];

    expect(sortTasks(tasks, "createdAt").map((task) => task.id)).toEqual(["new", "old"]);
    expect(sortTasks(tasks, "updatedAt").map((task) => task.id)).toEqual(["old", "new"]);
  });
});
