<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('tenant_id', 64)->nullable()->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('owner_name');
            $table->string('whatsapp')->nullable();
            $table->string('business_type', 20)->default('WARMINDO'); // WARMINDO|MADURA|BAKERY|OTHER
            $table->string('category_label', 60)->nullable();
            $table->string('owner_pin_hash');
            $table->string('status', 20)->default('ACTIVE'); // ACTIVE|SUSPENDED
            $table->decimal('target_margin_percent', 5, 2)->default(25);
            $table->unsignedInteger('ai_quota')->default(5);
            $table->unsignedInteger('ai_used')->default(0);
            $table->date('ai_reset_date')->nullable();
            $table->date('joined_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};