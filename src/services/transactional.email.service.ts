import nodemailer from 'nodemailer';
import { sendZeptoMail } from '../services/zepto.mail.service';
import { SendMailClient } from "zeptomail";


export const sendMailViaZepto = async (mailOptions: any) => {
    try {
        await sendZeptoMail({
            from: {
                address:
                    mailOptions.from ||
                    process.env.ZEPTOMAIL_FROM_EMAIL ||
                    "noreply@jooper.ai",
            },
            to: { address: mailOptions.to },
            subject: mailOptions.subject,
            ...(mailOptions.html && { htmlbody: mailOptions.html }),
            ...(mailOptions.text && { textbody: mailOptions.text }),
        });
    } catch (error) {
        console.error("ZeptoMail Error:", error);
        throw error;
    }
};


export const sendOtpEmail = async (email: string, otp: string) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'OTP Verification',
        text: `Your OTP is ${otp}`,
    };

    try {
        await sendMailViaZepto(mailOptions);
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }
};

export const sendActivationEmail = async (email: string, fullName: string, activationLink: string) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Activate Your Account",
        html: `
            <p>Hello ${fullName},</p>
            <p>Your account has been created. Please activate your account by setting up a password.</p>
            <p><a href="${activationLink}">Click here to activate your account</a></p>
            <p>The link will expire in 1 hour.</p>
        `,
    };

    await sendMailViaZepto(mailOptions);
};

export const sendResetPasswordEmail = async (email: string, fullName: string, resetPasswordLink: string) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset Your Account Password",
        html: `
          <p>Hi ${fullName},</p>
          <p>We received a request to reset your password. Click the link below to set up a new one:</p>
          <p><a href="${resetPasswordLink}">Reset Password</a></p>
          <p>This link is valid for the next 60 minutes.</p>
          <p>If you didn’t request this, you can safely ignore this email.</p>
          <p>Best regards,</p>
          <p>Your Support Team</p>
      `,
    };

    await sendMailViaZepto(mailOptions);
};

export const sendEmailToVerify = async (transporterOptions: any) => {

    const mailOptions = {
        from: transporterOptions.auth.user,
        to: process.env.EMAIL_USER,
        subject: "Dummy Email",
        html: `
          <p>This is a dummy email sent from your Node.js application.</p>
          <p>Best regards,</p>
          <p>Your Support Team</p>`,
    };

    await sendMailViaZepto(mailOptions);
}
// export const sendEmailChat = async (email: string, text: string, subject: string, emailConfig: any, cc?: string | string[],
//   bcc?: string | string[], threadId?: string) => {
//   let user = emailConfig.user ? emailConfig.user : process.env.EMAIL_USER;
//   let pass = emailConfig.pass ? emailConfig.pass : process.env.EMAIL_PASSWORD;

//   const transporter = nodemailer.createTransport({
//     host: emailConfig.host,
//     port: Number(emailConfig.port),
//     secure: emailConfig.secure.toString().toLowerCase() === "true",
//     auth: {
//       user: user,
//       pass: pass,
//     },
//   });

//   const headers: any = {};
//   if (threadId) {
//     headers['X-Thread-ID'] = threadId;
//     headers['Message-ID'] = `thread-${threadId}@${emailConfig.host}`;
//     headers['Reply-To'] = emailConfig.user;
//   }

