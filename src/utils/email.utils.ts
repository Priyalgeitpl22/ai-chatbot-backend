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
export const sendEmailChat = async(email:string,text:string,subject:string,emailConfig: any) => {

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
    html: text,
  };
  await transporter.sendMail(mailOptions);
}

export const sendChatTranscriptEmail = async ({
  email,
  messages,
  threadId,
  emailConfig,
}: {
  email: string;
  messages: { sender: string; content: string; createdAt: Date }[];
  threadId: string;
  emailConfig: any;
}) => {
  const formattedMessages = messages
    .map((msg, index) => {
      return `
        <div style="border:1px solid #ddd; border-radius:8px; padding:16px; margin-bottom:16px;">
          <h3 style="margin-top:0;">${msg.sender === 'User' ? `Question #${index + 1}` : 'Answer'}</h3>
          <p style="margin: 8px 0; font-weight: ${msg.sender === 'User' ? 'bold' : 'normal'};">
            ${msg.content}
          </p>
          <small style="color:#888;">${new Date(msg.createdAt).toLocaleString()}</small>
        </div>
      `;
    })
    .join("");

  const htmlContent = `
    <div style="font-family:Arial,sans-serif;">
      <h2 style="color:#333;">Chat Transcript - Thread #${threadId}</h2>
      ${formattedMessages}
      <p>Regards,<br/>Your Support Team</p>
    </div>
  `;

  await sendEmailChat(email, htmlContent, `Chat Transcript - Thread #${threadId}`, emailConfig);
};
