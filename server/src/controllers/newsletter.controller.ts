import { Request, Response } from 'express';
import { z } from 'zod';
import { sendEmail, emails } from '../config/resend';

export const subscribe = async (req: Request, res: Response) => {
  const { email } = z.object({ email: z.string().email('Please enter a valid email') }).parse(req.body);

  // Send welcome email (non-blocking — don't fail the request if email errors)
  sendEmail(email, "Welcome to SEMMAI's Inner Circle", emails.newsletterWelcome()).catch((err) =>
    console.error('[email] newsletter welcome:', err)
  );

  res.json({ subscribed: true });
};
