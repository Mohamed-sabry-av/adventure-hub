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
// Import compression middleware for response optimization
import compression from 'compression';
// Import caching libraries
import { createClient } from 'redis';
import mcache from 'memory-cache';

declare module 'express' {
  interface Request {
    rawBody?: Buffer;
  }
}

interface OrderStatusParams {
  paymentIntentId: string;
  orderId: string;
}

interface OrderData {
  billing: any;
  shipping: any;
  line_items: any[];
  coupon_lines?: any[];
  customer_id?: number;
  meta_data?: any[];
  total?:string
}

interface PaymentIntentRequest {
  amount: number;
  currency: string;
  orderData: OrderData;
}

// Load environment variables
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
  // apiVersion: '2024-10-28.acs', // Use a supported API version
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

// Initialize Redis client (if needed)
let redisClient;
if (process.env['REDIS_URL']) {
  try {
    redisClient = createClient({
      url: process.env['REDIS_URL']
    });
    redisClient.connect().then(() => {

    }).catch(err => {
      console.error('Redis connection error:', err);
    });
  } catch (error) {
    console.error('Error initializing Redis:', error);
  }
}

// Simple in-memory cache for SSR responses
const cache = (duration: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip caching for authenticated users or POST requests
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }
    
    const key = '__ssr_cache__' + req.originalUrl || req.url;
    const cachedBody = mcache.get(key);
    
    if (cachedBody) {
      res.send(cachedBody);
      return;
    } else {
      const originalSend = res.send;
      res.send = function(body) {
        mcache.put(key, body, duration * 1000);
        return originalSend.call(this, body);
      };
      next();
    }
  };
};

// Middleware setup
// Apply compression middleware to all responses
app.use(compression({ level: 6, threshold: 0 }));

// Serve static files with proper MIME types
app.use(express.static(browserDistFolder, {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    } else if (path.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    } else if (path.endsWith('.ttf')) {
      res.setHeader('Content-Type', 'font/ttf');
    }
  }
}));

// CORS setup
app.use(cors({ origin: process.env['CLIENT_URL']!, credentials: true }));

// Custom middleware to bypass JSON parsing for webhook
app.use((req, res, next) => {
  if (req.originalUrl === '/stripe-webhook') {
    next(); // Skip JSON parsing for webhook
  } else {
    bodyParser.json()(req, res, next); // Apply JSON parsing for other routes
  }
});

// Webhook endpoint with raw body parser
app.post(
  '/stripe-webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req: express.Request, res: express.Response) => {
    const sig = req.headers['stripe-signature'] as string;

    try {
      // Verify webhook signature using raw body
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env['STRIPE_WEBHOOK_SECRET']!
      );

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;

          const existingOrderId = paymentIntent.metadata['orderId'];
          if (existingOrderId && existingOrderId !== 'pending') {

            return res.json({ received: true });
          }

          let orderData: any;
          try {
            orderData = {
              billing: JSON.parse(paymentIntent.metadata['billing'] || '{}'),
              shipping: JSON.parse(paymentIntent.metadata['shipping'] || '{}'),
              line_items: JSON.parse(paymentIntent.metadata['line_items'] || '[]'),
              coupon_lines: JSON.parse(paymentIntent.metadata['coupon_lines'] || '[]'), // إضافة coupon_lines
              customer_id: JSON.parse(paymentIntent.metadata['customer_id'] || '0'),
              meta_data: JSON.parse(paymentIntent.metadata['meta_data'] || '[]'),
            };
          } catch (parseError: any) {
            console.error(`Error parsing metadata: ${parseError.message}`);
            return res.status(400).json({ success: false, error: 'Invalid metadata' });
          }

          if (!orderData.billing || !orderData.shipping || !orderData.line_items.length) {
            console.error('Incomplete order data in metadata:', orderData);
            return res.status(400).json({ success: false, error: 'Missing order data' });
          }

          const isUAE = orderData.billing.country?.toLowerCase() === 'ae';

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
                coupon_lines: orderData.coupon_lines || [], // إضافة coupon_lines
                total: (paymentIntent.amount / 100).toString(),
                transaction_id: paymentIntent.id,
                status: isUAE ? 'processing' : 'on-hold',
                date_paid: new Date().toISOString(),
                customer_id: orderData.customer_id || 0,
                meta_data: orderData.meta_data || [],
                customer_note: !isUAE ? 'Our representative will contact you to arrange international shipping' : '',
              },
              WOOCOMMERCE_AUTH
            );

            await stripe.paymentIntents.update(paymentIntent.id, {
              metadata: { orderId: orderResponse.data.id },
            });


            return res.json({ received: true });
          } catch (wooError: any) {
            console.error(`WooCommerce error: ${wooError.message}`, wooError.response?.data);
            return res.status(500).json({ success: false, error: 'Failed to create order' });
          }
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;

          // Do not create an order on payment failure
          return res.json({ received: true });
        }

        default:

          return res.json({ received: true });
      }
    } catch (err: any) {
      console.error(`Webhook error: ${err.message}`);
      return res.status(400).json({ success: false, error: `Webhook error: ${err.message}` });
    }
  }
);

