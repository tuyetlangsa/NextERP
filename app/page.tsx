"use client";

import { useState } from "react";
import type { SessionUser } from "@/types/domain";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { DesktopShell } from "@/components/desktop/DesktopShell";

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  if (!user) return <LoginScreen onDone={setUser} />;
  return <DesktopShell user={user} />;
}
