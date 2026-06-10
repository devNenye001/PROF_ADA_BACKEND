import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { logger } from '../../config/logger';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (idToken: string): Promise<TokenPayload | undefined> => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    logger.error('Error verifying Google Token:', error);
    return undefined;
  }
};
