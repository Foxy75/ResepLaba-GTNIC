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
            'name' => ['required', 'string'],
            'kind' => ['nullable', Rule::in(['recipe', 'retail'])],
            'category' => ['nullable', Rule::in(['makanan', 'minuman', 'eceran'])],
            'icon' => ['nullable', Rule::in(['meal', 'egg', 'rice', 'drink', 'soup', 'coffee', 'pack'])],
            'price' => ['required', 'numeric', 'gt:0'],
            'targetMargin' => ['nullable', 'numeric', 'between:0,90'],
            'recipe' => ['required', 'array', 'min:1'],
            'recipe.*.itemId' => ['required', 'string'],
            'recipe.*.qty' => ['required', 'numeric', 'gt:0'],
            'recipe.*.wastePct' => ['nullable', 'numeric', 'between:0,100'],
        ];
    }
}