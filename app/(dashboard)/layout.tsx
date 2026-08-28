import type { ReactNode } from "react";

import { Shell } from "@/components/dashboard/shell";

/**
 * Every screen in this group renders inside the authenticated shell, so no page
 * has to think about sign-in state or roles — by the time it renders, Convex has
 * confirmed an active staff row.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
