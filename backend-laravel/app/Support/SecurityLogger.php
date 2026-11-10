<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

final class SecurityLogger
{
    public static function log(string $event, string $severity, array $details, Request $request): void
    {
        $payload = [
            'timestamp' => now()->toIso8601String(),
            'event' => $event,
            'severity' => $severity,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent() ?? 'unknown',
            'endpoint' => $request->method().' '.$request->path(),
            'details' => $details,
        ];

        $message = sprintf(
            '[SECURITY_AUDIT] %s | %s | IP: %s | %s',
            $event,
            $severity,
            $payload['ip'],
            json_encode($details, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
        );

        match ($severity) {
            'EMERGENCY', 'CRITICAL', 'ALERT' => Log::critical($message, $payload),
            'WARNING' => Log::warning($message, $payload),
            'NOTICE' => Log::notice($message, $payload),
            default => Log::info($message, $payload),
        };
    }

    public static function loginFailed(string $email, Request $request, string $reason): void
    {
        self::log('AUTH_LOGIN_FAILED', 'WARNING', [
            'email' => $email,
            'reason' => $reason,
        ], $request);
    }

    public static function loginSuccess(string $email, string $userId, Request $request, string $profileType): void
    {
        self::log('AUTH_LOGIN_SUCCESS', 'INFO', [
            'email' => $email,
            'user_id' => $userId,
            'profile_type' => $profileType,
        ], $request);
    }

    public static function pinFailed(string $storeId, Request $request, int $remainingAttempts): void
    {
        self::log('AUTH_PIN_FAILED', 'WARNING', [
            'store_id' => $storeId,
            'remaining_attempts' => $remainingAttempts,
        ], $request);
    }

    public static function pinLocked(string $storeId, Request $request, int $lockoutMinutes): void
    {
        self::log('AUTH_PIN_LOCKED', 'CRITICAL', [
            'store_id' => $storeId,
            'lockout_minutes' => $lockoutMinutes,
            'threat' => 'POSSIBLE_BRUTE_FORCE_ATTACK',
        ], $request);
    }

    public static function pinSuccess(string $storeId, Request $request): void
    {
        self::log('AUTH_PIN_SUCCESS', 'INFO', [
            'store_id' => $storeId,
        ], $request);
    }

    public static function logout(string $userId, Request $request): void
    {
        self::log('AUTH_LOGOUT', 'INFO', [
            'user_id' => $userId,
        ], $request);
    }

    public static function sandboxLogin(string $profile, string $email, Request $request): void
    {
        self::log('AUTH_SANDBOX_LOGIN', 'NOTICE', [
            'profile' => $profile,
            'email' => $email,
        ], $request);
    }
}
