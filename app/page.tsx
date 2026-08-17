"use client";

import { useState } from "react";
import type { SessionUser } from "@/types/domain";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { DesktopShell } from "@/components/desktop/DesktopShell";
import { authApi } from "@/lib/api/auth";

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  if (!user) return <LoginScreen onDone={setUser} />;
  return <DesktopShell user={user} onLogout={logout} />;
}
