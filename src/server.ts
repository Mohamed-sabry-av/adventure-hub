import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';
import axios from 'axios';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bootstrap from './main.server';

// Extend Express Request to include rawBody (مش ضروري دلوقتي لأننا هنستخدم req.body كـ Buffer مباشرة)
declare module 'express' {
  interface Request {
    rawBody?: Buffer;
  }
}

// Interfaces for request bodies
interface OrderData {
  billing: any;
  shipping: any;
  line_items: any[];
}

interface PaymentIntentRequest {
  amount: number;
  currency: string;
  orderData: OrderData;
}

interface PaymentConfirmationRequest {
  paymentIntentId: string;
  orderData: OrderData;
}

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'WOOCOMMERCE_URL',
  'WOOCOMMERCE_CONSUMER_KEY',
  'WOOCOMMERCE_CONSUMER_SECRET',
  'CLIENT_URL',
  'STRIPE_PUBLISHABLE_KEY',
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Initialize Stripe
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
  // apiVersion: '2020-08-27', // Specify API version for compatibility
});

// WooCommerce API configuration
const WOOCOMMERCE_API_URL = `${process.env['WOOCOMMERCE_URL']!}/wp-json/wc/v3`;
const WOOCOMMERCE_AUTH = {
  auth: {
    username: process.env['WOOCOMMERCE_CONSUMER_KEY']!,
    password: process.env['WOOCOMMERCE_CONSUMER_SECRET']!,
  },
};

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

// Middleware setup
app.use(cors({ origin: process.env['CLIENT_URL']!, credentials: true }));

// Webhook endpoint to handle Stripe events
app.post(
  '/stripe-webhook',
  bodyParser.raw({ type: 'application/json' }), // Raw body parser بس للـ webhook
  async (req: express.Request, res: express.Response) => {
    const sig = req.headers['stripe-signature'] as string;

    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        req.body, // req.body هنا هيبقى Buffer لأننا بنستخدم bodyParser.raw()
        sig,
        process.env['STRIPE_WEBHOOK_SECRET']!
      );

      // Handle specific events
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

          // Check if order already exists to ensure idempotency
          const existingOrderId = paymentIntent.metadata['orderId'];
          if (existingOrderId && existingOrderId !== 'pending') {
            console.log(`Order ${existingOrderId} already processed`);
            return res.json({ received: true });
          }

          // Extract order data from metadata
          let orderData;
          try {
            orderData = {
              billing: JSON.parse(paymentIntent.metadata['billing'] || '{}'),
              shipping: JSON.parse(paymentIntent.metadata['shipping'] || '{}'),
              line_items: JSON.parse(
                paymentIntent.metadata['line_items'] || '[]'
              ),
            };
          } catch (parseError: any) {
            console.error(`Error parsing metadata: ${parseError.message}`);
            return res
              .status(400)
              .json({ success: false, error: 'Invalid metadata format' });
          }

          // Handle country-specific logic for shipping and payment
          const isUAE = orderData.billing.country?.toLowerCase() === 'united arab emirates';

          // Create order in WooCommerce
          try {
            const orderResponse = await axios.post(
              `${WOOCOMMERCE_API_URL}/orders`,
              {
                payment_method: 'stripe',
                payment_method_title: 'Credit Card / Digital Wallet',
                set_paid: true,
                billing: orderData.billing,
                shipping: orderData.shipping,
                line_items: orderData.line_items,
                total: (paymentIntent.amount / 100).toString(),
                transaction_id: paymentIntent.id,
                status: isUAE ? 'processing' : 'on-hold', // Set on-hold for non-UAE countries
                date_paid: new Date().toISOString(),
                customer_note: !isUAE ? 'Our representative will call you to arrange international shipping.' : '',
              },
              WOOCOMMERCE_AUTH
            );

            // Update Payment Intent metadata with order ID
            await stripe.paymentIntents.update(paymentIntent.id, {
              metadata: { orderId: orderResponse.data.id },
            });

            console.log(`Order created: ${orderResponse.data.id}`);
            return res.json({ received: true });
          } catch (wooError: any) {
            console.error(
              `WooCommerce error: ${wooError.message}`,
              wooError.response?.data
            );
            return res
              .status(500)
              .json({ success: false, error: 'Failed to create order in WooCommerce' });
          }
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`PaymentIntent failed: ${paymentIntent.id}`);
          // Notify customer or log failure (e.g., send email)
          return res.json({ received: true });
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
          return res.json({ received: true });
      }
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res
        .status(400)
        .json({ success: false, error: `Webhook Error: ${err.message}` });
    }
  }
);

