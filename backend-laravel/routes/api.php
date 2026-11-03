<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CronController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\OwnerController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/sandbox-login', [AuthController::class, 'sandboxLogin']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::middleware('store.active')->group(function () {
            Route::get('/store/workspace', [WorkspaceController::class, 'workspace']);

            Route::post('/pos/checkout', [PosController::class, 'checkout']);

            Route::post('/inventory/restock', [InventoryController::class, 'restock']);
            Route::middleware('ai.quota')->post('/inventory/ocr-receipt', [InventoryController::class, 'ocrReceipt']);
            Route::post('/inventory/receipt/commit', [InventoryController::class, 'commitReceipt']);
            Route::patch('/inventory/batches/{id}/adjust', [InventoryController::class, 'adjustBatch']);
            Route::patch('/inventory/batches/{id}/status', [InventoryController::class, 'markBatch']);

            Route::middleware('owner.pin')->group(function () {
                Route::delete('/inventory/batches/{id}', [InventoryController::class, 'removeBatch']);
                Route::post('/owner/products', [OwnerController::class, 'saveProduct']);
                Route::put('/owner/products/{id}', [OwnerController::class, 'saveProduct']);
                Route::delete('/owner/products/{id}', [OwnerController::class, 'deleteProduct']);
                Route::post('/owner/items', [OwnerController::class, 'saveItem']);
                Route::put('/owner/items/{id}', [OwnerController::class, 'saveItem']);
                Route::post('/owner/templates/{id}/apply', [OwnerController::class, 'applyTemplate']);
                Route::get('/owner/profit-summary', [OwnerController::class, 'profitSummary']);
                Route::patch('/owner/settings', [OwnerController::class, 'updateSettings']);
            });

            Route::post('/owner/verify-pin', [OwnerController::class, 'verifyPin']);
        });

        Route::middleware('role:SUPER_ADMIN')->group(function () {
            Route::get('/admin/stores', [AdminController::class, 'stores']);
            Route::patch('/admin/stores/{id}/status', [AdminController::class, 'setTenantStatus']);
            Route::post('/admin/broadcasts', [AdminController::class, 'sendBroadcast']);
        });
    });

    Route::get('/inventory/cron/daily-expiry-check', [CronController::class, 'dailyExpiryCheck']);
});