// Create Payment Intent for Stripe payments
app.post(
  '/api/payment/create-intent',
  async (req: express.Request<{}, {}, PaymentIntentRequest>, res: express.Response) => {
    try {
      const { amount, currency, orderData } = req.body;

      if (!amount || !currency || !orderData) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }
      if (!orderData.billing || !orderData.shipping || !orderData.line_items || orderData.line_items.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid order data' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        payment_method_types: ['card'],
        metadata: {
          orderId: 'pending',
          billing: JSON.stringify(orderData.billing),
          shipping: JSON.stringify(orderData.shipping),
          line_items: JSON.stringify(orderData.line_items),
          coupon_lines: JSON.stringify(orderData.coupon_lines || []), // إضافة coupon_lines
          customer_id: JSON.stringify(orderData.customer_id || 0),
          meta_data: JSON.stringify(orderData.meta_data || []),
        },
      });

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error: any) {
      console.error('Error creating Payment Intent:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Create COD Order
app.post(
  '/api/orders',
  async (req: express.Request<{}, {}, OrderData>, res: express.Response) => {
    try {
      const { billing, shipping, line_items, coupon_lines, total, customer_id, meta_data } = req.body;

      // Validate the incoming order data
      if (!billing || !shipping || !line_items || line_items.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing required order data' });
      }

      // Restrict COD to UAE only
      const isUAE = billing.country?.toLowerCase() === 'ae';
      if (!isUAE) {
        return res.status(400).json({ success: false, error: 'Cash on Delivery is only available for UAE orders' });
      }

      // Calculate total if not provided (optional, if needed by WooCommerce)
      const calculatedTotal = total || line_items.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity || 0);
      }, 0).toString();

      // Create the order in WooCommerce
      const orderResponse = await axios.post(
        `${WOOCOMMERCE_API_URL}/orders`,
        {
          payment_method: 'cod',
          payment_method_title: 'Cash on Delivery',
          set_paid: false,
          billing,
          shipping,
          line_items,
          coupon_lines: coupon_lines || [], // إضافة coupon_lines
          total: calculatedTotal,
          status: 'processing', // Since COD is only for UAE, status is always 'processing'
          customer_id: customer_id || 0,
          meta_data: meta_data || [],
          customer_note: '',
        },
        WOOCOMMERCE_AUTH
      );


      // Return the order ID for redirection
      return res.json({
        success: true,
        id: orderResponse.data.id,
      });
    } catch (error: any) {
      console.error('Error creating COD order:', error.message, error.response?.data);
      return res.status(500).json({ success: false, error: 'Failed to create COD order' });
    }
  }
);