// JSON body parser for other routes (بعد الـ webhook)
app.use(bodyParser.json());

// API endpoint to create a Payment Intent for credit cards and wallets
app.post(
  '/api/payment/create-intent',
  async (
    req: express.Request<{}, {}, PaymentIntentRequest>,
    res: express.Response
  ) => {
    try {
      const { amount, currency, orderData } = req.body;

      // Validate input
      if (!amount) {
        return res
          .status(400)
          .json({ success: false, error: 'Amount is required' });
      }
      if (!currency) {
        return res
          .status(400)
          .json({ success: false, error: 'Currency is required' });
      }
      if (!orderData) {
        return res
          .status(400)
          .json({ success: false, error: 'Order data is required' });
      }

      if (!orderData.billing) {
        return res
          .status(400)
          .json({ success: false, error: 'Billing data is required' });
      }

      if (!orderData.shipping) {
        return res
          .status(400)
          .json({ success: false, error: 'Shipping data is required' });
      }

      if (!orderData.line_items || orderData.line_items.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: 'Line items are required' });
      }

      // Create a Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        payment_method_types: ['card', 'wallet'], // Support cards and electronic wallets
        metadata: {
          orderId: 'pending',
          billing: JSON.stringify(orderData.billing),
          shipping: JSON.stringify(orderData.shipping),
          line_items: JSON.stringify(orderData.line_items),
        },
      });

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id, // Return the PaymentIntent ID
      });
    } catch (error: any) {
      console.error('Create Intent Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// API endpoint to confirm payment and create WooCommerce order (fallback)
app.post(
  '/api/payment/confirm',
  async (
    req: express.Request<{}, {}, PaymentConfirmationRequest>,
    res: express.Response
  ) => {
    try {
      const { paymentIntentId, orderData } = req.body;

      // Validate input
      if (!paymentIntentId || !orderData) {
        return res
          .status(400)
          .json({ success: false, error: 'Missing required fields' });
      }

      // Validate PaymentIntent ID format
      if (paymentIntentId.includes('_secret_')) {
        return res.status(400).json({
          success: false,
          error:
            'You passed a string that looks like a client secret as the PaymentIntent ID, but you must provide a valid PaymentIntent ID. Please use the value in the `id` field of the PaymentIntent.',
        });
      }

      // Retrieve Payment Intent to confirm payment status
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      if (paymentIntent.status !== 'succeeded') {
        return res
          .status(400)
          .json({ success: false, error: 'Payment not completed' });
      }

      // Check if order already exists to ensure idempotency
      const existingOrderId = paymentIntent.metadata['orderId'];
      if (existingOrderId && existingOrderId !== 'pending') {
        return res
          .status(200)
          .json({ success: true, orderId: existingOrderId });
      }

      // Handle country-specific logic for shipping and payment
      const isUAE = orderData.billing.country?.toLowerCase() === 'united arab emirates';

      // Create order in WooCommerce
      const orderResponse = await axios.post(
        `${WOOCOMMERCE_API_URL}/orders`,
        {
          payment_method: 'stripe',
          payment_method_title: 'Credit Card / Digital Wallet',
          set_paid: true,
          billing: orderData.billing,
          shipping: orderData.shipping,
          line_items: orderData.line_items,
          total: (paymentIntent.amount / 100).toString(),
          transaction_id: paymentIntent.id,
          status: isUAE ? 'processing' : 'on-hold', // Set on-hold for non-UAE countries
          date_paid: new Date().toISOString(),
          customer_note: !isUAE ? 'Our representative will call you to arrange international shipping.' : '',
        },
        WOOCOMMERCE_AUTH
      );

      // Update Payment Intent metadata with order ID
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: { orderId: orderResponse.data.id },
      });

      return res.json({ success: true, orderId: orderResponse.data.id });
    } catch (error: any) {
      console.error('Confirmation Error:', error);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.message || error.message,
      });
    }
  }
);

// Serve static files from /browser
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  })
);

// Render Angular application for all other requests
app.get(
  '**',
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  }
);

// Start the server
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}
