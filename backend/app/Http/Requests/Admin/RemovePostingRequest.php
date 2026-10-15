<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The reason for removing a posting; the employer sees it (plan PHASE_6 §4.2).
 */
class RemovePostingRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Give a reason; the employer sees it.',
            'reason.min' => 'Use at least 5 characters.',
            'reason.max' => 'Use 500 characters or fewer.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->reason)) {
            $this->merge(['reason' => trim($this->reason)]);
        }
    }
}
