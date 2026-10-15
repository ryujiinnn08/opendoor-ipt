<?php

namespace App\Http\Requests\Candidate;

use App\Enums\FeedbackRating;
use App\Models\Accommodation;
use App\Models\Application;
use Closure;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Sending feedback (F7.1, F7.2): `ratings` maps each accommodation of the hire copy to an answer;
 * the comment is optional plain text.
 */
class FeedbackRequest extends FormRequest
{
    public function authorize(): Response
    {
        return Gate::inspect('giveFeedback', $this->application());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ratings' => ['present', 'array'],
            'ratings.*' => ['nullable', Rule::enum(FeedbackRating::class)],
            'comment' => ['nullable', 'string', 'max:1000', $this->readable(...)],
        ];
    }

    /**
     * Exactly the hire copy's accommodations, each answered, at least one actually used. Checked
     * only while the form is open; otherwise FeedbackService gives the reason.
     *
     * @return list<Closure>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            $application = $this->application();
            if ($validator->errors()->has('ratings') || $application->feedbackState() !== 'open') {
                return;
            }

            $ratings = (array) $this->input('ratings', []);
            $copy = Accommodation::inDisplayOrder($application->hiredAccommodations);
            if (array_diff(array_map('strval', array_keys($ratings)), $copy->pluck('id')->map(fn ($id) => (string) $id)->all()) !== []) {
                $validator->errors()->add('ratings', 'You can only rate the accommodations listed when you were hired.');

                return;
            }

            $missing = false;
            foreach ($copy as $item) {
                if (($ratings[$item->id] ?? null) === null && ! $validator->errors()->has("ratings.{$item->id}")) {
                    $validator->errors()->add("ratings.{$item->id}", "Choose an answer for {$item->name}.");
                    $missing = true;
                }
            }
            if (! $missing && ! $validator->errors()->any() && collect($ratings)->every(fn ($rating) => $rating === FeedbackRating::NotUsed->value)) {
                $validator->errors()->add('ratings', 'Rate at least one accommodation you used.');
            }
        }];
    }

    /**
     * @return array<int, FeedbackRating>
     */
    public function ratings(): array
    {
        return collect($this->validated('ratings'))->map(fn (string $rating) => FeedbackRating::from($rating))->all();
    }

    /**
     * A body that isn't valid JSON would otherwise arrive empty.
     */
    protected function prepareForValidation(): void
    {
        $content = $this->getContent();
        if ($this->isJson() && trim($content) !== '') {
            json_decode($content);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new HttpResponseException(response()->json(['message' => "We couldn't read your ratings. Please try again."], 422));
            }
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ratings.*.enum' => 'Choose one of the answers given.',
        ];
    }

    private function application(): Application
    {
        return $this->route('application');
    }

    private function readable(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && ! mb_check_encoding($value, 'UTF-8')) {
            $fail("The comment has characters we can't read. Please type it again.");
        }
    }
}
