<?php

namespace App\Services;

use App\Models\Store;
use App\Models\SellableProduct;

final class HppCalculatorService
{
    public function __construct(
        private readonly GeminiAgentService $advisor,
    ) {
    }

    public function addDays(string $day, int $offset): string
    {
        return date('Y-m-d', strtotime($day.' +'.$offset.' days'));
    }

    /** Porting domain.movingAverageCost. */
    public function movingAverageCost(float $currentQty, float $currentCost, float $addQty, float $addCost): float
    {
        if ($currentQty <= 0) {
            return $addCost;
        }

        $total = $currentQty + $addQty;
        if ($total <= 0) {
            return $currentCost;
        }

        return ($currentQty * $currentCost + $addQty * $addCost) / $total;
    }

    /** Porting domain.computeHpp atas model (membaca compositions + unit_cost item). */
    public function computeHpp(SellableProduct $product): float
    {
        $total = 0.0;

        foreach ($product->compositions as $line) {
            $item = $line->inventoryItem;
            if (! $item) {
                continue;
            }
            $wasteFactor = 1 + ((float) ($line->waste_percent ?? 0) / 100);
            $total += (float) $line->qty_needed * $wasteFactor * (float) $item->unit_cost;
        }

        return round($total);
    }

    /** Porting domain.marginPercent. */
    public function marginPercent(float $price, float $hpp): float
    {
        if ($price <= 0) {
            return 0.0;
        }

        return round((($price - $hpp) / $price) * 1000) / 10;
    }

    /** Porting domain.recommendedPrice. */
    public function recommendedPrice(float $hpp, float $targetMargin): float
    {
        $ratio = min(max($targetMargin, 0), 90) / 100;
        $raw = $hpp / (1 - $ratio);

        return (float) (ceil($raw / 500) * 500);
    }

    /** Porting domain.marginState. */
    public function marginState(float $margin, float $target): string
    {
        if ($margin >= $target) {
            return 'safe';
        }
        if ($margin >= $target - 10) {
            return 'thin';
        }

        return 'critical';
    }

    /**
     * Porting api.marginWarnings: daftar pesan produk yang marginnya di bawah target.
     *
     * @return array<int, string>
     */
    public function marginWarnings(Store $store): array
    {
        $warnings = [];

        $products = $store->products()->with('compositions.inventoryItem')->get();

        foreach ($products as $product) {
            $hpp = $this->computeHpp($product);
            $margin = (float) $product->selling_price > 0
                ? (((float) $product->selling_price - $hpp) / (float) $product->selling_price) * 100
                : 0.0;

            if ($margin < (float) $product->target_margin_percent) {
                $advice = $this->advisor->marginGuardAdvice($product->name, $hpp, (float) $product->target_margin_percent);
                $warnings[] = sprintf('Margin %s turun ke %.1f%%. %s', $product->name, round($margin, 1), $advice);
            }
        }

        return $warnings;
    }

    /**
     * Porting domain.portionsAvailable atas model: porsi minimal antarbahan.
     */
    public function portionsAvailable(SellableProduct $product, FefoStockService $fefo, ?string $today = null): int
    {
        $today ??= $fefo->today();

        $limit = PHP_INT_MAX;
        $hasLine = false;

        foreach ($product->compositions()->with('inventoryItem')->get() as $line) {
            $hasLine = true;
            $item = $line->inventoryItem;
            if (! $item) {
                return 0;
            }
            $wasteFactor = 1 + ((float) ($line->waste_percent ?? 0) / 100);
            $perPortion = (float) $line->qty_needed * $wasteFactor;
            if ($perPortion <= 0) {
                continue;
            }
            $limit = min($limit, (int) floor($fefo->stockOf($item, $today) / $perPortion));
        }

        return $hasLine ? $limit : 0;
    }

