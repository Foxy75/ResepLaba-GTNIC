<?php

namespace App\Providers;

use App\Support\ApiResponse;
use App\Support\SecurityLogger;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');
            $ip = (string) $request->ip();

            return Limit::perMinute(5)
                ->by($email ? $email.'|'.$ip : $ip)
                ->response(function (Request $request, array $headers) {
                    SecurityLogger::log('AUTH_RATE_LIMIT_EXCEEDED', 'WARNING', [
                        'type' => 'login',
                        'target' => (string) $request->input('email'),
                    ], $request);

                    return ApiResponse::fail(
                        'Terlalu banyak percobaan masuk. Tunggu 1 menit sebelum mencoba lagi.',
                        [],
                        429,
                        $headers
                    );
                });
        });

        RateLimiter::for('sandbox', function (Request $request) {
            return Limit::perMinute(15)
                ->by((string) $request->ip())
                ->response(function (Request $request, array $headers) {
                    SecurityLogger::log('AUTH_RATE_LIMIT_EXCEEDED', 'WARNING', [
                        'type' => 'sandbox',
                    ], $request);

                    return ApiResponse::fail(
                        'Terlalu banyak permintaan akun sandbox. Tunggu beberapa saat.',
                        [],
                        429,
                        $headers
                    );
                });
        });

        RateLimiter::for('pin-verify', function (Request $request) {
            $storeId = $request->user()?->store?->id ?? (string) $request->ip();

            return Limit::perMinute(10)
                ->by($storeId)
                ->response(function (Request $request, array $headers) {
                    return ApiResponse::fail(
                        'Terlalu banyak percobaan PIN. Silakan tunggu.',
                        [],
                        429,
                        $headers
                    );
                });
        });
    }
}
