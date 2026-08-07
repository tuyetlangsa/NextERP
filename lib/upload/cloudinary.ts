"use client";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_RPOM_API_URL ?? "http://localhost:5080";

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  form.append("file", file);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("rpom.accessToken")
      : null;

  const res = await fetch(`${BASE_URL}/api/erp/upload/media`, {
    method: "POST",
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload thất bại (${res.status}): ${text || res.statusText}`);
  }

  const json = await res.json();
  // Backend returns { isSuccess: true, data: { url, publicId, ... } }
  const data = json.data ?? json;
  return {
    url: data.url,
    publicId: data.publicId,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
  };
}
