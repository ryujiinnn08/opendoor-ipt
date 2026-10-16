{{-- The main action in an OpenDoor email: a rounded purple button (a link styled as one). --}}
@props(['href'])
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
<tr>
<td style="background-color:#6a4c9c; border-radius:999px;">
    <a href="{{ $href }}" style="display:inline-block; padding:14px 28px; font-family:'Lexend', 'Atkinson Hyperlegible', Verdana, Arial, sans-serif; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:999px;">{{ $slot }}</a>
</td>
</tr>
</table>
