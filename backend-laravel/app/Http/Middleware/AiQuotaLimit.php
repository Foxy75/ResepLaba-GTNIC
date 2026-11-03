<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AiQuotaLimit
{
    public function handle(Request $request, Closure $next): Response
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 403);
        }

        $day = (string) config('reseplaba.demo_today', '2026-10-25');

        if ($store->ai_reset_date?->format('Y-m-d') !== $day) {
            $store->ai_used = 0;
            $store->ai_reset_date = $day;
            $store->save();
        }

        if ((int) $store->ai_used >= (int) $store->ai_quota) {
            return ApiResponse::fail(
                'Kuota pindai nota hari ini habis. Coba lagi besok.',
                [],
                429,
            );
        }

        return $next($request);
    }
}