<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->string('id', 64)->primary(); // RL-20261025-001 / RL-901
            $table->string('store_id', 64);
            $table->date('day');
            $table->decimal('total_amount', 16, 2);
            $table->decimal('total_hpp', 16, 2);
            $table->decimal('net_profit', 16, 2);
            $table->timestamp('created_at_time')->nullable(); // timestamp penjualan (waktu demo)
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->index(['store_id', 'day']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};