import type { Metadata } from "next";
import { PosScreen } from "@/components/pos/PosScreen";

export const metadata: Metadata = {
  title: "Kasir | ResepLaba",
  description: "Layar kasir warung dengan potongan stok FEFO otomatis.",
};

export default function PosPage() {
  return <PosScreen />;
}
