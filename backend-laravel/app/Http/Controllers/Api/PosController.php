<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Models\SellableProduct;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Services\FefoStockService;
use App\Services\HppCalculatorService;
use App\Support\ApiResponse;
use App\Support\WorkspaceSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class PosController extends Controller
{
    public function __construct(
        private readonly FefoStockService $fefo,
        private readonly HppCalculatorService $hpp,
    ) {
    }

    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $items = $request->validated('items');

        $usable = array_values(array_filter($items, static fn (array $line) => $line['qty'] > 0));

        if ($usable === []) {
            return ApiResponse::fail('Keranjang masih kosong.');
        }

        try {
            $output = DB::transaction(function () use ($store, $usable): array {
                $products = SellableProduct::query()
                    ->where('store_id', $store->id)
                    ->with('compositions.inventoryItem')
                    ->get()
                    ->keyBy('id');

                $transactionLines = [];
                $total = 0.0;
                $hppTotal = 0.0;

                foreach ($usable as $line) {
                    $product = $products->get($line['productId']);

                    if (! $product) {
                        throw new RuntimeException('Menu tidak ditemukan. Muat ulang halaman.');
                    }

                    foreach ($product->compositions as $ingredient) {
                        $item = $ingredient->inventoryItem;

                        if (! $item) {
                            throw new RuntimeException('Bahan utama belum terdaftar.');
                        }

                        $wasteFactor = 1 + ((float) ($ingredient->waste_percent ?? 0) / 100);
                        $needed = (float) $ingredient->qty_needed * $wasteFactor * (float) $line['qty'];

                        $result = $this->fefo->deduct($item, $needed);

                        if ($result['shortage'] > 0) {
                            throw new RuntimeException("Stok {$item->name} tidak cukup untuk transaksi ini.");
                        }

                        $hppTotal += (float) $result['hpp'];

                        foreach ($result['taken'] as $take) {
                            StockMovement::query()->create([
                                'id' => $this->nextId('sm'),
                                'store_id' => $store->id,
                                'inventory_item_id' => $item->id,
                                'inventory_batch_id' => $take['batchId'],
                                'type' => 'SALE_OUT',
                                'qty' => $take['qty'],
                                'cost' => $take['unitCost'],
                                'notes' => null,
                            ]);
                        }
                    }

                    $unitHpp = $this->hpp->computeHpp($product);

                    $transactionLines[] = [
                        'productId' => $product->id,
                        'product' => $product,
                        'name' => $product->name,
                        'qty' => (int) $line['qty'],
                        'price' => (float) $product->selling_price,
                        'unitHpp' => $unitHpp,
                    ];

                    $total += (float) $product->selling_price * (int) $line['qty'];
                }

                $demoToday = $this->fefo->today();
                $hppRounded = round($hppTotal);

                $transaction = Transaction::query()->create([
                    'id' => $this->nextId('RL'),
                    'store_id' => $store->id,
                    'day' => $demoToday,
                    'total_amount' => $total,
                    'total_hpp' => $hppRounded,
                    'net_profit' => $total - $hppRounded,
                    'created_at_time' => $demoToday.'T09:00:00.000Z',
                ]);

                foreach ($transactionLines as $line) {
                    TransactionItem::query()->create([
                        'id' => $this->nextId('ti'),
                        'transaction_id' => $transaction->id,
                        'sellable_product_id' => $line['productId'],
                        'product_name' => $line['name'],
                        'qty_sold' => $line['qty'],
                        'unit_price' => $line['price'],
                        'unit_hpp' => $line['unitHpp'],
                    ]);
                }

                $portions = [];
                foreach ($products as $product) {
                    $portions[] = [
                        'productId' => $product->id,
                        'portions' => $this->hpp->portionsAvailable($product, $this->fefo),
                    ];
                }

                return [
                    'transaction' => WorkspaceSerializer::transaction($transaction->fresh('items')),
                    'portions' => $portions,
                ];
            });
        } catch (RuntimeException $exception) {
            return ApiResponse::fail($exception->getMessage());
        }

        return ApiResponse::ok('Transaksi tersimpan.', $output);
    }

    private function nextId(string $prefix): string
    {
        return $prefix.'-'.uniqid().'-'.mt_rand(10, 99);
    }
}