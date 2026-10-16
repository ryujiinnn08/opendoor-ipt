{{--
    The "Contact us" email in OpenDoor's look (the site's purple and lilac, rounded cards).
    Email apps ignore most CSS, so it is built from tables with inline styles and system fonts.
    The plain-text version (mail/contact) goes along with it.
--}}
@php
    $font = "'Atkinson Hyperlegible', Verdana, Arial, sans-serif";
    $display = "'Lexend', 'Atkinson Hyperlegible', Verdana, Arial, sans-serif";
    $replyHref = 'mailto:'.$senderEmail.'?subject='.rawurlencode('Re: Your message to OpenDoor');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>New message from {{ $senderName }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f1fc; color:#241b3a; font-family:{{ $font }};">
<div style="display:none; max-height:0; overflow:hidden;">{{ \Illuminate\Support\Str::limit($body, 90) }}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1fc;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

    {{-- Logo and name --}}
    <tr>
    <td style="padding:0 0 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td style="padding-right:12px; vertical-align:middle;">
                <img src="{{ $logoUrl }}" width="40" height="55" alt="" style="display:block; border:0;">
            </td>
            <td style="vertical-align:middle; font-family:{{ $display }}; font-size:24px; font-weight:700; color:#47306f;">
                OpenDoor
            </td>
        </tr>
        </table>
    </td>
    </tr>

    {{-- The card --}}
    <tr>
    <td style="background-color:#ffffff; border:2px solid #ddd5ee; border-radius:16px; overflow:hidden;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

        <tr>
        <td style="background-color:#6a4c9c; border-radius:14px 14px 0 0; padding:24px 28px;">
            <p style="margin:0 0 4px; font-size:14px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#ebe3f7;">Contact us form</p>
            <h1 style="margin:0; font-family:{{ $display }}; font-size:24px; line-height:1.3; font-weight:700; color:#ffffff;">New message from {{ $senderName }}</h1>
        </td>
        </tr>

        <tr>
        <td style="padding:28px 28px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:16px; line-height:1.5;">
            <tr>
                <td style="padding:0 16px 10px 0; width:72px; vertical-align:top; font-weight:700; color:#4e4568;">Name</td>
                <td style="padding:0 0 10px; vertical-align:top;">{{ $senderName }}</td>
            </tr>
            <tr>
                <td style="padding:0 16px 10px 0; vertical-align:top; font-weight:700; color:#4e4568;">Email</td>
                <td style="padding:0 0 10px; vertical-align:top;"><a href="mailto:{{ $senderEmail }}" style="color:#47306f; font-weight:700; text-decoration:underline;">{{ $senderEmail }}</a></td>
            </tr>
            <tr>
                <td style="padding:0 16px 0 0; vertical-align:top; font-weight:700; color:#4e4568;">Sent</td>
                <td style="padding:0; vertical-align:top;">{{ $sentAt }}</td>
            </tr>
            </table>
        </td>
        </tr>

        <tr>
        <td style="padding:20px 28px 0;">
            <p style="margin:0 0 8px; font-family:{{ $display }}; font-size:18px; font-weight:700; color:#241b3a;">Their message</p>
            <div style="background-color:#f5f1fc; border-left:4px solid #6a4c9c; border-radius:12px; padding:16px 20px; font-size:17px; line-height:1.6; color:#241b3a; word-break:break-word;">{!! nl2br(e($body)) !!}</div>
        </td>
        </tr>

        <tr>
        <td style="padding:28px 28px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
            <td style="background-color:#6a4c9c; border-radius:999px;">
                <a href="{{ $replyHref }}" style="display:inline-block; padding:14px 28px; font-family:{{ $display }}; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:999px;">Reply to {{ $senderName }}</a>
            </td>
            </tr>
            </table>
            <p style="margin:16px 0 0; font-size:15px; line-height:1.5; color:#4e4568;">Or press Reply in your email app: it goes straight to {{ $senderEmail }}.</p>
        </td>
        </tr>

        </table>
    </td>
    </tr>

    <tr>
    <td style="padding:20px 8px 0; font-size:14px; line-height:1.5; color:#4e4568; text-align:center;">
        Sent by the Contact us form on <a href="{{ $siteUrl }}" style="color:#47306f; text-decoration:underline;">OpenDoor</a>.
    </td>
    </tr>

</table>
</td>
</tr>
</table>
</body>
</html>
