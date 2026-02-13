import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const mailOptions = {
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    logger.error('Email send error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your FinTrack Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; }
          .footer { margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Reset Your Password</h1>
          <p>You requested a password reset for your FinTrack account.</p>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" class="button">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>This email was sent by FinTrack</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to FinTrack!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to FinTrack, ${name}!</h1>
          <p>We're excited to have you on board. FinTrack is your personal finance companion.</p>
          <h2>Get Started</h2>
          <ul>
            <li>📊 Track your income and expenses</li>
            <li>🎯 Set and achieve financial goals</li>
            <li>🤖 Get AI-powered insights</li>
            <li>📈 Visualize your financial health</li>
          </ul>
          <p><a href="${config.frontendUrl}/dashboard" class="button">Go to Dashboard</a></p>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendBillReminderEmail(
  email: string,
  billName: string,
  amount: number,
  dueDate: Date
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Bill Reminder: ${billName} due soon`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .highlight { background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📅 Bill Reminder</h1>
          <div class="highlight">
            <h2>${billName}</h2>
            <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
            <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
          </div>
          <p>Don't forget to pay this bill on time to avoid late fees!</p>
        </div>
      </body>
      </html>
    `,
  });
}
