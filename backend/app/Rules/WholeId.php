<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A record id sent as a whole number (1) or digits ("1"). Laravel's `integer` rule also lets
 * `true` and `1.0` through, which code later reads as id 1 (security review, Phase 3B).
 */
class WholeId implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_int($value) && ! (is_string($value) && ctype_digit($value))) {
            $fail('Choose from the list.');
        }
    }
}
