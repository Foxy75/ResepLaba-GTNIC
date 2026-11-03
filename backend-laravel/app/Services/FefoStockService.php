<?php

namespace App\Services;

use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use Illuminate\Support\Facades\DB;

final class FefoStockService
{
    public function today(): string
    {
        return (string) config('reseplaba.demo_today', '2026-10-25');
    }

    /**
     * Porting domain.isUsableBatch: ACTIVE && qty > 0 && expiry >= today.
     */
    public function isUsableBatch(InventoryBatch $batch, ?string $today = null): bool
    {
        $today ??= $this->today();

        return $batch->status === 'ACTIVE'
            && (float) $batch->remaining_qty > 0
            && $batch->expiry_date?->format('Y-m-d') >= $today;
    }

    /**
     * Porting domain.stockOf: jumlah stok batch aktif yang belum kedaluwarsa.
     */
    public function stockOf(InventoryItem $item, ?string $today = null): float
    {
        $today ??= $this->today();

        return (float) InventoryBatch::query()
            ->where('inventory_item_id', $item->id)
            ->where('status', 'ACTIVE')
            ->where('remaining_qty', '>', 0)
            ->whereDate('expiry_date', '>=', $today)
            ->sum('remaining_qty');
    }

    /**
     * Porting domain.deductFefo. Deduksi FEFO dalam transaksi + lockForUpdate,
     * memotong batch terdekat kedaluwarsa lebih dulu.
     *
     * @return array{hpp: float, shortage: float, taken: array<int, array{batchId: string, qty: float, unitCost: float}>}
     */
    public function deduct(InventoryItem $item, float $needed, ?string $today = null): array
    {
        $today ??= $this->today();

        return DB::transaction(function () use ($item, $needed, $today) {
            $batches = InventoryBatch::query()
                ->where('inventory_item_id', $item->id)
                ->where('status', 'ACTIVE')
                ->where('remaining_qty', '>', 0)
                ->whereDate('expiry_date', '>=', $today)
                ->orderBy('expiry_date', 'ASC')
                ->orderBy('batch_code', 'ASC')
                ->lockForUpdate()
                ->get();

            $remaining = $needed;
            $hpp = 0.0;
            $taken = [];

            foreach ($batches as $batch) {
                if ($remaining <= 0) {
                    break;
                }

                $used = min((float) $batch->remaining_qty, $remaining);
                $batch->remaining_qty = round(((float) $batch->remaining_qty - $used) * 1000) / 1000;
                $batch->status = $batch->remaining_qty <= 0 ? 'DEPLETED' : 'ACTIVE';
                $batch->save();

                $remaining -= $used;
                $hpp += $used * (float) $batch->unit_cost;
                $taken[] = [
                    'batchId' => $batch->id,
                    'qty' => $used,
                    'unitCost' => (float) $batch->unit_cost,
                ];
            }

            return [
                'hpp' => round($hpp),
                'shortage' => max(0, $remaining),
                'taken' => $taken,
            ];
        });
    }
}