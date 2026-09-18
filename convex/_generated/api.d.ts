/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as agentmail from "../agentmail.js";
import type * as auth from "../auth.js";
import type * as budget from "../budget.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as firecrawl from "../firecrawl.js";
import type * as followups from "../followups.js";
import type * as guests from "../guests.js";
import type * as http from "../http.js";
import type * as inbound from "../inbound.js";
import type * as invites from "../invites.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_budget from "../lib/budget.js";
import type * as lib_docs from "../lib/docs.js";
import type * as lib_pools from "../lib/pools.js";
import type * as lib_svix from "../lib/svix.js";
import type * as lib_templates from "../lib/templates.js";
import type * as lib_text from "../lib/text.js";
import type * as lib_validators from "../lib/validators.js";
import type * as maintenance from "../maintenance.js";
import type * as members from "../members.js";
import type * as messages from "../messages.js";
import type * as openai from "../openai.js";
import type * as outreach from "../outreach.js";
import type * as quotes from "../quotes.js";
import type * as research from "../research.js";
import type * as slots from "../slots.js";
import type * as threads from "../threads.js";
import type * as users from "../users.js";
import type * as vendors from "../vendors.js";
import type * as weddings from "../weddings.js";
import type * as workflows from "../workflows.js";
import type * as zzScratchVerify from "../zzScratchVerify.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  agentmail: typeof agentmail;
  auth: typeof auth;
  budget: typeof budget;
  crons: typeof crons;
  events: typeof events;
  firecrawl: typeof firecrawl;
  followups: typeof followups;
  guests: typeof guests;
  http: typeof http;
  inbound: typeof inbound;
  invites: typeof invites;
  "lib/auth": typeof lib_auth;
  "lib/budget": typeof lib_budget;
  "lib/docs": typeof lib_docs;
  "lib/pools": typeof lib_pools;
  "lib/svix": typeof lib_svix;
  "lib/templates": typeof lib_templates;
  "lib/text": typeof lib_text;
  "lib/validators": typeof lib_validators;
  maintenance: typeof maintenance;
  members: typeof members;
  messages: typeof messages;
  openai: typeof openai;
  outreach: typeof outreach;
  quotes: typeof quotes;
  research: typeof research;
  slots: typeof slots;
  threads: typeof threads;
  users: typeof users;
  vendors: typeof vendors;
  weddings: typeof weddings;
  workflows: typeof workflows;
  zzScratchVerify: typeof zzScratchVerify;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  emailPool: import("@convex-dev/workpool/_generated/component.js").ComponentApi<"emailPool">;
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