// Check order status
app.get(
  '/api/order/status/:paymentIntentId',
  async (req: express.Request<OrderStatusParams>, res: express.Response) => {
    try {
      const { paymentIntentId } = req.params;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const orderId = paymentIntent.metadata?.['orderId'];

      if (orderId && orderId !== 'pending') {
        return res.json({ success: true, orderId });
      }
      return res.status(202).json({ success: false, message: 'Order not yet created' });
    } catch (error: any) {
      console.error('Error checking order status:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// reCAPTCHA verification endpoint
app.post('/api/verify-recaptcha', async (req: express.Request, res: express.Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'reCAPTCHA token is required' });
    }
    
    // Verify the token with Google's API
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: '6LfvcForAAAAAN0frTaHLtYvDAFOnf_ezFfKejil',
          response: token
        }
      }
    );
    
    if (response.data.success) {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'reCAPTCHA verification failed',
        details: response.data['error-codes']
      });
    }
  } catch (error: any) {
    console.error('Error verifying reCAPTCHA:', error);
    return res.status(500).json({ success: false, error: 'Failed to verify reCAPTCHA' });
  }
});

// Add API config endpoint to provide necessary client-side configuration
app.get('/api/config', (req, res) => {
  try {
    console.log('API Config request received from:', req.headers['user-agent']);
  // Only expose the minimum necessary client-side configurations
  // No secrets or API keys that shouldn't be public
  const clientConfig = {
    consumerKey: process.env['WOOCOMMERCE_CONSUMER_KEY'],
    consumerSecret: process.env['WOOCOMMERCE_CONSUMER_SECRET'],
    apiUrl: process.env['WOOCOMMERCE_URL'],
    stripePublishableKey: process.env['STRIPE_PUBLISHABLE_KEY'],
    stripeSecretKey: process.env['STRIPE_SECRET_KEY'],
    stripeWebhookSecret: process.env['STRIPE_WEBHOOK_SECRET'],
    tabbyPublicKey: process.env['TABBY_PUBLIC_KEY'],
    tabbyMerchantCode: process.env['TABBY_MERCHANT_CODE'],
    gtmId: process.env['GTM_ID'],
    fbAppId: process.env['FB_APP_ID'],
    googleClientId: process.env['GOOGLE_CLIENT_ID'],
    klaviyoPublicKey: process.env['KLAVIYO_PUBLIC_KEY']
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    // Allow CORS for this endpoint
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.json(clientConfig);
    console.log('Config response sent successfully');
  } catch (error) {
    console.error('Error serving config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// Add catch-all route for API requests that don't match any defined endpoints
app.all('/api/*', (req, res) => {
  const path = req.path;
  const method = req.method;
  console.warn(`API route not found: ${method} ${path}`);
  res.status(404).json({
    error: 'Not Found',
    message: `No route was found matching the URL (${path}) and request method (${method}).`,
    path: path,
    method: method
  });
});

// Add proper error handling for SSR
const renderPage = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { protocol, originalUrl, baseUrl, headers } = req;

    // Skip SSR for static files and API requests
    if (originalUrl.match(/\.(css|js|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$/) || 
        originalUrl.startsWith('/api/') || 
        originalUrl.includes('api/config') ||
        originalUrl.includes('wp-json')) {
      return next();
    }

    // Set performance and caching headers
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');

    const html = await commonEngine.render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      providers: [
        { provide: APP_BASE_HREF, useValue: baseUrl },
        { provide: 'REQUEST', useValue: req },
        { provide: 'RESPONSE', useValue: res }
      ],
    });

    // Ensure Google site verification tag is in the HTML
    const modifiedHtml = html.replace(
      /<meta name="theme-color" content="#222222">/,
      `<meta name="theme-color" content="#222222">\n  <meta name="google-site-verification" content="rt6fOYIBwSbI9eK8Pt_0MACLhQGaGs6Tl1MdFohwZmw" />`
    );

    res.send(modifiedHtml);
  } catch (err) {
    console.error('SSR Error:', err);
    next(err);
  }
};

// Apply caching middleware for SSR responses
app.use(cache(300)); // Cache for 5 minutes

// Handle API routes first
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Handle all other routes with SSR
app.get('*', renderPage);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start the server
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 3000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`Server running in ${process.env['NODE_ENV'] || 'development'} mode`);

  });
}
