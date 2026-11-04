<?php

use App\Http\Middleware\AiQuotaLimit;
use App\Http\Middleware\EnsureStoreIsActive;
use App\Http\Middleware\VerifyOwnerPin;
use App\Support\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'store.active' => EnsureStoreIsActive::class,
            'owner.pin' => VerifyOwnerPin::class,
            'ai.quota' => AiQuotaLimit::class,
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $message = collect($e->errors())->flatten()->first() ?: 'Validasi gagal.';

                return ApiResponse::fail($message, [], 422);
            }

            return null;
        });
    })->create();