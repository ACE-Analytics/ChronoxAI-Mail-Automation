import { Router, Request, Response } from 'express';
import emailService, { sendEmail } from '../services/emailService';

const router = Router();

// Route for sending an email
router.post('/send', async (req: Request, res: Response) => {
  try {
    // const { from, to, subject, body } = req.body;
    const from="birud.vora@brokersalliance.com", to="nikunj@acedataanalytics.com", subject="test", body ="test body";
    
    // Validate request
    if (!from || !to || !subject || !body) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields. Please provide from, to, subject, and body.' 
      });
    }
    
    // Can use either the imported function directly or the emailService object
    const result = await sendEmail({
      from,
      to,
      subject,
      body
    });
    
    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully',
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in send email route:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while processing request',
      error
    });
  }
});

// Simple test route that doesn't actually send an email
router.get('/test', (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Email service is running'
  });
});

export default router; 