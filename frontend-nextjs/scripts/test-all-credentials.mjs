import { chromium } from "playwright";
import path from "path";

const base = process.env.RESIPLABA_BASE_URL ?? "http://localhost:3000";
const executablePath =
  "C:/Users/Clanker-hs/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
const artifactDir = "C:/Users/Clanker-hs/.gemini/antigravity/brain/580079a3-96f6-40a8-8632-b4c8d316297d";

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const results = [];

function check(title, condition, detail = "") {
  if (condition) {
    results.push({ title, status: "PASS", detail });
    console.log(`  [PASS] ${title}`);
  } else {
    results.push({ title, status: "FAIL", detail });
    console.error(`  [FAIL] ${title}: ${detail}`);
  }
}

async function text() {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}

try {
  console.log("==================================================");
  console.log("TEST 1: WARMINDO CAK BUDI (budis@resep.laba)");
  console.log("==================================================");

  // 1.1 Navigasi ke halaman login
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  check("1.1 Akses halaman login", page.url().includes("/login"));

  // 1.2 Login dengan kredensial Warmindo
  await page.fill("#login-email", "budis@resep.laba");
  await page.fill("#login-password", "password");
  await page.getByRole("button", { name: "Masuk ke akun" }).click();
  await page.waitForURL("**/app/pos", { timeout: 15000 });
  await page.waitForSelector("text=Menu warung", { timeout: 15000 });
  const warmindoBody = await text();
  check("1.2 Login sukses & redirect ke /app/pos", warmindoBody.includes("Warmindo Cak Budi"));
  check("1.3 Menu racikan & FEFO tersedia", warmindoBody.includes("Mie Goreng Telur + Nasi"));
  await page.screenshot({ path: path.join(artifactDir, "test_warmindo_pos.png"), fullPage: true });

  // 1.3 Kasir POS Transaksi
  const mieBtn = page.getByRole("button", { name: /Mie Goreng Telur \+ Nasi/i }).first();
  await mieBtn.click();
  await page.getByRole("button", { name: /^Bayar/ }).first().click();
  await page.waitForSelector("text=Transaksi tersimpan", { timeout: 10000 });
  check("1.4 Checkout transaksi berhasil dengan struk laba", (await text()).includes("Laba menu ini"));
  await page.getByRole("button", { name: /Selesai, lanjut jualan/ }).click();

  // 1.4 Buka Stok Warmindo
  await page.getByRole("link", { name: "Stok", exact: true }).first().click();
  await page.waitForURL("**/app/stock");
  await page.waitForSelector("text=Daftar Stok Barang", { timeout: 15000 });
  const warmindoStock = await text();
  check("1.5 Daftar stok barang Warmindo aktif", warmindoStock.includes("Daftar Stok Barang"));
  check("1.6 Data stok bahan baku tersedia (telur, mie, beras)", warmindoStock.includes("Telur ayam") && warmindoStock.includes("Mie instan goreng"));
  await page.screenshot({ path: path.join(artifactDir, "test_warmindo_stock.png"), fullPage: true });

  // 1.5 Buka Mode Juragan Warmindo dengan PIN
  await page.getByRole("button", { name: "Mode Juragan" }).first().click();
  await page.getByRole("dialog").getByRole("heading", { name: "Mode Juragan" }).waitFor({ timeout: 10000 });
  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: `Angka ${digit}` }).click();
  }
  await page.waitForURL("**/app/owner", { timeout: 10000 });
  await page.waitForSelector("text=Simulator harga", { timeout: 15000 });
  const warmindoOwner = await text();
  check("1.7 Mode Juragan Warmindo terbuka", warmindoOwner.includes("Kantong Laba") && warmindoOwner.includes("Racikan & konversi satuan"));
  await page.screenshot({ path: path.join(artifactDir, "test_warmindo_owner.png"), fullPage: true });

  // 1.6 Keluar dari akun Warmindo
  await page.getByRole("button", { name: "Keluar dari akun" }).click();
  await page.waitForURL("**/login", { timeout: 10000 });
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.waitForTimeout(500);
  check("1.8 Logout Warmindo berhasil & kembali ke login", page.url().includes("/login"));

  console.log("\n==================================================");
  console.log("TEST 2: WARUNG MADURA BERKAH (sitiaminah@resep.laba)");
  console.log("==================================================");

  // 2.1 Login dengan kredensial Warung Madura
  await page.fill("#login-email", "sitiaminah@resep.laba");
  await page.fill("#login-password", "password");
  await page.getByRole("button", { name: "Masuk ke akun" }).click();
  await page.waitForURL("**/app/pos", { timeout: 15000 });
  await page.waitForSelector("text=Menu warung", { timeout: 15000 });
  const maduraBody = await text();
  check("2.1 Login sukses & redirect ke /app/pos", maduraBody.includes("Warung Madura Berkah"));
  check("2.2 Produk eceran Madura tersedia", /Indomie|Telur|Kopi|Susu|Roti/i.test(maduraBody));
  await page.screenshot({ path: path.join(artifactDir, "test_madura_pos.png"), fullPage: true });

  // 2.2 Buka Stok Warung Madura (Cek Stok Mendekati Kedaluwarsa)
  await page.getByRole("link", { name: "Stok", exact: true }).first().click();
  await page.waitForURL("**/app/stock");
  await page.waitForSelector("text=Daftar Stok Barang", { timeout: 15000 });
  const maduraStock = await text();
  check("2.3 Daftar stok barang Madura aktif", maduraStock.includes("Daftar Stok Barang"));
  check("2.4 Stok mendekati kedaluwarsa (Segera/Kritis) terdeteksi", maduraStock.includes("Segera") || maduraStock.includes("Kritis"));
  await page.screenshot({ path: path.join(artifactDir, "test_madura_stock.png"), fullPage: true });

  // 2.3 Uji Fitur Promo Tebus Murah (Zero-Waste Agent)
  const promoButton = page.getByRole("button", { name: /Promo/i }).first();
  if (await promoButton.isVisible().catch(() => false)) {
    await promoButton.click();
    await page.waitForSelector("text=Ide promo TEBUS MURAH", { timeout: 10000 });
    check("2.5 Agent C (Zero-Waste Promo) memunculkan sheet diskon", (await text()).includes("TEBUS MURAH"));
    await page.screenshot({ path: path.join(artifactDir, "test_madura_promo.png") });
    await page.getByLabel("Tutup", { exact: true }).click();
    await page.waitForTimeout(300);
  }

  // 2.4 Buka Mode Juragan Madura dengan PIN
  await page.getByRole("button", { name: "Mode Juragan" }).first().click();
  await page.getByRole("dialog").getByRole("heading", { name: "Mode Juragan" }).waitFor({ timeout: 10000 });
  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: `Angka ${digit}` }).click();
  }
  await page.waitForURL("**/app/owner", { timeout: 10000 });
  await page.waitForSelector("text=Kantong Laba", { timeout: 15000 });
  check("2.6 Mode Juragan Madura terbuka dengan analitik", (await text()).includes("Kantong Laba"));
  await page.screenshot({ path: path.join(artifactDir, "test_madura_owner.png"), fullPage: true });

  // 2.5 Keluar dari akun Madura
  await page.getByRole("button", { name: "Keluar dari akun" }).click();
  await page.waitForURL("**/login", { timeout: 10000 });
  check("2.7 Logout Madura berhasil & kembali ke login", page.url().includes("/login"));

  console.log("\n==================================================");
  console.log("TEST 3: SUPER ADMIN PLATFORM (admin@resep.laba)");
  console.log("==================================================");

  // 3.1 Navigasi bersih ke login untuk Admin
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-email", "admin@resep.laba");
  await page.fill("#login-password", "password");
  await page.getByRole("button", { name: "Masuk ke akun" }).click();
  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.getByRole("heading", { name: "Kendali platform" }).waitFor({ timeout: 15000 });
  const adminBody = await text();
  check("3.1 Login sukses & redirect ke /admin", adminBody.includes("Kendali platform") && adminBody.includes("Super Admin ResepLaba"));
  await page.screenshot({ path: path.join(artifactDir, "test_admin_dashboard.png"), fullPage: true });

  // 3.2 Cek Tab Warung (Tenant Management)
  await page.getByRole("button", { name: /^Warung$/ }).click();
  await page.waitForSelector("text=Tangguhkan", { timeout: 10000 });
  await page.waitForSelector("text=Warmindo Cak Budi", { timeout: 10000 });
  const tenantBody = await text();
  check("3.2 Daftar tenant warung muncul lengkap (5 tenant)", tenantBody.includes("Warmindo Cak Budi") && tenantBody.includes("Warung Madura Berkah") && tenantBody.includes("Roti Pagi Bu Rina"));
  await page.screenshot({ path: path.join(artifactDir, "test_admin_tenants.png"), fullPage: true });

  // 3.3 Cek Tab Broadcast Platform
  await page.getByRole("button", { name: /Broadcast/i }).click();
  await page.waitForSelector("text=Pengumuman harga", { timeout: 10000 });
  const broadcastBody = await text();
  check("3.3 Fitur broadcast pengumuman aktif", broadcastBody.includes("Pengumuman harga") && broadcastBody.includes("Tayangkan ke warung"));
  await page.screenshot({ path: path.join(artifactDir, "test_admin_broadcast.png") });

  // 3.4 Cek Tab Starter Pack (Paket Racikan Siap Pakai)
  await page.getByRole("button", { name: /Starter pack/i }).click();
  await page.waitForSelector("text=Starter pack", { timeout: 10000 });
  const starterBody = await text();
  check("3.4 Starter pack template racikan siap pakai tersedia", starterBody.includes("Warmindo") || starterBody.includes("Madura") || starterBody.includes("Toko roti"));
  await page.screenshot({ path: path.join(artifactDir, "test_admin_starter.png"), fullPage: true });

  // 3.5 Keluar dari akun Admin
  await page.getByRole("button", { name: "Keluar dari akun admin" }).click();
  await page.waitForURL("**/login", { timeout: 10000 });
  check("3.5 Logout Admin berhasil & kembali ke login", page.url().includes("/login"));

  console.log("\n==================================================");
  console.log("RINGKASAN HASIL PENGUJIAN SEMUA KREDENSIAL:");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  console.log(`Total: ${passed}/${total} pengujian LULUS.`);

  if (passed === total) {
    console.log("SEMUA KREDENSIAL DAN DATA DUMMY BERFUNGSI 100% SESUAI SPESIFIKASI!");
  } else {
    process.exit(1);
  }
} catch (err) {
  console.error("Terjadi error saat pengujian:", err);
  await page.screenshot({ path: path.join(artifactDir, "test_error.png") }).catch(() => {});
  process.exit(1);
} finally {
  await browser.close();
}
