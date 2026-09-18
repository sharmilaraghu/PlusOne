// Hairline icon set for PlusOne, 1.5px stroke, drawn to match the approved comp.
type Name = "home" | "people" | "mail" | "guests" | "arrow" | "search" | "pen" | "send" | "reply" | "check" | "close" | "heart";

const paths: Record<Name, string> = {
  home: "M4 11.2 12 4.5l8 6.7M6.2 9.6V19.5h11.6V9.6M10 19.5v-5h4v5",
  people: "M9 11a3.4 3.4 0 1 0 0-6.8A3.4 3.4 0 0 0 9 11Zm-6 8.5a6 6 0 0 1 12 0M16.2 10.6a2.9 2.9 0 1 0-.8-5.7M17.2 14.3a5.3 5.3 0 0 1 3.8 5.2",
  mail: "M3.5 6.5h17v11h-17zM3.8 7l8.2 6.2L20.2 7",
  guests: "M8 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.8 19.5a5.2 5.2 0 0 1 10.4 0M10.8 19.5a5.2 5.2 0 0 1 10.4 0",
  arrow: "M4 12h15m-5.5-5.5L19 12l-5.5 5.5",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.8-1.7L20 20",
  pen: "M4 20l4.2-1 10.3-10.3a2.1 2.1 0 0 0-3-3L5.2 16 4 20Zm9.5-12.5 3 3",
  send: "M20.5 3.5 3.5 10.6l6.8 2.6 2.6 6.8 7.6-16.5ZM10.3 13.2l4.4-4.4",
  reply: "M9.5 7 4 12l5.5 5M4.5 12H14a6 6 0 0 1 6 6v1",
  check: "M4.5 12.5 9.5 17.5 19.5 6.5",
  close: "M6 6l12 12M18 6 6 18",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z",
};

export function Icon({ name, size = 22, className = "" }: { name: Name; size?: number | string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}
