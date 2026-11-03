<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductComposition extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'sellable_product_id',
        'inventory_item_id',
        'qty_needed',
        'waste_percent',
    ];

    protected function casts(): array
    {
        return [
            'qty_needed' => 'float',
            'waste_percent' => 'float',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(SellableProduct::class, 'sellable_product_id');
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}