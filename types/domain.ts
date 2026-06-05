export interface Counter {
  id: string;
  ten: string;
  dien_giai?: string;
  kich_hoat: boolean;
}

export interface Area {
  id: string;
  quay: string; // Counter id
  ten: string;
  ten1?: string;
  ten2?: string;
  mo_ta?: string;
  khu_cha?: string | null;
  loai_kd?: string;
  co_so_do: boolean;
  so_so_do: number;
  thu_tu: number;
  quy_mo: number;
  kich_hoat: boolean;
  nhom_menu: string[]; // Category ids
}

export type SubsystemGroup =
  | "mat-bang"
  | "thuc-don"
  | "gia-km"
  | "he-thong"
  | "bao-cao";

export interface Subsystem {
  id: string;
  ten: string;
  sub: string;
  group: SubsystemGroup;
  desktop?: boolean;
  win: string | null; // window component id; null = chưa làm
}

export interface AppWindowState {
  id: string;
  def: Subsystem;
  pos: { x: number; y: number };
  size: { width: number; height: number };
  maximized: boolean;
  minimized: boolean;
  z: number;
}

export interface SessionUser {
  username: string;
  fullName: string;
  role: "owner" | "manager" | "admin";
}
