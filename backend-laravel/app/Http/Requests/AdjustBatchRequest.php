<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AdjustBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'qty' => ['required', 'numeric', 'min:0'],
            'reason' => ['nullable', 'string'],
        ];
    }
}