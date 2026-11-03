<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\WorkspaceSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AuthController extends Controller
{
    public function sandboxLogin(Request $request): JsonResponse
    {
        $profile = (string) $request->json('profile');

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

        $message = $profile === 'admin' ? 'Panel platform siap.' : 'Data contoh dimuat.';

        return ApiResponse::ok($message, WorkspaceSerializer::snapshot($store))
            ->header('Authorization', 'Bearer '.$token);
    }
}