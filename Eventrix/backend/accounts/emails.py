import logging
import threading
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

def get_welcome_email_html(user, login_url, role='Participant'):
  
    display_name = user.get_full_name() or user.first_name or user.username
    username = user.username
    email = user.email
    support_email = getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com')

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Eventrix</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Clean Eventrix Logo -->
          <tr>
            <td style="padding: 32px 36px 22px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #0d9488 0%, #2563eb 50%, #f97316 100%); text-align: center; line-height: 38px; color: #ffffff; font-weight: 900; font-size: 16px; letter-spacing: -0.5px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                      EX
                    </div>
                  </td>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size: 21px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; line-height: 1;">
                      EVENTRIX
                    </div>
                    <div style="font-size: 9px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px;">
                      Events Management System
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px 28px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; line-height: 1.3;">
                Welcome to Eventrix, {display_name}!
              </h1>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
                Your account has been created successfully. You're all set to discover upcoming events, book verified passes, and explore experiences.
              </p>

              <!-- Clean Account Summary Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 32%; font-weight: 500;">Full Name:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">{display_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">Username:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">@{username}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">Email:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #0f172a; font-weight: 600;">{email}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 500;">Status:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #16a34a; font-weight: 600;">Active & Confirmed &#10003;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Clean Primary CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
                <tr>
                  <td align="center">
                    <a href="{login_url}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 13px 34px; border-radius: 8px; letter-spacing: 0.2px;">
                      Log In to Your Account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct URL -->
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
                Or copy and paste this link into your browser:<br>
                <a href="{login_url}" target="_blank" style="color: #4f46e5; word-break: break-all; text-decoration: underline;">{login_url}</a>
              </p>
            </td>
          </tr>

          <!-- Clean Minimal Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 36px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 4px; font-weight: 500;">
                Eventrix &bull; Events Management System
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                Need help? Contact support at <a href="mailto:{support_email}" style="color: #64748b; text-decoration: underline;">{support_email}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return html_content


def _send_mail_task(subject, text_content, html_content, recipient_email, from_email):
  
    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[recipient_email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"Successfully sent clean confirmation email to {recipient_email}")
    except Exception as e:
        logger.error(f"Failed to send confirmation email to {recipient_email}: {str(e)}", exc_info=True)


def send_welcome_email(user, role='Participant', login_url=None, async_send=True):
  
    if not user.email:
        logger.warning(f"User {user.username} has no email address. Skipping confirmation email.")
        return False

    if not login_url:
        frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        login_url = f"{frontend_base}/#login"

    display_name = user.get_full_name() or user.first_name or user.username
    subject = f"Welcome to Eventrix - Account Confirmed"
    
    html_content = get_welcome_email_html(user, login_url=login_url, role=role)
    
    # Plain text version
    text_content = (
        f"Welcome to Eventrix, {display_name}!\n\n"
        f"Your account has been created successfully.\n\n"
        f"Account Details:\n"
        f"- Full Name: {display_name}\n"
        f"- Username: @{user.username}\n"
        f"- Email: {user.email}\n"
        f"- Status: Active & Confirmed\n\n"
        f"Log in to your account here:\n{login_url}\n\n"
        f"Eventrix • Events Management System\n"
        f"Support: {getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com')}"
    )

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com'))

    if async_send:
        thread = threading.Thread(
            target=_send_mail_task,
            args=(subject, text_content, html_content, user.email, from_email),
            daemon=True
        )
        thread.start()
        return True
    else:
        try:
            _send_mail_task(subject, text_content, html_content, user.email, from_email)
            return True
        except Exception:
            return False


def get_password_reset_otp_html(user, otp):
  
    display_name = user.get_full_name() or user.first_name or user.username
    support_email = getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com')

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Verification Code - Eventrix</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 30px 36px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #0d9488 0%, #2563eb 50%, #f97316 100%); text-align: center; line-height: 38px; color: #ffffff; font-weight: 900; font-size: 16px; letter-spacing: -0.5px;">
                      EX
                    </div>
                  </td>
                  <td style="vertical-align: middle; text-align: left;">
                    <div style="font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px; line-height: 1;">
                      EVENTRIX
                    </div>
                    <div style="font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px;">
                      Events Management System
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px 28px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px; line-height: 1.3;">
                Password Reset Verification Code
              </h1>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
                Hello {display_name},<br>
                We received a request to reset the password for your Eventrix account. Use the 6-digit verification code below to set up a new password:
              </p>

              <!-- OTP Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 26px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 14px 28px; text-align: center;">
                      <span style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">
                        {otp}
                      </span>
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 10px; font-weight: 500;">
                      &#x23F1; Valid for 10 minutes only
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 8px;">
                <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
                  <strong>Note:</strong> Never share this code with anyone. Eventrix staff will never ask for your verification code or password. If you didn't initiate this request, you can safely ignore this email.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 36px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 4px; font-weight: 500;">
                Eventrix &bull; Events Management System
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                Support: <a href="mailto:{support_email}" style="color: #64748b; text-decoration: underline;">{support_email}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return html_content


def send_password_reset_otp_email(user, otp, async_send=True):
  
    if not user.email:
        logger.warning(f"User {user.username} has no email address. Skipping password reset OTP.")
        return False

    display_name = user.get_full_name() or user.first_name or user.username
    subject = f"Your Eventrix Password Reset Code: {otp}"

    html_content = get_password_reset_otp_html(user, otp)

    text_content = (
        f"Hello {display_name},\n\n"
        f"Your Eventrix password reset verification code is: {otp}\n\n"
        f"This code will expire in 10 minutes.\n\n"
        f"If you did not request a password reset, please ignore this email.\n\n"
        f"Eventrix Support: {getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com')}"
    )

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', getattr(settings, 'EMAIL_HOST_USER', 'ravitech090@gmail.com'))

    if async_send:
        thread = threading.Thread(
            target=_send_mail_task,
            args=(subject, text_content, html_content, user.email, from_email),
            daemon=True
        )
        thread.start()
        return True
    else:
        try:
            _send_mail_task(subject, text_content, html_content, user.email, from_email)
            return True
        except Exception:
            return False

