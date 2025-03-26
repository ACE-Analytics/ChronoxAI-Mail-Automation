import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { google } from 'googleapis';
import { createAuth } from './emailService';

// Promisify fs functions
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Interface for the notification object
interface Notification {
  id: string;
  timestamp: string;
  data: any;
}

/**
 * Append a notification to the JSON file
 * 
 * @param notification The notification to append
 * @param filePath The path to the JSON file
 */
export const appendNotificationToFile = async (notification: Notification, filePath: string): Promise<void> => {
  try {
    console.log(notification)
    // Read the existing notifications
    let notifications: Notification[] = [];
    
    if (fs.existsSync(filePath)) {
      const fileData = await readFileAsync(filePath, 'utf-8');
      try {
        notifications = JSON.parse(fileData);
      } catch (error) {
        // If the file is corrupted, start with an empty array
        notifications = [];
      }
    }

    // Add the new notification
    notifications.push(notification);
    
    // Write back to the file
    await writeFileAsync(filePath, JSON.stringify(notifications, null, 2), 'utf-8');
    
    console.log(`Notification ${notification.id} appended to ${filePath}`);
  } catch (error) {
    console.error('Error appending notification to file:', error);
    throw error;
  }
};

/**
 * Get email history from Gmail API
 * 
 * @param historyId The history ID to start from
 * @returns The history response from Gmail API
 */
const getEmailHistory = async (historyId: string) => {
  try {
    const auth = createAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Ensure historyId is a valid number
    const numericHistoryId = parseInt(historyId);
    if (isNaN(numericHistoryId)) {
      throw new Error(`Invalid historyId format: ${historyId}`);
    }
    
    console.log('Fetching email history starting from historyId:', numericHistoryId);
    
    // First, try to get the current historyId to ensure we're not too far behind
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const currentHistoryId = profile.data.historyId;
    if (!currentHistoryId) {
      throw new Error('Could not get current historyId from Gmail profile');
    }
    console.log('Current Gmail historyId:', currentHistoryId);
    
    // Use a slightly older history ID to ensure we don't miss any messages
    const startHistoryId = Math.max(1, numericHistoryId - 1).toString();
    console.log('Using startHistoryId:', startHistoryId);
    
    const response = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: startHistoryId,
      historyTypes: ['messageAdded', 'labelAdded']
    });
    
    console.log('History API response:', JSON.stringify(response.data, null, 2));
    
    // If we got no history items, try getting the message directly
    if (!response.data.history || response.data.history.length === 0) {
      console.log('No history items found, trying to get message directly');
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: numericHistoryId.toString(),
          format: 'full'
        });
        console.log('Direct message response:', JSON.stringify(messageResponse.data, null, 2));
        
        // If we got a message, return it in a history-like format
        if (messageResponse.data) {
          return {
            history: [{
              messages: [{
                id: messageResponse.data.id,
                threadId: messageResponse.data.threadId
              }]
            }]
          };
        }
      } catch (error) {
        console.error('Error getting message directly:', error);
      }
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error fetching email history:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
      if (error.response.status === 403) {
        console.error('Permission denied. Please check OAuth scopes.');
        throw new Error('Insufficient permissions to access Gmail history');
      }
    }
    throw error;
  }
};

/**
 * Get email details from Gmail API
 * 
 * @param messageId The ID of the email message
 * @returns The email details from Gmail API
 */
const getEmailDetails = async (messageId: string) => {
  try {
    const auth = createAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching email details:', error);
    throw error;
  }
};

/**
 * Process an email notification - if it's an email received notification,
 * download the email and save it as .eml
 * 
 * @param notification The notification to process
 * @param emailDir The directory to save emails in
 */
