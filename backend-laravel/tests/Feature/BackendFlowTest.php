<?php

namespace Tests\Feature;

use App\Models\InventoryBatch;
use App\Models\Store;
use Database\Seeders\JudgeSandboxSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackendFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(JudgeSandboxSeeder::class);
    }

    private function login(string $profile): string
    {
        $response = $this->postJson('/api/v1/auth/sandbox-login', ['profile' => $profile]);

        $response->assertOk();
        $response->assertJsonPath('success', true);

        return (string) $response->headers->get('Authorization');
    }

    public function test_sandbox_login_returns_snapshot(): void
    {
        $response = $this->postJson('/api/v1/auth/sandbox-login', ['profile' => 'warmindo']);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.store.id', 'store-warmindo')
            ->assertJsonPath('data.store.name', 'Warmindo Cak Budi')
            ->assertJsonCount(8, 'data.items')
            ->assertJsonCount(8, 'data.products')
            ->assertJsonCount(11, 'data.batches')
            ->assertJsonCount(5, 'data.tenants');

        $this->assertStringContainsString('Harga telur di pasar naik', $response->json('data.broadcasts.0.message'));
    }

    public function test_checkout_deducts_fefo_oldest_first(): void
    {
        $token = $this->login('warmindo');

        $response = $this->withHeader('Authorization', $token)
            ->postJson('/api/v1/pos/checkout', [
                'items' => [
                    ['productId' => 'mie-telur', 'qty' => 2],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Transaksi tersimpan.')
            ->assertJsonPath('data.transaction.total', 30000);

        $eggOldest = InventoryBatch::find('b-e-1');
        $eggNewer = InventoryBatch::find('b-e-2');

        $this->assertEquals(94.0, (float) $eggOldest->remaining_qty, 'batch terdekat kedaluwarsa dipotong lebih dulu');
        $this->assertEquals(144.0, (float) $eggNewer->remaining_qty, 'batch lebih lama tak tersentuh saat batch dekat masih cukup');
    }

    public function test_restock_updates_moving_average(): void
    {
        $token = $this->login('madura');

        $response = $this->withHeader('Authorization', $token)
            ->postJson('/api/v1/inventory/restock', [
                'itemId' => 'm-telur',
                'purchaseQty' => 1,
                'totalCost' => 552000,
                'expiresAt' => '2026-12-30',
                'code' => 'MT-2612-C',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Kulakan tersimpan.')
            ->assertJsonPath('data.units', 240)
            ->assertJsonPath('data.unitCost', 2300);
    }

    public function test_owner_pin_guards_and_verifies(): void
    {
        $token = $this->login('warmindo');

        $this->withHeader('Authorization', $token)
            ->postJson('/api/v1/owner/verify-pin', ['pin' => '0000'])
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'PIN salah. Coba lagi.');

        $this->withHeader('Authorization', $token)
            ->postJson('/api/v1/owner/verify-pin', ['pin' => '1234'])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data', true);
    }

    public function test_owner_endpoints_require_correct_pin(): void
    {
        $token = $this->login('warmindo');

        $this->withHeader('Authorization', $token)
            ->deleteJson('/api/v1/inventory/batches/b-n-2')
            ->assertStatus(403);
    }

    public function test_admin_suspend_and_listing(): void
    {
        $token = $this->login('admin');

        $this->withHeader('Authorization', $token)
            ->getJson('/api/v1/admin/stores')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(5, 'data');

        $this->withHeader('Authorization', $token)
            ->patchJson('/api/v1/admin/stores/t-3/status', ['status' => 'SUSPENDED'])
            ->assertOk()
            ->assertJsonPath('data.status', 'SUSPENDED');

        $this->assertEquals('SUSPENDED', Store::find('store-3')->status);
    }

    public function test_suspended_store_is_blocked(): void
    {
        Store::where('id', 'store-warmindo')->update(['status' => 'SUSPENDED']);

        $store = Store::find('store-warmindo');
        $token = $store->user->createToken('t')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/store/workspace')
            ->assertStatus(403);
    }

    public function test_store_user_cannot_access_admin(): void
    {
        $token = $this->login('warmindo');

        $this->withHeader('Authorization', $token)
            ->getJson('/api/v1/admin/stores')
            ->assertStatus(403);
    }
}