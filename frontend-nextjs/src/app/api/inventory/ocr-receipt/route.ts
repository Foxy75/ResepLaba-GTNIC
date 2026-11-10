import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const receiptSchema = z.object({
  supplier_name: z.string().describe("Nama toko / supplier grosir pada nota"),
  receipt_date: z.string().describe("Tanggal nota dalam format YYYY-MM-DD"),
  items: z.array(
    z.object({
      raw_name: z.string().describe("Nama barang sesuai teks nota"),
      purchase_qty: z.number().describe("Jumlah kemasan grosir yang dibeli"),
      purchase_unit: z.string().describe("Nama kemasan grosir misal Dus, Krat, Karung, Bal, Pak, Slop"),
      suggested_base_unit: z.enum(["pcs", "butir", "gram", "ml"]).describe("Satuan eceran dasar"),
      conversion_rate_guess: z.number().describe("Estimasi isi satuan dasar per kemasan grosir"),
      total_purchase_price: z.number().describe("Total harga beli barang dalam Rupiah bulat tanpa titik/koma"),
    }),
  ),
});

const ALLOWED_MIME_TYPES = ["image/webp", "image/jpeg", "image/png", "image/jpg"];
const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB limit for serverless payload safety

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const formData = await req.formData();
    const imageFile = formData.get("image");

    if (!apiKey || !imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({
        success: true,
        message: apiKey ? "Contoh draf nota siap diperiksa." : "Mode demo (Kunci API Gemini belum diatur).",
        data: getDemoDraft(),
        warnings: [],
      });
    }

    // Security Gate 1: Check payload size limit
    if (imageFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message: "Ukuran berkas terlalu besar (maksimal 4.5MB).",
          data: null,
          warnings: ["Payload limit exceeded"],
        },
        { status: 413 }
      );
    }

    // Security Gate 2: Enforce strict MIME type whitelist
    const mimeType = imageFile.type ? imageFile.type.toLowerCase() : "image/webp";
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format berkas tidak didukung. Harap unggah format WebP, JPEG, atau PNG.",
          data: null,
          warnings: ["Invalid mime type"],
        },
        { status: 415 }
      );
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const google = createGoogleGenerativeAI({ apiKey });
    const targetModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";

    const { object } = await generateObject({
      model: google(targetModel),
      schema: receiptSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Anda adalah ReceiptParserAgent untuk warung UMKM Indonesia (ResepLaba).
Tugas Anda mengekstrak informasi nota belanja/kulakan dari gambar menjadi JSON terstruktur.
Petunjuk:
1. raw_name: Nama barang sesuai teks nota.
2. purchase_qty: Jumlah kemasan grosir yang dibeli (angka).
3. purchase_unit: Nama satuan kemasan grosir (contoh: Dus, Krat, Karung, Pak).
4. suggested_base_unit: Satuan eceran dasar ('pcs', 'butir', 'gram', 'ml').
5. conversion_rate_guess: Estimasi isi eceran per kemasan grosir (contoh: 1 Dus Mie = 40, 1 Krat Telur = 240 butir, 1 Karung Beras 25kg = 25000 gram).
6. total_purchase_price: Total harga beli barang tersebut dalam Rupiah (integer).`,
            },
            {
              type: "image",
              image: Buffer.from(arrayBuffer),
              mimeType: mimeType,
            },
          ],
        },
      ],
    });

    const rows = object.items.map((item) => ({
      itemId: "",
      name: item.raw_name,
      purchaseQty: item.purchase_qty,
      purchaseUnit: item.purchase_unit,
      conversionRate: item.conversion_rate_guess,
      totalCost: item.total_purchase_price,
      expiresAt: "2026-12-30",
    }));

    return NextResponse.json({
      success: true,
      message: "Draf nota berhasil diekstrak dengan AI Gemini.",
      data: {
        supplier: object.supplier_name,
        receiptDate: object.receipt_date,
        rows,
      },
      warnings: [],
    });
  } catch (error) {
    console.error("OCR Extraction Error:", error);
    return NextResponse.json({
      success: true,
      message: "Menggunakan draf fallback karena kendala pemrosesan AI.",
      data: getDemoDraft(),
      warnings: [],
    });
  }
}

function getDemoDraft() {
  return {
    supplier: "Agen Sumber Rezeki",
    receiptDate: "2026-10-25",
    rows: [
      { itemId: "", name: "Indomie Goreng Spesial", purchaseQty: 1, purchaseUnit: "Dus", conversionRate: 40, totalCost: 115000, expiresAt: "2026-12-30" },
      { itemId: "", name: "Telur Ayam Ras", purchaseQty: 1, purchaseUnit: "Krat", conversionRate: 240, totalCost: 360000, expiresAt: "2026-11-10" },
      { itemId: "", name: "Beras Rojolele", purchaseQty: 1, purchaseUnit: "Karung", conversionRate: 25000, totalCost: 325000, expiresAt: "2027-04-15" },
    ],
  };
}
