<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'store_id',
        'name',
        'base_unit',
        'purchase_unit',
        'conversion_rate',
        'unit_cost',
        'min_stock',
    ];

    protected function casts(): array
    {
        return [
            'conversion_rate' => 'float',
            'unit_cost' => 'float',
            'min_stock' => 'float',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function compositions(): HasMany
    {
        return $this->hasMany(ProductComposition::class);
    }
}