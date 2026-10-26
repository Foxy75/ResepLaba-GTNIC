import type { Metadata } from "next";
import { AdminScreen } from "@/components/admin/AdminScreen";

export const metadata: Metadata = {
  title: "Panel platform | ResepLaba",
  description: "Kendali tenant, kuota AI, starter pack, dan pengumuman harga platform.",
};

export default function AdminPage() {
  return <AdminScreen />;
}
