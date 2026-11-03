<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class VerifyPinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pin' => ['required', 'digits:4'],
        ];
    }
}