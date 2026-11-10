<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Database\Seeders\JudgeSandboxSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdversarialAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(JudgeSandboxSeeder::class);
    }

    // ==========================================
    // 1. LOGIN ADVERSARIAL STRESS-TESTING
    // ==========================================

    public function test_login_with_wrong_password_fails_cleanly(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'WrongPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Surel atau kata sandi salah.');

        $this->assertEmpty($response->headers->get('Authorization'));
    }

    public function test_login_with_non_existent_email_fails_cleanly(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'hacker_nobody@attacker.com',
            'password' => 'any_password',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Surel atau kata sandi salah.');

        $this->assertEmpty($response->headers->get('Authorization'));
    }

    public function test_login_with_sql_injection_payloads(): void
    {
        $payloads = [
            "' OR '1'='1",
            "admin@resep.laba' --",
            "admin@resep.laba' /*",
            "' UNION SELECT * FROM users --",
            "\" OR \"\"=\"",
            "1; DROP TABLE users; --",
        ];

        foreach ($payloads as $sqli) {
            // In email field
            $resEmail = $this->postJson('/api/v1/auth/login', [
                'email' => $sqli,
                'password' => 'password',
            ]);
            // Either validation 422 or auth 422, but NEVER 500 or 200
            $this->assertEquals(422, $resEmail->getStatusCode(), "SQLi in email should return 422: {$sqli}");
            $this->assertFalse($resEmail->json('success'));
            $this->assertEmpty($resEmail->headers->get('Authorization'));

            // In password field with valid email
            $resPass = $this->postJson('/api/v1/auth/login', [
                'email' => 'budis@resep.laba',
                'password' => $sqli,
            ]);
            $this->assertEquals(422, $resPass->getStatusCode(), "SQLi in password should return 422: {$sqli}");
            $this->assertFalse($resPass->json('success'));
            $this->assertEmpty($resPass->headers->get('Authorization'));
        }

        // Verify users table was not dropped or altered
        $this->assertDatabaseHas('users', ['email' => 'budis@resep.laba']);
    }

    public function test_login_whitespace_padding(): void
    {
        // Padded email should be trimmed by TrimStrings middleware and authenticate
        $resTrimmedEmail = $this->postJson('/api/v1/auth/login', [
            'email' => "  budis@resep.laba \t ",
            'password' => 'password',
        ]);
        $resTrimmedEmail->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.store.id', 'store-warmindo');

        // Padded password should NOT be trimmed (password is exempt from TrimStrings)
        $resTrimmedPass = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'password ',
        ]);
        $resTrimmedPass->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Surel atau kata sandi salah.');
    }

    public function test_login_email_case_sensitivity(): void
    {
        // Under SQLite/PostgreSQL binary collation, unmatched casing safely returns 422 without 500
        $resUpper = $this->postJson('/api/v1/auth/login', [
            'email' => 'BUDIS@RESEP.LABA',
            'password' => 'password',
        ]);
        // Safe rejection: returns 422 if DB collation is case-sensitive, or 200 if insensitive (e.g. MySQL)
        $this->assertContains($resUpper->getStatusCode(), [200, 422]);

        // Passwords MUST be strictly case-sensitive:
        $resPassWrongCase = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'PASSWORD',
        ]);
        $resPassWrongCase->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_login_suspended_store_behavior(): void
    {
        // Suspend Warmindo store
        Store::where('id', 'store-warmindo')->update(['status' => 'SUSPENDED']);

        // STORE_USER login should be blocked with 403
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'password',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Warung sedang ditangguhkan. Hubungi tim operasional.');

        $this->assertEmpty($response->headers->get('Authorization'));

        // SUPER_ADMIN login should bypass store suspension
        $resAdmin = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@resep.laba',
            'password' => 'password',
        ]);

        $resAdmin->assertOk()
            ->assertJsonPath('success', true);
        $this->assertNotEmpty($resAdmin->headers->get('Authorization'));
    }

    public function test_login_missing_and_malformed_fields(): void
    {
        // Empty payload
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        // Missing password
        $this->postJson('/api/v1/auth/login', ['email' => 'budis@resep.laba'])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        // Missing email
        $this->postJson('/api/v1/auth/login', ['password' => 'password'])
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        // Malformed emails
        $invalidEmails = ['notanemail', 'plainaddress', '@missingusername.com', 'user@.com', 'user@domain..com'];
        foreach ($invalidEmails as $badEmail) {
            $this->postJson('/api/v1/auth/login', [
                'email' => $badEmail,
                'password' => 'password',
            ])->assertStatus(422)->assertJsonPath('success', false);
        }
    }

    public function test_login_user_without_store_returns_controlled_error(): void
    {
        // Create an orphan store user
        $orphan = User::create([
            'name' => 'Orphan User',
            'email' => 'orphan@resep.laba',
            'password' => Hash::make('password'),
            'role' => 'STORE_USER',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'orphan@resep.laba',
            'password' => 'password',
        ]);

        $response->assertStatus(500)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Data warung belum tersedia untuk pengguna ini.');
    }

    // ==========================================
    // 2. REGISTRATION ADVERSARIAL STRESS-TESTING
    // ==========================================

    public function test_register_duplicate_email_fails_validation(): void
    {
        $payload = [
            'name' => 'Imposter Budi',
            'email' => 'budis@resep.laba', // Already seeded
            'password' => 'secret123',
            'storeName' => 'Warung Duplikat',
            'businessType' => 'WARMINDO',
            'pin' => '1234',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertEmpty($response->headers->get('Authorization'));

        // Verify the original user was NOT replaced
        $user = User::where('email', 'budis@resep.laba')->first();
        $this->assertEquals('Budi Santoso', $user->name);
    }

    public function test_register_missing_required_fields(): void
    {
        $basePayload = [
            'name' => 'Test User',
            'email' => 'newuser@resep.laba',
            'password' => 'validpassword123',
            'storeName' => 'Warung Baru',
        ];

        $requiredFields = ['name', 'email', 'password', 'storeName'];

        foreach ($requiredFields as $field) {
            $incomplete = $basePayload;
            unset($incomplete[$field]);

            $response = $this->postJson('/api/v1/auth/register', $incomplete);
            $response->assertStatus(422)
                ->assertJsonPath('success', false);
        }
    }

    public function test_register_weak_password_rejected(): void
    {
        $weakPasswords = ['123', '12345', 'abc', ''];

        foreach ($weakPasswords as $pass) {
            $response = $this->postJson('/api/v1/auth/register', [
                'name' => 'Weak Pass User',
                'email' => 'weak'.rand(100, 999).'@resep.laba',
                'password' => $pass,
                'storeName' => 'Warung Lemah',
            ]);

            $response->assertStatus(422)
                ->assertJsonPath('success', false);
        }
    }

    public function test_register_pin_format_validation(): void
    {
        $invalidPins = [
            '123',      // 3 digits (too short)
            '12345',    // 5 digits (too long)
            'abcd',     // alphabetic
            '12a4',     // alphanumeric
            '-123',     // negative
            '12.4',     // decimal
        ];

        foreach ($invalidPins as $pin) {
            $response = $this->postJson('/api/v1/auth/register', [
                'name' => 'Bad PIN User',
                'email' => 'badpin'.rand(1000, 9999).'@resep.laba',
                'password' => 'password123',
                'storeName' => 'Warung PIN Rusak',
                'pin' => $pin,
            ]);

            $response->assertStatus(422)
                ->assertJsonPath('success', false);
        }

        // Test whitespace-padded PIN: Laravel TrimStrings trims input, so ' 1234 ' becomes '1234'
        $resPadded = $this->postJson('/api/v1/auth/register', [
            'name' => 'Padded PIN User',
            'email' => 'paddedpin@resep.laba',
            'password' => 'password123',
            'storeName' => 'Warung Padded PIN',
            'pin' => ' 1234 ',
        ]);
        // Validated that TrimStrings sanitizer sanitizes padded 4-digit PIN to 1234
        $resPadded->assertStatus(201);
        $paddedStore = Store::where('name', 'Warung Padded PIN')->first();
        $this->assertTrue(Hash::check('1234', $paddedStore->owner_pin_hash));

        // Test valid PIN formats
        $validPins = ['0000', '9999', '1234', '5678'];
        foreach ($validPins as $idx => $pin) {
            $email = "validpin_{$idx}@resep.laba";
            $response = $this->postJson('/api/v1/auth/register', [
                'name' => "Valid PIN {$idx}",
                'email' => $email,
                'password' => 'password123',
                'storeName' => "Warung PIN {$idx}",
                'pin' => $pin,
            ]);

            $response->assertStatus(201)
                ->assertJsonPath('success', true);

            $store = Store::where('name', "Warung PIN {$idx}")->first();
            $this->assertNotNull($store);
            $this->assertTrue(Hash::check($pin, $store->owner_pin_hash));
        }

        // Test omitted PIN defaults to '1234'
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Default PIN User',
            'email' => 'defaultpin@resep.laba',
            'password' => 'password123',
            'storeName' => 'Warung Default PIN',
        ]);

        $response->assertStatus(201)->assertJsonPath('success', true);
        $storeDefault = Store::where('name', 'Warung Default PIN')->first();
        $this->assertNotNull($storeDefault);
        $this->assertTrue(Hash::check('1234', $storeDefault->owner_pin_hash));
    }

    public function test_register_invalid_business_type_rejected(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alien Merchant',
            'email' => 'alien@resep.laba',
            'password' => 'password123',
            'storeName' => 'Galactic Store',
            'businessType' => 'SUPERMARKET_MEGA',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_register_transaction_rollback_on_failure(): void
    {
        $initialUserCount = User::count();
        $initialStoreCount = Store::count();

        // Simulate failure by triggering validation or DB constraint error
        // Let's test with email unique collision to ensure transaction never creates partial store
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Rollback Tester',
            'email' => 'budis@resep.laba', // Duplicate email
            'password' => 'password123',
            'storeName' => 'Should Not Exist Store',
        ]);

        $response->assertStatus(422);

        $this->assertEquals($initialUserCount, User::count(), 'User count should remain unchanged after failed registration');
        $this->assertEquals($initialStoreCount, Store::count(), 'Store count should remain unchanged after failed registration');
        $this->assertDatabaseMissing('stores', ['name' => 'Should Not Exist Store']);
    }

    public function test_register_sql_injection_and_xss_in_fields(): void
    {
        $sqliPayload = "Warung ' OR 1=1; DROP TABLE stores; --";
        $xssPayload = "Budi <script>alert('xss')</script>";

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => $xssPayload,
            'email' => 'sqli_tester@resep.laba',
            'password' => 'password123',
            'storeName' => $sqliPayload,
            'businessType' => 'WARMINDO',
            'pin' => '9999',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        // Verify safely saved literally
        $this->assertDatabaseHas('stores', ['name' => $sqliPayload]);
        $this->assertDatabaseHas('users', ['name' => $xssPayload]);
        $this->assertDatabaseHas('stores', ['id' => 'store-warmindo']); // table intact
    }

    // ==========================================
    // 3. SANCTUM AUTHENTICATION HEADERS & PROTECTION
    // ==========================================

    public function test_sanctum_token_issued_from_login_works_on_workspace(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'password',
        ]);

        $loginRes->assertOk();
        $token = (string) $loginRes->headers->get('Authorization');
        $this->assertStringStartsWith('Bearer ', $token);

        // Call protected route
        $workspaceRes = $this->withHeader('Authorization', $token)
            ->getJson('/api/v1/store/workspace');

        $workspaceRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.store.id', 'store-warmindo')
            ->assertJsonPath('data.store.name', 'Warmindo Cak Budi');
    }

    public function test_sanctum_token_issued_from_register_works_on_workspace(): void
    {
        $regRes = $this->postJson('/api/v1/auth/register', [
            'name' => 'Slamet Riyadi',
            'email' => 'slamet@resep.laba',
            'password' => 'password123',
            'storeName' => 'Warung Slamet',
            'businessType' => 'MADURA',
            'pin' => '7788',
        ]);

        $regRes->assertStatus(201);
        $token = (string) $regRes->headers->get('Authorization');
        $this->assertStringStartsWith('Bearer ', $token);

        $workspaceRes = $this->withHeader('Authorization', $token)
            ->getJson('/api/v1/store/workspace');

        $workspaceRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.store.name', 'Warung Slamet')
            ->assertJsonPath('data.store.ownerName', 'Slamet Riyadi');
    }

    public function test_invalid_and_tampered_tokens_rejected_with_401(): void
    {
        $tamperedHeaders = [
            'Bearer invalid_token_1234567890',
            'Bearer 999|malformedtokenhashvalue',
            'Basic dXNlcjpwYXNz',
            'Token 12345',
            '',
        ];

        foreach ($tamperedHeaders as $header) {
            $req = $this->withHeaders(['Accept' => 'application/json']);
            if (! empty($header)) {
                $req = $req->withHeader('Authorization', $header);
            }

            $response = $req->getJson('/api/v1/store/workspace');
            $response->assertStatus(401)
                ->assertJsonPath('success', false)
                ->assertJsonPath('message', 'Autentikasi diperlukan.');
        }
    }

    public function test_token_blocked_after_store_suspended_mid_session(): void
    {
        // 1. Log in successfully
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'sitiaminah@resep.laba',
            'password' => 'password',
        ]);
        $token = (string) $loginRes->headers->get('Authorization');

        // 2. Mid-session: Platform suspends the store
        Store::where('id', 'store-madura')->update(['status' => 'SUSPENDED']);

        // 3. User makes request with previously valid token
        $response = $this->withHeader('Authorization', $token)
            ->getJson('/api/v1/store/workspace');

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Warung ditangguhkan platform. Aktifkan kembali untuk melanjutkan.');
    }

    public function test_owner_pin_header_enforcement_on_protected_endpoints(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'password',
        ]);
        $token = (string) $loginRes->headers->get('Authorization');

        // Target: PATCH /api/v1/owner/settings (requires auth:sanctum + store.active + owner.pin)
        $settingsPayload = ['name' => 'Warmindo Cak Budi', 'targetMargin' => 30];

        // Case 1: Valid token, NO X-Owner-PIN
        $resNoPin = $this->withHeader('Authorization', $token)
            ->patchJson('/api/v1/owner/settings', $settingsPayload);
        $resNoPin->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'PIN salah. Coba lagi.');

        // Case 2: Valid token, WRONG X-Owner-PIN
        $resWrongPin = $this->withHeader('Authorization', $token)
            ->withHeader('X-Owner-PIN', '0000')
            ->patchJson('/api/v1/owner/settings', $settingsPayload);
        $resWrongPin->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'PIN salah. Coba lagi.');

        // Case 3: Valid token, CORRECT X-Owner-PIN (1234)
        $resCorrectPin = $this->withHeader('Authorization', $token)
            ->withHeader('X-Owner-PIN', '1234')
            ->patchJson('/api/v1/owner/settings', $settingsPayload);
        $resCorrectPin->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_register_emoji_and_special_character_store_slug_fallback(): void
    {
        // Emoji-only store name generates empty Str::slug -> should fallback to 'warung' slug
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Emoji Owner',
            'email' => 'emoji@resep.laba',
            'password' => 'password123',
            'storeName' => '🍜☕🥐',
            'businessType' => 'WARMINDO',
            'pin' => '1234',
        ]);

        $response->assertStatus(201);
        $store = Store::where('owner_name', 'Emoji Owner')->first();
        $this->assertNotNull($store);
        $this->assertStringStartsWith('store-warung-', $store->id);
    }

    public function test_register_character_length_limits(): void
    {
        // 1. Name exceeds 100 chars
        $this->postJson('/api/v1/auth/register', [
            'name' => str_repeat('A', 101),
            'email' => 'longname@resep.laba',
            'password' => 'password123',
            'storeName' => 'Warung Panjang',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // 2. Store name exceeds 100 chars
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Owner Normal',
            'email' => 'longstore@resep.laba',
            'password' => 'password123',
            'storeName' => str_repeat('B', 101),
        ])->assertStatus(422)->assertJsonPath('success', false);

        // 3. Email exceeds 150 chars
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Owner Normal',
            'email' => str_repeat('c', 140) . '@resep.laba', // > 150 chars
            'password' => 'password123',
            'storeName' => 'Warung Normal',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // 4. WhatsApp exceeds 20 chars
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Owner Normal',
            'email' => 'longwa@resep.laba',
            'password' => 'password123',
            'storeName' => 'Warung Normal',
            'whatsapp' => '081234567890123456789', // 21 chars
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_store_user_blocked_from_super_admin_routes(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'budis@resep.laba',
            'password' => 'password',
        ]);
        $token = (string) $loginRes->headers->get('Authorization');

        $response = $this->withHeader('Authorization', $token)
            ->getJson('/api/v1/admin/stores');

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Akses ditolak. Anda bukan pengelola platform.');
    }

    public function test_super_admin_can_access_workspace_snapshot(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@resep.laba',
            'password' => 'password',
        ]);
        $token = (string) $loginRes->headers->get('Authorization');

        $response = $this->withHeader('Authorization', $token)
            ->getJson('/api/v1/store/workspace');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(5, 'data.tenants')
            ->assertJsonCount(4, 'data.templates');
    }
}
