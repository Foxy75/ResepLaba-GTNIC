<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SaveProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string'],
            'kind' => ['nullable', Rule::in(['recipe', 'retail'])],
            'category' => ['nullable', Rule::in(['makanan', 'minuman', 'eceran'])],
            'icon' => ['nullable', Rule::in(['meal', 'egg', 'rice', 'drink', 'soup', 'coffee', 'pack'])],
            'price' => ['nullable', 'numeric'],
            'targetMargin' => ['nullable', 'numeric', 'between:0,90'],
            'recipe' => ['nullable', 'array'],
            'recipe.*.itemId' => ['nullable', 'string'],
            'recipe.*.qty' => ['nullable', 'numeric', 'gt:0'],
            'recipe.*.wastePct' => ['nullable', 'numeric', 'between:0,100'],
        ];
    }
}