//   const mailOptions = {
//     from: emailConfig.user,
//     to: email,
//     subject: threadId ? `[ThreadID: ${threadId}] ${subject}` : subject,
//     cc: cc && cc.length ? cc : undefined,
//     bcc: bcc && bcc.length ? bcc : undefined,
//     html: text,
//     headers: headers,
//   };
//   await sendMailViaZepto(mailOptions);
// }
export const sendEmailChat = async (
    email: string,
    text: string,
    subject: string,
    emailConfig: any,
    cc?: string | string[],
    bcc?: string | string[],
    threadId?: string
) => {
    try {
        /**
         * 🟢 CASE 1: SMTP (dynamic)
         */
        if (emailConfig?.type === "SMTP") {
            const transporter = nodemailer.createTransport({
                host: emailConfig.host,
                port: Number(emailConfig.port),
                secure:
                    emailConfig.secure?.toString().toLowerCase() === "true",
                auth: {
                    user: emailConfig.user,
                    pass: emailConfig.pass,
                },
            });

            const headers: any = {};
            if (threadId) {
                headers["X-Thread-ID"] = threadId;
                headers["Message-ID"] = `thread-${threadId}@${emailConfig.host}`;
                headers["Reply-To"] = emailConfig.user;
            }

            await transporter.sendMail({
                from: emailConfig.user,
                to: email,
                subject: threadId
                    ? `[ThreadID: ${threadId}] ${subject}`
                    : subject,
                cc,
                bcc,
                html: text,
                headers,
            });

            console.log("✅ Sent via SMTP:", emailConfig.user);
            return;
        }

        /**
         * 🟣 CASE 2: ZeptoMail (dynamic)
         */
        if (emailConfig?.type === "ZEPTO") {
            if (!emailConfig.token || !emailConfig.fromEmail) {
                throw new Error("ZEPTO config missing token or fromEmail");
            }

            const client = new SendMailClient({
                url:
                    emailConfig.url ||
                    "https://api.zeptomail.in/v1.1/email",
                token: emailConfig.token,
            });

            await client.sendMail({
                from: {
                    address: emailConfig.fromEmail,
                    name: emailConfig.fromName || emailConfig.fromEmail,
                },
                to: [
                    {
                        email_address: {
                            address: email,
                            name: ''
                        },
                    },
                ],
                subject: threadId
                    ? `[ThreadID: ${threadId}] ${subject}`
                    : subject,
                htmlbody: text,
            });

            console.log("✅ Sent via Zepto:", emailConfig.fromEmail);
            return;
        }

        /**
         * 🔴 CASE 3: Fallback (global Zepto)
         */
        const client = new SendMailClient({
            url: process.env.ZEPTOMAIL_API_URL!,
            token: process.env.ZEPTOMAIL_TOKEN!,
        });

        await client.sendMail({
            from: {
                address: process.env.ZEPTOMAIL_FROM_EMAIL!,
                name: ''
            },
            to: [
                {
                    email_address: {
                        address: email,
                        name: ''
                    },
                },
            ],
            subject,
            htmlbody: text,
        });

        console.log("✅ Sent via default Zepto");
    } catch (error) {
        console.error("❌ Email send failed:", error);
        throw error;
    }
};

export const sendChatTranscriptEmail = async ({
    email,
    cc,
    messages,
    threadId,
    emailConfig,
}: {
    email: string;
    cc?: string[] | string;
    messages: { sender: string; content: string; createdAt: Date }[];
    threadId: string;
    emailConfig: any;
}) => {
    const formattedMessages = messages
        .map((msg) => {
            const isUser = msg.sender === "User";
            return `
        <table width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0;">
          <tr>
            <td align="${isUser ? "left" : "right"}">
              <div style="
                display:inline-block;
                max-width:60%;
                background:${isUser ? "#f1f1f1" : "#cce5ff"};
                color:#000;
                padding:12px 16px;
                border-radius:18px;
                border-top-${isUser ? "left" : "right"}-radius:4px;
                box-shadow:0 1px 3px rgba(0,0,0,0.1);
                font-family:Arial, sans-serif;
                text-align:left;
              ">
                <div style="font-size:12px; color:#666; margin-bottom:4px;">
                  ${msg.sender} • ${new Date(msg.createdAt).toLocaleDateString()}
                </div>
                <div style="font-size:14px; line-height:1.4;">
                  ${msg.content}
                </div>
              </div>
            </td>
          </tr>
        </table>
      `;
        })
        .join("");

    const htmlContent = `
    <div style="font-family:Arial,sans-serif;">
      <h2 style="color:#333;">Chat Transcript - Thread #${threadId}</h2>
      ${formattedMessages}
      <p style="margin-top:20px;">Regards,<br/>Your Support Team</p>
    </div>
  `;

    await sendEmailChat(email, htmlContent, `Chat Transcript - Thread #${threadId}`, emailConfig, cc, undefined, threadId);
};

