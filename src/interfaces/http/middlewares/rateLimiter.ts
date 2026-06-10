import rateLimit from 'express-rate-limit';

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 chat requests per `window` (here, per hour)
  message: {
    success: false,
    error: { message: 'Too many chat requests created from this IP, please try again after an hour' }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const documentReviewRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // Limit each IP to 5 document reviews per `window` (here, per day)
  message: {
    success: false,
    error: { message: 'Daily limit of 5 document reviews exceeded, please try again tomorrow' }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
