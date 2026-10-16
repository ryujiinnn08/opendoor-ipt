<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\ContactRequest;
use App\Mail\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * The "Contact us" form: emails the message to the team inbox. Open to guests, so the route is
 * rate-limited and the form has a hidden trap field for bots.
 */
class ContactController extends Controller
{
    public function store(ContactRequest $request): JsonResponse
    {
        $thanks = ['message' => 'Thank you. Your message was sent. We will reply by email.'];

        // A bot filled the hidden field: answer as if it worked, send nothing.
        if ($request->filled('website')) {
            return response()->json($thanks, 202);
        }

        $to = config('mail.contact_to');
        if (! $to) {
            abort(503, 'The contact form is not available right now. Please try again later.');
        }

        try {
            Mail::to($to)->send(new ContactMessage(
                $request->string('name')->toString(),
                $request->string('email')->toString(),
                $request->string('message')->toString(),
            ));
        } catch (Throwable $e) {
            report($e);
            abort(503, 'We could not send your message. Please try again in a few minutes.');
        }

        return response()->json($thanks, 202);
    }
}
