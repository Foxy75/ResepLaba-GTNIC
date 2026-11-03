<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('store_id', 64);
            $table->string('inventory_item_id', 64);
            $table->string('inventory_batch_id', 64)->nullable();
            $table->string('type', 30); // RESTOCK_IN|RECEIPT_IN|SALE_OUT|EXPIRED_WASTE|DAMAGED_WASTE|ADJUSTMENT
            $table->decimal('qty', 14, 2);
            $table->decimal('cost', 16, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->cascadeOnDelete();
            $table->foreign('inventory_batch_id')->references('id')->on('inventory_batches')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};