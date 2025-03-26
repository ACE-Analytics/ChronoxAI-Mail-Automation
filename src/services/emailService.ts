import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

// OAuth2 credentials should be set in .env
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Interface for the email parameters
interface EmailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
}

// Create OAuth2 client
export const createAuth = (): OAuth2Client => {
  const auth = new OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  // Set the refresh token
  auth.setCredentials({
    refresh_token: REFRESH_TOKEN
  });

  return auth;
};

// Initialize the authentication and Gmail API client
const auth = createAuth();
const gmail = google.gmail({ version: 'v1', auth });

// Generate an authentication URL for getting the initial code
export const getAuthUrl = (): string => {
  const scopes = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    // 'https://www.googleapis.com/auth/gmail.metadata',
    'https://www.googleapis.com/auth/gmail.modify'
    
  ];
  
  return auth.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'  // Force to always prompt for consent, useful for getting a refresh token
  });
};

// Exchange code for tokens (used once to get refresh token)
export const getTokensFromCode = async (code: string) => {
  const { tokens } = await auth.getToken(code);
  console.log('Refresh token:', tokens.refresh_token);
  return tokens;
};

// Function to send an email
export const sendEmail = async (params: EmailParams): Promise<any> => {
  const { from, to, subject, body } = params;

  // Format the email according to RFC 5322
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body
  ].join('\r\n');
  
  // Base64 encode the email
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const res = await gmail.users.messages.send({
      userId: 'me', // 'me' refers to the authenticated user
      requestBody: {
        raw: encodedEmail,
      },
    });
    
    console.log('Email sent successfully:', res.data);
    return { success: true, data: res.data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

// Export functions as a combined object for backward compatibility
export default {
  getAuthUrl,
  getTokensFromCode,
  sendEmail,
  createAuth
}; 