<?php

namespace Database\Seeders;

use App\Models\Broadcast;
use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use App\Models\ProductComposition;
use App\Models\SellableProduct;
use App\Models\StarterTemplate;
use App\Models\StarterTemplateItem;
use App\Models\Store;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Replika deterministik frontend-nextjs/src/lib/seed.ts.
 * DEMO_TODAY = 2026-10-25; seluruh tanggal batch/transaksi = DEMO_TODAY + offset.
 */
class JudgeSandboxSeeder extends Seeder
{
    private const DEMO_TODAY = '2026-10-25';

    public function run(): void
    {
        $this->seedUsers();
        $this->seedStores();
        $this->seedWarmindo();
        $this->seedMadura();
        $this->seedBroadcasts();
        $this->seedTemplates();
    }

    private function addDays(string $day, int $offset): string
    {
        return date('Y-m-d', strtotime($day." +{$offset} days"));
    }

    private function seedUsers(): void
    {
        $users = [
            ['name' => 'Admin Platform', 'email' => 'admin@resep.laba', 'role' => 'SUPER_ADMIN'],
            ['name' => 'Budi Santoso', 'email' => 'budis@resep.laba', 'role' => 'STORE_USER'],
            ['name' => 'Siti Aminah', 'email' => 'sitiaminah@resep.laba', 'role' => 'STORE_USER'],
        ];

        foreach ($users as $user) {
            User::query()->updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => Hash::make('password'),
                    'role' => $user['role'],
                ],
            );
        }
    }

    private function seedStores(): void
    {
        $pinHash = Hash::make('1234');

        $stores = [
            ['id' => 'store-warmindo', 'tenant_id' => 't-1', 'user_email' => 'budis@resep.laba', 'name' => 'Warmindo Cak Budi', 'owner_name' => 'Budi Santoso', 'whatsapp' => '6281234567890', 'business_type' => 'WARMINDO', 'category_label' => 'Warmindo', 'status' => 'ACTIVE', 'target_margin' => 25, 'ai_quota' => 5, 'ai_used' => 2, 'joined_at' => '2026-08-12'],
            ['id' => 'store-madura', 'tenant_id' => 't-2', 'user_email' => 'sitiaminah@resep.laba', 'name' => 'Warung Madura Berkah', 'owner_name' => 'Siti Aminah', 'whatsapp' => '6289876543210', 'business_type' => 'MADURA', 'category_label' => 'Warung kelontong', 'status' => 'ACTIVE', 'target_margin' => 20, 'ai_quota' => 5, 'ai_used' => 1, 'joined_at' => '2026-07-30'],
            ['id' => 'store-3', 'tenant_id' => 't-3', 'user_email' => null, 'name' => 'Roti Pagi Bu Rina', 'owner_name' => 'Rina Wijaya', 'whatsapp' => null, 'business_type' => 'BAKERY', 'category_label' => 'Toko roti', 'status' => 'ACTIVE', 'target_margin' => 25, 'ai_quota' => 5, 'ai_used' => 4, 'joined_at' => '2026-09-05'],
            ['id' => 'store-4', 'tenant_id' => 't-4', 'user_email' => null, 'name' => 'Warkop Sore Abadi', 'owner_name' => 'Pak Hadi', 'whatsapp' => null, 'business_type' => 'OTHER', 'category_label' => 'Warkop', 'status' => 'ACTIVE', 'target_margin' => 25, 'ai_quota' => 5, 'ai_used' => 0, 'joined_at' => '2026-10-02'],
            ['id' => 'store-5', 'tenant_id' => 't-5', 'user_email' => null, 'name' => 'Warung kecil Mbak Nani', 'owner_name' => 'Nani', 'whatsapp' => null, 'business_type' => 'MADURA', 'category_label' => 'Warung kelontong', 'status' => 'SUSPENDED', 'target_margin' => 25, 'ai_quota' => 5, 'ai_used' => 5, 'joined_at' => '2026-06-18'],
        ];

        foreach ($stores as $store) {
            $user = $store['user_email'] ? User::where('email', $store['user_email'])->first() : null;

            Store::query()->updateOrCreate(
                ['id' => $store['id']],
                [
                    'tenant_id' => $store['tenant_id'],
                    'user_id' => $user?->id,
                    'name' => $store['name'],
                    'owner_name' => $store['owner_name'],
                    'whatsapp' => $store['whatsapp'],
                    'business_type' => $store['business_type'],
                    'category_label' => $store['category_label'],
                    'owner_pin_hash' => $pinHash,
                    'status' => $store['status'],
                    'target_margin_percent' => $store['target_margin'],
                    'ai_quota' => $store['ai_quota'],
                    'ai_used' => $store['ai_used'],
                    'ai_reset_date' => self::DEMO_TODAY,
                    'joined_at' => $store['joined_at'],
                ],
            );
        }
    }

    private function seedWarmindo(): void
    {
        $storeId = 'store-warmindo';

        $items = [
            ['id' => 'noodle', 'name' => 'Mie instan goreng', 'baseUnit' => 'bungkus', 'purchaseUnit' => 'dus', 'conversionRate' => 40, 'unitCost' => 2800, 'minStock' => 8],
            ['id' => 'egg', 'name' => 'Telur ayam', 'baseUnit' => 'butir', 'purchaseUnit' => 'krat', 'conversionRate' => 240, 'unitCost' => 2100, 'minStock' => 24],
            ['id' => 'rice', 'name' => 'Beras', 'baseUnit' => 'gram', 'purchaseUnit' => 'karung 25 kg', 'conversionRate' => 25000, 'unitCost' => 14, 'minStock' => 3000],
            ['id' => 'milk', 'name' => 'Susu kotak cokelat', 'baseUnit' => 'kotak', 'purchaseUnit' => 'dus', 'conversionRate' => 24, 'unitCost' => 3800, 'minStock' => 6],
            ['id' => 'bread', 'name' => 'Roti tawar', 'baseUnit' => 'bungkus', 'purchaseUnit' => 'pak', 'conversionRate' => 12, 'unitCost' => 11000, 'minStock' => 4],
            ['id' => 'tea', 'name' => 'Teh sachet', 'baseUnit' => 'sachet', 'purchaseUnit' => 'renceng', 'conversionRate' => 10, 'unitCost' => 350, 'minStock' => 10],
            ['id' => 'sugar', 'name' => 'Gula pasir', 'baseUnit' => 'gram', 'purchaseUnit' => 'sak 1 kg', 'conversionRate' => 1000, 'unitCost' => 16, 'minStock' => 200],
            ['id' => 'coffee', 'name' => 'Kopi sachet', 'baseUnit' => 'sachet', 'purchaseUnit' => 'renceng', 'conversionRate' => 10, 'unitCost' => 1200, 'minStock' => 6],
        ];

        $batches = [
            ['id' => 'b-n-1', 'itemId' => 'noodle', 'code' => 'M-2609-A', 'offset' => 120, 'qty' => 23, 'initial' => 40, 'unitCost' => 2800],
            ['id' => 'b-n-2', 'itemId' => 'noodle', 'code' => 'M-2701-B', 'offset' => 210, 'qty' => 40, 'initial' => 40, 'unitCost' => 2800],
            ['id' => 'b-e-1', 'itemId' => 'egg', 'code' => 'T-2610-A', 'offset' => 8, 'qty' => 96, 'initial' => 120, 'unitCost' => 2100],
            ['id' => 'b-e-2', 'itemId' => 'egg', 'code' => 'T-2611-B', 'offset' => 15, 'qty' => 144, 'initial' => 240, 'unitCost' => 2100],
            ['id' => 'b-r-1', 'itemId' => 'rice', 'code' => 'B-2612-A', 'offset' => 300, 'qty' => 18500, 'initial' => 25000, 'unitCost' => 14],
            ['id' => 'b-m-1', 'itemId' => 'milk', 'code' => 'S-2609-A', 'offset' => 1, 'qty' => 4, 'initial' => 12, 'unitCost' => 3800],
            ['id' => 'b-m-2', 'itemId' => 'milk', 'code' => 'S-2611-B', 'offset' => 90, 'qty' => 20, 'initial' => 24, 'unitCost' => 3800],
            ['id' => 'b-b-1', 'itemId' => 'bread', 'code' => 'R-2610-A', 'offset' => 3, 'qty' => 6, 'initial' => 12, 'unitCost' => 11000],
            ['id' => 'b-t-1', 'itemId' => 'tea', 'code' => 'TS-2609-A', 'offset' => 150, 'qty' => 30, 'initial' => 50, 'unitCost' => 350],
            ['id' => 'b-s-1', 'itemId' => 'sugar', 'code' => 'G-2612-A', 'offset' => 220, 'qty' => 800, 'initial' => 1000, 'unitCost' => 16],
            ['id' => 'b-k-1', 'itemId' => 'coffee', 'code' => 'K-2609-A', 'offset' => 120, 'qty' => 22, 'initial' => 30, 'unitCost' => 1200],
        ];

        $products = [
            ['id' => 'mie-telur', 'name' => 'Mie Goreng Telur + Nasi', 'kind' => 'recipe', 'category' => 'makanan', 'icon' => 'meal', 'price' => 15000, 'target' => 30, 'recipe' => [['noodle', 1, 5], ['egg', 1, 0], ['rice', 150, 2]]],
            ['id' => 'telur-dadar', 'name' => 'Telur Dadar', 'kind' => 'recipe', 'category' => 'makanan', 'icon' => 'egg', 'price' => 7000, 'target' => 28, 'recipe' => [['egg', 2, 3]]],
            ['id' => 'nasi', 'name' => 'Nasi Putih', 'kind' => 'recipe', 'category' => 'makanan', 'icon' => 'rice', 'price' => 5000, 'target' => 30, 'recipe' => [['rice', 180, 2]]],
            ['id' => 'indomie-rebus', 'name' => 'Indomie Rebus', 'kind' => 'recipe', 'category' => 'makanan', 'icon' => 'soup', 'price' => 10000, 'target' => 30, 'recipe' => [['noodle', 1, 5], ['egg', 1, 0]]],
            ['id' => 'es-teh', 'name' => 'Es Teh Manis', 'kind' => 'recipe', 'category' => 'minuman', 'icon' => 'drink', 'price' => 4000, 'target' => 35, 'recipe' => [['tea', 2, 0], ['sugar', 20, 0]]],
            ['id' => 'kopi-susu', 'name' => 'Kopi Susu Sachet', 'kind' => 'recipe', 'category' => 'minuman', 'icon' => 'coffee', 'price' => 5000, 'target' => 32, 'recipe' => [['coffee', 1, 0], ['milk', 1, 0], ['sugar', 10, 0]]],
            ['id' => 'indomie-ecer', 'name' => 'Indomie Goreng Bungkus', 'kind' => 'retail', 'category' => 'eceran', 'icon' => 'pack', 'price' => 3500, 'target' => 18, 'recipe' => [['noodle', 1, 0]]],
            ['id' => 'telur-rebus', 'name' => 'Telur Rebus', 'kind' => 'retail', 'category' => 'eceran', 'icon' => 'egg', 'price' => 3000, 'target' => 18, 'recipe' => [['egg', 1, 0]]],
        ];

        $this->seedWorkspace($storeId, $items, $batches, $products, [845000, 1390000, 1210000, 1600000, 1450000, 990000, 1320000], 20261025);
    }

    private function seedMadura(): void
    {
        $storeId = 'store-madura';

        $items = [
            ['id' => 'm-indomie', 'name' => 'Indomie goreng', 'baseUnit' => 'bungkus', 'purchaseUnit' => 'dus', 'conversionRate' => 40, 'unitCost' => 2800, 'minStock' => 8],
            ['id' => 'm-telur', 'name' => 'Telur ayam', 'baseUnit' => 'butir', 'purchaseUnit' => 'krat', 'conversionRate' => 240, 'unitCost' => 2000, 'minStock' => 24],
            ['id' => 'm-kopi', 'name' => 'Kopi sachet', 'baseUnit' => 'sachet', 'purchaseUnit' => 'renceng', 'conversionRate' => 10, 'unitCost' => 1300, 'minStock' => 8],
            ['id' => 'm-susu', 'name' => 'Susu UHT 1 liter', 'baseUnit' => 'kotak', 'purchaseUnit' => 'dus', 'conversionRate' => 24, 'unitCost' => 4200, 'minStock' => 6],
            ['id' => 'm-roti', 'name' => 'Roti tawar', 'baseUnit' => 'bungkus', 'purchaseUnit' => 'pak', 'conversionRate' => 12, 'unitCost' => 12000, 'minStock' => 4],
            ['id' => 'm-air', 'name' => 'Air mineral', 'baseUnit' => 'botol', 'purchaseUnit' => 'dus', 'conversionRate' => 24, 'unitCost' => 2500, 'minStock' => 6],
        ];

        $batches = [
            ['id' => 'b-mi-1', 'itemId' => 'm-indomie', 'code' => 'IM-2609-A', 'offset' => 110, 'qty' => 18, 'initial' => 40, 'unitCost' => 2800],
            ['id' => 'b-mi-2', 'itemId' => 'm-indomie', 'code' => 'IM-2702-B', 'offset' => 240, 'qty' => 40, 'initial' => 40, 'unitCost' => 2800],
            ['id' => 'b-mt-1', 'itemId' => 'm-telur', 'code' => 'MT-2610-A', 'offset' => 10, 'qty' => 80, 'initial' => 120, 'unitCost' => 2000],
            ['id' => 'b-mt-2', 'itemId' => 'm-telur', 'code' => 'MT-2611-B', 'offset' => 20, 'qty' => 120, 'initial' => 240, 'unitCost' => 2000],
            ['id' => 'b-mk-1', 'itemId' => 'm-kopi', 'code' => 'MK-2609-A', 'offset' => 140, 'qty' => 26, 'initial' => 40, 'unitCost' => 1300],
            ['id' => 'b-ms-1', 'itemId' => 'm-susu', 'code' => 'MS-2609-A', 'offset' => 2, 'qty' => 6, 'initial' => 12, 'unitCost' => 4200],
            ['id' => 'b-ms-2', 'itemId' => 'm-susu', 'code' => 'MS-2611-B', 'offset' => 95, 'qty' => 18, 'initial' => 24, 'unitCost' => 4200],
            ['id' => 'b-mr-1', 'itemId' => 'm-roti', 'code' => 'MR-2610-A', 'offset' => 3, 'qty' => 5, 'initial' => 12, 'unitCost' => 12000],
            ['id' => 'b-ma-1', 'itemId' => 'm-air', 'code' => 'MA-2609-A', 'offset' => 200, 'qty' => 24, 'initial' => 24, 'unitCost' => 2500],
        ];

        $products = [
            ['id' => 'md-indomie', 'name' => 'Indomie Goreng', 'kind' => 'retail', 'category' => 'eceran', 'icon' => 'pack', 'price' => 3500, 'target' => 18, 'recipe' => [['m-indomie', 1, 0]]],
            ['id' => 'md-telur-rebus', 'name' => 'Telur Rebus', 'kind' => 'retail', 'category' => 'eceran', 'icon' => 'egg', 'price' => 3000, 'target' => 18, 'recipe' => [['m-telur', 1, 0]]],
            ['id' => 'md-kopi', 'name' => 'Kopi Sachet', 'kind' => 'retail', 'category' => 'minuman', 'icon' => 'coffee', 'price' => 1500, 'target' => 20, 'recipe' => [['m-kopi', 1, 0]]],
            ['id' => 'md-susu', 'name' => 'Susu Kotak', 'kind' => 'retail', 'category' => 'minuman', 'icon' => 'drink', 'price' => 4500, 'target' => 20, 'recipe' => [['m-susu', 1, 0]]],
            ['id' => 'md-roti', 'name' => 'Roti Tawar', 'kind' => 'retail', 'category' => 'eceran', 'icon' => 'pack', 'price' => 13000, 'target' => 22, 'recipe' => [['m-roti', 1, 0]]],
            ['id' => 'md-air', 'name' => 'Air Mineral', 'kind' => 'retail', 'category' => 'eceran', 'icon' => 'pack', 'price' => 3000, 'target' => 18, 'recipe' => [['m-air', 1, 0]]],
            ['id' => 'md-kuah', 'name' => 'Indomie Kuah Telur', 'kind' => 'recipe', 'category' => 'makanan', 'icon' => 'soup', 'price' => 9000, 'target' => 28, 'recipe' => [['m-indomie', 1, 5], ['m-telur', 1, 0]]],
        ];

        $this->seedWorkspace($storeId, $items, $batches, $products, [612000, 980000, 845000, 1210000, 760000, 690000, 1020000], 20261026);
    }

    private function seedWorkspace(string $storeId, array $items, array $batches, array $products, array $targets, int $seed): void
    {
        foreach ($items as $item) {
            InventoryItem::query()->updateOrCreate(
                ['id' => $item['id']],
                [
                    'store_id' => $storeId,
                    'name' => $item['name'],
                    'base_unit' => $item['baseUnit'],
                    'purchase_unit' => $item['purchaseUnit'],
                    'conversion_rate' => $item['conversionRate'],
                    'unit_cost' => $item['unitCost'],
                    'min_stock' => $item['minStock'],
                ],
            );
        }

        foreach ($batches as $batch) {
            InventoryBatch::query()->updateOrCreate(
                ['id' => $batch['id']],
                [
                    'inventory_item_id' => $batch['itemId'],
                    'batch_code' => $batch['code'],
                    'initial_qty' => $batch['initial'],
                    'remaining_qty' => $batch['qty'],
                    'unit_cost' => $batch['unitCost'],
                    'expiry_date' => $this->addDays(self::DEMO_TODAY, $batch['offset']),
                    'status' => 'ACTIVE',
                ],
            );
        }

        $costById = collect($items)->mapWithKeys(fn ($item) => [$item['id'] => (float) $item['unitCost']]);

        $hppById = [];

        foreach ($products as $product) {
            SellableProduct::query()->updateOrCreate(
                ['id' => $product['id']],
                [
                    'store_id' => $storeId,
                    'name' => $product['name'],
                    'kind' => $product['kind'],
                    'category' => $product['category'],
                    'icon' => $product['icon'],
                    'selling_price' => $product['price'],
                    'target_margin_percent' => $product['target'],
                ],
            );

            $productModel = SellableProduct::find($product['id']);
            $productModel->compositions()->delete();

            $hpp = 0.0;

            foreach ($product['recipe'] as [$itemId, $qty, $wastePct]) {
                ProductComposition::query()->create([
                    'id' => $product['id'].'-'.str_replace(' ', '-', $itemId),
                    'sellable_product_id' => $product['id'],
                    'inventory_item_id' => $itemId,
                    'qty_needed' => $qty,
                    'waste_percent' => $wastePct,
                ]);

                $hpp += $qty * (1 + $wastePct / 100) * ($costById[$itemId] ?? 0.0);
            }

            $hppById[$product['id']] = round($hpp);
        }

        $this->buildTransactions($storeId, $products, $hppById, $targets, $seed);
    }

    private function buildTransactions(string $storeId, array $products, array $hppById, array $targets, int $seed): void
    {
        $count = count($products);
        $rng = $this->makeRng($seed);
        $counter = 1;

        foreach ($targets as $offset => $target) {
            $day = $this->addDays(self::DEMO_TODAY, -$offset);
            $total = 0;

            while ($total < $target) {
                $lineCount = 1 + (int) floor($rng() * 3);

                $lines = [];

                for ($i = 0; $i < $lineCount; $i++) {
                    $product = $products[(int) floor($rng() * $count)];
                    $qty = 1 + (int) floor($rng() * 3);

                    $lines[] = [
                        'productId' => $product['id'],
                        'name' => $product['name'],
                        'qty' => $qty,
                        'price' => $product['price'],
                        'hpp' => $hppById[$product['id']],
                    ];
                }

                $lineTotal = array_sum(array_map(fn ($line) => $line['price'] * $line['qty'], $lines));
                $hppTotal = array_sum(array_map(fn ($line) => $line['hpp'] * $line['qty'], $lines));
                $hour = str_pad((string) (2 + (int) floor($rng() * 15)), 2, '0', STR_PAD_LEFT);
                $minute = str_pad((string) ((int) floor($rng() * 60)), 2, '0', STR_PAD_LEFT);

                $transactionId = 'RL-'.$storeId.'-'.str_replace('-', '', $day).'-'.str_pad((string) $counter, 3, '0', STR_PAD_LEFT);

                Transaction::query()->create([
                    'id' => $transactionId,
                    'store_id' => $storeId,
                    'day' => $day,
                    'total_amount' => $lineTotal,
                    'total_hpp' => $hppTotal,
                    'net_profit' => $lineTotal - $hppTotal,
                    'created_at_time' => "{$day}T{$hour}:{$minute}:00.000Z",
                ]);

                foreach ($lines as $index => $line) {
                    TransactionItem::query()->create([
                        'id' => $transactionId.'-'.$index,
                        'transaction_id' => $transactionId,
                        'sellable_product_id' => $line['productId'],
                        'product_name' => $line['name'],
                        'qty_sold' => $line['qty'],
                        'unit_price' => $line['price'],
                        'unit_hpp' => $line['hpp'],
                    ]);
                }

                $total += $lineTotal;
                $counter++;
            }
        }
    }

    /**
     * Porting makeRng (LCG) dari seed.ts: (state * 1664525 + 1013904223) >>> 0.
     */
    private function makeRng(int $seed): callable
    {
        $state = $seed & 0xFFFFFFFF;

        return function () use (&$state): float {
            $state = (($state * 1664525 + 1013904223) & 0xFFFFFFFF);

            return $state / 4294967296;
        };
    }

    private function seedBroadcasts(): void
    {
        Broadcast::query()->updateOrCreate(
            ['id' => 'bc-1'],
            [
                'message' => 'Harga telur di pasar naik 25% minggu ini. Cek harga menu yang pakai telur sebelum jualan berikutnya.',
                'severity' => 'warning',
                'created_at' => $this->addDays(self::DEMO_TODAY, -1).' 03:00:00',
                'updated_at' => $this->addDays(self::DEMO_TODAY, -1).' 03:00:00',
            ],
        );
    }

    private function seedTemplates(): void
    {
        $templates = [
            ['id' => 'tmpl-madura', 'name' => 'Warung Madura', 'description' => 'Barang eceran kelontong: mie, telur, kopi, susu, roti, air.', 'items' => [
                ['name' => 'Indomie goreng', 'baseUnit' => 'bungkus', 'purchaseUnit' => 'dus', 'conversionRate' => 40, 'unitCost' => 2800, 'minStock' => 8],
                ['name' => 'Telur ayam', 'baseUnit' => 'butir', 'purchaseUnit' => 'krat', 'conversionRate' => 240, 'unitCost' => 2000, 'minStock' => 24],
                ['name' => 'Kopi sachet', 'baseUnit' => 'sachet', 'purchaseUnit' => 'renceng', 'conversionRate' => 10, 'unitCost' => 1300, 'minStock' => 8],
                ['name' => 'Susu UHT 1 liter', 'baseUnit' => 'kotak', 'purchaseUnit' => 'dus', 'conversionRate' => 24, 'unitCost' => 4200, 'minStock' => 6],
            ]],
            ['id' => 'tmpl-warmindo', 'name' => 'Warmindo', 'description' => 'Bahan dasar racikan mie goreng, nasi, es teh, dan kopi susu.', 'items' => [
                ['name' => 'Mie instan goreng', 'baseUnit' => 'bungkus', 'purchaseUnit' => 'dus', 'conversionRate' => 40, 'unitCost' => 2800, 'minStock' => 8],
                ['name' => 'Telur ayam', 'baseUnit' => 'butir', 'purchaseUnit' => 'krat', 'conversionRate' => 240, 'unitCost' => 2100, 'minStock' => 24],
                ['name' => 'Beras', 'baseUnit' => 'gram', 'purchaseUnit' => 'karung 25 kg', 'conversionRate' => 25000, 'unitCost' => 14, 'minStock' => 3000],
                ['name' => 'Teh sachet', 'baseUnit' => 'sachet', 'purchaseUnit' => 'renceng', 'conversionRate' => 10, 'unitCost' => 350, 'minStock' => 10],
            ]],
            ['id' => 'tmpl-roti', 'name' => 'Toko roti', 'description' => 'Tepung, margarine, Yeast, gula, dan kemasan.', 'items' => [
                ['name' => 'Tepung terigu', 'baseUnit' => 'gram', 'purchaseUnit' => 'sak 25 kg', 'conversionRate' => 25000, 'unitCost' => 12, 'minStock' => 5000],
                ['name' => 'Margarine', 'baseUnit' => 'gram', 'purchaseUnit' => 'sak 2 kg', 'conversionRate' => 2000, 'unitCost' => 48, 'minStock' => 500],
                ['name' => 'Gula pasir', 'baseUnit' => 'gram', 'purchaseUnit' => 'sak 1 kg', 'conversionRate' => 1000, 'unitCost' => 16, 'minStock' => 200],
            ]],
            ['id' => 'tmpl-warkop', 'name' => 'Warkop', 'description' => 'Kopi bubuk, gula, susu, teh, dan snack.', 'items' => [
                ['name' => 'Kopi bubuk', 'baseUnit' => 'gram', 'purchaseUnit' => 'renteng 10 sachet', 'conversionRate' => 200, 'unitCost' => 90, 'minStock' => 100],
                ['name' => 'Gula pasir', 'baseUnit' => 'gram', 'purchaseUnit' => 'sak 1 kg', 'conversionRate' => 1000, 'unitCost' => 16, 'minStock' => 200],
                ['name' => 'Susu kental manis', 'baseUnit' => 'ml', 'purchaseUnit' => 'kaleng 600 ml', 'conversionRate' => 600, 'unitCost' => 24, 'minStock' => 120],
            ]],
        ];

        foreach ($templates as $index => $template) {
            StarterTemplate::query()->updateOrCreate(
                ['id' => $template['id']],
                [
                    'name' => $template['name'],
                    'description' => $template['description'],
                ],
            );

            StarterTemplateItem::query()->where('starter_template_id', $template['id'])->delete();

            foreach ($template['items'] as $itemIndex => $item) {
                StarterTemplateItem::query()->create([
                    'id' => $template['id'].'-'.$itemIndex,
                    'starter_template_id' => $template['id'],
                    'name' => $item['name'],
                    'base_unit' => $item['baseUnit'],
                    'purchase_unit' => $item['purchaseUnit'],
                    'conversion_rate' => $item['conversionRate'],
                    'unit_cost' => $item['unitCost'],
                    'min_stock' => $item['minStock'],
                ]);
            }
        }
    }
}