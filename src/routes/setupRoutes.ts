import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { createAuth } from '../services/emailService';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Route to set up Gmail API's watch functionality with Pub/Sub
router.post('/watch-mailbox', async (req: Request, res: Response) => {
  try {
    const { topicName, labelIds = ['INBOX'] } = req.body;

    // Validate request
    if (!topicName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: topicName. Please provide the Pub/Sub topic name.'
      });
    }

    // Initialize auth and Gmail API
    const auth = createAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    // Set up watch on the user's mailbox
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName,
        labelIds
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully set up watch on mailbox',
      data: response.data,
      expirationInfo: {
        message: 'This watch will expire in approximately 7 days and needs to be renewed',
        expiresOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error setting up watch on mailbox:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to set up watch on mailbox',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route to stop watching the mailbox
router.post('/stop-watch', async (req: Request, res: Response) => {
  try {
    // Initialize auth and Gmail API
    const auth = createAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    // Stop watching the mailbox
    await gmail.users.stop({
      userId: 'me'
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully stopped watching mailbox'
    });
  } catch (error) {
    console.error('Error stopping watch on mailbox:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to stop watching mailbox',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 