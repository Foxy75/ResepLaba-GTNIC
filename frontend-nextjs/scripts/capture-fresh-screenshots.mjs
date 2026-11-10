import { chromium } from "playwright";
import path from "path";

const base = process.env.RESIPLABA_BASE_URL ?? "http://localhost:3000";
const executablePath =
  "C:/Users/Clanker-hs/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";
const artifactDir = "C:/Users/Clanker-hs/.gemini/antigravity/brain/580079a3-96f6-40a8-8632-b4c8d316297d";

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });

try {
  console.log("1. Capture Login Page");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(artifactDir, "impeccable_login_clean.png"), fullPage: true });

  console.log("2. Login as Warung Madura Berkah");
  await page.fill("#login-email", "sitiaminah@resep.laba");
  await page.fill("#login-password", "password");
  await page.getByRole("button", { name: "Masuk ke akun" }).click();
  await page.waitForURL("**/app/pos", { timeout: 15000 });

  console.log("3. Capture Stock Page (Humanized, No Heatmap, No Opname, No Jargon)");
  await page.getByRole("link", { name: "Stok", exact: true }).first().click();
  await page.waitForURL("**/app/stock", { timeout: 15000 });
  await page.waitForSelector("text=Daftar Stok Barang", { timeout: 15000 });
  await page.screenshot({ path: path.join(artifactDir, "stock_screen_humanized.png"), fullPage: true });

  console.log("4. Click 'Hitung Fisik' and capture sheet");
  await page.getByRole("button", { name: "Hitung Fisik" }).first().click();
  await page.waitForSelector("text=Hitung Fisik Barang", { timeout: 10000 });
  await page.screenshot({ path: path.join(artifactDir, "hitung_fisik_sheet.png") });

  console.log("Done capturing all screenshots successfully!");
} finally {
  await browser.close();
}
