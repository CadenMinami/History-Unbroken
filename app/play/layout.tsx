import type { ReactNode } from "react";

import { CaseSessionProvider } from "@/components/case-session/case-session-provider";

export default function PlayLayout({ children }: { children: ReactNode }) {
  return <CaseSessionProvider>{children}</CaseSessionProvider>;
}
