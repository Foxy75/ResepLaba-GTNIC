import { chromium } from "../../../frontend-nextjs/node_modules/playwright/index.mjs";

const base = "http://localhost:3000";
const executablePath =
  "C:/Users/Clanker-hs/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

const failures = [];
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) {
    failures.push(message);
    console.log(`  FAIL: ${message}`);
  } else {
    console.log(`  PASS: ${message}`);
  }
}

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  // Test 1: "/" redirects immediately to "/login"
  console.log("Check 1: Unauthenticated '/' redirects to '/login'");
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  assert(page.url().includes("/login"), `Navigating to '/' redirected to '${page.url()}'`);

  // Test 2: Standard login with Warmindo Cak Budi
  console.log("Check 2: Standard login with Warmindo Cak Budi (budis@resep.laba)");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-email", "budis@resep.laba");
  await page.fill("#login-password", "password");
  await page.getByRole("button", { name: "Masuk ke warung" }).click();
  await page.waitForURL("**/app/pos", { timeout: 10000 });
  assert(page.url().includes("/app/pos"), "Warmindo login redirected to /app/pos");

  // Test 3: Standard login with Warung Madura Berkah
  console.log("Check 3: Standard login with Warung Madura Berkah (sitiaminah@resep.laba)");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-email", "sitiaminah@resep.laba");
  await page.fill("#login-password", "password");
  await page.getByRole("button", { name: "Masuk ke warung" }).click();
  await page.waitForURL("**/app/pos", { timeout: 10000 });
  assert(page.url().includes("/app/pos"), "Madura login redirected to /app/pos");

  // Test 4: Standard login with Super Admin Platform
  console.log("Check 4: Standard login with Super Admin Platform (admin@resep.laba)");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.fill("#login-email", "admin@resep.laba");
  await page.fill("#login-password", "password");
  await page.getByRole("button", { name: "Masuk ke warung" }).click();
  await page.waitForURL("**/admin", { timeout: 10000 });
  assert(page.url().includes("/admin"), "Super Admin login redirected to /admin");

  // Test 5: Registration creates new store and owner account and redirects
  console.log("Check 5: Registration form creates new store and owner account");
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Buat Warung Baru" }).click();
  const testId = Date.now().toString().slice(-5);
  await page.fill("#register-name", `Juragan Audit ${testId}`);
  await page.fill("#register-store-name", `Warung Audit ${testId}`);
  await page.selectOption("#register-business-type", "WARMINDO");
  await page.fill("#register-email", `audit${testId}@resep.laba`);
  await page.fill("#register-password", "password123");
  await page.fill("#register-pin", "4321");
  await page.getByRole("button", { name: "Daftarkan warung sekarang" }).click();
  await page.waitForURL("**/app/pos", { timeout: 15000 });
  assert(page.url().includes("/app/pos"), "New store registration redirected to /app/pos");
  const posText = await page.locator("body").innerText();
  assert(posText.includes(`Warung Audit ${testId}`), "Newly registered store name is displayed in UI");

  // Test 6: Verify Expiry Heatmap and encoding on /app/stock
  console.log("Check 6: Expiry heatmap styling & encoding on /app/stock");
  // Log in as Madura to see inventory and expiry heatmap
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Warung Madura Berkah/ }).click();
  await page.waitForURL("**/app/pos");
  await page.getByRole("link", { name: "Stok", exact: true }).first().click();
  await page.waitForURL("**/app/stock");
  await page.waitForSelector("text=Papan kedaluwarsa", { timeout: 15000 });

  const stockBody = await page.locator("body").innerText();
  assert(!stockBody.includes("Â"), "Zero instances of 'Â' found on /app/stock text");
  assert(!stockBody.includes("Â·"), "Zero instances of 'Â·' found on /app/stock text");
  assert(stockBody.includes("·"), "Legitimate middle dot '·' rendered on /app/stock");

  // Check heatmap table
  const tableCount = await page.locator("table").count();
  assert(tableCount > 0, "Expiry Heatmap rendered as semantic HTML table");
  const blackRects = await page.locator("rect[fill='#000000'], rect[fill='black']").count();
  assert(blackRects === 0, "Zero black SVG rect elements found in heatmap");

  // Check cells have text
  const cellTexts = await page.locator("table tbody td div").allInnerTexts();
  const validCells = cellTexts.filter(t => t === "-" || !isNaN(parseInt(t, 10)));
  assert(validCells.length > 0, `Heatmap has ${validCells.length} cells with readable count values or '-'`);

} catch (err) {
  failures.push(`Execution error: ${err.message}`);
  console.error(err);
} finally {
  await browser.close();
}

console.log(`\nIndependent Verification Summary: ${checks - failures.length}/${checks} checks passed.`);
if (failures.length > 0) {
  console.error("FAILURES:\n" + failures.join("\n"));
  process.exit(1);
} else {
  console.log("ALL ACCEPTANCE CRITERIA CHECKS PASSED EMPIRICALLY!");
}
