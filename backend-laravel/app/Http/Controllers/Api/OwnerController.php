<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveItemRequest;
use App\Http\Requests\SaveProductRequest;
use App\Http\Requests\UpdateStoreSettingsRequest;
use App\Http\Requests\VerifyPinRequest;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\ProductComposition;
use App\Models\SellableProduct;
use App\Models\StarterTemplate;
use App\Services\FefoStockService;
use App\Services\HppCalculatorService;
use App\Support\ApiResponse;
use App\Support\WorkspaceSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class OwnerController extends Controller
{
    public function __construct(
        private readonly FefoStockService $fefo,
        private readonly HppCalculatorService $hpp,
    ) {
    }

    public function saveProduct(SaveProductRequest $request, ?string $id = null): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $data = $request->validated();
        $productId = $id ?? (string) ($data['id'] ?? '');
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return ApiResponse::fail('Nama menu belum diisi.');
        }

        $recipe = array_values(array_filter(
            $data['recipe'] ?? [],
            static fn (array $line) => ($line['itemId'] ?? '') !== '' && (float) ($line['qty'] ?? 0) > 0,
        ));

        if ($recipe === []) {
            return ApiResponse::fail('Racikan minimal punya satu bahan.');
        }

        if ((float) ($data['price'] ?? 0) <= 0) {
            return ApiResponse::fail('Harga jual harus lebih dari nol.');
        }

        $product = $productId !== ''
            ? SellableProduct::where('store_id', $store->id)->where('id', $productId)->first()
            : null;

        $exists = $product !== null;

        if (! $product) {
            $product = new SellableProduct();
            $product->id = $productId !== '' ? $productId : $this->nextId('menu');
            $product->store_id = $store->id;
        }

        $product->name = $name;
        $product->kind = (string) ($data['kind'] ?? ($product->kind ?? 'retail'));
        $product->category = (string) ($data['category'] ?? ($product->category ?? 'eceran'));
        $product->icon = (string) ($data['icon'] ?? ($product->icon ?? 'meal'));
        $product->selling_price = (float) ($data['price'] ?? 0);
        $product->target_margin_percent = (float) ($data['targetMargin'] ?? 25);
        $product->save();

        $product->compositions()->delete();

        foreach ($recipe as $line) {
            ProductComposition::query()->create([
                'id' => $this->nextId('pc'),
                'sellable_product_id' => $product->id,
                'inventory_item_id' => (string) $line['itemId'],
                'qty_needed' => (float) $line['qty'],
                'waste_percent' => (float) ($line['wastePct'] ?? 0),
            ]);
        }

        $message = $exists ? 'Menu diperbarui.' : 'Menu baru disimpan.';

        return ApiResponse::ok($message, WorkspaceSerializer::product($product->refresh()));
    }

    public function deleteProduct(Request $request, string $id): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $product = SellableProduct::where('store_id', $store->id)->where('id', $id)->first();

        if (! $product) {
            return ApiResponse::fail('Menu tidak ditemukan.');
        }

        $name = $product->name;
        $product->delete();

        return ApiResponse::ok("Menu {$name} dihapus.", null);
    }

    public function saveItem(SaveItemRequest $request, ?string $id = null): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $data = $request->validated();
        $itemId = $id ?? (string) ($data['id'] ?? '');
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return ApiResponse::fail('Nama barang belum diisi.');
        }

        if ((float) ($data['conversionRate'] ?? 0) <= 0) {
            return ApiResponse::fail('Isi per kemasan harus lebih dari nol.');
        }

        if ((float) ($data['minStock'] ?? 0) < 0) {
            return ApiResponse::fail('Stok minimum tidak boleh negatif.');
        }

        $item = $itemId !== ''
            ? InventoryItem::where('store_id', $store->id)->where('id', $itemId)->first()
            : null;

        $exists = $item !== null;

        if (! $item) {
            $item = new InventoryItem();
            $item->id = $itemId !== '' ? $itemId : $this->nextId('item');
            $item->store_id = $store->id;
        }

        $item->name = $name;
        $item->base_unit = (string) ($data['baseUnit'] ?? $item->base_unit ?? 'pcs');
        $item->purchase_unit = (string) ($data['purchaseUnit'] ?? $item->purchase_unit ?? '');
        $item->conversion_rate = (float) ($data['conversionRate'] ?? 1);
        $item->min_stock = (float) ($data['minStock'] ?? 0);
        if (array_key_exists('unitCost', $data) && $data['unitCost'] !== null) {
            $item->unit_cost = (float) $data['unitCost'];
        }
        $item->save();

        $message = $exists ? 'Barang diperbarui.' : 'Barang baru ditambahkan.';

        return ApiResponse::ok($message, WorkspaceSerializer::item($item->refresh()));
    }

    public function verifyPin(VerifyPinRequest $request): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $result = \App\Services\PinSecurityService::verify($store, (string) $request->input('pin'), $request);

        if (! $result['ok']) {
            return ApiResponse::fail($result['message'], [], $result['status']);
        }

        return ApiResponse::ok($result['message'], true);
    }

    public function applyTemplate(Request $request, string $id): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $template = StarterTemplate::with('items')->where('id', $id)->first();

        if (! $template) {
            return ApiResponse::fail('Template tidak ditemukan.');
        }

        $items = InventoryItem::where('store_id', $store->id)->get()->keyBy('name');
        $added = 0;

        foreach ($template->items as $templateItem) {
            $existing = $items->get($templateItem->name);

            if ($existing) {
                continue;
            }

            $itemId = 'it-'.$template->id.'-'.Str::slug($templateItem->name);

            InventoryItem::query()->create([
                'id' => $itemId,
                'store_id' => $store->id,
                'name' => $templateItem->name,
                'base_unit' => $templateItem->base_unit,
                'purchase_unit' => $templateItem->purchase_unit,
                'conversion_rate' => $templateItem->conversion_rate,
                'unit_cost' => $templateItem->unit_cost,
                'min_stock' => $templateItem->min_stock,
            ]);

            $units = (float) $templateItem->conversion_rate * 2;

            InventoryBatch::query()->create([
                'id' => $this->nextId('batch'),
                'inventory_item_id' => $itemId,
                'batch_code' => strtoupper(substr((string) $template->name, 0, 2)).'-'.date('ymd', strtotime($this->fefo->today())),
                'initial_qty' => $units,
                'remaining_qty' => $units,
                'unit_cost' => $templateItem->unit_cost,
                'expiry_date' => $this->hpp->addDays($this->fefo->today(), 120),
                'status' => 'ACTIVE',
            ]);

            $items->put($templateItem->name, InventoryItem::find($itemId));
            $added++;
        }

        return ApiResponse::ok("Paket {$template->name} ditambahkan: {$added} barang baru.", $added);
    }

    public function updateSettings(UpdateStoreSettingsRequest $request): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $data = $request->validated();
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return ApiResponse::fail('Nama warung belum diisi.');
        }

        $targetMargin = (float) ($data['targetMargin'] ?? $store->target_margin_percent);
        if ($targetMargin < 0 || $targetMargin > 90) {
            return ApiResponse::fail('Target margin harus antara 0 dan 90 persen.');
        }

        $store->name = $name;
        $store->target_margin_percent = $targetMargin;
        $store->whatsapp = trim((string) ($data['whatsapp'] ?? $store->whatsapp));
        $store->save();

        return ApiResponse::ok('Pengaturan warung disimpan.', null);
    }

    public function profitSummary(Request $request): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $today = $this->fefo->today();

        $transactions = [];
        foreach ($store->transactions()->orderByDesc('id')->get() as $transaction) {
            $transactions[] = WorkspaceSerializer::transaction($transaction);
        }

        $items = [];
        foreach ($store->items()->orderBy('id')->get() as $item) {
            $items[] = WorkspaceSerializer::item($item);
        }

        $batches = [];
        foreach ($store->items()->with('batches')->get() as $item) {
            foreach ($item->batches as $batch) {
                $batches[] = WorkspaceSerializer::batch($batch);
            }
        }

        $series = $this->hpp->seriesByDay($transactions, 7, $today);
        $totals = [
            'omzet' => array_sum(array_map(static fn (array $p) => $p['omzet'], $series)),
            'hpp' => array_sum(array_map(static fn (array $p) => $p['hpp'], $series)),
            'laba' => array_sum(array_map(static fn (array $p) => $p['laba'], $series)),
        ];

        return ApiResponse::ok('Ringkasan laba dimuat.', [
            'series' => $series,
            'totals' => $totals,
            'byProduct' => $this->hpp->profitByProduct($transactions),
            'lowStock' => $this->hpp->lowStockItems($items, $batches, $today),
            'heatmap' => $this->hpp->expiryHeatmap($items, $batches, 30, $today),
        ]);
    }

    private function nextId(string $prefix): string
    {
        return $prefix.'-'.uniqid().'-'.mt_rand(10, 99);
    }
}