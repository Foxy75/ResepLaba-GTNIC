<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ReceiptCommitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.itemId' => ['required', 'string'],
            'rows.*.name' => ['required', 'string'],
            'rows.*.purchaseQty' => ['required', 'numeric', 'gt:0'],
            'rows.*.purchaseUnit' => ['nullable', 'string'],
            'rows.*.conversionRate' => ['required', 'numeric', 'gt:0'],
            'rows.*.totalCost' => ['required', 'numeric', 'gt:0'],
            'rows.*.expiresAt' => ['nullable', 'date'],
        ];
    }
}