<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Current password, then a new one by the registration rules (F1.6).
 */
class ChangePasswordRequest extends FormRequest
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
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => ['required', 'confirmed', 'different:current_password', Password::defaults()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => 'Enter your current password.',
            'current_password.current_password' => "That isn't your current password.",
            'password.required' => 'Enter a new password.',
            'password.confirmed' => 'The two new passwords do not match.',
            'password.different' => 'Choose a password different from your current one.',
            'password.min' => 'Use at least 8 characters.',
        ];
    }
}
