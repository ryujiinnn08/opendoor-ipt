<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Password rule (plan PHASE_1 §3.2): 8+ characters with upper and lower case, a number and a symbol.
        Password::defaults(fn () => Password::min(8)->mixedCase()->numbers()->symbols());

        // "Contact us" (it sends real email): short and daily caps per visitor, a cap per email
        // address, and a cap for the whole site. Resend's free plan sends about 100 emails a day, so
        // the site cap keeps a flood of messages from blocking sign-up confirmation emails.
        RateLimiter::for('contact', function (Request $request) {
            $wait = fn (string $text) => fn () => response()->json(['message' => $text], 429);
            $email = Str::lower(trim((string) $request->input('email')));

            return [
                Limit::perMinutes(10, 3)->by('ip-10min:'.$request->ip())
                    ->response($wait('You have sent several messages in a short time. Please wait 10 minutes and try again.')),
                Limit::perDay(10)->by('ip-day:'.$request->ip())
                    ->response($wait('You have reached today\'s limit for the contact form. Please try again tomorrow, or email us directly.')),
                Limit::perDay(3)->by('email-day:'.$email)
                    ->response($wait('We have already received several messages from this email address today. We will reply soon.')),
                Limit::perDay(50)->by('site-day')
                    ->response($wait('The contact form is very busy today. Please try again tomorrow, or email us directly.')),
            ];
        });
    }
}
