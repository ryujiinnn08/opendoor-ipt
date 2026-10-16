{{-- The "Contact us" email in OpenDoor's look. The plain-text version (mail/contact) goes along with it. --}}
@php
    $label = 'padding:0 16px 10px 0; width:72px; vertical-align:top; font-weight:700; color:#4e4568;';
    $value = 'padding:0 0 10px; vertical-align:top;';
@endphp
<x-email.frame
    :title="'New message from '.$senderName"
    eyebrow="Contact us form"
    :preheader="\Illuminate\Support\Str::limit($body, 90)"
>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:16px; line-height:1.5;">
    <tr><td style="{{ $label }}">Name</td><td style="{{ $value }}">{{ $senderName }}</td></tr>
    <tr><td style="{{ $label }}">Email</td><td style="{{ $value }}"><a href="mailto:{{ $senderEmail }}" style="color:#47306f; font-weight:700; text-decoration:underline;">{{ $senderEmail }}</a></td></tr>
    <tr><td style="{{ $label }}">Sent</td><td style="{{ $value }}">{{ $sentAt }}</td></tr>
    </table>

    <p style="margin:20px 0 8px; font-family:'Lexend', 'Atkinson Hyperlegible', Verdana, Arial, sans-serif; font-size:18px; font-weight:700;">Their message</p>
    <div style="background-color:#f5f1fc; border-left:4px solid #6a4c9c; border-radius:12px; padding:16px 20px; word-break:break-word;">{!! nl2br(e($body)) !!}</div>

    <x-email.button :href="'mailto:'.$senderEmail.'?subject='.rawurlencode('Re: Your message to OpenDoor')">Reply to {{ $senderName }}</x-email.button>
    <p style="margin:16px 0 0; font-size:15px; line-height:1.5; color:#4e4568;">Or press Reply in your email app: it goes straight to {{ $senderEmail }}.</p>

    <x-slot:footer>Sent by the Contact us form on <a href="{{ rtrim((string) config('opendoor.frontend_url'), '/') }}" style="color:#47306f; text-decoration:underline;">OpenDoor</a>.</x-slot:footer>
</x-email.frame>
