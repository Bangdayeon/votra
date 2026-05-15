export type FolderNode = {
  name: string;
  color?: FolderColor;
  children?: FolderNode[];
  /** 이 노드를 초기에 펼친 상태로 둘지. 미지정 시 부모 FolderTree 의 defaultOpen 을 따라감 */
  defaultOpen?: boolean;
};

export type FolderColor =
  | "amber"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "rose"
  | "gray";
