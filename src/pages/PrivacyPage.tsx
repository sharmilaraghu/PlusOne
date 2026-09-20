import { Link } from "react-router-dom";

/**
 * A plain account of what PlusOne stores and who it is shared with. Public, because
 * signing in with Google requires one, and because anyone should be able to read it.
 */
export function PrivacyPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-[44rem] px-5 py-12 md:px-8">
      <Link to="/" className="display text-2xl tracking-tight text-accent" aria-label="PlusOne home">
        Plus<em>One</em>
      </Link>
      <h1 className="mt-6 text-[2.2rem] leading-tight">Privacy</h1>
      <p className="mt-2 text-sm text-muted">Last updated 20 September 2026.</p>

      <div className="mt-8 grid gap-6 text-[0.98rem] leading-relaxed">
        <section>
          <h2 className="display text-xl">What PlusOne keeps</h2>
          <p className="mt-2 text-muted">
            The wedding you describe: your names, dates, city, budget and the days you are planning. The vendors PlusOne
            finds for you and what they write back. The guests you add, their email addresses, and their replies,
            including any dietary needs or allergies they mention. If you sign in with Google, your name, email address
            and profile picture. Nothing else.
          </p>
        </section>

        <section>
          <h2 className="display text-xl">Who else sees it</h2>
          <p className="mt-2 text-muted">
            Anyone you invite to plan with you. Vendors you contact see the emails PlusOne sends on your behalf: your
            names, your dates, your guest numbers, and, when they ask about food, how many guests have an allergy and
            what it is — never a guest's name or address. Your budget is only ever mentioned to a vendor who asks about
            price.
          </p>
        </section>

        <section>
          <h2 className="display text-xl">The services behind it</h2>
          <p className="mt-2 text-muted">
            PlusOne runs on Convex, which stores your plan. OpenAI reads vendor replies and writes emails. Firecrawl
            reads vendors' own web pages. AgentMail sends and receives your wedding's email. Each sees only what it
            needs for that job, and none of them is given your data to sell or train on.
          </p>
        </section>

        <section>
          <h2 className="display text-xl">Your choices</h2>
          <p className="mt-2 text-muted">
            You can edit or delete any guest, vendor or day at any time, and remove a wedding entirely from its settings.
            Deleting a wedding deletes its guests, vendors and emails with it. To have your account removed, or to ask
            what is held about you, write to the address below and it will be done.
          </p>
        </section>

        <section>
          <h2 className="display text-xl">Contact</h2>
          <p className="mt-2 text-muted">
            PlusOne is a small project built for the Convex All Gas Hackathon. Questions, requests and complaints all go
            to the address on the{" "}
            <a href="https://github.com/sharmilaraghu/PlusOne" className="text-accent underline underline-offset-2">
              project's GitHub page
            </a>
            .
          </p>
        </section>
      </div>

      <Link to="/" className="btn-quiet btn-sm mt-10">Back to PlusOne</Link>
    </main>
  );
}
