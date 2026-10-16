<?php

namespace App\Http\Requests\Public;

use App\Enums\EmploymentType;
use App\Enums\WorkSetup;
use App\Models\JobPosting;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Query parameters of the public job list. Anything a person could hand-edit into the
 * address is checked here, so the list never runs with values it doesn't understand.
 */
class JobSearchRequest extends FormRequest
{
    public const PER_PAGE = 12;

    /** Far beyond any real list; keeps the offset inside a 64-bit number. */
    public const MAX_PAGE = 10000;

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
            'q' => [
                'nullable', 'string', 'max:100',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (! is_string($value)) {
                        return;
                    }
                    if (! mb_check_encoding($value, 'UTF-8')) {
                        $fail('Search with letters, numbers and spaces.');

                        return;
                    }
                    if (count(preg_split('/\s+/u', trim($value), -1, PREG_SPLIT_NO_EMPTY)) > JobPosting::SEARCH_MAX_WORDS) {
                        $fail('Search with '.JobPosting::SEARCH_MAX_WORDS.' words or fewer.');
                    }
                },
            ],
            'category' => ['nullable', 'integer', 'exists:categories,id'],
            'accommodations' => ['nullable', 'array', 'max:50'],
            'accommodations.*' => ['integer', 'distinct', 'exists:accommodations,id'],
            // LinkedIn-style filters (UI_FEEDBACK_PLAN §3.3): any of the ticked values.
            'work_setup' => ['nullable', 'array', 'max:'.count(WorkSetup::cases())],
            'work_setup.*' => ['string', 'distinct', Rule::enum(WorkSetup::class)],
            'employment_type' => ['nullable', 'array', 'max:'.count(EmploymentType::cases())],
            'employment_type.*' => ['string', 'distinct', Rule::enum(EmploymentType::class)],
            'employer' => ['nullable', 'integer'],
            'sort' => ['nullable', 'in:newest,closing,match'],
            'match' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PAGE],
            'per_page' => ['nullable', 'integer', 'between:1,'.self::PER_PAGE],
        ];
    }

    /**
     * @return array{q: ?string, category: ?int, accommodations: list<int>, work_setup: list<string>, employment_type: list<string>, employer: ?int, sort: string, per_page: int, match: bool}
     */
    public function filters(): array
    {
        $q = trim((string) $this->validated('q'));

        return [
            'q' => $q === '' ? null : $q,
            'category' => $this->filled('category') ? (int) $this->validated('category') : null,
            'accommodations' => array_values(array_map('intval', $this->validated('accommodations') ?? [])),
            'work_setup' => array_values($this->validated('work_setup') ?? []),
            'employment_type' => array_values($this->validated('employment_type') ?? []),
            'employer' => $this->filled('employer') ? (int) $this->validated('employer') : null,
            'sort' => $this->validated('sort') ?? 'newest',
            'per_page' => (int) ($this->validated('per_page') ?? self::PER_PAGE),
            'match' => $this->boolean('match'),
        ];
    }
}
