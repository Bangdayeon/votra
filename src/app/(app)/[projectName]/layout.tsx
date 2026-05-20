import { ProjectHeader } from "@/components/project/ProjectHeader";

export default function ProjectNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ProjectHeader />
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
