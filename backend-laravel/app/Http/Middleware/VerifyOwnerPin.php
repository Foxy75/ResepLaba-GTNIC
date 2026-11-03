<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

final class VerifyOwnerPin
{
    public function handle(Request $request, Closure $next): Response
    {
        $pin = $request->header('X-Owner-PIN') ?? $request->input('pin');
        $store = $request->user()?->store;

        if (! $pin || ! $store || ! Hash::check((string) $pin, $store->owner_pin_hash)) {
            return ApiResponse::fail('PIN salah. Coba lagi.', [], 403);
        }

        return $next($request);
    }
}