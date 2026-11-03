<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureStoreIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $store = $request->user()?->store;

        if ($store && $store->status === 'SUSPENDED') {
            return ApiResponse::fail(
                'Warung ditangguhkan platform. Aktifkan kembali untuk melanjutkan.',
                [],
                403,
            );
        }

        return $next($request);
    }
}