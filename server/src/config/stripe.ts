import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.stripe.secretKey, {
  apiVersion: '2025-02-24.acacia',
});
