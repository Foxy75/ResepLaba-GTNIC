<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('starter_template_items', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('starter_template_id', 64);
            $table->string('name');
            $table->string('base_unit', 20);
            $table->string('purchase_unit', 60);
            $table->decimal('conversion_rate', 14, 2)->default(1);
            $table->decimal('unit_cost', 16, 2)->default(0);
            $table->decimal('min_stock', 14, 2)->default(0);
            $table->timestamps();

            $table->foreign('starter_template_id')->references('id')->on('starter_templates')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('starter_template_items');
    }
};