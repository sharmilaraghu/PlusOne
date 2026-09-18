import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * A thrown Convex error inside a route used to unmount the whole tree and leave a
 * blank white page — which is what someone following a stale link to a wedding they
 * are not a member of actually saw. This says what happened and offers a way back.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    const raw = error instanceof Error ? error.message : String(error);
    // Convex prefixes server errors with a request id and stack; keep the sentence.
    const cleaned = raw.replace(/^\[.*?\]\s*/, "").split("\n")[0].trim();
    return { message: cleaned || "Something went wrong." };
  }

  componentDidCatch(error: unknown) {
    console.error("route error", error);
  }

  render() {
    if (this.state.message === null) return this.props.children;
    const notAMember = /not a member/i.test(this.state.message);
    return (
      <main id="main" className="grid min-h-[70dvh] place-items-center px-5 py-16">
        <div className="card max-w-[30rem] px-7 py-8 text-center">
          <h1 className="text-[1.8rem] leading-tight">
            {notAMember ? "This plan isn't yours to see" : "That didn't load"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {notAMember
              ? "You are signed in, but this wedding belongs to someone else. Ask them to invite you, or go back to your own."
              : this.state.message}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary" onClick={() => this.setState({ message: null })}>
              My weddings
            </Link>
            <button className="btn-quiet" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }
}
