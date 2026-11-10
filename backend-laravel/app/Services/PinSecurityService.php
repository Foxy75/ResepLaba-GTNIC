<?php

namespace App\Services;

use App\Models\Store;
use App\Support\SecurityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;

final class PinSecurityService
{
    public const MAX_ATTEMPTS = 3;
    public const LOCKOUT_MINUTES = 15;

    public static function isLocked(Store $store): ?int
    {
        $lockKey = "pin_lockout_{$store->id}";
        if (Cache::has($lockKey)) {
            $remainingSeconds = (int) Cache::get($lockKey) - now()->timestamp;

            return max(1, (int) ceil($remainingSeconds / 60));
        }

        return null;
    }

    /**
     * @return array{ok: bool, status: int, message: string, locked: bool}
     */
    public static function verify(Store $store, string $pin, Request $request): array
    {
        if ($remainingMinutes = self::isLocked($store)) {
            return [
                'ok' => false,
                'status' => 423,
                'message' => "Mode Juragan terkunci sementara demi keamanan karena 3x salah PIN. Coba lagi dalam {$remainingMinutes} menit.",
                'locked' => true,
            ];
        }

        $attemptsKey = "pin_attempts_{$store->id}";

        if ($pin === '' || ! Hash::check($pin, $store->owner_pin_hash)) {
            $attempts = (int) Cache::get($attemptsKey, 0) + 1;
            Cache::put($attemptsKey, $attempts, now()->addMinutes(10));

            if ($attempts >= self::MAX_ATTEMPTS) {
                $lockKey = "pin_lockout_{$store->id}";
                Cache::put(
                    $lockKey,
                    now()->addMinutes(self::LOCKOUT_MINUTES)->timestamp,
                    now()->addMinutes(self::LOCKOUT_MINUTES)
                );
                Cache::forget($attemptsKey);

                SecurityLogger::pinLocked($store->id, $request, self::LOCKOUT_MINUTES);

                return [
                    'ok' => false,
                    'status' => 423,
                    'message' => "Mode Juragan dikunci selama ".self::LOCKOUT_MINUTES." menit karena terlalu banyak kesalahan PIN.",
                    'locked' => true,
                ];
            }

            $remaining = self::MAX_ATTEMPTS - $attempts;
            SecurityLogger::pinFailed($store->id, $request, $remaining);

            return [
                'ok' => false,
                'status' => 403,
                'message' => "PIN salah. Sisa kesempatan: {$remaining} kali.",
                'locked' => false,
            ];
        }

        // Success: clear counter
        Cache::forget($attemptsKey);
        SecurityLogger::pinSuccess($store->id, $request);

        return [
            'ok' => true,
            'status' => 200,
            'message' => 'Mode Juragan terbuka.',
            'locked' => false,
        ];
    }
}
