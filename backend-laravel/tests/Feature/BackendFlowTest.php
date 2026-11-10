<?php

namespace Tests\Feature;

use App\Models\InventoryBatch;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\JudgeSandboxSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
            ->assertJsonCount(0, 'data.tenants')
            ->assertJsonCount(0, 'data.templates');

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
            ->assertSee('PIN salah');

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
        $this->postJson('/api/v1/auth/sandbox-login', ['profile' => 'admin'])
            ->assertJsonCount(5, 'data.tenants')
            ->assertJsonCount(4, 'data.templates');

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

    public function test_restock_returns_margin_advice_when_below_target(): void
    {
        $token = $this->login('warmindo');

        $response = $this->withHeader('Authorization', $token)
            ->postJson('/api/v1/inventory/restock', [
                'itemId' => 'egg',
                'purchaseQty' => 1,
                'totalCost' => 2400000,
                'expiresAt' => '2026-12-30',
                'code' => 'T-2612-X',
            ]);

        $response->assertOk()->assertJsonPath('message', 'Kulakan tersimpan.');

        $warnings = $response->json('warnings');
        $this->assertTrue(
            collect($warnings)->contains(fn ($w) => str_contains((string) $w, 'Margin')),
            'saran Margin Guard muncul saat modal naik di bawah target',
        );
    }

    public function test_promo_endpoint_returns_clearance_text(): void
    {
        $token = $this->login('warmindo');

        $response = $this->withHeader('Authorization', $token)
            ->postJson('/api/v1/inventory/batches/b-m-1/promo');

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertStringContainsString('PROMO TEBUS MURAH', (string) $response->json('data.text'));
    }

    public function test_unauthenticated_api_request_returns_401(): void
    {
        $this->get('/api/v1/store/workspace')
            ->assertStatus(401)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Autentikasi diperlukan.');
    }

    public function test_standard_login_for_seeded_users(): void
    {
        // 1. Warmindo Cak Budi
        $resWarmindo = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'password',
        ]);
        $resWarmindo->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Login berhasil.')
            ->assertJsonPath('data.store.id', 'store-warmindo')
            ->assertJsonPath('data.store.name', 'Warmindo Cak Budi');
        $this->assertNotEmpty($resWarmindo->headers->get('Authorization'));

        // 2. Warung Madura Berkah
        $resMadura = $this->postJson('/api/v1/auth/login', [
            'email' => 'sitiaminah@resep.laba',
            'password' => 'password',
        ]);
        $resMadura->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Login berhasil.')
            ->assertJsonPath('data.store.id', 'store-madura')
            ->assertJsonPath('data.store.name', 'Warung Madura Berkah');
        $this->assertNotEmpty($resMadura->headers->get('Authorization'));

        // 3. Super Admin Platform
        $resAdmin = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@resep.laba',
            'password' => 'password',
        ]);
        $resAdmin->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Login berhasil.')
            ->assertJsonCount(5, 'data.tenants')
            ->assertJsonCount(4, 'data.templates');
        $this->assertNotEmpty($resAdmin->headers->get('Authorization'));
    }

    public function test_standard_login_fails_with_invalid_credentials(): void
    {
        // Incorrect password
        $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'wrong-pass',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Surel atau kata sandi salah.');

        // Unknown email
        $this->postJson('/api/v1/auth/login', [
            'email' => 'nonexistent@resep.laba',
            'password' => 'password',
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Surel atau kata sandi salah.');
    }

    public function test_register_creates_user_and_store_and_returns_token(): void
    {
        $payload = [
            'name' => 'Bambang Sudirman',
            'email' => 'bambang@warungbaru.id',
            'password' => 'rahasia123',
            'storeName' => 'Warung Pojok Bambang',
            'businessType' => 'MADURA',
            'whatsapp' => '081234567890',
            'pin' => '8899',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Pendaftaran warung berhasil.')
            ->assertJsonPath('data.store.name', 'Warung Pojok Bambang')
            ->assertJsonPath('data.store.ownerName', 'Bambang Sudirman')
            ->assertJsonPath('data.store.businessType', 'MADURA')
            ->assertJsonPath('data.store.categoryLabel', 'Warung kelontong')
            ->assertJsonPath('data.store.status', 'ACTIVE');

        $authHeader = (string) $response->headers->get('Authorization');
        $this->assertStringStartsWith('Bearer ', $authHeader);

        // Verify database persistence
        $user = User::where('email', 'bambang@warungbaru.id')->first();
        $this->assertNotNull($user);
        $this->assertEquals('Bambang Sudirman', $user->name);
        $this->assertEquals('STORE_USER', $user->role);
        $this->assertTrue(Hash::check('rahasia123', $user->password));

        $store = Store::where('user_id', $user->id)->first();
        $this->assertNotNull($store);
        $this->assertEquals('Warung Pojok Bambang', $store->name);
        $this->assertEquals('MADURA', $store->business_type);
        $this->assertTrue(Hash::check('8899', $store->owner_pin_hash));
    }
}