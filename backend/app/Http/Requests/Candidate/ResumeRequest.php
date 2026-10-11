<?php

namespace App\Http\Requests\Candidate;

use Illuminate\Foundation\Http\FormRequest;

class ResumeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * PDF only: the file name's extension (extensions) and the contents (mimes, mimetypes)
     * are both checked (plan PHASE_3 §8).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'resume' => ['required', 'file', 'extensions:pdf', 'mimes:pdf', 'mimetypes:application/pdf', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'resume.required' => 'Choose a PDF file.',
            'resume.file' => 'Choose a PDF file.',
            'resume.extensions' => 'The résumé must be a PDF file.',
            'resume.mimes' => 'The résumé must be a PDF file.',
            'resume.mimetypes' => 'The résumé must be a PDF file.',
            'resume.max' => 'The résumé must be smaller than 5 MB.',
            'resume.uploaded' => 'The résumé must be smaller than 5 MB.',
        ];
    }
}
