<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryBatch;
use App\Models\StockMovement;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class CronController extends Controller
{
    public function dailyExpiryCheck(Request $request): JsonResponse
    {
        $secret = (string) $request->query('secret', '');
        $expected = (string) config('reseplaba.cron_secret', 'reseplaba-2026');

        if ($secret === '' || ! hash_equals($expected, $secret)) {
            return ApiResponse::fail('Secret cron tidak valid.', [], 403);
        }

        $today = (string) config('reseplaba.demo_today', '2026-10-25');

        $expired = InventoryBatch::query()
            ->where('status', 'ACTIVE')
            ->whereDate('expiry_date', '<', $today)
            ->with('item')
            ->get();

        $count = 0;

        foreach ($expired as $batch) {
            $batch->status = 'EXPIRED';
            $batch->remaining_qty = 0;
            $batch->save();

            StockMovement::query()->create([
                'id' => 'sm-'.uniqid().'-'.mt_rand(10, 99),
                'store_id' => $batch->item->store_id,
                'inventory_item_id' => $batch->inventory_item_id,
                'inventory_batch_id' => $batch->id,
                'type' => 'EXPIRED_WASTE',
                'qty' => 0,
                'cost' => null,
                'notes' => 'Penandaan kedaluwarsa otomatis harian.',
            ]);

            $count++;
        }

        return ApiResponse::ok("{$count} batch ditandai kedaluwarsa.", ['expired' => $count]);
    }
}