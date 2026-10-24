-- =============================================================================
-- ResepLaba Database Schema (PostgreSQL / Supabase / MySQL compatible)
-- GTNIC 2026 - Smart Inventory, FEFO Tracking & Margin Guard Platform
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'STORE_USER', -- 'SUPER_ADMIN', 'STORE_USER'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. STORES / TENANTS TABLE
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'WARMINDO', -- 'MADURA', 'WARMINDO', 'BAKERY', 'OTHER'
    owner_pin_hash VARCHAR(255) NOT NULL, -- PIN 4 Digit Mode Juragan (Bcrypt)
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED'
    daily_ai_quota INT DEFAULT 5,
    ai_used_today INT DEFAULT 0,
    telegram_chat_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INVENTORY ITEMS (Master Bahan / Eceran)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    base_unit VARCHAR(50) NOT NULL, -- 'pcs', 'butir', 'gram', 'ml'
    purchase_unit VARCHAR(50) NOT NULL, -- 'Kardus', 'Krat', 'Karung', 'Pak'
    conversion_rate NUMERIC(12, 2) NOT NULL DEFAULT 1.00, -- 1 Kardus = 40 pcs
    total_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- dalam base_unit
    avg_cost_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- Moving Average Cost
    min_stock_alert NUMERIC(12, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INVENTORY BATCHES (Pelacakan Batch FEFO & Kedaluwarsa)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) NOT NULL,
    initial_qty NUMERIC(12, 2) NOT NULL,
    remaining_qty NUMERIC(12, 2) NOT NULL,
    purchase_unit_cost NUMERIC(14, 2) NOT NULL,
    expiry_date DATE NOT NULL, -- Kunci Utama Algoritma FEFO
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'DEPLETED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SELLABLE PRODUCTS (Menu / Produk Siap Jual di Kasir)
CREATE TABLE IF NOT EXISTS sellable_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    product_type VARCHAR(50) DEFAULT 'SINGLE_ITEM', -- 'SINGLE_ITEM', 'RECIPE_BUNDLE'
    selling_price NUMERIC(14, 2) NOT NULL,
    current_hpp NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    min_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    is_margin_warning BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. PRODUCT COMPOSITIONS (Resep / Bill of Materials)
CREATE TABLE IF NOT EXISTS product_compositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sellable_product_id UUID NOT NULL REFERENCES sellable_products(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    qty_needed NUMERIC(12, 2) NOT NULL, -- 1 bungkus mie, 1 butir telur, 150 gram beras
    waste_percent NUMERIC(5, 2) DEFAULT 0.00, -- Toleransi susut (0% - 5%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TRANSACTIONS (Nota Penjualan POS)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL,
    total_hpp_snapshot NUMERIC(14, 2) NOT NULL,
    net_profit_snapshot NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TRANSACTION ITEMS
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    sellable_product_id UUID NOT NULL REFERENCES sellable_products(id) ON DELETE RESTRICT,
    qty_sold INT NOT NULL,
    unit_price_snapshot NUMERIC(14, 2) NOT NULL,
    unit_hpp_snapshot NUMERIC(14, 2) NOT NULL
);

-- 9. STOCK MOVEMENTS (Audit Trail Perpindahan Stok)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    inventory_batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'RESTOCK_IN', 'SALE_OUT', 'EXPIRED_WASTE', 'ADJUSTMENT'
    qty NUMERIC(12, 2) NOT NULL,
    cost NUMERIC(14, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
