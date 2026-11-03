<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RestockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'itemId' => ['required', 'string'],
            'purchaseQty' => ['required', 'numeric', 'gt:0'],
            'totalCost' => ['required', 'numeric', 'gt:0'],
            'expiresAt' => [
                'required',
                'date',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $today = (string) config('reseplaba.demo_today', '2026-10-25');
                    if ($value < $today) {
                        $fail('Tanggal kedaluwarsa tidak boleh di masa lalu.');
                    }
                },
            ],
            'code' => ['nullable', 'string'],
        ];
    }
}