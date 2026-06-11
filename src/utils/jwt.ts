import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const MAGIC_LINK_SECRET = process.env.JWT_MAGIC_LINK_SECRET || 'fallback_magic_link_secret';

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as { userId: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET) as { userId: string };
};

export const generateMagicLinkToken = (email: string) => {
  return jwt.sign({ email }, MAGIC_LINK_SECRET, { expiresIn: '15m' });
};

export const verifyMagicLinkToken = (token: string) => {
  return jwt.verify(token, MAGIC_LINK_SECRET) as { email: string };
};

