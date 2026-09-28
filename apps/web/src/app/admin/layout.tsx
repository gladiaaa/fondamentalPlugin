import type { Metadata } from "next";
import { AdminShell } from "@/features/admin/AdminShell";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};

/** Back-office (#106) : jamais indexé, tout le contenu est chargé depuis le navigateur. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
