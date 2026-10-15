<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Suspend with a reason, or reactivate (plan PHASE_6 §4.1, Q6).
 */
class SuspendRequest extends FormRequest
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
            'suspended' => ['required', 'boolean'],
            'reason' => ['nullable', 'required_if_accepted:suspended', 'string', 'min:5', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'suspended.required' => 'Choose suspend or reactivate.',
            'suspended.boolean' => 'Choose suspend or reactivate.',
            'reason.required_if_accepted' => 'Say why you are suspending this account.',
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
