import type { Metadata } from "next";
import { StockScreen } from "@/components/stock/StockScreen";

export const metadata: Metadata = {
  title: "Stok & belanja | ResepLaba",
  description: "Papan kedaluwarsa FEFO, catat belanja masuk, dan penyesuaian stok fisik warung.",
};

export default function StockPage() {
  return <StockScreen />;
}
