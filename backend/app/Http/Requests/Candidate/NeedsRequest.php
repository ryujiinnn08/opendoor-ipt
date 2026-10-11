<?php

namespace App\Http\Requests\Candidate;

use App\Models\Accommodation;
use App\Rules\WholeId;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * The whole list of a job seeker's needs. A retired type may stay if it's already on the
 * list, but can't be added (the same rule as the posting form, plan PHASE_3 §8).
 */
class NeedsRequest extends FormRequest
{
    public const MAX_NEEDS = 50;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = ['accommodations' => ['present', 'array', 'max:'.self::MAX_NEEDS]];

        // Each item costs a query, so an oversized list is refused without checking its items.
        if (! $this->tooMany()) {
            $rules['accommodations.*'] = ['bail', new WholeId, 'distinct', 'exists:accommodations,id'];
        }

        return $rules;
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $ids = $this->input('accommodations');
                if (! is_array($ids) || $this->tooMany()) {
                    return;
                }

                $retired = Accommodation::whereIn('id', array_filter($ids, 'is_numeric'))->where('is_active', false)->get()->keyBy('id');
                $saved = $this->user()->needs()->pluck('accommodations.id')->all();

                foreach ($ids as $index => $id) {
                    $accommodation = is_numeric($id) ? $retired->get((int) $id) : null;

                    if ($accommodation && ! in_array($accommodation->id, $saved, true)) {
                        $validator->errors()->add(
                            "accommodations.{$index}",
                            "\"{$accommodation->name}\" is no longer offered. Untick it to continue.",
                        );
                    }
                }
            },
        ];
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        return array_map('intval', $this->validated('accommodations'));
    }

    private function tooMany(): bool
    {
        $ids = $this->input('accommodations');

        return is_array($ids) && count($ids) > self::MAX_NEEDS;
    }
}
