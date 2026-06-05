"use client";

import { useState } from "react";
import { authApi } from "@/lib/api/auth";
import type { SessionUser } from "@/types/domain";

interface Props {
  onDone: (user: SessionUser) => void;
}

export function LoginScreen({ onDone }: Props) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setSubmitting(true);
    setError(null);

    const res = await authApi.login({ username, password });

    if (res.isSuccess) {
      onDone({
        staffAccountId: res.data.staffAccountId,
        username: res.data.username,
        fullName: res.data.fullName,
        roleCode: res.data.roleCode,
      });
      return;
    }

    // Dev fallback: backend not running → enter UI with stub session.
    if (res.statusCode === 0) {
      onDone({ staffAccountId: 0, username, fullName: username, roleCode: "OWNER" });
      return;
    }

    setError(res.detail || res.title || "Đăng nhập thất bại");
    setSubmitting(false);
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>RPOM ERP</h1>
        <div className="sub">Đăng nhập web quản trị</div>
        <form onSubmit={submit}>
          <div className="field-group">
            <label>Tên đăng nhập</label>
            <input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field-group">
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && (
            <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 12 }}>{error}</div>
          )}
          <button type="submit" className="signin" disabled={submitting}>
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
