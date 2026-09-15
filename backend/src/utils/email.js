/**
 * Email service — sends verification codes via Resend.
 * Falls back to console logging if RESEND_API_KEY is not set (dev mode).
 */

let resendClient = null;

async function getResend() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const { Resend } = await import('resend');
  resendClient = new Resend(apiKey);
  return resendClient;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'Aethel <onboarding@resend.dev>';

/**
 * Send a 6-digit verification code to the user's email.
 */
export async function sendVerificationEmail(toEmail, code, username) {
  const resend = await getResend();

  const subject = `${code} is your Aethel verification code`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0E1116; color: #fff; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 28px; font-weight: 900; letter-spacing: -0.04em; margin: 0;">
          aethel<span style="color: #E50914;">.</span>
        </h1>
      </div>
      <p style="color: #A0A4AE; font-size: 14px; margin-bottom: 8px;">Hey ${username || 'there'},</p>
      <p style="color: #A0A4AE; font-size: 14px; margin-bottom: 24px;">
        Enter this code to verify your email address:
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #181A20; border: 1px solid #2C313A; border-radius: 12px; padding: 16px 32px;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #E50914;">${code}</span>
        </div>
      </div>
      <p style="color: #5a5f6e; font-size: 12px; text-align: center; margin-bottom: 8px;">
        This code expires in <strong style="color: #A0A4AE;">10 minutes</strong>.
      </p>
      <p style="color: #5a5f6e; font-size: 12px; text-align: center;">
        If you didn't create an account on Aethel, you can safely ignore this email.
      </p>
      <div style="text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #22252D;">
        <p style="color: #3a3f4a; font-size: 11px;">© ${new Date().getFullYear()} aethel. Your cinematic universe.</p>
      </div>
    </div>
  `;

  if (resend) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [toEmail],
        subject,
        html,
      });
      console.log(`📧 Verification email sent to ${toEmail}`);
    } catch (err) {
      console.error(`📧 Failed to send email to ${toEmail}:`, err.message);
      // Fall back to console
      console.log(`\n📧 ═══════════════════════════════════════`);
      console.log(`   VERIFICATION CODE for ${toEmail}: ${code}`);
      console.log(`📧 ═══════════════════════════════════════\n`);
    }
  } else {
    // Dev mode — log to console
    console.log(`\n📧 ═══════════════════════════════════════`);
    console.log(`   VERIFICATION CODE for ${toEmail}: ${code}`);
    console.log(`📧 ═══════════════════════════════════════\n`);
  }
}

/**
 * Generate a random 6-digit numeric code.
 */
export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generate recovery codes for 2FA backup.
 */
export function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
