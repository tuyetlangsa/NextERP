"use client";

import { useState } from "react";
import type { SessionUser } from "@/types/domain";

interface Props {
  onDone: (user: SessionUser) => void;
}

export function LoginScreen({ onDone }: Props) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("password");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to /api/auth/login → save JWT
    if (!username.trim() || !password.trim()) return;
    onDone({ username, fullName: username, role: "owner" });
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
          <button type="submit" className="signin">Đăng nhập</button>
        </form>
      </div>
    </div>
  );
}
