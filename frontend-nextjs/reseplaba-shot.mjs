import { chromium } from "playwright";

const base = process.env.RESIPLABA_BASE_URL ?? "http://localhost:3000";
const outDir = "M:/coding/ResepLaba-GTNIC/.impeccable/review";
const executablePath =
  "C:/Users/Clanker-hs/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

const viewports = [
  { suffix: "360", width: 360, height: 780 },
  { suffix: "390", width: 390, height: 844 },
  { suffix: "768", width: 768, height: 1024 },
  { suffix: "1280", width: 1280, height: 800 },
];

const browser = await chromium.launch({ executablePath });

async function enter(page, profile = /Warmindo Cak Budi/) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: profile }).click();
  await page.waitForSelector("text=Menu warung", { timeout: 15000 });
}

async function openPin(page) {
  const mobile = page.getByRole("button", { name: /Buka mode juragan dengan PIN/ });
  const desktop = page.getByRole("button", { name: "Juragan", exact: true });
  if (await mobile.isVisible().catch(() => false)) await mobile.click();
  else await desktop.click();
  await page.waitForSelector("text=Mode Juragan", { timeout: 10000 });
}

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });

  // 1. Rute /login
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/login-${viewport.suffix}.png`, fullPage: true });

  // 2. Rute /app/pos
  await enter(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/pos-${viewport.suffix}.png`, fullPage: true });

  // 3. Rute /app/stock
  await page.getByRole("link", { name: "Stok", exact: true }).first().click();
  await page.waitForSelector("text=Papan kedaluwarsa", { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/stock-${viewport.suffix}.png`, fullPage: true });

  // State: restock sheet
  await page.getByRole("button", { name: /Belanja masuk/ }).first().click();
  await page.waitForSelector("text=Catat belanja masuk", { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/restock-${viewport.suffix}.png`, fullPage: true });
  await page.getByRole("button", { name: "Batal" }).click();
  await page.waitForTimeout(200);

  // State: draft OCR sheet
  await page.getByRole("tab", { name: /Catat dari nota/ }).click();
  await page.getByRole("button", { name: /Pindai nota belanja/ }).click();
  await page.waitForSelector("text=Draf nota belanja", { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/draft-ocr-${viewport.suffix}.png`, fullPage: true });
  await page.getByRole("button", { name: "Batal" }).click();
  await page.waitForTimeout(200);

  // 4. State: PinSheet
  await openPin(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/pin-${viewport.suffix}.png`, fullPage: true });

  // 5. Rute /app/owner
  for (const digit of ["1", "2", "3", "4"]) {
    await page.getByRole("button", { name: `Angka ${digit}` }).click();
  }
  await page.waitForSelector("text=Kantong laba 7 hari terakhir", { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/owner-${viewport.suffix}.png`, fullPage: true });

  // 6. Rute /admin
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Kendali platform", { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/admin-${viewport.suffix}.png`, fullPage: true });

  // State: confirm dialog
  await page.getByRole("button", { name: /^Warung$/ }).click();
  await page.getByRole("button", { name: /Tangguhkan/ }).first().click();
  await page.waitForSelector("text=Tangguhkan warung?", { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/confirm-dialog-${viewport.suffix}.png`, fullPage: true });
  await page.getByRole("button", { name: "Batal" }).click();
  await page.waitForTimeout(200);

  await page.close();
  console.log(`lebar ${viewport.suffix}px selesai`);
}

await browser.close();
console.log("Semua screenshot (5 rute + 4 state x 4 lebar) selesai disimpan di .impeccable/review/");
