<?php

namespace App\Http\Requests\Candidate;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * My applications: a filter and a page.
 */
class ApplicationListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::in(Application::FILTERS)],
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ];
    }

    public function filter(): string
    {
        return $this->validated('status') ?? 'all';
    }
}
