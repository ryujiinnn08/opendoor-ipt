<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The "Contact us" form. `website` is a hidden trap field: people never see it, so a value
 * means a bot filled in the form (the controller then drops the message quietly).
 */
class ContactRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
            'website' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Enter your name.',
            'name.max' => 'Your name must be 100 characters or fewer.',
            'email.required' => 'Enter your email address.',
            'email.email' => 'Enter a valid email address, like name@example.com.',
            'email.max' => 'Your email address must be 255 characters or fewer.',
            'message.required' => 'Write your message.',
            'message.min' => 'Write at least 10 characters so we can understand your message.',
            'message.max' => 'Your message must be 2,000 characters or fewer.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => is_string($this->name) ? trim($this->name) : $this->name,
            'email' => is_string($this->email) ? trim($this->email) : $this->email,
            'message' => is_string($this->message) ? trim($this->message) : $this->message,
        ]);
    }
}
