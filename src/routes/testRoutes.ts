import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import path from 'path';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Setup the JWT authentication with domain-wide delegation
const createJWTAuth = (keyPath: string, scopes: string[], userEmail: string): JWT => {
  return new JWT({
    keyFile: path.resolve(process.cwd(), keyPath),
    scopes,
    subject: userEmail // The email to impersonate
  });
};

// Create email content in RFC 5322 format
const createEmailContent = (from: string, to: string, subject: string, body: string): string => {
  const emailLines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ];
  
  return emailLines.join('\r\n');
};

// Encode email for Gmail API
const encodeEmail = (email: string): string => {
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Send an email using Gmail API
const sendTestEmail = async (auth: JWT, from: string, to: string, subject: string, body: string) => {
  const gmail = google.gmail({ version: 'v1', auth });
  const email = createEmailContent(from, to, subject, body);
  const encodedEmail = encodeEmail(email);
  
  return gmail.users.messages.send({
    userId: 'me', // 'me' refers to the authenticated user
    requestBody: {
      raw: encodedEmail,
    },
  });
};

// Route for testing the provided code
router.get('/test-gmail', async (req: Request, res: Response) => {
  try {
    // Load the service account key file
    const KEY_PATH = process.env.SERVICE_ACCOUNT_KEY_PATH || './service-account-key.json';
    const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
    const USER_EMAIL = process.env.GMAIL_USER_EMAIL;

    // Check if USER_EMAIL is defined
    if (!USER_EMAIL) {
      return res.status(400).json({
        success: false,
        message: 'GMAIL_USER_EMAIL environment variable is not defined'
      });
    }

    console.log('Using service account with delegation to:', USER_EMAIL);

    // Set up JWT authentication with domain-wide delegation
    const auth = createJWTAuth(KEY_PATH, SCOPES, USER_EMAIL);
    
    // Email details
    const from = USER_EMAIL;
    const to = "nikunj@acedataanalytics.com";
    const subject = "Test Email from Gmail API";
    const body = `This is a test email sent using the Gmail API at ${new Date().toISOString()}.`;

    console.log('Attempting to send test email...');
    
    // Send the email
    const result = await sendTestEmail(auth, from, to, subject, body);

    console.log('Email sent successfully:', result.data);

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error
    });
  }
});

export default router; 