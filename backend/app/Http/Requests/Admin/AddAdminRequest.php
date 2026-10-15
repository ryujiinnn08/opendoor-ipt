<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\AccountFields;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Name and email of a new administrator; OpenDoor makes the password (Q4).
 */
class AddAdminRequest extends FormRequest
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

        return ['name' => $rules['name'], 'email' => $rules['email']];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...$this->accountMessages(),
            'name.required' => "Enter the administrator's full name.",
            'email.required' => "Enter the administrator's email address.",
            'email.unique' => 'An account with this email already exists.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeEmail();
    }
}
