{{--
    The frame every OpenDoor email shares: the logo, a white card with a purple heading band, and a
    footer line. Email apps ignore most CSS, so it is built from tables with inline styles.
    Use <x-email.button> for the main action and pass `footer` for the line under the card.
--}}
@props(['title', 'eyebrow' => null, 'preheader' => '', 'footer' => null])
@php
    $font = "'Atkinson Hyperlegible', Verdana, Arial, sans-serif";
    $display = "'Lexend', 'Atkinson Hyperlegible', Verdana, Arial, sans-serif";
    $site = rtrim((string) config('opendoor.frontend_url'), '/');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{{ $title }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f1fc; color:#241b3a; font-family:{{ $font }};">
@if ($preheader)
<div style="display:none; max-height:0; overflow:hidden;">{{ $preheader }}</div>
@endif
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f1fc;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

    <tr>
    <td style="padding:0 0 20px;">
        <a href="{{ $site }}" style="text-decoration:none;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td style="padding-right:12px; vertical-align:middle;">
                <img src="{{ $site }}/email-logo.png" width="40" height="55" alt="" style="display:block; border:0;">
            </td>
            <td style="vertical-align:middle; font-family:{{ $display }}; font-size:24px; font-weight:700; color:#47306f;">
                OpenDoor
            </td>
        </tr>
        </table>
        </a>
    </td>
    </tr>

    <tr>
    <td style="background-color:#ffffff; border:2px solid #ddd5ee; border-radius:16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
        <td style="background-color:#6a4c9c; border-radius:14px 14px 0 0; padding:24px 28px;">
            @if ($eyebrow)
            <p style="margin:0 0 4px; font-size:14px; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; color:#ebe3f7;">{{ $eyebrow }}</p>
            @endif
            <h1 style="margin:0; font-family:{{ $display }}; font-size:24px; line-height:1.3; font-weight:700; color:#ffffff;">{{ $title }}</h1>
        </td>
        </tr>
        <tr>
        <td style="padding:28px 28px 32px; font-size:17px; line-height:1.6; color:#241b3a;">
            {{ $slot }}
        </td>
        </tr>
        </table>
    </td>
    </tr>

    <tr>
    <td style="padding:20px 8px 0; font-size:14px; line-height:1.5; color:#4e4568; text-align:center;">
        @if ($footer)
        {{ $footer }}
        @else
        Sent by <a href="{{ $site }}" style="color:#47306f; text-decoration:underline;">OpenDoor</a>.
        @endif
    </td>
    </tr>

</table>
</td>
</tr>
</table>
</body>
</html>
