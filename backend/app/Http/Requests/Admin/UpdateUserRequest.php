<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\AccountFields;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * An administrator corrects someone's name or email, with a reason (ADMIN_USERS_PLAN U2, U4).
 */
class UpdateUserRequest extends FormRequest
{
    use AccountFields;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = $this->accountRules();
        $email = array_map(
            fn ($rule) => $rule === 'unique:users,email' ? Rule::unique('users', 'email')->ignore($this->route('user')) : $rule,
            $rules['email'],
        );

        return [
            'name' => $rules['name'],
            'email' => $email,
            'reason' => ['required', 'string', 'min:5', 'max:300'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...$this->accountMessages(),
            'name.required' => 'Enter their full name.',
            'email.required' => 'Enter their email address.',
            'email.unique' => 'An account with this email already exists.',
            'reason.required' => 'Say why you are changing these details.',
            'reason.min' => 'Use at least 5 characters.',
            'reason.max' => 'Use 300 characters or fewer.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeEmail();
        $this->merge([
            'name' => is_string($this->name) ? trim($this->name) : $this->name,
            'reason' => is_string($this->reason) ? trim($this->reason) : $this->reason,
        ]);
    }
}
