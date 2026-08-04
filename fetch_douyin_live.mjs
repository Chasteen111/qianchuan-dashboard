// Fetch douyin live data via Playwright
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const USER_DATA = "C:/Users/vfu/Documents/Codex/2026-07-27/a-3/work/browser-data";
const OUTPUT = "F:/AI/临时拷贝区/千川看板/douyin_live_raw.json";

const context = await chromium.launchPersistentContext(USER_DATA, {
  headless: true, viewport: { width: 1440, height: 900 },
});

const page = await context.newPage();
let capturedData = null;

// Capture the shop_live_list_room_detail API response
page.on("response", async (resp) => {
  const url = resp.url();
  if (url.includes("shop_live_list_room_detail")) {
    try {
      const body = await resp.json();
      capturedData = body;
      console.log("Captured API response:", url.substring(0, 100));
    } catch (e) {}
  }
});

// Navigate to live overview
console.log("Navigating to compass...");
await page.goto("https://compass.jinritemai.com/shop/live-overview", { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(5000);

// Switch account
try {
  await page.click(".aurora-select-content-value"); await page.waitForTimeout(800);
  await page.click("text=自营账号"); await page.waitForTimeout(3000);
} catch (e) { console.log("Account switch may already be set"); }

// Set date to yesterday (T-1)
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
const yday = yesterday.getDate().toString();
try {
  await page.click(".ecom-dorami-date-picker-wrapper >> text=自定义"); await page.waitForTimeout(1500);
  const inputs = await page.$$(".ecom-picker-input");
  if (inputs.length > 0) { await inputs[0].click({ force: true }); await page.waitForTimeout(1000); }
  await page.evaluate((day) => {
    document.querySelectorAll(".ecom-picker-date-panel td").forEach(c => {
      if (c.textContent.trim() === day) c.click();
    });
  }, yday);
  await page.waitForTimeout(1000);
  if (inputs.length > 1) { await inputs[1].click({ force: true }); await page.waitForTimeout(1000); }
  await page.evaluate((day) => {
    document.querySelectorAll(".ecom-picker-date-panel td").forEach(c => {
      if (c.textContent.trim() === day) c.click();
    });
  }, yday);
  await page.waitForTimeout(1000);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(8000);
} catch (e) { console.log("Date selection issue:", e.message); }

if (capturedData) {
  fs.writeFileSync(OUTPUT, JSON.stringify(capturedData, null, 2), "utf-8");
  console.log("Data saved:", OUTPUT);
  const rows = capturedData?.data?.module_data?.shop_live_list_room_detail?.compass_general_table_value?.data;
  console.log("Sessions found:", rows?.length || 0);
} else {
  console.log("No API data captured - writing empty");
  fs.writeFileSync(OUTPUT, "{}", "utf-8");
}

await context.close();
