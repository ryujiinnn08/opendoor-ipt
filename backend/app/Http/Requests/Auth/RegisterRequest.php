<?php

namespace App\Http\Requests\Auth;

use App\Enums\Role;
use App\Http\Requests\Concerns\AccountFields;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
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
        return [
            'role' => ['required', Rule::in(Role::selfRegistrable())],
            ...$this->accountRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role.required' => 'Choose whether you are looking for a job or hiring.',
            'role.in' => 'Choose whether you are looking for a job or hiring.',
            ...$this->accountMessages(),
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeEmail();
    }
}
