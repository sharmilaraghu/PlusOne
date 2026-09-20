import { v, type PropertyValidators } from "convex/values";
import {
  activityFields,
  chatMessageFields,
  contractCheckFields,
  budgetLineFields,
  eventFields,
  guestFields,
  inviteFields,
  memberFields,
  messageFields,
  quoteFields,
  researchRunFields,
  threadFields,
  vendorFields,
  vendorSlotFields,
  weddingFields,
} from "../schema";

/** Build a full document validator (fields + system fields) for `returns`. */
function doc<T extends string, F extends PropertyValidators>(table: T, fields: F) {
  return v.object({ _id: v.id(table), _creationTime: v.number(), ...fields });
}

export const weddingDoc = doc("weddings", weddingFields);
export const memberDoc = doc("members", memberFields);
export const inviteDoc = doc("invites", inviteFields);
export const eventDoc = doc("events", eventFields);
export const vendorSlotDoc = doc("vendorSlots", vendorSlotFields);
export const vendorDoc = doc("vendors", vendorFields);
export const researchRunDoc = doc("researchRuns", researchRunFields);
export const threadDoc = doc("threads", threadFields);
export const messageDoc = doc("messages", messageFields);
export const quoteDoc = doc("quotes", quoteFields);
export const budgetLineDoc = doc("budgetLines", budgetLineFields);
export const guestDoc = doc("guests", guestFields);
export const activityDoc = doc("activity", activityFields);
export const chatMessageDoc = doc("chatMessages", chatMessageFields);
export const contractCheckDoc = doc("contractChecks", contractCheckFields);

/** Public projection of a user (never expose auth internals). */
export const userSummary = v.object({
  _id: v.id("users"),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  /** Profile photo, when they signed in with Google. */
  image: v.optional(v.string()),
  /** A readable name made from their address, for accounts that never gave one. */
  nameFromEmail: v.optional(v.string()),
});
