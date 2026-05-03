import type { ReactNode } from "react";
import { FlowProvider } from "@/components/flow/FlowContext";
import { SiteShell } from "@/components/flow/SiteShell";
import { StepNav } from "@/components/flow/StepNav";

export default function FlowLayout({ children }: { children: ReactNode }) {
  return (
    <FlowProvider>
      <SiteShell>
        <StepNav />
        <main className="wip-shell mx-auto w-full max-w-6xl flex-1 border-b border-rule">
          {children}
        </main>
      </SiteShell>
    </FlowProvider>
  );
}
