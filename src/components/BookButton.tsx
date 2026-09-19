import { useState } from "react";

/**
 * "Book" with a moment to confirm, and a choice about who hears about it. Left on,
 * PlusOne emails the chosen vendor for next steps and thanks everyone else it
 * contacted for this need; turned off, it just records a booking made elsewhere.
 */
export function BookButton({
  vendorName,
  onBook,
  label = "Mark booked",
  className = "btn-primary btn-sm",
  disabled,
  note,
}: {
  vendorName: string;
  onBook: (notify: boolean) => Promise<unknown>;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** An extra line, e.g. what goes onto the budget. */
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className={`${className} whitespace-nowrap`} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="w-[17rem] rounded-[14px] border border-line bg-paper p-3 text-left shadow-[0_14px_30px_-18px_rgba(70,35,35,0.45)]">
      <p className="text-sm font-medium">Book {vendorName}?</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      <label className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <input type="checkbox" className="mt-0.5" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        <span>Let PlusOne tell {vendorName} you'd like to go ahead, and thank the others who quoted.</span>
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="btn-quiet btn-sm" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary btn-sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onBook(notify).finally(() => {
              setBusy(false);
              setOpen(false);
            });
          }}
        >
          {busy ? "Booking…" : "Book"}
        </button>
      </div>
    </div>
  );
}
