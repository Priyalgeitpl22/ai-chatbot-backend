import { sendMailViaZepto } from "./transactional.email.service";




export async function subscriptionActivationEmail(
  planCode: string,
  billingPeriod: string,
  organizationName: string = "",
  contactEmail: string = "",
  totalCost: number
) {
  const adminEmail =
    process.env.ADMIN_EMAIL || "muskan.t@goldeneagle.ai";

  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL!;
  console.log(fromEmail,"fromEmail")

  if (!fromEmail) {
    throw new Error("ZEPTOMAIL_FROM_EMAIL is required");
}
  const mailOptions = {
    from: fromEmail,
    to: adminEmail,
    subject: "Subscription Activation Request",
    html: `
      <p>Hello Admin,</p>
      <p>We have received a request to activate a subscription for ${organizationName} organization.</p>
      <p>Plan Code: ${planCode}</p>
      <p>Billing Period: ${billingPeriod}</p>
      <p>Total billing amount: ${totalCost}$</p>
      <p>Contact Email: ${contactEmail}</p>
      <p>Best regards,</p>
      <p>Your Support Team</p>
    `,
  }
  await sendMailViaZepto(mailOptions);
}

export async function subscriptionExpiryReminderEmail(
  toEmail: string,
  orgName: string,
  planName: string,
  expiryDate: Date,
  daysRemaining: number,
  renewalLink: string
): Promise<void> {
  const emailUser = process.env.EMAIL_USER;
  if (!emailUser) {
    throw new Error("EMAIL_USER environment variable is required");
  }
  const formattedExpiry = expiryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const urgencyColor =
    daysRemaining <= 1 ? "#e53e3e" : daysRemaining <= 5 ? "#dd6b20" : "#3182ce";
  const urgencyLabel =
    daysRemaining === 1
      ? "⚠️ Your subscription expires tomorrow"
      : `⚠️ Your subscription expires in ${daysRemaining} days`;
  const subject = `${urgencyLabel} — ${planName} Plan`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8" /></head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background-color: ${urgencyColor}; padding: 24px 32px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${urgencyLabel}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px;">
                    <p style="font-size: 16px; color: #333333; margin-top: 0;">Hi <strong>${orgName}</strong>,</p>
                    <p style="font-size: 16px; color: #333333;">
                      Your <strong>${planName}</strong> subscription is set to expire on
                      <strong style="color: ${urgencyColor};">${formattedExpiry}</strong>.
                    </p>
                    <p style="font-size: 16px; color: #555555;">
                      To avoid any interruption to your service, please renew before the expiry date.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td style="background-color: ${urgencyColor}; border-radius: 6px; padding: 14px 28px;">
                          <a href="${renewalLink}" style="color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none;">
                            Renew Subscription →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 14px; color: #888888;">
                      If you have already renewed or have any questions, please contact our support team.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8f8f8; padding: 20px 32px; border-top: 1px solid #eeeeee;">
                    <p style="font-size: 12px; color: #aaaaaa; margin: 0; text-align: center;">
                      You're receiving this because you're an admin of <strong>${orgName}</strong>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    await sendMailViaZepto({
      from: emailUser,
      to: toEmail,
      subject,
      html,
    });
    console.log(`[subscriptionExpiryReminderEmail] ✅ Sent to ${toEmail} — "${subject}"`);
  } catch (error) {
    console.error(`[subscriptionExpiryReminderEmail] ❌ Failed to send to ${toEmail}:`, error);
    throw error;
  }
}
