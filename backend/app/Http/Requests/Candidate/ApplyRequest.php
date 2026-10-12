<?php

namespace App\Http\Requests\Candidate;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

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
            'cover_note' => ['nullable', 'string', 'max:3000', $this->readable(...)],
            'interview_request' => ['nullable', 'string', 'max:1000', $this->readable(...)],
        ];
    }

    /**
     * A body that isn't valid JSON would otherwise arrive empty and create an application without
     * the texts the person wrote, which they can never send again (one application per job).
     */
    protected function prepareForValidation(): void
    {
        $content = $this->getContent();
        if ($this->isJson() && trim($content) !== '') {
            json_decode($content);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new HttpResponseException(response()->json(['message' => "We couldn't read your application. Please try again."], 422));
            }
        }
    }

    /**
     * Text that isn't valid UTF-8 (a form body with stray bytes) is refused, not stored garbled.
     */
    private function readable(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && ! mb_check_encoding($value, 'UTF-8')) {
            $fail("The :attribute has characters we can't read. Please type it again.");
        }
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
