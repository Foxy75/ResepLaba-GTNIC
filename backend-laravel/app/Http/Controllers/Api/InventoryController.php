<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdjustBatchRequest;
use App\Http\Requests\MarkBatchRequest;
use App\Http\Requests\ReceiptCommitRequest;
use App\Http\Requests\RestockRequest;
use App\Models\AiUsageLog;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use App\Services\FefoStockService;
use App\Services\GeminiAgentService;
use App\Services\HppCalculatorService;
use App\Support\ApiResponse;
use App\Support\WorkspaceSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class InventoryController extends Controller
{
    public function __construct(
        private readonly FefoStockService $fefo,
        private readonly HppCalculatorService $hpp,
        private readonly GeminiAgentService $gemini,
    ) {
    }

    public function restock(RestockRequest $request): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $item = InventoryItem::query()
            ->where('store_id', $store->id)
            ->where('id', $request->input('itemId'))
            ->first();

        if (! $item) {
            return ApiResponse::fail('Pilih barang yang tersedia.');
        }

        $data = $request->validated();

        $units = (float) $data['purchaseQty'] * (float) $item->conversion_rate;
        $unitCost = (float) $data['totalCost'] / $units;
        $currentQty = $this->fefo->stockOf($item);
        $nextCost = $this->hpp->movingAverageCost($currentQty, (float) $item->unit_cost, $units, $unitCost);

        $code = trim((string) ($data['code'] ?? ''));
        if ($code === '') {
            $code = strtoupper(substr((string) $item->base_unit, 0, 2)).'-'.date('ymd', strtotime($this->fefo->today()));
        }

        $batch = InventoryBatch::query()->create([
            'id' => $this->nextId('batch'),
            'inventory_item_id' => $item->id,
            'batch_code' => $code,
            'initial_qty' => $units,
            'remaining_qty' => $units,
            'unit_cost' => $unitCost,
            'expiry_date' => $data['expiresAt'],
            'status' => 'ACTIVE',
        ]);

        $item->unit_cost = $nextCost;
        $item->save();

        StockMovement::query()->create([
            'id' => $this->nextId('sm'),
            'store_id' => $store->id,
            'inventory_item_id' => $item->id,
            'inventory_batch_id' => $batch->id,
            'type' => 'RESTOCK_IN',
            'qty' => $units,
            'cost' => $unitCost,
            'notes' => null,
        ]);

        return ApiResponse::ok('Kulakan tersimpan.', [
            'batch' => WorkspaceSerializer::batch($batch),
            'units' => $units,
            'unitCost' => $unitCost,
        ], $this->hpp->marginWarnings($store));
    }

    public function ocrReceipt(Request $request): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $imageBase64 = $this->extractImageBase64($request);

        $draft = $this->gemini->parseReceipt($imageBase64);

        $draft = $this->matchItemIds($store, $draft);

        $store->ai_used = (int) $store->ai_used + 1;
        $store->save();

        AiUsageLog::query()->create([
            'id' => $this->nextId('ail'),
            'store_id' => $store->id,
            'agent' => 'receipt_parser',
            'tokens' => 0,
        ]);

        return ApiResponse::ok('Draf nota siap diperiksa.', $draft);
    }

    public function commitReceipt(ReceiptCommitRequest $request): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $items = InventoryItem::query()
            ->where('store_id', $store->id)
            ->get()
            ->keyBy('id');

        $added = 0;
        $warnings = [];

        foreach ($request->validated('rows') as $row) {
            $item = $items->get($row['itemId']);

            if (! $item) {
                $warnings[] = "{$row['name']} belum ada di daftar barang.";
                continue;
            }

            if (empty($row['expiresAt'])) {
                $warnings[] = "{$row['name']} belum punya tanggal kedaluwarsa.";
                continue;
            }

            $units = (float) $row['purchaseQty'] * (float) $row['conversionRate'];
            $unitCost = (float) $row['totalCost'] / $units;
            $currentQty = $this->fefo->stockOf($item);
            $nextCost = $this->hpp->movingAverageCost($currentQty, (float) $item->unit_cost, $units, $unitCost);

            $batch = InventoryBatch::query()->create([
                'id' => $this->nextId('batch'),
                'inventory_item_id' => $item->id,
                'batch_code' => strtoupper(substr((string) $item->base_unit, 0, 2)).'-'.date('ymd', strtotime($this->fefo->today())),
                'initial_qty' => $units,
                'remaining_qty' => $units,
                'unit_cost' => $unitCost,
                'expiry_date' => $row['expiresAt'],
                'status' => 'ACTIVE',
            ]);

            StockMovement::query()->create([
                'id' => $this->nextId('sm'),
                'store_id' => $store->id,
                'inventory_item_id' => $item->id,
                'inventory_batch_id' => $batch->id,
                'type' => 'RECEIPT_IN',
                'qty' => $units,
                'cost' => $unitCost,
                'notes' => null,
            ]);

            $item->unit_cost = $nextCost;
            $item->save();

            $added++;
        }

        if (! $added) {
            return ApiResponse::fail('Belum ada baris yang bisa disimpan. Isi tanggal kedaluwarsa lebih dulu.', $warnings);
        }

        return ApiResponse::ok("{$added} barang masuk ke stok.", ['added' => $added], [...$warnings, ...$this->hpp->marginWarnings($store)]);
    }

    public function adjustBatch(AdjustBatchRequest $request, string $id): JsonResponse
    {
        $batch = $this->findStoreBatch($request, $id);

        if (! $batch) {
            return ApiResponse::fail('Batch tidak ditemukan.');
        }

        $qty = (float) $request->validated('qty');
        $oldQty = (float) $batch->remaining_qty;
        $batch->remaining_qty = $qty;
        $batch->status = $qty <= 0 ? 'DEPLETED' : $batch->status;
        $batch->save();

        StockMovement::query()->create([
            'id' => $this->nextId('sm'),
            'store_id' => $batch->item->store_id,
            'inventory_item_id' => $batch->inventory_item_id,
            'inventory_batch_id' => $batch->id,
            'type' => 'ADJUSTMENT',
            'qty' => $qty - $oldQty,
            'cost' => null,
            'notes' => (string) $request->input('reason', ''),
        ]);

        $reason = (string) $request->input('reason', '');

        return ApiResponse::ok(trim("Stok {$batch->batch_code} disesuaikan. {$reason}"), WorkspaceSerializer::batch($batch->refresh()));
    }

    public function promoBatch(Request $request, string $id): JsonResponse
    {
        $batch = $this->findStoreBatch($request, $id);

        if (! $batch) {
            return ApiResponse::fail('Batch tidak ditemukan.');
        }

        $item = $batch->item;
        $today = strtotime($this->fefo->today());
        $expiry = strtotime((string) $batch->expiry_date);
        $days = (int) max(0, floor(($expiry - $today) / 86400));

        $text = $this->gemini->zeroWastePromo($item->name, $batch->batch_code, $days, (float) $batch->remaining_qty);

        return ApiResponse::ok('Ide promo siap.', ['text' => $text]);
    }

    public function markBatch(MarkBatchRequest $request, string $id): JsonResponse
    {
        $batch = $this->findStoreBatch($request, $id);

        if (! $batch) {
            return ApiResponse::fail('Batch tidak ditemukan.');
        }

        $status = (string) $request->validated('status');
        $batch->status = $status;
        $batch->remaining_qty = 0;
        $batch->save();

        StockMovement::query()->create([
            'id' => $this->nextId('sm'),
            'store_id' => $batch->item->store_id,
            'inventory_item_id' => $batch->inventory_item_id,
            'inventory_batch_id' => $batch->id,
            'type' => $status === 'DAMAGED' ? 'DAMAGED_WASTE' : 'EXPIRED_WASTE',
            'qty' => 0,
            'cost' => null,
            'notes' => null,
        ]);

        $message = $status === 'DAMAGED'
            ? "Batch {$batch->batch_code} ditandai rusak."
            : "Batch {$batch->batch_code} ditandai kedaluwarsa.";

        return ApiResponse::ok($message, WorkspaceSerializer::batch($batch->refresh()));
    }

    public function removeBatch(Request $request, string $id): JsonResponse
    {
        $batch = $this->findStoreBatch($request, $id);

        if (! $batch) {
            return ApiResponse::fail('Batch tidak ditemukan.');
        }

        $code = $batch->batch_code;
        $batch->delete();

        return ApiResponse::ok("Batch {$code} dihapus dari daftar stok.", null);
    }

    private function findStoreBatch(Request $request, string $id): ?InventoryBatch
    {
        $store = $request->user()?->store;

        if (! $store) {
            return null;
        }

        return InventoryBatch::query()
            ->where('id', $id)
            ->whereHas('item', fn ($query) => $query->where('store_id', $store->id))
            ->with('item')
            ->first();
    }

    private function extractImageBase64(Request $request): ?string
    {
        if ($request->hasFile('image')) {
            $file = $request->file('image');

            return base64_encode((string) $file->get());
        }

        $json = $request->json('imageBase64');

        return is_string($json) && $json !== '' ? $json : null;
    }

    /**
     * Cocokkan raw_name ke item toko (best-effort) bila itemId belum terisi.
     */
    private function matchItemIds(\App\Models\Store $store, array $draft): array
    {
        $items = InventoryItem::query()->where('store_id', $store->id)->get();

        foreach ($draft['rows'] as &$row) {
            if (($row['itemId'] ?? '') !== '') {
                continue;
            }

            $name = mb_strtolower((string) ($row['name'] ?? ''));

            $exact = $items->first(fn ($item) => mb_strtolower($item->name) === $name);
            if ($exact) {
                $row['itemId'] = $exact->id;
                continue;
            }

            $contains = $items->first(fn ($item) => str_contains(mb_strtolower($item->name), $name) || str_contains($name, mb_strtolower($item->name)));
            if ($contains) {
                $row['itemId'] = $contains->id;
            }
        }
        unset($row);

        return $draft;
    }

    private function nextId(string $prefix): string
    {
        return $prefix.'-'.uniqid().'-'.mt_rand(10, 99);
    }
}