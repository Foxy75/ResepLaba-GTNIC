import { chromium } from "playwright";
import path from "path";

const base = process.env.RESIPLABA_BASE_URL ?? "http://localhost:3000";
const executablePath =
  "C:/Users/Clanker-hs/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
const artifactDir = "C:/Users/Clanker-hs/.gemini/antigravity/brain/580079a3-96f6-40a8-8632-b4c8d316297d";

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

console.log("=== MEMULAI SIMULASI WARUNG ASLI RESEPLABA ===");

try {
  // 1. Buka Halaman Login
  console.log("1. Mengakses halaman login...");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.screenshot({ path: path.join(artifactDir, "shot_1_login_page.png"), fullPage: true });

  // 2. Login menggunakan kredensial Warmindo Cak Budi
  console.log("2. Memasukkan kredensial budis@resep.laba...");
  await page.fill("#login-email", "budis@resep.laba");
  await page.fill("#login-password", "password");
  await page.screenshot({ path: path.join(artifactDir, "shot_2_login_filled.png") });
  
  await page.getByRole("button", { name: "Masuk ke akun" }).click();
  await page.waitForURL("**/app/pos", { timeout: 15000 });
  await page.waitForSelector("text=Menu warung", { timeout: 15000 });
  console.log("   -> Berhasil masuk ke kasir!");
  await page.screenshot({ path: path.join(artifactDir, "shot_3_pos_catalog.png"), fullPage: true });

  // 3. Melakukan transaksi penjualan kasir (POS)
  console.log("3. Menambahkan pesanan menu ke keranjang...");
  const mieButton = page.getByRole("button", { name: /Mie Goreng Telur \+ Nasi/i }).first();
  await mieButton.click();
  await mieButton.click(); // 2 porsi

  // Cari menu minuman jika ada
  const buttons = await page.getByRole("button").all();
  for (const btn of buttons) {
    const text = await btn.innerText().catch(() => "");
    if (/Kopi|Teh|Susu|Es/i.test(text) && /Rp/i.test(text)) {
      await btn.click();
      break;
    }
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(artifactDir, "shot_4_pos_cart.png") });

  console.log("4. Melakukan checkout transaksi...");
  await page.getByRole("button", { name: /^Bayar/ }).first().click();
  await page.waitForSelector("text=Transaksi tersimpan", { timeout: 10000 });
  console.log("   -> Transaksi berhasil disimpan! Struk kasir muncul.");
  await page.screenshot({ path: path.join(artifactDir, "shot_5_receipt.png") });

  await page.getByRole("button", { name: /Selesai, lanjut jualan/ }).click();
  await page.waitForTimeout(300);

  // 5. Cek Stok dan Papan Kedaluwarsa
  console.log("5. Membuka layar Stok & Papan Kedaluwarsa...");
  await page.getByRole("link", { name: "Stok", exact: true }).first().click();
  await page.waitForURL("**/app/stock");
  await page.waitForSelector("text=Papan kedaluwarsa", { timeout: 15000 });
  await page.screenshot({ path: path.join(artifactDir, "shot_6_stock_heatmap.png"), fullPage: true });

  // 6. Belanja Masuk (Restock Bahan Baku)
  console.log("6. Mencatat belanja masuk (kulakan bahan warung)...");
  await page.getByRole("button", { name: /Belanja masuk/ }).first().click();
  await page.waitForSelector("text=Catat belanja masuk");
  
  await page.fill("#restock-qty", "2");
  await page.fill("#restock-cost", "56000");
  await page.fill("#restock-expiry", "2026-12-28");
  await page.fill("#restock-code", "MT-KULAKAN-01");
  await page.screenshot({ path: path.join(artifactDir, "shot_7_restock_modal.png") });

  await page.getByRole("button", { name: /Simpan belanjaan/ }).click();
  await page.waitForSelector("text=Kulakan tersimpan", { timeout: 10000 });
  console.log("   -> Kulakan tersimpan ke stok!");
  await page.waitForTimeout(600);

  // 7. Pindai Nota Belanja (Human-in-the-loop OCR)
  console.log("7. Menguji pemindai nota belanja (OCR staging)...");
  await page.getByRole("tab", { name: /Catat dari nota/ }).click();
  await page.getByRole("button", { name: /Pindai nota belanja/ }).click();
  await page.waitForSelector("text=Draf nota belanja", { timeout: 15000 });
  console.log("   -> Draf nota belanja berhasil dibuka!");
  await page.screenshot({ path: path.join(artifactDir, "shot_8_receipt_draft.png") });
  await page.getByRole("button", { name: /Batal/ }).click();

  // 8. Buka Mode Juragan dengan PIN
  console.log("8. Membuka Mode Juragan dengan PIN...");
  await page.getByRole("button", { name: "Juragan", exact: true }).click();
  await page.waitForSelector("text=Mode Juragan");
  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: `Angka ${digit}` }).click();
  }
  await page.waitForURL("**/app/owner", { timeout: 10000 });
  await page.waitForSelector("text=Simulator harga", { timeout: 15000 });
  console.log("   -> Mode Juragan terbuka!");
  await page.screenshot({ path: path.join(artifactDir, "shot_9_owner_dashboard.png"), fullPage: true });

  // 9. Tambah Menu Racikan Baru
  console.log("9. Meracik menu baru khas warung...");
  const addMenuBtn = page.getByRole("button", { name: /Racik menu baru|Tambah menu/i }).first();
  if (await addMenuBtn.isVisible().catch(() => false)) {
    await addMenuBtn.click();
    await page.waitForSelector("text=Racik menu");
    await page.fill("#product-name", "Nasi Gila Warmindo Cak Budi");
    await page.fill("#product-price", "22000");
    await page.screenshot({ path: path.join(artifactDir, "shot_10_recipe_editor.png") });
    await page.getByRole("button", { name: /Simpan menu/i }).click();
    await page.waitForSelector("text=Menu baru disimpan", { timeout: 10000 });
    console.log("   -> Menu 'Nasi Gila Warmindo Cak Budi' berhasil disimpan!");
  }

  await page.screenshot({ path: path.join(artifactDir, "shot_11_final_owner.png"), fullPage: true });

  console.log("=== SEMUA ALUR BERHASIL DIUJI DAN DISIMULASIKAN DENGAN DATA DUMMY REALISTIS ===");
} catch (err) {
  console.error("Error during simulation:", err);
  await page.screenshot({ path: path.join(artifactDir, "shot_error.png") }).catch(() => {});
} finally {
  await browser.close();
}
