<?php

namespace App\Support;

use App\Models\Broadcast;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\SellableProduct;
use App\Models\StarterTemplate;
use App\Models\Store;
use App\Models\Transaction;

/**
 * Pemetaan 1:1 model Eloquent (snake_case) -> JSON kontrak frontend (camelCase),
 * persis bentuk types.ts. id dipertahankan sebagai string slug dari seed.
 */
final class WorkspaceSerializer
{
    public static function num(mixed $value): int|float
    {
        $value = (float) $value;

        return $value == (float) (int) $value ? (int) $value : $value;
    }

    public static function store(Store $store): array
    {
        return [
            'id' => (string) $store->id,
            'name' => (string) $store->name,
            'ownerName' => (string) $store->owner_name,
            'businessType' => (string) $store->business_type,
            'categoryLabel' => (string) $store->category_label,
            'whatsapp' => (string) $store->whatsapp,
            'status' => (string) $store->status,
            'aiQuota' => (int) $store->ai_quota,
            'aiUsed' => (int) $store->ai_used,
            'targetMargin' => self::num($store->target_margin_percent),
            'pin' => (string) config('reseplaba.demo_pin', '1234'),
        ];
    }

    public static function item(InventoryItem $item): array
    {
        return [
            'id' => (string) $item->id,
            'name' => (string) $item->name,
            'baseUnit' => (string) $item->base_unit,
            'purchaseUnit' => (string) $item->purchase_unit,
            'conversionRate' => self::num($item->conversion_rate),
            'unitCost' => self::num($item->unit_cost),
            'minStock' => self::num($item->min_stock),
        ];
    }

    public static function batch(InventoryBatch $batch): array
    {
        return [
            'id' => (string) $batch->id,
            'itemId' => (string) $batch->inventory_item_id,
            'code' => (string) $batch->batch_code,
            'expiresAt' => $batch->expiry_date?->format('Y-m-d'),
            'qty' => self::num($batch->remaining_qty),
            'initialQty' => self::num($batch->initial_qty),
            'unitCost' => self::num($batch->unit_cost),
            'status' => (string) $batch->status,
        ];
    }

    public static function product(SellableProduct $product): array
    {
        $recipe = [];

        foreach ($product->compositions()->orderBy('id')->get() as $line) {
            $recipe[] = [
                'itemId' => (string) $line->inventory_item_id,
                'qty' => self::num($line->qty_needed),
                'wastePct' => self::num($line->waste_percent),
            ];
        }

        return [
            'id' => (string) $product->id,
            'name' => (string) $product->name,
            'kind' => (string) $product->kind,
            'category' => (string) $product->category,
            'icon' => (string) $product->icon,
            'price' => self::num($product->selling_price),
            'targetMargin' => self::num($product->target_margin_percent),
            'recipe' => $recipe,
        ];
    }

    public static function transaction(Transaction $transaction): array
    {
        $lines = [];

        foreach ($transaction->items()->orderBy('id')->get() as $line) {
            $lines[] = [
                'productId' => (string) $line->sellable_product_id,
                'name' => (string) $line->product_name,
                'qty' => (int) $line->qty_sold,
                'price' => self::num($line->unit_price),
                'hpp' => self::num($line->unit_hpp),
            ];
        }

        return [
            'id' => (string) $transaction->id,
            'storeId' => (string) $transaction->store_id,
            'createdAt' => (string) ($transaction->created_at_time ?? $transaction->created_at?->toISOString()),
            'day' => $transaction->day?->format('Y-m-d'),
            'total' => self::num($transaction->total_amount),
            'hpp' => self::num($transaction->total_hpp),
            'profit' => self::num($transaction->net_profit),
            'lines' => $lines,
        ];
    }

    public static function tenant(Store $store, int $transactionsToday): array
    {
        return [
            'id' => (string) ($store->tenant_id ?? $store->id),
            'storeId' => (string) $store->id,
            'name' => (string) $store->name,
            'ownerName' => (string) $store->owner_name,
            'businessType' => (string) $store->business_type,
            'categoryLabel' => (string) $store->category_label,
            'status' => (string) $store->status,
            'transactionsToday' => $transactionsToday,
            'aiUsed' => (int) $store->ai_used,
            'aiQuota' => (int) $store->ai_quota,
            'joinedAt' => $store->joined_at?->format('Y-m-d'),
        ];
    }

    public static function broadcast(Broadcast $broadcast): array
    {
        return [
            'id' => (string) $broadcast->id,
            'message' => (string) $broadcast->message,
            'severity' => (string) $broadcast->severity,
            'createdAt' => (string) $broadcast->created_at?->toISOString(),
        ];
    }

    public static function template(StarterTemplate $template): array
    {
        $items = [];

        foreach ($template->items()->orderBy('id')->get() as $line) {
            $items[] = [
                'name' => (string) $line->name,
                'baseUnit' => (string) $line->base_unit,
                'purchaseUnit' => (string) $line->purchase_unit,
                'conversionRate' => self::num($line->conversion_rate),
                'unitCost' => self::num($line->unit_cost),
                'minStock' => self::num($line->min_stock),
            ];
        }

        return [
            'id' => (string) $template->id,
            'name' => (string) $template->name,
            'description' => (string) $template->description,
            'items' => $items,
        ];
    }

    /**
     * Snapshot penuh { store, items, batches, products, transactions, broadcasts, tenants, templates }.
     */
    public static function snapshot(Store $store, ?string $today = null): array
    {
        $today ??= (string) config('reseplaba.demo_today', '2026-10-25');

        $items = [];
        foreach ($store->items()->orderBy('id')->get() as $item) {
            $items[] = self::item($item);
        }

        $batches = [];
        foreach ($store->items()->with('batches')->get() as $item) {
            foreach ($item->batches as $batch) {
                $batches[] = self::batch($batch);
            }
        }

        $products = [];
        foreach ($store->products()->orderBy('id')->get() as $product) {
            $products[] = self::product($product);
        }

        $transactions = [];
        foreach ($store->transactions()->orderByDesc('id')->get() as $transaction) {
            $transactions[] = self::transaction($transaction);
        }

        $broadcasts = [];
        foreach (Broadcast::orderByDesc('created_at')->get() as $broadcast) {
            $broadcasts[] = self::broadcast($broadcast);
        }

        $tenants = [];
        foreach (Store::orderBy('id')->get() as $tenant) {
            $tenants[] = self::tenant(
                $tenant,
                (int) $tenant->transactions()->whereDate('day', $today)->count(),
            );
        }

        $templates = [];
        foreach (StarterTemplate::orderBy('id')->get() as $template) {
            $templates[] = self::template($template);
        }

        return [
            'store' => self::store($store),
            'items' => $items,
            'batches' => $batches,
            'products' => $products,
            'transactions' => $transactions,
            'broadcasts' => $broadcasts,
            'tenants' => $tenants,
            'templates' => $templates,
        ];
    }
}