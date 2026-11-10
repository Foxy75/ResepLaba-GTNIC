<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\SecurityLogger;
use App\Support\WorkspaceSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class AuthController extends Controller
{
    public function sandboxLogin(Request $request): JsonResponse
    {
        $profile = (string) $request->json('profile');

        // Security Gate: Sandbox login protection for production
        if (app()->environment('production') && ! config('reseplaba.allow_sandbox', false)) {
            SecurityLogger::log('AUTH_SANDBOX_BLOCKED', 'ALERT', [
                'reason' => 'Sandbox login is disabled in production environment without explicit override.',
                'profile' => $profile,
            ], $request);

            return ApiResponse::fail('Akses sandbox dinonaktifkan di lingkungan produksi.', [], 403);
        }

        $emails = [
            'warmindo' => 'budis@resep.laba',
            'madura' => 'sitiaminah@resep.laba',
            'admin' => 'admin@resep.laba',
        ];

        if (! isset($emails[$profile])) {
            return ApiResponse::fail('Profil tidak dikenal.');
        }

        $user = User::where('email', $emails[$profile])->first();

        if (! $user) {
            return ApiResponse::fail('Profil belum tersedia. Jalankan seeder dulu.', [], 500);
        }

        if ($profile === 'admin') {
            $store = Store::where('id', 'store-warmindo')->first();
        } else {
            $store = $user->store;
        }

        if (! $store) {
            return ApiResponse::fail('Data warung belum tersedia. Jalankan seeder dulu.', [], 500);
        }

        $token = $user->createToken('sandbox')->plainTextToken;

        SecurityLogger::sandboxLogin($profile, $user->email, $request);

        $message = $profile === 'admin' ? 'Panel platform siap.' : 'Data contoh dimuat.';

        return ApiResponse::ok($message, WorkspaceSerializer::snapshot($store, null, $profile === 'admin'))
            ->header('Authorization', 'Bearer '.$token);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            SecurityLogger::loginFailed($validated['email'], $request, 'Invalid credentials');

            return ApiResponse::fail('Surel atau kata sandi salah.', [], 422);
        }

        if ($user->role === 'SUPER_ADMIN') {
            $store = Store::where('id', 'store-warmindo')->first();
        } else {
            $store = $user->store;
        }

        if (! $store) {
            return ApiResponse::fail('Data warung belum tersedia untuk pengguna ini.', [], 500);
        }

        if ($user->role !== 'SUPER_ADMIN' && $store->status === 'SUSPENDED') {
            SecurityLogger::log('AUTH_SUSPENDED_LOGIN_ATTEMPT', 'WARNING', [
                'user_id' => $user->id,
                'store_id' => $store->id,
            ], $request);

            return ApiResponse::fail('Warung sedang ditangguhkan. Hubungi tim operasional.', [], 403);
        }

        $token = $user->createToken('auth')->plainTextToken;

        SecurityLogger::loginSuccess($user->email, (string) $user->id, $request, $user->role);

        return ApiResponse::ok('Login berhasil.', WorkspaceSerializer::snapshot($store, null, $user->role === 'SUPER_ADMIN'))
            ->header('Authorization', 'Bearer '.$token);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();
            SecurityLogger::logout((string) $user->id, $request);
        }

        return ApiResponse::ok('Logout berhasil. Sesi telah diakhiri.');
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:users,email',
            'password' => 'required|string|min:8',
            'storeName' => 'required|string|max:100',
            'businessType' => 'nullable|string|in:WARMINDO,MADURA,BAKERY,OTHER',
            'whatsapp' => 'nullable|string|max:20',
            'pin' => ['nullable', 'string', 'regex:/^[0-9]{4}$/'],
        ]);

        $user = null;

        $store = DB::transaction(function () use ($validated, &$user) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'STORE_USER',
            ]);

            $businessType = $validated['businessType'] ?? 'WARMINDO';
            $categoryLabel = match ($businessType) {
                'WARMINDO' => 'Warmindo',
                'MADURA' => 'Warung kelontong',
                'BAKERY' => 'Toko roti',
                default => 'Warung UMKM',
            };

            $slug = Str::slug($validated['storeName']);
            if (empty($slug)) {
                $slug = 'warung';
            }

            return Store::create([
                'id' => 'store-'.$slug.'-'.Str::lower(Str::random(4)),
                'tenant_id' => 't-'.Str::lower(Str::random(6)),
                'user_id' => $user->id,
                'name' => $validated['storeName'],
                'owner_name' => $validated['name'],
                'whatsapp' => $validated['whatsapp'] ?? null,
                'business_type' => $businessType,
                'category_label' => $categoryLabel,
                'owner_pin_hash' => Hash::make($validated['pin'] ?? '1234'),
                'status' => 'ACTIVE',
                'target_margin_percent' => 25.0,
                'ai_quota' => 5,
                'ai_used' => 0,
                'ai_reset_date' => date('Y-m-d'),
                'joined_at' => date('Y-m-d'),
            ]);
        });

        $token = $user->createToken('auth')->plainTextToken;

        SecurityLogger::log('AUTH_REGISTER_SUCCESS', 'INFO', [
            'user_id' => $user->id,
            'email' => $user->email,
            'store_id' => $store->id,
        ], $request);

        return ApiResponse::ok('Pendaftaran warung berhasil.', WorkspaceSerializer::snapshot($store, null, false))
            ->setStatusCode(201)
            ->header('Authorization', 'Bearer '.$token);
    }
}
