<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

class UniqueCompany implements ValidationRule
{
    public const MESSAGE = 'A company with this name and location is already registered.';

    public function __construct(private mixed $address, private ?int $except = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! is_string($this->address)) {
            return;
        }
        if (DB::table('employers')->whereRaw('company_name_key = LOWER(TRIM(?))', [$value])
            ->whereRaw('company_address_key = LOWER(TRIM(?))', [$this->address])
            ->when($this->except !== null, fn ($query) => $query->where('id', '<>', $this->except))->exists()) {
            $fail(self::MESSAGE);
        }
    }
}
