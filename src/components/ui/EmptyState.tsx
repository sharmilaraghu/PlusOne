import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function EmptyState({
  icon = "heart",
  title,
  body,
  action,
  compact = false,
}: {
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  body?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`grid justify-items-center gap-2 text-center ${compact ? "py-6" : "card px-6 py-12"}`}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={20} />
      </span>
      <p className="display mt-1 text-xl">{title}</p>
      {body && <p className="max-w-[34rem] text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
