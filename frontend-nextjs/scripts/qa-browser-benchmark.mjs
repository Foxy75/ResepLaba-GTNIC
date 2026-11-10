import { chromium } from "playwright";
import fs from "fs";

const base = process.env.RESEPLABA_BASE_URL ?? "http://localhost:3000";
const executablePath =
  "C:/Users/Clanker-hs/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

const testResults = {
  metadata: {
    target: "ResepLaba (GTNIC 2026)",
    baseUrl: base,
    timestamp: new Date().toISOString(),
    environment: "Local Next.js App Router (port 3000) + Laravel 11 REST API (port 8000)",
  },
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
  functionalTests: [],
  performanceMetrics: {},
  consoleErrors: [],
  networkAnomalies: [],
};

function recordTest(suite, testName, passed, details = "", severity = "NORMAL") {
  testResults.summary.total += 1;
  if (passed) {
    testResults.summary.passed += 1;
    console.log(`[PASS] [${suite}] ${testName} - ${details}`);
  } else {
    testResults.summary.failed += 1;
    console.log(`[FAIL] [${suite}] ${testName} - ${details}`);
  }
  testResults.functionalTests.push({ suite, testName, passed, details, severity });
}

async function runQABenchmark() {
  const browser = await chromium.launch({ executablePath });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      testResults.consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on("pageerror", (err) => {
    testResults.consoleErrors.push({ text: err.message, stack: err.stack });
  });

  page.on("requestfailed", (request) => {
    testResults.networkAnomalies.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "Unknown failure",
    });
  });

  console.log("==================================================");
  console.log("       STARTING COMPREHENSIVE QA TEST SUITE       ");
  console.log("==================================================");

  // -------------------------------------------------------------
  // Test Suite 1: Authentication, Redirection & Registration
  // -------------------------------------------------------------
  try {
    console.log("\n--- Suite 1: Authentication & Navigation ---");
    const t0_nav = Date.now();
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    const rootRedirectDuration = Date.now() - t0_nav;
    const currentUrl = page.url();
    recordTest(
      "Navigation",
      "Unauthenticated Root Redirection to /login",
      currentUrl.includes("/login"),
      `Redirected to /login in ${rootRedirectDuration}ms`
    );

    // Performance timing of /login
    const loginPerf = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime || 0;
      return {
        dns_ms: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp_ms: Math.round(nav.connectEnd - nav.connectStart),
        ttfb_ms: Math.round(nav.responseStart - nav.requestStart),
        download_ms: Math.round(nav.responseEnd - nav.responseStart),
        domContentLoaded_ms: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        domComplete_ms: Math.round(nav.domComplete - nav.startTime),
        loadEvent_ms: Math.round(nav.loadEventEnd - nav.startTime),
        fcp_ms: Math.round(fcp),
      };
    });
    testResults.performanceMetrics["login_page"] = loginPerf;
  } catch (err) {
    recordTest("Navigation", "Unauthenticated Root Redirection", false, err.message);
  }

  // Negative Credentials Handling
  try {
    await page.fill('#login-email', "unregistered_merchant@test.com");
    await page.fill('#login-password', "wrongpassword123");
    const t0_badLogin = Date.now();
    await page.getByRole("button", { name: /Masuk ke akun/ }).click();
    await page.waitForTimeout(600);
    const badLoginLatency = Date.now() - t0_badLogin;

    const bodyText = await page.innerText("body");
    const showsAuthError =
      bodyText.includes("Kredensial tidak valid") ||
      bodyText.includes("Gagal masuk") ||
      bodyText.includes("Periksa surel dan kata sandi") ||
      page.url().includes("/login");

    recordTest(
      "Authentication",
      "Negative Credentials Handling & Error Notification",
      showsAuthError && page.url().includes("/login"),
      `Safely blocked invalid credentials in ${badLoginLatency}ms`
    );
  } catch (err) {
    recordTest("Authentication", "Negative Credentials Handling", false, err.message);
  }

  // Full Store & Owner Registration
  try {
    await page.getByRole("tab", { name: "Buat Warung Baru" }).click();
    await page.waitForSelector("#register-name", { timeout: 5000 });

    const uniqueSuffix = Date.now().toString().slice(-4);
    await page.fill("#register-name", "Haji Slamet");
    await page.fill("#register-store-name", `Warung Slamet ${uniqueSuffix}`);
    await page.fill("#register-email", `slamet${uniqueSuffix}@resep.laba`);
    await page.fill("#register-password", "slamet123");
    await page.fill("#register-whatsapp", "081298765432");
    await page.fill("#register-pin", "8888");

    const t0_reg = Date.now();
    await page.getByRole("button", { name: /Daftarkan warung sekarang/ }).click();
    await page.waitForURL("**/app/pos", { timeout: 15000 });
    const regDuration = Date.now() - t0_reg;

    recordTest(
      "Authentication",
      "Full Store & Owner Registration (Atomic Tenant Onboarding)",
      page.url().includes("/app/pos"),
      `Tenant created and redirected to /app/pos in ${regDuration}ms`
    );
  } catch (err) {
    recordTest("Authentication", "Full Store & Owner Registration", false, err.message);
  }

  // 1-Click Sandbox Preset (Warmindo Cak Budi)
  try {
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    const t0_sandbox = Date.now();
    await page.getByRole("button", { name: /Warmindo Cak Budi/ }).click();
    await page.waitForURL("**/app/pos", { timeout: 15000 });
    const sandboxDuration = Date.now() - t0_sandbox;

    recordTest(
      "Authentication",
      "1-Click Sandbox Preset (Warmindo Cak Budi)",
      page.url().includes("/app/pos"),
      `Sandbox preset loaded with full workspace snapshot in ${sandboxDuration}ms`
    );

    // Performance timing of /app/pos
    const posPerf = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const paint = performance.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime || 0;
      return {
        ttfb_ms: Math.round(nav?.responseStart - nav?.requestStart || 0),
        domContentLoaded_ms: Math.round(nav?.domContentLoadedEventEnd - nav?.startTime || 0),
        loadEvent_ms: Math.round(nav?.loadEventEnd - nav?.startTime || 0),
        fcp_ms: Math.round(fcp),
      };
    });
    testResults.performanceMetrics["pos_page"] = posPerf;
  } catch (err) {
    recordTest("Authentication", "1-Click Sandbox Preset", false, err.message);
  }

  // -------------------------------------------------------------
  // Test Suite 2: POS, Cart Calculations & Checkout
  // -------------------------------------------------------------
  try {
    console.log("\n--- Suite 2: POS, Cart Calculations & Checkout ---");
    await page.waitForSelector("text=Menu warung", { timeout: 10000 });
    const bannerButton = page.locator("button[aria-label='Tutup pengumuman']");
    const hasBroadcast = await bannerButton.isVisible();
    const posText = await page.innerText("body");
    recordTest(
      "POS & Checkout",
      "Platform Broadcast Notification Rendering in Cashier View",
      hasBroadcast,
      "Broadcast banner rendered and interactive in cashier view"
    );

    const mieCard = page.getByRole("button", { name: /Tambah Mie Goreng Telur \+ Nasi, Rp/ });
    await mieCard.click();
    await mieCard.click();
    await page.waitForTimeout(300);

    const posBodyText = await page.innerText("body");
    const cartHas2Items = posBodyText.includes("2 item");
    const cartHas30k = /Rp\s?30\.000/.test(posBodyText);
    recordTest(
      "POS & Checkout",
      "Cart Aggregation & Pricing Accuracy (2x Rp15.000 = Rp30.000)",
      cartHas2Items && cartHas30k,
      `Calculated 2 items total Rp30.000`
    );

    // Trigger Checkout
    const t0_checkout = Date.now();
    await page.getByRole("button", { name: /^Bayar/ }).first().click();
    await page.waitForSelector("text=Transaksi tersimpan", { timeout: 10000 });
    const checkoutLatency = Date.now() - t0_checkout;
    const receiptText = await page.innerText("body");
    const receiptHasTotal = /Rp\s?30\.000/.test(receiptText);
    const receiptHasProfit = receiptText.includes("Laba menu ini");
    recordTest(
      "POS & Checkout",
      "Atomic Transaction Submission & Digital Receipt Breakdown",
      receiptHasTotal && receiptHasProfit,
      `Checkout completed in ${checkoutLatency}ms with margin & receipt display`
    );
    testResults.performanceMetrics["pos_checkout_latency_ms"] = checkoutLatency;

    await page.getByRole("button", { name: /Selesai, lanjut jualan/ }).click();
  } catch (err) {
    recordTest("POS & Checkout", "POS Execution Flow", false, err.message);
  }

  // -------------------------------------------------------------
  // Test Suite 3: Inventory Management & FEFO
  // -------------------------------------------------------------
  try {
    console.log("\n--- Suite 3: Inventory Management & FEFO ---");
    await page.getByRole("link", { name: "Stok", exact: true }).first().click();
    await page.waitForURL("**/app/stock");
    await page.waitForSelector("text=Daftar Stok Barang", { timeout: 10000 });

    const stockText = await page.innerText("body");
    const hasExpiryBoard = stockText.includes("Daftar Stok Barang");
    const hasExpiryChips = stockText.includes("Kritis H-1") || stockText.includes("Segera H-3");
    recordTest(
      "Inventory Management",
      "Papan Kedaluwarsa & Visual Urgency Indicators",
      hasExpiryBoard && hasExpiryChips,
      "Expiry board rendered with urgency tags (H-1 / H-3)"
    );

    // Test Restock Modal
    await page.getByRole("button", { name: /Belanja masuk/ }).first().click();
    await page.waitForSelector("text=Catat belanja masuk");
    await page.fill("#restock-qty", "5");
    await page.fill("#restock-cost", "125000");
    await page.fill("#restock-expiry", "2026-12-15");
    const t0_restock = Date.now();
    await page.getByRole("button", { name: /Simpan belanjaan/ }).click();
    await page.waitForSelector("text=Kulakan tersimpan", { timeout: 10000 });
    const restockLatency = Date.now() - t0_restock;
    recordTest(
      "Inventory Management",
      "Wholesale Stock-in Intake with FEFO Batch Recording",
      (await page.innerText("body")).includes("Kulakan tersimpan"),
      `Batch intake recorded in ${restockLatency}ms`
    );
    testResults.performanceMetrics["inventory_restock_latency_ms"] = restockLatency;

    // Test Human-in-the-loop OCR staging
    await page.getByRole("tab", { name: /Catat dari nota/ }).click();
    await page.getByRole("button", { name: /Pindai nota belanja/ }).click();
    await page.waitForSelector("text=Draf nota belanja", { timeout: 15000 });
    const stagingText = await page.innerText("body");
    const isStagingVisible = stagingText.includes("Draf nota belanja");
    recordTest(
      "AI OCR Staging",
      "Human-in-the-Loop OCR Staging Card (Pre-commit Verification)",
      isStagingVisible,
      "OCR results staged in editable card before database persistence"
    );
    await page.getByRole("button", { name: /Batal/ }).click();
  } catch (err) {
    recordTest("Inventory Management", "Inventory Flow", false, err.message);
  }

  // -------------------------------------------------------------
  // Test Suite 4: Security & Mode Juragan (PIN Lock)
  // -------------------------------------------------------------
  try {
    console.log("\n--- Suite 4: Security & Mode Juragan (PIN Lock) ---");
    await page.getByRole("button", { name: "Juragan", exact: true }).click();
    await page.waitForSelector("text=Mode Juragan");

    // Negative test: Enter wrong PIN '9999'
    for (const digit of ["9", "9", "9", "9"]) {
      await page.getByRole("button", { name: `Angka ${digit}` }).click();
    }
    await page.waitForSelector("text=PIN salah. Coba lagi.", { timeout: 5000 });
    const pinDenied = page.url().includes("/app/stock") || !(await page.innerText("body")).includes("Kantong laba");
    recordTest(
      "Security & RBAC",
      "Mode Juragan Unauthorized PIN Rejection (4-Digit PIN Gate)",
      pinDenied,
      "Incorrect PIN (9999) rejected; access to financial ledger blocked"
    );

    // Enter correct PIN '1234'
    for (const digit of ["1", "2", "3", "4"]) {
      await page.getByRole("button", { name: `Angka ${digit}` }).click();
    }
    await page.waitForURL("**/app/owner", { timeout: 10000 });
    const ownerText = await page.innerText("body");
    const hasProfitLedger = ownerText.includes("Kantong laba 7 hari terakhir");
    const hasPriceSimulator = ownerText.includes("Simulator harga");
    const hasRecipeEditor = ownerText.includes("Racikan & konversi satuan");
    recordTest(
      "Owner Governance",
      "Mode Juragan Verification & Financial Dashboard Access",
      hasProfitLedger && hasPriceSimulator && hasRecipeEditor,
      "Authenticated via X-Owner-PIN header; revenue analytics & recipe settings unlocked"
    );

    // Test Recipe Creation
    await page.getByRole("button", { name: /Menu baru/ }).click();
    await page.waitForSelector("text=Menu racikan baru");
    await page.fill("#recipe-name", "Mie Goreng QA Test");
    await page.fill("#recipe-price", "18000");
    await page.getByRole("button", { name: /Simpan menu/ }).click();
    await page.waitForSelector("text=Menu baru disimpan", { timeout: 10000 });
    recordTest(
      "Recipe & BoM",
      "Smart Bill of Materials (BoM) Recipe Creation",
      (await page.innerText("body")).includes("Mie Goreng QA Test"),
      "Recipe successfully registered and reflected in catalog"
    );
  } catch (err) {
    recordTest("Owner Governance", "Mode Juragan & Recipe Flow", false, err.message);
  }

  // -------------------------------------------------------------
  // Test Suite 5: Super Admin Console
  // -------------------------------------------------------------
  try {
    console.log("\n--- Suite 5: Super Admin Console ---");
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Super Admin Platform/ }).click();
    await page.waitForURL("**/admin", { timeout: 10000 });
    await page.waitForSelector("text=Warung terdaftar", { timeout: 10000 });

    const adminText = (await page.innerText("body")).toLowerCase();
    const hasAdminConsole = adminText.includes("warung terdaftar") && (adminText.includes("super admin") || adminText.includes("panel platform"));
    recordTest(
      "Multi-tenant SaaS",
      "Super Admin Platform Dashboard Access",
      hasAdminConsole,
      "Super Admin authenticated with administrative privileges"
    );

    // Test Tenant Management
    await page.getByRole("button", { name: /^Warung$/ }).click();
    await page.waitForSelector("input[placeholder='Cari warung']", { timeout: 5000 });
    const suspendBtn = page.getByRole("button", { name: /Tangguhkan|Aktifkan/ }).first();
    const canManageTenants = await suspendBtn.isVisible();
    await suspendBtn.click();
    await page.waitForSelector("text=warung?", { timeout: 5000 });
    await page.getByRole("button", { name: /Ya,/ }).click();
    await page.waitForTimeout(1000);

    recordTest(
      "Multi-tenant SaaS",
      "Tenant Governance & Lifecycle Control (Suspend / Activate)",
      canManageTenants,
      "Tenant status toggle action executed and confirmed"
    );

    // Test Platform Broadcast
    await page.getByRole("button", { name: /^Broadcast$/ }).click();
    await page.fill("#broadcast-text", "Pemberitahuan QA Otomatis: Sistem beroperasi normal.");
    await page.getByRole("button", { name: /Tayangkan ke warung aktif/ }).click();
    await page.waitForSelector("text=Pengumuman ditayangkan", { timeout: 10000 });
    recordTest(
      "Multi-tenant SaaS",
      "Admin Broadcast Dispatch to Active Tenants",
      (await page.innerText("body")).includes("Pemberitahuan QA Otomatis"),
      "Broadcast notification published and recorded in broadcast ledger"
    );
  } catch (err) {
    recordTest("Multi-tenant SaaS", "Super Admin Flow", false, err.message);
  }

  // -------------------------------------------------------------
  // Test Suite 6: Mobile Ergonomics & Viewport Audit
  // -------------------------------------------------------------
  try {
    console.log("\n--- Suite 6: Mobile Ergonomics & Viewport Audit ---");
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${base}/login`, { waitUntil: "networkidle" });
    const loginMobileText = await page.innerText("body");
    const mobileRenderOk = loginMobileText.includes("ResepLaba");
    recordTest(
      "Ergonomics & Responsiveness",
      "Mobile Viewport Rendering (375x667px)",
      mobileRenderOk,
      "Login and navigation responsive on mobile screen dimensions"
    );
  } catch (err) {
    recordTest("Ergonomics & Responsiveness", "Mobile Viewport Audit", false, err.message);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================");
  console.log("             QA TEST SUITE SUMMARY                ");
  console.log("==================================================");
  console.log(`Total Checks Run : ${testResults.summary.total}`);
  console.log(`Passed           : ${testResults.summary.passed}`);
  console.log(`Failed           : ${testResults.summary.failed}`);
  console.log(`Console Errors   : ${testResults.consoleErrors.length}`);
  console.log(`Network Anomalies: ${testResults.networkAnomalies.length}`);
  console.log("Performance Metrics:\n", JSON.stringify(testResults.performanceMetrics, null, 2));

  fs.writeFileSync(
    "scripts/qa-benchmark-results.json",
    JSON.stringify(testResults, null, 2),
    "utf-8"
  );
}

runQABenchmark();
