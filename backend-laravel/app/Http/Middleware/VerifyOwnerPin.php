<?php

namespace App\Http\Middleware;

use App\Services\PinSecurityService;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class VerifyOwnerPin
{
    public function handle(Request $request, Closure $next): Response
    {
        $store = $request->user()?->store;

        if (! $store) {
            return ApiResponse::fail('Warung tidak ditemukan.', [], 404);
        }

        $pin = (string) ($request->header('X-Owner-PIN') ?? $request->input('pin') ?? '');
        $result = PinSecurityService::verify($store, $pin, $request);

        if (! $result['ok']) {
            return ApiResponse::fail($result['message'], [], $result['status']);
        }

        return $next($request);
    }
}
