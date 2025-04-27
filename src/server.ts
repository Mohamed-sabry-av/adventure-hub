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

declare module 'express' {
  interface Request {
    rawBody?: Buffer;
  }
}

interface OrderStatusParams {
  paymentIntentId: string;
  orderId: string;
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
  bodyParser.raw({ type: 'application/json' }),
  async (req: express.Request, res: express.Response) => {
    const sig = req.headers['stripe-signature'] as string;

    try {
      // Verify webhook signature
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env['STRIPE_WEBHOOK_SECRET']!
      );

      // Handle specific events
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);

          // Check for idempotency
          const existingOrderId = paymentIntent.metadata['orderId'];
          if (existingOrderId && existingOrderId !== 'pending') {
            console.log(`Order ${existingOrderId} already processed`);
            return res.json({ received: true });
          }

          // Parse order data from metadata
          let orderData: OrderData;
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
              .json({ success: false, error: 'الـ metadata غلط' });
          }

          // Validate order data
          if (
            !orderData.billing ||
            !orderData.shipping ||
            !orderData.line_items.length
          ) {
            console.error('الداتا ناقصة في الـ metadata');
            return res
              .status(400)
              .json({ success: false, error: 'الداتا ناقصة' });
          }

          // Handle country-specific logic
          const isUAE =
            orderData.billing.country?.toLowerCase() === 'united arab emirates';

          // Create order in WooCommerce
          try {
            const orderResponse = await axios.post(
              `${WOOCOMMERCE_API_URL}/orders`,
              {
                payment_method: 'stripe',
                payment_method_title: 'كارت/محفظة رقمية',
                set_paid: true,
                billing: orderData.billing,
                shipping: orderData.shipping,
                line_items: orderData.line_items,
                total: (paymentIntent.amount / 100).toString(),
                transaction_id: paymentIntent.id,
                status: isUAE ? 'processing' : 'on-hold',
                date_paid: new Date().toISOString(),
                customer_note: !isUAE
                  ? 'مندوبنا هيتصل بيك عشان يظبط الشحن الدولي'
                  : '',
              },
              WOOCOMMERCE_AUTH
            );

            // Update Payment Intent with order ID
            await stripe.paymentIntents.update(paymentIntent.id, {
              metadata: { orderId: orderResponse.data.id },
            });

            console.log(`الأوردر اتعمل: ${orderResponse.data.id}`);
            return res.json({ received: true });
          } catch (wooError: any) {
            console.error(
              `مشكلة في WooCommerce: ${wooError.message}`,
              wooError.response?.data
            );
            return res
              .status(500)
              .json({ success: false, error: 'مشكلة في إنشاء الأوردر' });
          }
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`الدفع فشل: ${paymentIntent.id}`);
          return res.json({ received: true });
        }

        default:
          console.log(`إيفينت مش متعرف عليه: ${event.type}`);
          return res.json({ received: true });
      }
    } catch (err: any) {
      console.error(`خطأ في الـ Webhook: ${err.message}`);
      return res
        .status(400)
        .json({ success: false, error: `خطأ في الـ Webhook: ${err.message}` });
    }
  }
);

// JSON body parser for other routes
app.use(bodyParser.json());

// API endpoint to create a Payment Intent
app.post(
  '/api/payment/create-intent',
  async (
    req: express.Request<{}, {}, PaymentIntentRequest>,
    res: express.Response
  ) => {
    try {
      const { amount, currency, orderData } = req.body;

      // Validate input
      if (!amount || !currency || !orderData) {
        return res
          .status(400)
          .json({ success: false, error: 'فيه حاجة ناقصة في الداتا' });
      }
      if (
        !orderData.billing ||
        !orderData.shipping ||
        !orderData.line_items ||
        orderData.line_items.length === 0
      ) {
        return res.status(400).json({ success: false, error: 'الداتا غلط' });
      }

      // Create a Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        payment_method_types: ['card'],
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
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error('خطأ في إنشاء الـ Intent:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// API endpoint to check order status
// API endpoint to check order status
app.get(
  '/api/order/status/:paymentIntentId',
  async (req: express.Request<OrderStatusParams>, res: express.Response) => {
    try {
      const paymentIntentId = req.params.paymentIntentId; // دلوقتي هيشتغل من غير مشاكل
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      const orderId = paymentIntent.metadata?.['orderId'];

      if (orderId && orderId !== 'pending') {
        return res.json({ success: true, orderId });
      }
      return res
        .status(202)
        .json({ success: false, message: 'الأوردر لسه ما اتعملش' });
    } catch (error: any) {
      console.error('خطأ في جلب حالة الأوردر:', error);
      return res.status(500).json({ success: false, error: error.message });
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
