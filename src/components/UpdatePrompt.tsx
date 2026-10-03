import { useDeploymentUpdates } from "@convex-dev/static-hosting/react";

/**
 * Shown in a tab that was open when a new version was published. The old tab still
 * points at files that no longer exist, so the next screen it tries to load would
 * fail; reloading picks up the new version.
 */
export function UpdatePrompt() {
  const { updateAvailable, reload, dismiss } = useDeploymentUpdates();
  if (!updateAvailable) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-cream px-4 py-3 text-sm shadow-[0_18px_40px_-20px_rgba(40,50,42,0.5)]"
    >
      <p className="min-w-0 text-ink">PlusOne has been updated. Reload to get the new version.</p>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn-quiet btn-sm" onClick={dismiss}>Later</button>
        <button type="button" className="btn-primary btn-sm" onClick={reload}>Reload</button>
      </div>
    </div>
  );
}
