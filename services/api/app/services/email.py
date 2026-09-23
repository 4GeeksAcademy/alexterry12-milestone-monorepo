"""Transactional email helpers for the TrackFlow company API."""

from __future__ import annotations

import os
from pathlib import Path

import resend
from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

_FROM_ADDRESS = "onboarding@resend.dev"


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send a short HTML password-reset email with a clickable link."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is not set.")

    resend.api_key = api_key

    html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:8px;padding:32px 24px;">
          <tr>
            <td style="color:#18181b;font-size:20px;font-weight:700;padding-bottom:12px;">
              Reset your TrackFlow password
            </td>
          </tr>
          <tr>
            <td style="color:#52525b;font-size:15px;line-height:1.5;padding-bottom:24px;">
              We received a request to reset your password. This link expires in 30 minutes.
              If you did not ask for this, you can ignore this email.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="{reset_url}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 28px;border-radius:6px;">
                Reset password
              </a>
            </td>
          </tr>
          <tr>
            <td style="color:#71717a;font-size:13px;line-height:1.5;word-break:break-all;">
              Or open this link:<br />
              <a href="{reset_url}" style="color:#2563eb;">{reset_url}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    resend.Emails.send(
        {
            "from": _FROM_ADDRESS,
            "to": [to_email],
            "subject": "Reset your TrackFlow password",
            "html": html,
        }
    )
