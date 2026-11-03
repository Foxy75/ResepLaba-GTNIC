<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'tenant_id',
        'user_id',
        'name',
        'owner_name',
        'whatsapp',
        'business_type',
        'category_label',
        'owner_pin_hash',
        'status',
        'target_margin_percent',
        'ai_quota',
        'ai_used',
        'ai_reset_date',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'target_margin_percent' => 'float',
            'ai_quota' => 'integer',
            'ai_used' => 'integer',
            'ai_reset_date' => 'date',
            'joined_at' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(SellableProduct::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function aiUsageLogs(): HasMany
    {
        return $this->hasMany(AiUsageLog::class);
    }
}