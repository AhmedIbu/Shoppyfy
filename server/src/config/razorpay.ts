import Razorpay from 'razorpay';
import { env } from './env';
import { ApiError } from '../utils/ApiError';

// Lazily construct the Razorpay client. The SDK throws "key_id is mandatory"
// when keys are absent, so constructing it at module load would crash the
// whole API (every request 500s) on any deploy that hasn't set the keys.
// Building it on first use keeps the rest of the site alive — only checkout
// fails, and with a clear message — when payment keys are missing.
let client: Razorpay | null = null;

export const getRazorpay = (): Razorpay => {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw ApiError.badRequest(
      'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    );
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return client;
};