    /**
     * Porting domain.seriesByDay atas data JSON (camelCase) hasil serializer.
     *
     * @param array<int, array<string, mixed>> $transactions
     * @return array<int, array{day: string, omzet: float, hpp: float, laba: float}>
     */
    public function seriesByDay(array $transactions, int $days, string $today): array
    {
        $points = [];

        for ($offset = $days - 1; $offset >= 0; $offset--) {
            $day = $this->addDays($today, -$offset);
            $omzet = 0.0;
            $hpp = 0.0;

            foreach ($transactions as $transaction) {
                if (($transaction['day'] ?? null) === $day) {
                    $omzet += (float) ($transaction['total'] ?? 0);
                    $hpp += (float) ($transaction['hpp'] ?? 0);
                }
            }

            $points[] = ['day' => $day, 'omzet' => $omzet, 'hpp' => $hpp, 'laba' => $omzet - $hpp];
        }

        return $points;
    }

    /**
     * Porting domain.profitByProduct atas data transaksi JSON.
     *
     * @param array<int, array<string, mixed>> $transactions
     * @return array<int, array{productId: string, name: string, qty: int, omzet: float, hpp: float, laba: float}>
     */
    public function profitByProduct(array $transactions): array
    {
        $map = [];

        foreach ($transactions as $transaction) {
            foreach (($transaction['lines'] ?? []) as $line) {
                $id = (string) ($line['productId'] ?? '');
                $entry = $map[$id] ?? [
                    'productId' => $id,
                    'name' => (string) ($line['name'] ?? ''),
                    'qty' => 0,
                    'omzet' => 0.0,
                    'hpp' => 0.0,
                    'laba' => 0.0,
                ];

                $entry['qty'] += (int) ($line['qty'] ?? 0);
                $entry['omzet'] += (float) ($line['price'] ?? 0) * (int) ($line['qty'] ?? 0);
                $entry['hpp'] += (float) ($line['hpp'] ?? 0) * (int) ($line['qty'] ?? 0);
                $entry['laba'] = $entry['omzet'] - $entry['hpp'];
                $map[$id] = $entry;
            }
        }

        $result = array_values($map);
        usort($result, static fn (array $a, array $b): int => $b['laba'] <=> $a['laba']);

        return $result;
    }

    /**
     * Porting domain.lowStockItems atas data item + batch JSON.
     *
     * @param array<int, array<string, mixed>> $items
     * @param array<int, array<string, mixed>> $batches
     * @return array<int, array{item: array<string, mixed>, stock: float, minStock: float}>
     */
    public function lowStockItems(array $items, array $batches, string $today): array
    {
        $stock = [];
        foreach ($batches as $batch) {
            if (($batch['status'] ?? null) !== 'ACTIVE') {
                continue;
            }
            $qty = (float) ($batch['qty'] ?? 0);
            if ($qty <= 0) {
                continue;
            }
            if (($batch['expiresAt'] ?? '') < $today) {
                continue;
            }
            $itemId = (string) ($batch['itemId'] ?? '');
            $stock[$itemId] = ($stock[$itemId] ?? 0.0) + $qty;
        }

        $result = [];

        foreach ($items as $item) {
            $itemId = (string) ($item['id'] ?? '');
            $current = $stock[$itemId] ?? 0.0;
            $minStock = (float) ($item['minStock'] ?? 0);
            if ($current < $minStock) {
                $result[] = ['item' => $item, 'stock' => $current, 'minStock' => $minStock];
            }
        }

        usort($result, static fn (array $a, array $b): int => $a['stock'] <=> $b['stock']);

        return $result;
    }

    /**
     * Porting domain.expiryHeatmap atas data item + batch JSON.
     *
     * @param array<int, array<string, mixed>> $items
     * @param array<int, array<string, mixed>> $batches
     * @return array<int, array{itemId: string, itemName: string, unit: string, counts: array<int, int>}>
     */
    public function expiryHeatmap(array $items, array $batches, int $days, string $today): array
    {
        return array_map(function (array $item) use ($batches, $days, $today): array {
            $counts = [];
            for ($index = 0; $index < $days; $index++) {
                $day = $this->addDays($today, $index);
                $count = 0;
                foreach ($batches as $batch) {
                    if (($batch['itemId'] ?? null) === $item['id'] && ($batch['expiresAt'] ?? null) === $day) {
                        $count++;
                    }
                }
                $counts[] = $count;
            }

            return [
                'itemId' => (string) ($item['id'] ?? ''),
                'itemName' => (string) ($item['name'] ?? ''),
                'unit' => (string) ($item['baseUnit'] ?? ''),
                'counts' => $counts,
            ];
        }, $items);
    }
}