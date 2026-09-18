import type { ReactNode } from "react";

/** One heading, one meta line, one optional action. Every app page uses this so sizes stop drifting. */
export function PageHeader({ title, meta, action }: { title: ReactNode; meta?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[2rem] leading-tight md:text-[2.4rem]">{title}</h1>
        {meta && <p className="mt-1.5 text-sm text-muted">{meta}</p>}
      </div>
      {action}
    </header>
  );
}
