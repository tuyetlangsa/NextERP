"use client";

import { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { formatApiError } from "@/lib/http/formatError";
import type { SessionUser } from "@/types/domain";

interface Props {
  onDone: (user: SessionUser) => void;
}

/**
 * Opt-in dev convenience: when the backend is unreachable, enter the UI with a stub
 * session so the windows can be worked on offline against mock data.
 *
 * Two independent guards, both resolved at module level:
 *  - `NODE_ENV` is inlined as the literal "production" by a production build, so the whole
 *    constant folds to `false` there and the branch below is dropped from the bundle. A
 *    deployed build cannot be talked into this path by cutting the network, and setting the
 *    env var on the deploy by mistake does not re-enable it.
 *  - In dev it still stays off unless `NEXT_PUBLIC_ALLOW_OFFLINE_LOGIN=true` is set in
 *    `.env.local`.
 */
const ALLOW_OFFLINE_LOGIN =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_ALLOW_OFFLINE_LOGIN === "true";

export function LoginScreen({ onDone }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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

    // statusCode 0 = the request never reached the server (network down, CORS, abort).
    if (ALLOW_OFFLINE_LOGIN && res.statusCode === 0) {
      onDone({
        staffAccountId: 0,
        username,
        fullName: `${username} (OFFLINE)`,
        roleCode: "OWNER",
      });
      return;
    }

    setError(formatApiError(res) || "Đăng nhập thất bại");
    setSubmitting(false);
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>RPOM Quản trị</h1>
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
