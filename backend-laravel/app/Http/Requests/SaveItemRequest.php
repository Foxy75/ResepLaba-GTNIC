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
            'name' => ['required', 'string'],
            'baseUnit' => ['required', 'string'],
            'purchaseUnit' => ['required', 'string'],
            'conversionRate' => ['required', 'numeric', 'gt:0'],
            'unitCost' => ['nullable', 'numeric', 'min:0'],
            'minStock' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}