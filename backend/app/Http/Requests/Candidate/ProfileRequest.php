<?php

namespace App\Http\Requests\Candidate;

use App\Enums\DisabilityType;
use App\Enums\EducationLevel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The job seeker's whole profile, saved at once (plan PHASE_3 §4.1). Every field is optional
 * in Phase 3; an entry that is sent needs its main fields. Empty strings arrive as null.
 */
class ProfileRequest extends FormRequest
{
    public const MAX_ENTRIES = 10;

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
            'name' => ['required', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:150'],
            'city' => ['nullable', 'string', 'max:100'],
            'province' => ['nullable', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\-\s]{7,30}$/'],
            'about' => ['nullable', 'string', 'max:2000'],
            'skills' => ['nullable', 'string', 'max:1000'],
            'trainings' => ['nullable', 'string', 'max:2000'],
            'languages' => ['nullable', 'string', 'max:255'],
            'disability_type' => ['nullable', Rule::enum(DisabilityType::class)],
            'show_disability' => ['sometimes', 'boolean'],

            'experiences' => ['sometimes', 'array', 'max:'.self::MAX_ENTRIES],
            'experiences.*.job_title' => ['required', 'string', 'max:150'],
            'experiences.*.company' => ['required', 'string', 'max:150'],
            'experiences.*.started_on' => ['required', 'date_format:Y-m'],
            'experiences.*.ended_on' => ['nullable', 'date_format:Y-m'],
            'experiences.*.is_current' => ['sometimes', 'boolean'],
            'experiences.*.description' => ['nullable', 'string', 'max:2000'],

            'educations' => ['sometimes', 'array', 'max:'.self::MAX_ENTRIES],
            'educations.*.level' => ['required', Rule::enum(EducationLevel::class)],
            'educations.*.school' => ['required', 'string', 'max:200'],
            'educations.*.course' => ['nullable', 'string', 'max:150'],
            'educations.*.year_finished' => ['nullable', 'integer', 'between:1950,'.$this->now()->year],
            'educations.*.is_studying' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Month checks the rules can't express: no start in the future, and an end (not before the
     * start) unless it's the current job. 'YYYY-MM' compares correctly as text.
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $thisMonth = $this->now()->format('Y-m');

                foreach ((array) $this->input('experiences', []) as $index => $entry) {
                    if (! is_array($entry) || $validator->errors()->has("experiences.{$index}.started_on")) {
                        continue;
                    }
                    $start = $entry['started_on'] ?? null;
                    $end = $entry['ended_on'] ?? null;

                    if ($start > $thisMonth) {
                        $validator->errors()->add("experiences.{$index}.started_on", "The start can't be in the future.");
                    }
                    if (filter_var($entry['is_current'] ?? false, FILTER_VALIDATE_BOOLEAN) || $validator->errors()->has("experiences.{$index}.ended_on")) {
                        continue;
                    }
                    if ($end === null) {
                        $validator->errors()->add("experiences.{$index}.ended_on", 'Enter when you left, such as 2024-12, or tick "I work here now".');
                    } elseif ($end < $start) {
                        $validator->errors()->add("experiences.{$index}.ended_on", "The end can't be before the start.");
                    }
                }
            },
        ];
    }

    /**
     * Now in Philippine time: "this month" and "this year" are counted there, not in UTC.
     */
    private function now(): Carbon
    {
        return now(config('opendoor.postings.timezone'));
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Enter your full name.',
            'contact_number.regex' => 'Enter a phone number, such as 0917 123 4567.',
            'experiences.max' => 'You can add up to 10 work experiences.',
            'educations.max' => 'You can add up to 10 education entries.',
            'experiences.*.job_title.required' => 'Enter the job title.',
            'experiences.*.company.required' => 'Enter the company or employer.',
            'experiences.*.started_on.required' => 'Enter when you started, such as 2023-06.',
            'experiences.*.started_on.date_format' => 'Enter when you started, such as 2023-06.',
            'experiences.*.ended_on.date_format' => 'Enter when you left, such as 2024-12.',
            'educations.*.level.required' => 'Choose a level.',
            'educations.*.level.enum' => 'Choose a level.',
            'educations.*.school.required' => 'Enter the school.',
            'educations.*.year_finished.between' => 'Enter a year from 1950 to this year.',
            'educations.*.year_finished.integer' => 'Enter a year from 1950 to this year.',
        ];
    }
}
