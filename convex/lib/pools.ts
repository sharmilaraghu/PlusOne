import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

/** Low-parallelism pool for outbound email. Sends are never auto-retried
 *  (a retry could double-send); idempotency lives on the message row. */
export const emailPool = new Workpool(components.emailPool, {
  maxParallelism: 2,
  retryActionsByDefault: false,
});
