import { exposeDeploymentQuery } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";

/** Which build of the site is live, so open tabs can be told when a newer one is published. */
export const { getCurrentDeployment } = exposeDeploymentQuery(components.staticHosting);
