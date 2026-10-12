<?php

namespace App\Http\Requests\Candidate;

use App\Enums\ApplicationStatus;
use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A job seeker withdrawing or confirming a hire, or an employer hiring or rejecting. expected_status is the status they saw, so a
 * change made meanwhile is never overwritten.
 */
class ApplicationStatusRequest extends FormRequest
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
            'status' => ['required', 'string', Rule::in($this->user()?->role === Role::Employer ? ['hired', 'rejected'] : ['withdrawn', 'hired'])],
            'expected_status' => ['required', 'string', Rule::enum(ApplicationStatus::class)],
        ];
    }
}
