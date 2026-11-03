<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatch extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'inventory_item_id',
        'batch_code',
        'initial_qty',
        'remaining_qty',
        'unit_cost',
        'expiry_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'initial_qty' => 'float',
            'remaining_qty' => 'float',
            'unit_cost' => 'float',
            'expiry_date' => 'date',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}