import Link from "next/link";
import type { ReactNode } from "react";

export function SiteShell({
  children,
  showMasthead = true,
}: {
  children: ReactNode;
  showMasthead?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-field-muted">
      {showMasthead ? (
        <header className="masthead-rule-thick bg-field-muted">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-8 sm:py-10">
            <Link href="/" className="block text-center">
              <h1 className="masthead-wordmark text-4xl font-normal text-ink sm:text-5xl md:text-6xl">
                Citizen Kane
              </h1>
            </Link>
          </div>
        </header>
      ) : null}
      {children}
      <footer className="border-t border-rule bg-field-muted py-8 text-center">
        <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-muted">
          Citizen Kane · verification
        </p>
        <p className="mx-auto mt-3 max-w-md font-sans text-xs leading-relaxed text-ink-muted">
          Transcription via AssemblyAI; analysis via the OpenAI API. Treat
          outputs as editorial aids, not affidavits.
        </p>
      </footer>
    </div>
  );
}
