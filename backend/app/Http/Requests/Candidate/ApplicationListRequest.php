<?php

namespace App\Http\Requests\Candidate;

use App\Enums\ApplicationStatus;
use App\Enums\Role;
use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * My applications (job seekers: all, waiting, hired, closed), or one posting's applicants
 * (employers: `job_posting` and all or a status), with a page.
 */
class ApplicationListRequest extends FormRequest
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
        if ($this->user()?->role === Role::Employer) {
            return [
                'job_posting' => ['required', 'integer', 'min:1', 'max:999999999999999999'],
                'status' => ['nullable', Rule::in(['all', ...array_column(ApplicationStatus::cases(), 'value')])],
                'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
            ];
        }

        return [
            'status' => ['nullable', Rule::in(Application::FILTERS)],
            'page' => ['nullable', 'integer', 'min:1', 'max:100000'],
        ];
    }

    public function filter(): string
    {
        return $this->validated('status') ?? 'all';
    }
}
