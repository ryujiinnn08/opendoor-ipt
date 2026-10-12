<?php

namespace App\Http\Requests\Candidate;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Applying for a job (F6.1, F6.2): both texts are optional plain text.
 */
class ApplyRequest extends FormRequest
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
            'cover_note' => ['nullable', 'string', 'max:3000'],
            'interview_request' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'cover_note' => 'cover note',
            'interview_request' => 'interview accommodation request',
        ];
    }
}
