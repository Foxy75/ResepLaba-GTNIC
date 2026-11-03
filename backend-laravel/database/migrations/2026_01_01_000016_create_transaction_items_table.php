<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_items', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('transaction_id', 64);
            $table->string('sellable_product_id', 64);
            $table->string('product_name'); // snapshot nama saat jual
            $table->integer('qty_sold');
            $table->decimal('unit_price', 14, 2);
            $table->decimal('unit_hpp', 14, 2);
            $table->timestamps();

            $table->foreign('transaction_id')->references('id')->on('transactions')->cascadeOnDelete();
            $table->foreign('sellable_product_id')->references('id')->on('sellable_products')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_items');
    }
};