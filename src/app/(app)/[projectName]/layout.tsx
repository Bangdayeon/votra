import { ProjectHeader } from "@/components/project/ProjectHeader";

export default function ProjectNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <ProjectHeader />
      {children}
    </div>
  );
}
