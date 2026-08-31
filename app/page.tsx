"use client";

import { useState } from "react";
import type { SessionUser } from "@/types/domain";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { DesktopShell } from "@/components/desktop/DesktopShell";
import { authApi } from "@/lib/api/auth";
import { ensureSyncfusionViLocale } from "@/lib/syncfusion-vi";

// Chạy trước khi bất kỳ Grid nào render — L10n.load chỉ ghi vào từ điển tĩnh,
// Syncfusion đọc lúc render nên gọi ở root là đủ cho mọi window.
ensureSyncfusionViLocale();

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  if (!user) return <LoginScreen onDone={setUser} />;
  return <DesktopShell user={user} onLogout={logout} />;
}
