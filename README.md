# ChronoxAI Mail Automation

A Node.js application for sending emails using Gmail API with OAuth2 authentication and receiving real-time notifications for new emails using Google Pub/Sub. The codebase follows a functional programming approach for better maintainability and testability.

## Setup Instructions

### 1. Create OAuth2 Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Navigate to **APIs & Services > Credentials**
4. Click on **Create Credentials** and select **OAuth client ID**
5. Select **Web application** as the application type
6. Add a name for your application
7. Add the following redirect URI: `http://localhost:3000/auth/google/callback`
8. Click **Create**
9. Copy the **Client ID** and **Client Secret** that are generated

### 2. Enable Gmail API and Pub/Sub API

1. In the Google Cloud Console, navigate to **APIs & Services > Library**
2. Search for "Gmail API" and select it
3. Click **Enable**
4. Go back to the Library and search for "Cloud Pub/Sub API"
5. Click **Enable**

### 3. Configure Environment Variables

Update the `.env` file with your OAuth2 credentials:

```
PORT=3000
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
# The GOOGLE_REFRESH_TOKEN will be obtained in the next steps
GMAIL_USER_EMAIL=your-gmail-here@gmail.com
```

### 4. Install Dependencies and Run the Application

```bash
npm install
npm run dev
```

### 5. Obtain Refresh Token

1. Navigate to `http://localhost:3000/auth/google` in your browser
2. You will be redirected to Google's authentication page
3. Sign in with the Google account you want to use for sending emails
4. Grant the necessary permissions
5. After authorization, you will be redirected back to your application
6. The page will display your refresh token. Copy this token.
7. Add the refresh token to your `.env` file:

```
GOOGLE_REFRESH_TOKEN=your-refresh-token-here
```

8. Restart the application

### 6. Set Up Gmail Push Notifications with Pub/Sub

To receive real-time notifications when new emails arrive:

1. Create a Pub/Sub Topic in Google Cloud Console:
   - Navigate to **Pub/Sub > Topics**
   - Click **Create Topic**
   - Name it (e.g., `gmail-notifications`) 
   - Click **Create**

2. Create a Subscription for your Topic:
   - Under your new topic, click **Create Subscription**
   - Give it a name (e.g., `gmail-notifications-sub`)
   - Choose **Push** as the delivery type
   - Set the Endpoint URL to `https://your-server-domain.com/api/notifications/pubsub`
   - Click **Create**

3. Set up Gmail API to use your Pub/Sub Topic using the built-in endpoint:
   - Make a POST request to `/api/setup/watch-mailbox` with the following body:
     ```json
     {
       "topicName": "projects/your-project-id/topics/gmail-notifications",
       "labelIds": ["INBOX"]
     }
     ```
   - This registration lasts for 7 days and then needs to be renewed
   - You can stop watching at any time by making a POST request to `/api/setup/stop-watch`

4. Make your endpoint publicly accessible:
   - For development, use a tool like [ngrok](https://ngrok.com/) to expose your local server:
     ```
     ngrok http 3000
     ```
   - Use the generated HTTPS URL with your Pub/Sub subscription
   - For production, deploy your application to a server with a public HTTPS endpoint

### 7. Test Email Notifications

Once you've set up Pub/Sub:

1. Send yourself an email to trigger a notification
2. The notification will be pushed to your endpoint
3. Check the `data/notifications.json` file to see the recorded notifications
4. Received emails will be saved as .eml files in the `data/emails` directory

## API Endpoints

### Email Routes

- `GET /api/email/test` - Test the email service
- `POST /api/email/send` - Send an email
  - Request body: `{ "from": "sender@example.com", "to": "recipient@example.com", "subject": "Email Subject", "body": "Email content" }`

### Authentication Routes

- `GET /auth/google` - Initiate the OAuth2 authentication flow
- `GET /auth/google/callback` - OAuth2 callback endpoint

### Notification Routes

- `POST /api/notifications/pubsub` - Receive push notifications from Google Pub/Sub
- `GET /api/notifications` - Get all stored notifications

### Setup Routes

- `POST /api/setup/watch-mailbox` - Set up Gmail API to watch for new emails
  - Request body: `{ "topicName": "projects/your-project-id/topics/gmail-notifications", "labelIds": ["INBOX"] }`
- `POST /api/setup/stop-watch` - Stop watching the mailbox

## Functional Programming Approach

This project has been refactored to use a functional programming approach:

- The email service uses pure functions instead of classes
- Functions are separated by concern for better testability
- Stateless functions make the code more predictable
- Reduced side effects by isolating API calls
- Better code organization with smaller, focused functions

### Example of Functional Code:

```typescript
// Creating email content
const createEmailContent = (from, to, subject, body) => {
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

// Encoding email for Gmail API
const encodeEmail = (email) => {
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};
```

## Development

- `npm run dev` - Start the development server with hot reloading
- `npm run build` - Build the TypeScript project
- `npm start` - Start the production server