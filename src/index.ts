import express from 'express';
import dotenv from 'dotenv';
import emailRoutes from './routes/emailRoutes';
import testRoutes from './routes/testRoutes';
import authRoutes from './routes/authRoutes';
import notificationRoutes from './routes/notificationRoutes';
import setupRoutes from './routes/setupRoutes';
import { scheduleGmailWatch } from './triggers/gmailWatchTrigger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/email', emailRoutes);
app.use('/api/test', testRoutes);
app.use('/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/setup', setupRoutes);

// Basic route for testing the server
app.get('/', (req, res) => {
  res.send('ChronoxAI Mail Automation API is running!');
});

// Start the server and schedule Gmail watch
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test the email service at: http://localhost:${PORT}/api/email/test`);
  console.log(`Test the Gmail API directly at: http://localhost:${PORT}/api/test/test-gmail`);
  console.log(`Send emails at: http://localhost:${PORT}/api/email/send (POST)`);
  console.log(`Setup OAuth2: http://localhost:${PORT}/auth/google`);
  console.log(`Receive notifications at: http://localhost:${PORT}/api/notifications/pubsub (POST)`);
  console.log(`View all notifications at: http://localhost:${PORT}/api/notifications (GET)`);
  console.log(`Set up Gmail notifications: http://localhost:${PORT}/api/setup/watch-mailbox (POST)`);
  
  // Start the Gmail watch scheduler
  scheduleGmailWatch();
  console.log('Gmail watch scheduler initialized - will run daily at midnight');
}); 