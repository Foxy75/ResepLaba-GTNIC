<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('store_id', 64);
            $table->string('name');
            $table->string('base_unit', 20); // pcs|butir|gram|ml|bungkus|kotak|sachet|botol
            $table->string('purchase_unit', 60); // dus|krat|karung 25 kg|pak|renceng
            $table->decimal('conversion_rate', 14, 2)->default(1);
            $table->decimal('unit_cost', 16, 2)->default(0); // moving average cost
            $table->decimal('min_stock', 14, 2)->default(0);
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->index(['store_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};