<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'transaction_id',
        'sellable_product_id',
        'product_name',
        'qty_sold',
        'unit_price',
        'unit_hpp',
    ];

    protected function casts(): array
    {
        return [
            'qty_sold' => 'integer',
            'unit_price' => 'float',
            'unit_hpp' => 'float',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(SellableProduct::class, 'sellable_product_id');
    }
}