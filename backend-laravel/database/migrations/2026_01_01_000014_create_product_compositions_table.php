<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_compositions', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('sellable_product_id', 64);
            $table->string('inventory_item_id', 64);
            $table->decimal('qty_needed', 12, 2);
            $table->decimal('waste_percent', 5, 2)->default(0);
            $table->timestamps();

            $table->foreign('sellable_product_id')->references('id')->on('sellable_products')->cascadeOnDelete();
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_compositions');
    }
};