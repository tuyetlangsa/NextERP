"use client";

import { registerLicense } from "@syncfusion/ej2-base";

let registered = false;

export function ensureSyncfusionLicense() {
  if (registered) return;
  // TODO: Đăng ký license Community tại https://syncfusion.com/account
  // sau đó set NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY trong .env.local
  const key = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY;
  if (key) {
    registerLicense(key);
  }
  registered = true;
}
