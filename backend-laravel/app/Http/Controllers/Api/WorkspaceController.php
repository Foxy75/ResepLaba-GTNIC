<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Support\ApiResponse;
use App\Support\WorkspaceSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class WorkspaceController extends Controller
{
    public function workspace(Request $request): JsonResponse
    {
        $store = $request->user()?->store;

        // Admin (tanpa store) memakai store warmindo sebagai proxy snapshot,
        // sama seperti AuthController::sandboxLogin.
        if (! $store && $request->user()?->role === 'SUPER_ADMIN') {
            $store = Store::where('id', 'store-warmindo')->first();
        }

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        return ApiResponse::ok('Data contoh dimuat.', WorkspaceSerializer::snapshot($store, null, $request->user()?->role === 'SUPER_ADMIN'));
    }
}