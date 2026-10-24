# Product Requirements Document (PRD)
## ResepLaba: SaaS Smart Inventory, FEFO Batch Tracking, and Margin Guard Platform for Micro & Medium SMEs (Warung & Culinary Edition)

* **Project Name**: ResepLaba (Warung & Culinary Edition)
* **Competition**: Garda Tech National Innovation Competition (GTNIC) 2026 — Web Development Category
* **Sub-Theme**: *Accelerating Digital Transformation for Business and SMEs* (Focus: Micro & Digital Economy)
* **Tech Stack**: Next.js (App Router, TypeScript, Tailwind CSS, shadcn/ui) + Laravel 11 REST API / Next.js Server Actions + PostgreSQL (Supabase)
* **Document Status**: Version 2.0 (Production-Ready Architecture for MVP)

---

## 1. Executive Summary & Problem Statement

Micro and small enterprises in Indonesia (such as *Warung Madura*, *Warmindo*, street food vendors, and local grocers) are the backbone of the national economy. However, they face systemic operational hurdles that erode their profit margins:
1. **Bulk-to-Retail Friction**: Owners buy goods in bulk wholesale units (e.g., 1 carton of 40 instant noodles, 1 crate of 15 kg eggs) but sell them individually or as processed composite menus (e.g., *Mie Goreng Telur + Nasi*). Manual conversions lead to inventory leakage.
2. **Expired Goods Losses (*Food Waste*)**: Conventional systems lack batch tracking, causing older packaged goods or fresh ingredients hidden at the back of shelves to expire unnoticed.
3. **Margin Blindness**: When wholesale supplier prices rise, owners often fail to adjust retail or menu prices in real time, resulting in declining profits or operating at a loss.
4. **Usability Barrier**: Complex, multi-role enterprise apps intimidate non-tech-savvy micro-entrepreneurs who operate alone or with 1–2 staff members.

**ResepLaba Solution**: A lightweight, dual-mode web application tailored for micro-retailers and food stalls, featuring automated bulk-to-retail conversion, **FEFO (First Expired, First Out)** batch inventory management, a **Smart Margin Guard**, and a **Super Admin SaaS Dashboard** to govern platform health and templates.

---

## 2. System Architecture & Role Hierarchy

To bridge simplicity for micro-users and powerful control for platform administrators, the system implements a **3-Tier Access Control Architecture**:

```
+-----------------------------------------------------------------+
|                    SUPER ADMIN PLATFORM (YOU)                   |
| - Store Management (Active / Banned / Suspend)                  |
| - Instant Starter Pack Templates (Pre-loaded Warung inventory)  |
| - AI Quota Limiter & National Inflation Price Broadcast         |
+--------------------------------+--------------------------------+
                                 │
                                 v
+-----------------------------------------------------------------+
|                    WARUNG TENANT (SINGLE LOGIN)                 |
|                                                                 |
|   [DEFAULT MODE: PENJAGA CASHIER]       [LOCKED WITH 4-DIGIT PIN]   |
|   - Fast POS Touch Interface            - Juragan Owner Mode            |
|   - Automated FEFO Stock Deduction      - Profit & Net Margin Analytics |
|   - Expiry Visual Alerts                - Recipe/BoM Cost Builder       |
|   - Quick [+ Restock In] entry          - Price Hike Simulation Slider  |
+-----------------------------------------------------------------+
```

---

## 3. Detailed Functional Requirements

### F-01: Super Admin SaaS Dashboard (Platform Control)
* **Store Management**: View all registered warung tenants, monitor status (`ACTIVE` / `BANNED`), and perform 1-click suspensions for abusive accounts.
* **Instant Template Seeder**: Provide pre-configured inventory templates (e.g., *Template Warung Madura*, *Template Warmindo*) so new users can populate their inventory in 1 second.
* **Broadcast & Inflation Monitor**: Broadcast banner announcements across all warung dashboards regarding wholesale price hikes.
* **AI Receipt OCR Quota Manager**: Limit daily free usages of the AI invoice scanner to preserve zero-cost operations ($0 Free Tier).

### F-02: Adaptive Dual-Mode Store Interface (Juragan vs. Penjaga)
* **Penjaga Cashier Mode (Default)**: Clean POS layout optimized for fast sales and quick stock-in logging (`+ Restock In`) without exposing sensitive profit margins or master recipe settings.
* **Juragan Owner Mode (Protected by 4-Digit PIN)**: Access to financial analytics, net profit reports, ingredient recipe builders, and price adjustment recommendations.

### F-03: Bulk-to-Retail & Smart Bill of Materials (BoM) Engine
* **Universal Conversion**: Supports both wholesale-to-retail unit splitting (e.g., 1 Box $\rightarrow$ 40 Pcs) and composite recipe manufacturing (e.g., 1 Plate of *Mie Goreng Telur* $\rightarrow$ Deducts 1 Pack Noodle + 1 Egg + 150g Rice).
* **Automatic Cost Calculation (HPP)**: Instantly computes the exact production cost per portion based on current bulk purchase prices.

