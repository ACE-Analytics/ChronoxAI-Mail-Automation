import { Router, Request, Response } from 'express';
import { getAuthUrl, getTokensFromCode } from '../services/emailService';

const router = Router();

// Route to initiate OAuth flow
router.get('/google', (req: Request, res: Response) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

// OAuth callback route
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ 
      success: false, 
      message: 'Authorization code not provided' 
    });
  }
  
  try {
    const tokens = await getTokensFromCode(code as string);
    
    // Display the refresh token - in production, you would save this securely
    res.send(`
      <h1>Authentication Successful</h1>
      <p>Add these values to your .env file:</p>
      <pre>
      GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || 'Not provided - you may need to force consent'}
      </pre>
      <p>Access token (temporary): ${tokens.access_token || 'Not available'}</p>
      <p>Token type: ${tokens.token_type || 'Not available'}</p>
      <p>Expires in: ${(tokens as any).expires_in ? `${(tokens as any).expires_in} seconds` : 'Not available'}</p>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to exchange code for tokens', 
      error 
    });
  }
});

export default router; 