export const processEmailNotification = async (notification: Notification, emailDir: string): Promise<void> => {
  try {
    const { data } = notification;
    
    // Check if this is an email notification
    if (data && data.historyId && data.emailAddress) {
      console.log('Processing email notification:', data);
      
      // Get the email history
      let history;
      try {
        history = await getEmailHistory(data.historyId);
      } catch (error: any) {
        console.error('Failed to get email history:', error);
        return;
      }
      
      console.log('History data:', JSON.stringify(history, null, 2));
      
      if (history.history && history.history.length > 0) {
        // Process each history item
        for (const historyItem of history.history) {
          console.log('Processing history item:', JSON.stringify(historyItem, null, 2));
          
          // Check for messages array
          if (historyItem.messages && historyItem.messages.length > 0) {
            console.log('Found messages:', historyItem.messages.length, 'messages');
            for (const message of historyItem.messages) {
              const messageId = message.id;
              if (messageId) {
                console.log('Processing message ID:', messageId);
                
                // Get the full email details
                let emailDetails;
                try {
                  emailDetails = await getEmailDetails(messageId);
                  console.log('Email details:', JSON.stringify(emailDetails, null, 2));
                } catch (error) {
                  console.error('Failed to get email details:', error);
                  continue;
                }
                
                // Save the email as .eml file
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const filename = `${timestamp}-${messageId}.eml`;
                const emailPath = path.join(emailDir, filename);
                
                // Get the raw email content
                let rawEmail;
                try {
                  rawEmail = await getEmailRaw(messageId, data.emailAddress);
                  if (rawEmail) {
                    await writeFileAsync(emailPath, rawEmail, 'utf-8');
                    console.log(`Email saved to ${emailPath}`);
                  } else {
                    console.error('Failed to get raw email content');
                  }
                } catch (error) {
                  console.error('Failed to save email file:', error);
                }
              }
            }
          }
          
          // Check for messagesAdded
          if (historyItem.messagesAdded) {
            console.log('Found messagesAdded:', historyItem.messagesAdded.length, 'messages');
            for (const messageAdded of historyItem.messagesAdded) {
              const messageId = messageAdded.message?.id;
              if (messageId) {
                console.log('Processing message ID:', messageId);
                
                // Get the full email details
                let emailDetails;
                try {
                  emailDetails = await getEmailDetails(messageId);
                  console.log('Email details:', JSON.stringify(emailDetails, null, 2));
                } catch (error) {
                  console.error('Failed to get email details:', error);
                  continue;
                }
                
                // Save the email as .eml file
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const filename = `${timestamp}-${messageId}.eml`;
                const emailPath = path.join(emailDir, filename);
                
                // Get the raw email content
                let rawEmail;
                try {
                  rawEmail = await getEmailRaw(messageId, data.emailAddress);
                  if (rawEmail) {
                    await writeFileAsync(emailPath, rawEmail, 'utf-8');
                    console.log(`Email saved to ${emailPath}`);
                  } else {
                    console.error('Failed to get raw email content');
                  }
                } catch (error) {
                  console.error('Failed to save email file:', error);
                }
              }
            }
          }
          
          // Check for labelsAdded (emails being added to INBOX)
          if (historyItem.labelsAdded) {
            console.log('Found labelsAdded:', historyItem.labelsAdded.length, 'labels');
            for (const labelAdded of historyItem.labelsAdded) {
              if (labelAdded.labelIds?.includes('INBOX')) {
                const messageId = labelAdded.message?.id;
                if (messageId) {
                  console.log('Processing INBOX message ID:', messageId);
                  
                  // Get the full email details
                  let emailDetails;
                  try {
                    emailDetails = await getEmailDetails(messageId);
                    console.log('Email details:', JSON.stringify(emailDetails, null, 2));
                  } catch (error) {
                    console.error('Failed to get email details:', error);
                    continue;
                  }
                  
                  // Save the email as .eml file
                  const timestamp = new Date().toISOString().replace(/:/g, '-');
                  const filename = `${timestamp}-${messageId}.eml`;
                  const emailPath = path.join(emailDir, filename);
                  
                  // Get the raw email content
                  let rawEmail;
                  try {
                    rawEmail = await getEmailRaw(messageId, data.emailAddress);
                    if (rawEmail) {
                      await writeFileAsync(emailPath, rawEmail, 'utf-8');
                      console.log(`Email saved to ${emailPath}`);
                    } else {
                      console.error('Failed to get raw email content');
                    }
                  } catch (error) {
                    console.error('Failed to save email file:', error);
                  }
                }
              }
            }
          }
        }
      } else {
        console.log('No history items found');
      }
    } else {
      console.log('Not an email received notification or unrecognized format');
    }
  } catch (error) {
    console.error('Error processing email notification:', error);
    throw error;
  }
};

/**
 * Get the raw email data from Gmail API
 * 
 * @param emailId The ID of the email to fetch
 * @param userEmail The email address of the user
 * @returns The raw email data as a string
 */
const getEmailRaw = async (emailId: string, userEmail: string): Promise<string | null> => {
  try {
    // Initialize auth and Gmail API
    const auth = createAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Get the full email - 'raw' format gives us the email in RFC 2822 format, perfect for .eml
    const response = await gmail.users.messages.get({
      userId: 'me', // 'me' refers to the authenticated user
      id: emailId,
      format: 'raw'
    });
    
    if (!response.data.raw) {
      console.error('No raw data in email response');
      return null;
    }
    
    // The raw email is base64url encoded, decode it to get the actual email content
    const rawEmail = Buffer.from(response.data.raw, 'base64url').toString('utf-8');
    return rawEmail;
  } catch (error) {
    console.error('Error fetching raw email:', error);
    return null;
  }
}; 