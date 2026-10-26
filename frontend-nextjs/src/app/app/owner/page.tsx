import type { Metadata } from "next";
import { OwnerScreen } from "@/components/owner/OwnerScreen";

export const metadata: Metadata = {
  title: "Kantong Laba | ResepLaba",
  description: "Laporan laba, simulator harga, dan editor racikan menu untuk juragan warung.",
};

export default function OwnerPage() {
  return <OwnerScreen />;
}
