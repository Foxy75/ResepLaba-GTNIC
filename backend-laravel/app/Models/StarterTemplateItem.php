<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StarterTemplateItem extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'starter_template_id',
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

    public function template(): BelongsTo
    {
        return $this->belongsTo(StarterTemplate::class, 'starter_template_id');
    }
}