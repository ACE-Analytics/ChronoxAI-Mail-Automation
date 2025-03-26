import { google } from 'googleapis';
import { createAuth } from '../services/emailService';
import schedule from 'node-schedule';

const GMAIL_API_URL = 'https://www.googleapis.com/gmail/v1/users/me/watch';
const TOPIC_NAME = 'projects/chronoxai-mail-automation/topics/ai-mail-automation-topic';

export async function setupGmailWatch() {
    try {
        const auth = await createAuth();
        const gmail = google.gmail({ version: 'v1', auth });

        const response = await gmail.users.watch({
            userId: 'me',
            requestBody: {
                topicName: TOPIC_NAME,
                labelIds: ['INBOX']
            }
        });

        console.log('Gmail watch setup successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error setting up Gmail watch:', error);
        throw error;
    }
}

export function scheduleGmailWatch() {
    // Schedule the watch setup to run daily at midnight
    schedule.scheduleJob('0 0 * * *', async () => {
        console.log('Running scheduled Gmail watch setup...');
        try {
            await setupGmailWatch();
        } catch (error) {
            console.error('Failed to run scheduled Gmail watch setup:', error);
        }
    });
} 

// setupGmailWatch();