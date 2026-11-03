<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SellableProduct extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'store_id',
        'name',
        'kind',
        'category',
        'icon',
        'selling_price',
        'target_margin_percent',
    ];

    protected function casts(): array
    {
        return [
            'selling_price' => 'float',
            'target_margin_percent' => 'float',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function compositions(): HasMany
    {
        return $this->hasMany(ProductComposition::class);
    }

    public function transactionsItems(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }
}