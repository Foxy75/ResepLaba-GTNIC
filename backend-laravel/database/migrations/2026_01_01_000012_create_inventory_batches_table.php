<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('inventory_item_id', 64);
            $table->string('batch_code', 100);
            $table->decimal('initial_qty', 14, 2);
            $table->decimal('remaining_qty', 14, 2);
            $table->decimal('unit_cost', 16, 2);
            $table->date('expiry_date');
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE|EXPIRED|DAMAGED|DEPLETED
            $table->timestamps();

            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->cascadeOnDelete();
            $table->index(['inventory_item_id', 'expiry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');
    }
};