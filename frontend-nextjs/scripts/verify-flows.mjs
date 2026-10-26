import { chromium } from "playwright";

const base = process.env.RESIPLABA_BASE_URL ?? "http://localhost:3000";
const executablePath =
  "C:/Users/Clanker-hs/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

const failures = [];
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) {
    failures.push(message);
    console.log(`  FAIL ${message}`);
    return;
  }
  console.log(`  ok   ${message}`);
}

async function text(page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ");
}

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  console.log("1. Login sandbox");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Warmindo Cak Budi/ }).click();
  await page.waitForURL("**/app/pos");
  await page.waitForSelector("text=Menu warung", { timeout: 15000 });
  assert((await text(page)).includes("Menu warung"), "kasir terbuka setelah pilih sandbox");
  assert((await text(page)).includes("Harga telur di pasar naik"), "banner broadcast tampil di kasir");

  console.log("2. Jual 2 porsi mie goreng (FEFO)");
  const mieCard = page.getByRole("button", { name: /Tambah Mie Goreng Telur \+ Nasi, Rp/ });
  await mieCard.click();
  await mieCard.click();
  await page.waitForTimeout(300);
  assert((await text(page)).includes("2 item"), "keranjang berisi 2 item");
  assert(/Rp\s?30\.000/.test(await text(page)), "total keranjang Rp30.000");
  await page.getByRole("button", { name: /^Bayar/ }).first().click();
  await page.waitForSelector("text=Transaksi tersimpan", { timeout: 10000 });
  const receipt = await text(page);
  assert(/Rp\s?30\.000/.test(receipt), "struk menunjukkan total Rp30.000");
  assert(receipt.includes("Laba menu ini"), "struk menampilkan laba menu");
  await page.getByRole("button", { name: /Selesai, lanjut jualan/ }).click();

  console.log("3. Stok: papan kedaluwarsa dan belanja masuk");
  await page.getByRole("link", { name: "Stok", exact: true }).first().click();
  await page.waitForURL("**/app/stock");
  await page.waitForSelector("text=Papan kedaluwarsa", { timeout: 15000 });
  const stockText = await text(page);
  assert(stockText.includes("Papan kedaluwarsa"), "papan kedaluwarsa tampil");
  assert(stockText.includes("Kritis H-1") || stockText.includes("Segera H-3"), "chip status kedaluwarsa tampil");
  await page.getByRole("button", { name: /Belanja masuk/ }).first().click();
  await page.waitForSelector("text=Catat belanja masuk");
  await page.fill("#restock-qty", "2");
  await page.fill("#restock-cost", "50000");
  await page.fill("#restock-expiry", "2026-12-30");
  await page.getByRole("button", { name: /Simpan belanjaan/ }).click();
  await page.waitForSelector("text=Kulakan tersimpan", { timeout: 10000 });
  assert((await text(page)).includes("Kulakan tersimpan"), "kulakan tersimpan dengan toast");

  console.log("4. Draf nota (human in the loop)");
  await page.getByRole("tab", { name: /Catat dari nota/ }).click();
  await page.getByRole("button", { name: /Pindai nota belanja/ }).click();
  await page.waitForSelector("text=Draf nota belanja", { timeout: 15000 });
  assert((await text(page)).includes("Draf nota belanja"), "draf nota tampil sebelum disimpan ke stok");
  await page.getByRole("button", { name: /Batal/ }).click();

  console.log("5. Mode Juragan dengan PIN");
  await page.getByRole("button", { name: "Juragan", exact: true }).click();
  await page.waitForSelector("text=Mode Juragan");
  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: `Angka ${digit}` }).click();
  }
  await page.waitForURL("**/app/owner", { timeout: 10000 });
  const ownerText = await text(page);
  assert(ownerText.includes("Kantong laba 7 hari terakhir"), "grafik laba 7 hari tampil");
  assert(ownerText.includes("Simulator harga"), "simulator harga tampil");
  assert(ownerText.includes("Racikan & konversi satuan"), "editor racikan tampil");
  assert(ownerText.includes("Laba per menu"), "laba per menu tampil");

  console.log("6. Editor resep");
  await page.getByRole("button", { name: /Menu baru/ }).click();
  await page.waitForSelector("text=Menu racikan baru");
  await page.fill("#recipe-name", "Mie Goreng Spesial");
  await page.fill("#recipe-price", "16000");
  await page.getByRole("button", { name: /Simpan menu/ }).click();
  await page.waitForSelector("text=Menu baru disimpan", { timeout: 10000 });
  assert((await text(page)).includes("Mie Goreng Spesial"), "menu racikan baru tersimpan");

  console.log("7. Admin: suspend tenant dan broadcast");
  await page.getByRole("link", { name: /Panel platform/ }).click();
  await page.waitForURL("**/admin");
  await page.getByRole("button", { name: /^Warung$/ }).click();
  await page.getByRole("button", { name: /Tangguhkan/ }).first().click();
  await page.waitForSelector("text=Tangguhkan warung?");
  await page.getByRole("button", { name: /Ya, tangguhkan/ }).click();
  await page.waitForSelector("text=ditangguhkan", { timeout: 10000 });
  assert((await text(page)).includes("Ditangguhkan"), "status tenant berubah menjadi ditangguhkan");
  await page.getByRole("button", { name: /^Broadcast$/ }).click();
  await page.fill("#broadcast-text", "Harga gula naik 10% di pasar Resilience.");
  await page.getByRole("button", { name: /Tayangkan ke warung aktif/ }).click();
  await page.waitForSelector("text=Pengumuman ditayangkan", { timeout: 10000 });
  assert((await text(page)).includes("Harga gula naik 10%"), "broadcast baru masuk ke riwayat");

  console.log("8. Broadcast muncul di layar warung");
  await page.getByRole("link", { name: /Buka kasir/ }).click();
  await page.waitForURL("**/app/pos");
  await page.waitForSelector("text=Menu warung", { timeout: 15000 });
  await page.waitForSelector("text=Harga gula naik 10%", { timeout: 10000 });
  assert((await text(page)).includes("Harga gula naik 10%"), "broadcast baru tampil di kasir");
} catch (error) {
  failures.push(`error: ${error.message}`);
  console.log(`  ERROR ${error.message}`);
} finally {
  await browser.close();
}

console.log(`\n${checks - failures.length}/${checks} pemeriksaan lulus`);
if (failures.length) {
  console.log("Gagal:");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}
console.log("Semua alur utama lolos.");

