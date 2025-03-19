import nodemailer from 'nodemailer';

// Configure email transporter (adjust for your email provider)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendOTPEmail(email: string, otp: string, name?: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your DrUPay Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Verification Code</h2>
          <p>Hello ${name || 'there'},</p>
          <p>Your verification code for DrUPay is:</p>
          <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this code, please ignore this email or contact support.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}