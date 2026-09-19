import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

// The browser's type="email" check is easy to bypass, so the server decides.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the deployment env.
    Google,
    Password<DataModel>({
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!EMAIL_RE.test(email)) {
          throw new ConvexError("Enter a valid email address.");
        }
        return { email };
      },
    }),
  ],
});
