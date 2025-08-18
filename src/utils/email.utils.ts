import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
});

export const sendOtpEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP is ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');
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

  await transporter.sendMail(mailOptions);
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

  await transporter.sendMail(mailOptions);
};

export const sendEmailToVerify = async (transporterOptions: any) => {

  const transporter = nodemailer.createTransport(transporterOptions);
  const mailOptions = {
    from: transporterOptions.auth.user,
    to: process.env.EMAIL_USER,
    subject: "Dummy Email",
    html: `
          <p>This is a dummy email sent from your Node.js application.</p>
          <p>Best regards,</p>
          <p>Your Support Team</p>`,
  };

  await transporter.sendMail(mailOptions);
}
export const sendEmailChat = async(email:string,text:string,subject:string,emailConfig: any,cc?: string | string[],
  bcc?: string | string[]) => {

  console.log("emailConfig",emailConfig);
  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: Number(emailConfig.port),
    secure: emailConfig.secure.toString().toLowerCase() === "true",
    auth: {
      user: emailConfig.user,
      pass: emailConfig.pass,
    },
  });


  const mailOptions = {
    from: emailConfig.user,
    to: email,
    subject: subject,
    cc: cc && cc.length ? cc : undefined,   
    html: text,
  };
  await transporter.sendMail(mailOptions);
}

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

  await sendEmailChat(email, htmlContent, `Chat Transcript - Thread #${threadId}`, emailConfig, cc);
};

