<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * A message from the "Contact us" form, sent to the OpenDoor team inbox (CONTACT_TO_EMAIL).
 *
 * It is sent from OpenDoor's own verified address. The visitor's address is only the reply-to,
 * so pressing Reply in the inbox answers them.
 */
class ContactMessage extends Mailable
{
    public readonly string $senderName;

    public function __construct(string $senderName, public readonly string $senderEmail, public readonly string $body)
    {
        // A name is never allowed to carry line breaks into the subject line.
        $this->senderName = trim((string) preg_replace('/\s+/', ' ', $senderName));
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [new Address($this->senderEmail, $this->senderName)],
            subject: "OpenDoor contact form: {$this->senderName}",
        );
    }

    public function content(): Content
    {
        return new Content(text: 'mail.contact');
    }
}
