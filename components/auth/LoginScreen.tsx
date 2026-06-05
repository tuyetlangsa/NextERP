"use client";

import { useState } from "react";
import clsx from "clsx";
import type { SessionUser } from "@/types/domain";
import { mockCounters } from "@/data/mock";

interface Props {
  onDone: (user: SessionUser) => void;
}

export function LoginScreen({ onDone }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [counterId, setCounterId] = useState("Q01");

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to /api/auth/login → save JWT
    if (username.trim() && password.trim()) setStep(2);
  };

  const submitCounter = () => {
    onDone({ username, fullName: username, counterId });
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>RPOM ERP</h1>
        <div className="sub">{step === 1 ? "Đăng nhập hệ thống" : "Chọn quầy làm việc cho phiên này"}</div>

        {step === 1 && (
          <form onSubmit={submitLogin}>
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
        )}

        {step === 2 && (
          <>
            <div className="counter-grid">
              {mockCounters.filter(c => c.kich_hoat).slice(0, 8).map(c => (
                <button
                  key={c.id}
                  className={clsx("counter-card", counterId === c.id && "sel")}
                  onClick={() => setCounterId(c.id)}
                  type="button"
                >
                  <div className="c">{c.ten}</div>
                  <div className="s">{c.dien_giai}</div>
                </button>
              ))}
            </div>
            <button className="signin" onClick={submitCounter}>Vào hệ thống</button>
          </>
        )}
      </div>
    </div>
  );
}