### F-04: FEFO Batch Tracking & Automated Expiry Alerts
* **Batch Logging**: Every stock-in record captures `expiry_date`, `initial_qty`, and `unit_cost`.
* **FEFO Deduction Logic**: Sales transactions automatically deduct inventory from the batch closest to its expiration date.
* **Cron Job Expiry Alarm**: Daily background task (`/api/cron/check-expiry`) scans active batches and highlights items expiring within 3 days in bright red on the dashboard.

### F-05: Smart Margin Guard & Price Hike Simulator
* **Real-Time Profit Protection**: When new wholesale purchases reflect higher prices, the system calculates updated HPP and alerts the owner if profit margins fall below safe thresholds.
* **What-If Slider**: Interactive UI allowing owners to simulate retail price adjustments to maintain target profit margins.

---

## 4. Technology Stack (100% Free Tier / Student Budget)

| Component | Selected Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js (App Router) + Tailwind CSS + shadcn/ui | High performance, fully responsive on mobile/tablet devices. |
| **Backend & Logic** | Next.js Server Actions / Laravel 11 REST API | Secure server-side validation and database transactions. |
| **Database** | Supabase (PostgreSQL Free Tier) | ACID-compliant relational database ensuring zero data corruption during FEFO stock deductions. |
| **Hosting & Deploy** | Vercel (Hobby Free Tier) + Optional `.biz.id` domain (~Rp20k/yr) | Public live deployment for dewan juri evaluation. |
| **Automation** | Cron-job.org + Gemini 2.5 Flash API + Telegram Bot | Daily expiry scanner, AI invoice OCR parser, and instant push alerts. |

---

## 5. Database Schema Blueprint (PostgreSQL)

```sql
-- 1. Stores / Tenants Table (Super Admin Control)
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(100) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    whatsapp_number VARCHAR(20),
    business_type VARCHAR(30), -- 'WARMINDO', 'MADURA', 'GROSIR'
    owner_pin VARCHAR(6) DEFAULT '1234',
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE' or 'BANNED'
    ai_quota_limit INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Master Inventory / Bulk Goods
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    base_unit VARCHAR(20) NOT NULL, -- 'pcs', 'gram', 'ml'
    purchase_unit VARCHAR(50) NOT NULL, -- 'Kardus (Isi 40)'
    conversion_rate NUMERIC NOT NULL,
    total_stock NUMERIC DEFAULT 0,
    avg_cost NUMERIC DEFAULT 0,
    min_stock_alert NUMERIC DEFAULT 5
);

-- 3. FEFO Expiry Batches
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    batch_code VARCHAR(50),
    initial_qty NUMERIC NOT NULL,
    remaining_qty NUMERIC NOT NULL,
    unit_cost NUMERIC NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

-- 4. Sellable Products / Menu Recipes
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    selling_price NUMERIC NOT NULL,
    current_hpp NUMERIC NOT NULL,
    is_composite BOOLEAN DEFAULT FALSE -- FALSE = retail item, TRUE = recipe menu
);

-- 5. Recipe Composition (BoM Link)
CREATE TABLE product_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    qty_needed NUMERIC NOT NULL
);
```

---

## 6. Alignment with GTNIC 2026 Evaluation Criteria

1. **Problem Relevance & Innovation (20%)**: Directly targets grassroots micro-SMEs (*Warung Madura* and street vendors) with practical automation rather than complex enterprise ERPs.
2. **Functionality & System Implementation (25%)**: Complete end-to-end flow from bulk restock, FEFO batch reduction, POS sales, to margin alerts running seamlessly without errors.
3. **Technical Quality & Architecture (20%)**: Clean separation of concerns, secure PIN-locked roles, ACID database transactions, and a scalable Super Admin SaaS control layer.
4. **User Experience & Interface Design (15%)**: Intuitive dual-mode touch interface designed for high-stress cashier environments and non-technical owners.
5. **Business Impact & Scalability (10%)**: Solves critical financial leakage (margin loss & expired goods waste) with a proven path toward national SME digitization.
6. **Documentation & Demo (10%)**: Comprehensive PRD, ERD, and an **Instant Judge Sandbox** enabling evaluators to test the app in under 30 seconds.

---

## 7. Execution Timeline (Oct 19 – Nov 10, 2026)
* **Phase 1 (Oct 19–24)**: Repository setup, Supabase database configuration, and Super Admin tenant control panel.
* **Phase 2 (Oct 25–31)**: Dual-mode UI (Pin-lock Juragan vs. Penjaga), FEFO inventory batching, and automated cron expiry alerts.
* **Phase 3 (Nov 1–6)**: Smart BoM recipe builder, POS checkout engine, and Margin Guard simulation slider.
* **Phase 4 (Nov 7–10)**: Cross-device responsive testing, proposal finalization (`GTNIC2026_WebDev_ResepLaba.pdf`), and 3-minute video demo recording prior to the November 10 deadline.