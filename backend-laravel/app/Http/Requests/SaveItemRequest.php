<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SaveItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string'],
            'baseUnit' => ['nullable', 'string'],
            'purchaseUnit' => ['nullable', 'string'],
            'conversionRate' => ['nullable', 'numeric'],
            'unitCost' => ['nullable', 'numeric', 'min:0'],
            'minStock' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}