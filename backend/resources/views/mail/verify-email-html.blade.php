{{-- The "confirm your email" message in OpenDoor's look. The plain-text version (mail/verify-email) goes along with it. --}}
<x-email.frame
    title="Confirm your email"
    eyebrow="Welcome to OpenDoor"
    preheader="Confirm your email address to finish setting up your OpenDoor account."
>
    <p style="margin:0 0 16px;">Hello,</p>
    <p style="margin:0;">Thank you for creating an OpenDoor account. Please confirm that this is your email address.</p>

    <x-email.button :href="$actionUrl">{{ $actionText }}</x-email.button>

    <div style="margin:28px 0 0; background-color:#f5f1fc; border-radius:12px; padding:16px 20px; font-size:16px; line-height:1.5;">
        <p style="margin:0 0 8px;"><strong>The link works for {{ $hours }} hours.</strong> After that, log in to OpenDoor and ask for a new link.</p>
        <p style="margin:0;">If you did not create an OpenDoor account, you can ignore this email.</p>
    </div>

    <p style="margin:24px 0 0;">The OpenDoor team</p>

    <p style="margin:24px 0 0; padding-top:20px; border-top:2px solid #ebe3f7; font-size:14px; line-height:1.5; color:#4e4568;">
        If the button does not work, copy this link into your browser:<br>
        <a href="{{ $actionUrl }}" style="color:#47306f; text-decoration:underline; word-break:break-all;">{{ $actionUrl }}</a>
    </p>
</x-email.frame>
