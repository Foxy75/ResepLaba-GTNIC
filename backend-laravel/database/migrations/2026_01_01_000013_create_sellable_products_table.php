<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sellable_products', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('store_id', 64);
            $table->string('name');
            $table->string('kind', 20)->default('retail'); // retail|recipe
            $table->string('category', 20)->default('eceran'); // makanan|minuman|eceran
            $table->string('icon', 20)->default('meal'); // meal|egg|rice|drink|soup|coffee|pack
            $table->decimal('selling_price', 14, 2);
            $table->decimal('target_margin_percent', 5, 2)->default(25);
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sellable_products');
    }
};