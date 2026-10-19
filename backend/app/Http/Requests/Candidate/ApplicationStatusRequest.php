<?php

namespace App\Http\Requests\Candidate;

use App\Enums\ApplicationStatus;
use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * An employer hiring or rejecting. expected_status prevents overwriting a newer decision.
 */
class ApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === Role::Employer;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(['hired', 'rejected'])],
            'expected_status' => ['required', 'string', Rule::enum(ApplicationStatus::class)],
        ];
    }
}
