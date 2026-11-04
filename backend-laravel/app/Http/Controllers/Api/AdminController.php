<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendBroadcastRequest;
use App\Http\Requests\SetTenantStatusRequest;
use App\Models\Broadcast;
use App\Models\Store;
use App\Support\ApiResponse;
use App\Support\WorkspaceSerializer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class AdminController extends Controller
{
    public function stores(): JsonResponse
    {
        $today = (string) config('reseplaba.demo_today', '2026-10-25');

        $tenants = Store::orderBy('id')->get()->map(
            fn (Store $store) => WorkspaceSerializer::tenant(
                $store,
                (int) $store->transactions()->whereDate('day', $today)->count(),
            ),
        )->all();

        return ApiResponse::ok('Daftar warung dimuat.', $tenants);
    }

    public function setTenantStatus(SetTenantStatusRequest $request, string $id): JsonResponse
    {
        $store = Store::where('tenant_id', $id)->first();

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.');
        }

        $status = (string) $request->validated('status');
        $store->status = $status;
        $store->save();

        $today = (string) config('reseplaba.demo_today', '2026-10-25');
        $tenant = WorkspaceSerializer::tenant(
            $store,
            (int) $store->transactions()->whereDate('day', $today)->count(),
        );

        $message = $status === 'SUSPENDED'
            ? "{$store->name} ditangguhkan."
            : "{$store->name} diaktifkan kembali.";

        return ApiResponse::ok($message, $tenant);
    }

    public function sendBroadcast(SendBroadcastRequest $request): JsonResponse
    {
        $trimmed = trim((string) $request->validated('message'));

        if ($trimmed === '') {
            return ApiResponse::fail('Isi pengumuman masih kosong.');
        }

        $broadcast = Broadcast::query()->create([
            'id' => $this->nextId('bc'),
            'message' => $trimmed,
            'severity' => 'warning',
        ]);

        return ApiResponse::ok('Pengumuman ditayangkan ke warung aktif.', WorkspaceSerializer::broadcast($broadcast));
    }

    private function nextId(string $prefix): string
    {
        return $prefix.'-'.uniqid().'-'.mt_rand(10, 99);
    }
}