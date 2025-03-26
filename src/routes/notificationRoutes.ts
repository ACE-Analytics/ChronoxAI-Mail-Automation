import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { createAuth } from '../services/emailService';
import { processEmailNotification, appendNotificationToFile } from '../services/notificationService';
import { Console } from 'console';

const router = Router();

// Directory for storing notifications and emails
const DATA_DIR = path.join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const EMAIL_DIR = path.join(DATA_DIR, 'emails');

// Ensure the directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(EMAIL_DIR)) {
  fs.mkdirSync(EMAIL_DIR, { recursive: true });
}

// Ensure the notifications file exists with valid JSON
if (!fs.existsSync(NOTIFICATIONS_FILE)) {
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
}

// Handle Pub/Sub push notifications
router.post('/pubsub', async (req: Request, res: Response) => {
  try {
    // Check if there's a message in the request body
    console.log(req.body)
    return res.status(200).json({
      "status":"OK"
    })

    if (!req.body || !req.body.message) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Pub/Sub message format'
      });
    }

    // Extract and decode the message data
    const pubsubMessage = req.body.message;
    const data = pubsubMessage.data 
      ? Buffer.from(pubsubMessage.data, 'base64').toString('utf-8') 
      : '{}';
    
    let notificationData;
    try {
      notificationData = JSON.parse(data);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message data format'
      });
    }

    // Add timestamp and message ID
    const notification = {
      id: pubsubMessage.messageId || `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      data: notificationData
    };

    // Append the notification to our JSON file
    await appendNotificationToFile(notification, NOTIFICATIONS_FILE);

    // Check if this is an email reception notification and process it
    await processEmailNotification(notification, EMAIL_DIR);

    // Always respond with success to acknowledge the message
    return res.status(200).json({
      success: true,
      message: 'Notification received and processed'
    });
  } catch (error) {
    console.error('Error processing Pub/Sub notification:', error);
    
    // Still return 200 to acknowledge the message and prevent retries
    // but include error information for debugging
    return res.status(200).json({
      success: false,
      message: 'Error processing notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route to get all stored notifications
router.get('/', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      return res.status(200).json([]);
    }

    const notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error retrieving notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving notifications',
      error
    });
  }
});

export default router; 