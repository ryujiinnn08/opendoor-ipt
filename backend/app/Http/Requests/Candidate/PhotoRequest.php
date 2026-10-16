<?php

namespace App\Http\Requests\Candidate;

use Illuminate\Foundation\Http\FormRequest;

/** A profile photo: a JPEG or PNG up to 2 MB, at least 200 × 200 (UI_FEEDBACK_WAVE_B_PLAN B1). */
class PhotoRequest extends FormRequest
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
            'photo' => ['required', 'file', 'image', 'mimes:jpeg,png', 'mimetypes:image/jpeg,image/png', 'max:2048', 'dimensions:min_width=200,min_height=200'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'photo.required' => 'Choose a photo.',
            'photo.image' => 'Choose a JPEG or PNG photo.',
            'photo.mimes' => 'Choose a JPEG or PNG photo.',
            'photo.mimetypes' => 'Choose a JPEG or PNG photo.',
            'photo.max' => 'Choose a photo of 2 MB or less.',
            'photo.dimensions' => 'Choose a photo at least 200 by 200 pixels.',
        ];
    }
}
