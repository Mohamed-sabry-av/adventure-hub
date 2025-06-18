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

/**
 * Security Implementation Notes:
 * 
 * - API_SECRET_KEY: Used for internal server-to-server requests to access sensitive configurations
 * - Config Management: We maintain separate public (client-side) and private (server-side) configurations
 * - Secure Config Access: Internal requests must include x-internal-request header with API_SECRET_KEY
 * - Sensitive Data Protection: API keys, auth credentials, and secrets are only exposed server-side
 * 
 * This approach prevents sensitive credentials from being included in client-side JavaScript.
 */

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
  'API_SECRET_KEY', // Required for internal server-to-server secure API requests
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

// Function to get updated Stripe instance with fresh credentials if needed
const getStripeInstance = async () => {
  try {
    // Try to get fresh config from internal API
    const config = await fetchInternalConfig();
    return new Stripe(config.stripeSecretKey, {
      // apiVersion: '2024-10-28.acs', // Use a supported API version
    });
  } catch (error) {
    console.error('Error getting updated Stripe instance, using default:', error);
    // Fall back to initial instance
    return stripe;
  }
};

// WooCommerce API configuration
const WOOCOMMERCE_API_URL = `${process.env['WOOCOMMERCE_URL']!}/wp-json/wc/v3`;
const WOOCOMMERCE_AUTH = {
  auth: {
    username: process.env['WOOCOMMERCE_CONSUMER_KEY']!,
    password: process.env['WOOCOMMERCE_CONSUMER_SECRET']!,
  },
};

// Function to get WooCommerce auth with updated credentials if needed
const getWooCommerceAuth = async () => {
  try {
    // Try to get fresh config from internal API
    const config = await fetchInternalConfig();
    return {
      auth: {
        username: config.consumerKey,
        password: config.consumerSecret,
      },
    };
  } catch (error) {
    console.error('Error getting updated WooCommerce auth, using default:', error);
    // Fall back to initial values
    return WOOCOMMERCE_AUTH;
  }
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
      const stripeInstance = await getStripeInstance();
      const event = stripeInstance.webhooks.constructEvent(
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
              await getWooCommerceAuth()
            );

            const stripeInstance = await getStripeInstance();
            await stripeInstance.paymentIntents.update(paymentIntent.id, {
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

      const stripeInstance = await getStripeInstance();
      const paymentIntent = await stripeInstance.paymentIntents.create({
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
        await getWooCommerceAuth()
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
      const stripeInstance = await getStripeInstance();
      const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
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

// Internal function to get configuration securely within the server
const getServerConfig = () => {
  // Return all configuration including sensitive data for server-side use
  return {
    apiUrl: process.env['WOOCOMMERCE_URL']!,
    stripePublishableKey: process.env['STRIPE_PUBLISHABLE_KEY']!,
    tabbyPublicKey: process.env['TABBY_PUBLIC_KEY']!,
    tabbyMerchantCode: process.env['TABBY_MERCHANT_CODE']!,
    gtmId: process.env['GTM_ID']!,
    fbAppId: process.env['FB_APP_ID']!,
    googleClientId: process.env['GOOGLE_CLIENT_ID']!,
    klaviyoPublicKey: process.env['KLAVIYO_PUBLIC_KEY']!,
    consumerKey: process.env['WOOCOMMERCE_CONSUMER_KEY']!,
    consumerSecret: process.env['WOOCOMMERCE_CONSUMER_SECRET']!,
    stripeSecretKey: process.env['STRIPE_SECRET_KEY']!,
    stripeWebhookSecret: process.env['STRIPE_WEBHOOK_SECRET']!
  };
};

// Internal function to get server config without exposing sensitive data
const fetchInternalConfig = async () => {
  try {
    // Use internal request with secret key for secure data access
    const response = await axios.get(`http://localhost:${process.env['PORT'] || 3000}/api/config`, {
      headers: {
        'x-internal-request': process.env['API_SECRET_KEY']
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching internal config:', error);
    // Fallback to direct access from environment variables
    return getServerConfig();
  }
};

// Add API config endpoint to provide necessary client-side configuration
app.get('/api/config', (req, res) => {
  try {
    console.log('API Config request received from:', req.headers['user-agent']);
    
    // Determine if this is a server-side request
    const isServerSideRequest = req.headers['x-internal-request'] === process.env['API_SECRET_KEY'];
    
    // Create a base configuration object with public keys only
    const clientConfig = {
      apiUrl: process.env['WOOCOMMERCE_URL'],
      stripePublishableKey: process.env['STRIPE_PUBLISHABLE_KEY'],
      tabbyPublicKey: process.env['TABBY_PUBLIC_KEY'],
      tabbyMerchantCode: process.env['TABBY_MERCHANT_CODE'],
      gtmId: process.env['GTM_ID'],
      fbAppId: process.env['FB_APP_ID'],
      googleClientId: process.env['GOOGLE_CLIENT_ID'],
      klaviyoPublicKey: process.env['KLAVIYO_PUBLIC_KEY'],
    };
    
    // Only include sensitive keys for server-side usage if this is an internal request
    if (isServerSideRequest) {
      Object.assign(clientConfig, getServerConfig());
    }
  
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    
    // Only allow CORS for public configs
    if (!isServerSideRequest) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    
    res.json(clientConfig);
    console.log(`Config response sent successfully (${isServerSideRequest ? 'server-side' : 'client-side'} config)`);
  } catch (error) {
    console.error('Error serving config:', error);
    res.status(500).json({ error: 'Failed to load configuration' });
  }
});

// وسيط آمن للحصول على البيانات من WooCommerce
app.get('/api/wc/:endpoint(*)', async (req, res) => {
  try {
    const endpoint = req.params['endpoint'];
    const queryParams = new URLSearchParams(req.query as any).toString();
    const url = `${WOOCOMMERCE_API_URL}/${endpoint}${queryParams ? '?' + queryParams : ''}`;
    
    console.log(`WooCommerce API Proxy: GET ${endpoint} | Full URL: ${url}`);
    
    const response = await axios.get(url, await getWooCommerceAuth());
    
    // إعادة هيدرز الاستجابة المهمة
    if (response.headers['x-wp-total']) {
      res.setHeader('X-WP-Total', response.headers['x-wp-total']);
    }
    if (response.headers['x-wp-totalpages']) {
      res.setHeader('X-WP-TotalPages', response.headers['x-wp-totalpages']);
    }
    
    console.log(`WooCommerce API Success: GET ${endpoint} | Status: ${response.status}`);
    res.json(response.data);
  } catch (error: any) {
    const requestedEndpoint = req.params['endpoint'];
    console.error(`WooCommerce API Error: GET ${requestedEndpoint} | ${error.message}`);
    console.error('Request details:', {
      requestedEndpoint,
      params: req.query,
      headers: req.headers['user-agent']
    });
    
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to WooCommerce API' });
    }
  }
});

// وسيط آمن لإرسال بيانات إلى WooCommerce
app.post('/api/wc/:endpoint(*)', async (req, res) => {
  try {
    const endpoint = req.params['endpoint'];
    const url = `${WOOCOMMERCE_API_URL}/${endpoint}`;
    
    console.log(`WooCommerce API Proxy: POST ${endpoint}`);
    
    const response = await axios.post(url, req.body, await getWooCommerceAuth());
    res.json(response.data);
  } catch (error: any) {
    console.error('WooCommerce API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to WooCommerce API' });
    }
  }
});

// وسيط آمن لتحديث بيانات في WooCommerce
app.put('/api/wc/:endpoint(*)', async (req, res) => {
  try {
    const endpoint = req.params['endpoint'];
    const url = `${WOOCOMMERCE_API_URL}/${endpoint}`;
    
    console.log(`WooCommerce API Proxy: PUT ${endpoint}`);
    
    const response = await axios.put(url, req.body, await getWooCommerceAuth());
    res.json(response.data);
  } catch (error: any) {
    console.error('WooCommerce API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to WooCommerce API' });
    }
  }
});

// وسيط آمن لحذف بيانات من WooCommerce
app.delete('/api/wc/:endpoint(*)', async (req, res) => {
  try {
    const endpoint = req.params['endpoint'];
    const url = `${WOOCOMMERCE_API_URL}/${endpoint}`;
    
    console.log(`WooCommerce API Proxy: DELETE ${endpoint}`);
    
    const response = await axios.delete(url, {
      ...await getWooCommerceAuth(),
      data: req.body
    });
    res.json(response.data);
  } catch (error: any) {
    console.error('WooCommerce API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to WooCommerce API' });
    }
  }
});

// وسيط للتعامل مع نقاط نهاية API سلة التسوق المخصصة
app.post('/api/custom/cart/guest', async (req, res) => {
  try {
    console.log('Proxying guest cart request to WordPress');
    const response = await axios.post(
      `${process.env['WOOCOMMERCE_URL']}/wp-json/custom/v1/cart/guest`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Guest Cart API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Guest Cart API' });
    }
  }
});

app.post('/api/custom/cart/guest/add', async (req, res) => {
  try {
    console.log('Proxying add to guest cart request to WordPress');
    const response = await axios.post(
      `${process.env['WOOCOMMERCE_URL']}/wp-json/custom/v1/cart/guest/add`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Guest Cart Add API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Guest Cart Add API' });
    }
  }
});

app.post('/api/custom/cart/guest/update', async (req, res) => {
  try {
    console.log('Proxying update guest cart request to WordPress');
    const response = await axios.post(
      `${process.env['WOOCOMMERCE_URL']}/wp-json/custom/v1/cart/guest/update`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Guest Cart Update API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Guest Cart Update API' });
    }
  }
});

app.post('/api/custom/cart/guest/remove', async (req, res) => {
  try {
    console.log('Proxying remove from guest cart request to WordPress');
    const response = await axios.post(
      `${process.env['WOOCOMMERCE_URL']}/wp-json/custom/v1/cart/guest/remove`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Guest Cart Remove API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Guest Cart Remove API' });
    }
  }
});

app.post('/api/custom/cart/guest/load', async (req, res) => {
  try {
    console.log('Proxying load guest cart request to WordPress');
    const response = await axios.post(
      `${process.env['WOOCOMMERCE_URL']}/wp-json/custom/v1/cart/guest/load`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Guest Cart Load API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Guest Cart Load API' });
    }
  }
});

app.post('/api/custom/cart/guest/coupon', async (req, res) => {
  try {
    console.log('Proxying guest cart coupon request to WordPress');
    const response = await axios.post(
      `${process.env['WOOCOMMERCE_URL']}/wp-json/custom/v1/cart/guest/coupon`,
      req.body
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Guest Cart Coupon API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Guest Cart Coupon API' });
    }
  }
});

app.get('/api/custom/cart/guest/all', async (req, res) => {
  try {
    console.log('Proxying get all guest carts request to WordPress');
    const response = await axios.get(
      `${process.env['WOOCOMMERCE_URL']}/wp-json/custom/v1/cart/guest/all`
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Get All Guest Carts API Proxy Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to proxy request to Get All Guest Carts API' });
    }
  }
});

// إضافة نقطة نهاية اختبار للتأكد من أن الخادم يعمل بشكل صحيح
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    server: 'Node.js Express',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    woocommerce_url: process.env['WOOCOMMERCE_URL'] || 'not set',
    client_ip: req.ip || 'unknown',
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent']
    }
  });
});

// Add endpoint to fetch banner data directly
app.get('/api/banners', async (req, res) => {
  try {
    console.log('Fetching banner data from WP API');
    const response = await axios.get('https://adventures-hub.com/wp-json/custom/v1/banners', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log('Banner data fetched successfully. Raw response:', typeof response.data, JSON.stringify(response.data).substring(0, 200) + '...');
    
    // Make sure we're sending the correct format - the API returns {banner_images: [...]}
    // Just pass it through directly since the Angular app is expecting this format
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching banner data:', error);
    res.status(500).json({ error: 'Failed to fetch banner data' });
  }
});

// Add endpoint to fetch category images
app.get('/api/category-images', async (req, res) => {
  try {
    console.log('Fetching category images from WP API');
    const response = await axios.get('https://adventures-hub.com/wp-json/custom/v1/category-images', {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log('Category images data fetched successfully');
    
    // Pass through the response data
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching category images:', error);
    res.status(500).json({ error: 'Failed to fetch category images' });
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

// Add proxy endpoint for content type API
app.get('/api/content-type/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`Proxying content type request for slug: ${slug}`);
    
    // First try to check if it's a product
    try {
      const productResponse = await axios.get(`${WOOCOMMERCE_API_URL}/products`, {
        params: {
          slug: slug,
          _fields: 'id'
        },
        ...await getWooCommerceAuth()
      });
      
      if (productResponse.data && productResponse.data.length > 0) {
        console.log(`Slug ${slug} determined to be a product`);
        return res.json({ type: 'product' });
      }
    } catch (error: any) {
      console.error(`Error checking if ${slug} is a product:`, error.message);
    }
    
    // Then check if it's a category
    try {
      const categoryResponse = await axios.get(`${WOOCOMMERCE_API_URL}/products/categories`, {
        params: {
          slug: slug,
          _fields: 'id'
        },
        ...await getWooCommerceAuth()
      });
      
      if (categoryResponse.data && categoryResponse.data.length > 0) {
        console.log(`Slug ${slug} determined to be a category`);
        return res.json({ type: 'category' });
      }
    } catch (error: any) {
      console.error(`Error checking if ${slug} is a category:`, error.message);
    }
    
    // If we reach here, try the original API as a fallback
    try {
      const response = await axios.get(`https://adventures-hub.com/wp-json/api/v1/content-type/${slug}`, {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      console.log(`Content type for ${slug} from API: ${response.data.type}`);
      return res.json(response.data);
    } catch (error: any) {
      console.error(`Error from content type API for ${slug}:`, error.message);
      // Continue to the 404 response below
    }
    
    // If all attempts fail, return 404
    console.log(`Content type not found for slug: ${slug}`);
    return res.status(404).json({ error: 'Content type not found', slug });
    
  } catch (error: any) {
    console.error(`Error in content-type endpoint for slug ${req.params.slug}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch content type' });
  }
});

// Add route resolver middleware for slug-based routing
const resolveSlugRoutes = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip for static files, API endpoints, and existing defined routes
  if (
    req.originalUrl.match(/\.(css|js|png|jpg|jpeg|gif|ico|woff|woff2|ttf|svg)$/) ||
    req.originalUrl.startsWith('/api/') ||
    req.originalUrl.includes('wp-json') ||
    // Skip known application routes
    req.originalUrl.startsWith('/maintenance') ||
    req.originalUrl.startsWith('/admin') ||
    req.originalUrl.startsWith('/user') ||
    req.originalUrl.startsWith('/order-received') ||
    req.originalUrl.startsWith('/cart') ||
    req.originalUrl.startsWith('/checkout') ||
    req.originalUrl.startsWith('/history') ||
    req.originalUrl.startsWith('/page-not-found') ||
    req.originalUrl.startsWith('/blog') ||
    req.originalUrl.startsWith('/pages') ||
    req.originalUrl.startsWith('/brand/') ||
    req.originalUrl.startsWith('/sale') ||
    // Skip if this is the home page
    req.originalUrl === '/' 
  ) {
    return next();
  }

  // Parse the URL to separate path from query parameters
  const urlParts = req.originalUrl.split(/[?#]/);
  const path = urlParts[0];
  const queryString = urlParts.length > 1 ? `?${urlParts[1]}` : '';

  // Handle redirects for old prefix routes - use 301 redirect for better performance
  if (path.startsWith('/product/') || path.startsWith('/category/')) {
    // Extract the slug from old URL format, preserving any query parameters
    const oldSlug = path.split('/').filter(Boolean)[1];
    if (oldSlug) {
      console.log(`Redirecting old route ${path} to /${oldSlug}${queryString}`);
      // Use 301 redirect with cache control header to improve performance
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      return res.redirect(301, `/${oldSlug}${queryString}`);
    }
  }

  // Check if this is a path with multiple segments (potential subcategory)
  const pathSegments = path.split('/').filter(Boolean);
  
  // If we have multiple segments, this might be a subcategory path
  if (pathSegments.length > 1) {
    try {
      // Get the last segment which should be the deepest category
      const deepestSlug = pathSegments[pathSegments.length - 1];
      
      // Set a short cache time for these responses to improve performance
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
      
      // Check if the deepest slug is a valid category
      const categoryResponse = await axios.get(`${WOOCOMMERCE_API_URL}/products/categories`, {
        params: {
          slug: deepestSlug,
          _fields: 'id'
        },
        ...await getWooCommerceAuth(),
        timeout: 3000 // Add timeout to prevent hanging
      }).catch(error => {
        console.error(`Error checking if ${deepestSlug} is a category:`, error.message);
        return { data: [] };
      });
      
      if (categoryResponse.data && categoryResponse.data.length > 0) {
        console.log(`Multi-segment path resolved as category: ${deepestSlug}`);
        (req as any).contentType = 'category';
        return next();
      }
      
      // If not a category, check if it's a product (could be a product under a category path)
      const productResponse = await axios.get(`${WOOCOMMERCE_API_URL}/products`, {
        params: {
          slug: deepestSlug,
          _fields: 'id'
        },
        ...await getWooCommerceAuth(),
        timeout: 3000 // Add timeout to prevent hanging
      }).catch(error => {
        console.error(`Error checking if ${deepestSlug} is a product:`, error.message);
        return { data: [] };
      });
      
      if (productResponse.data && productResponse.data.length > 0) {
        console.log(`Multi-segment path resolved as product: ${deepestSlug}`);
        (req as any).contentType = 'product';
        return next();
      }
    } catch (error: any) {
      console.error(`Error checking multi-segment path: ${req.originalUrl}`, error.message);
      // Continue to single segment check
    }
  }

  // Extract the slug - remove leading slash and any trailing slashes
  const slug = pathSegments[0];
  
  if (!slug) {
    return next();
  }
  
  try {
    // Set a short cache time for these responses to improve performance
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    
    // Use our internal content type detection directly instead of making an HTTP request
    console.log(`Checking content type for slug: ${slug}`);
    
    // Use Promise.race to run both checks in parallel and take the first result
    const contentTypePromise = Promise.race([
      // Check if it's a product
      axios.get(`${WOOCOMMERCE_API_URL}/products`, {
        params: {
          slug: slug,
          _fields: 'id'
        },
        ...await getWooCommerceAuth(),
        timeout: 3000 // Add timeout to prevent hanging
      }).then(response => {
        if (response.data && response.data.length > 0) {
          console.log(`Slug ${slug} resolved as content type: product`);
          return 'product';
        }
        return null;
      }).catch((error) => {
        console.error(`Error checking if ${slug} is a product:`, error.message);
        return null;
      }),
      
      // Check if it's a category
      axios.get(`${WOOCOMMERCE_API_URL}/products/categories`, {
        params: {
          slug: slug,
          _fields: 'id'
        },
        ...await getWooCommerceAuth(),
        timeout: 3000 // Add timeout to prevent hanging
      }).then(response => {
        if (response.data && response.data.length > 0) {
          console.log(`Slug ${slug} resolved as content type: category`);
          return 'category';
        }
        return null;
      }).catch((error) => {
        console.error(`Error checking if ${slug} is a category:`, error.message);
        return null;
      })
    ]);
    
    // Add a timeout to avoid hanging
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => resolve('unknown'), 3000);
    });
    
    // Use the result of the race or the timeout
    const contentType = await Promise.race([contentTypePromise, timeoutPromise]);
    
    if (contentType && contentType !== 'unknown') {
      (req as any).contentType = contentType;
      // Store the clean slug (without query params) for SSR
      (req as any).cleanSlug = slug;
      return next();
    }
    
    // Fallback to the external API only if internal checks failed
    try {
      const response = await axios.get(`https://adventures-hub.com/wp-json/api/v1/content-type/${slug}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
        timeout: 2000 // Add a timeout to prevent hanging
      });
      
      const apiContentType = response.data.type;
      console.log(`Slug ${slug} resolved as content type from API: ${apiContentType}`);
      
      // Add the content type to the request object for use in SSR
      (req as any).contentType = apiContentType;
      // Store the clean slug (without query params) for SSR
      (req as any).cleanSlug = slug;
      
      // Continue with normal rendering
      return next();
    } catch (error: any) {
      console.error(`Error from content type API for ${slug}:`, error.message);
    }
    
    // If we reach here, we couldn't determine the content type
    console.log(`Could not determine content type for slug: ${slug}, passing to next handler`);
    return next();
  } catch (error: any) {
    console.error(`Error resolving content type for slug ${slug}:`, error.message);
    // If we can't determine the content type, pass to next handler
    // which will likely be the 404 handler
    return next();
  }
};

// Apply the resolver middleware before other route handlers but after API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Apply the slug resolution middleware
app.use(resolveSlugRoutes);

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

    // If we have a content type from the slug resolver, add it to the SSR providers
    const providers = [
      { provide: APP_BASE_HREF, useValue: baseUrl },
    ];
    
    if ((req as any).contentType) {
      // Extract slug from URL (removing any query parameters)
      const urlPath = originalUrl.split(/[?#]/)[0];
      const pathSegments = urlPath.split('/').filter(Boolean);
      const slug = (req as any).cleanSlug || (pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '');
      
      providers.push({
        provide: 'CONTENT_TYPE' as any,
        useValue: { 
          type: (req as any).contentType,
          slug: slug
        } as any
      });
      
      console.log(`SSR rendering with content type: ${(req as any).contentType}, slug: ${slug}`);
    }

    // Render the app
    const html = await commonEngine.render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers,
    });

    // Send the rendered HTML
    res.send(html);
  } catch (error) {
    console.error('Error during SSR rendering:', error);
    
    // Try to send a more graceful error response
    try {
      res.status(500).send(`
        <html>
          <head>
            <title>Server Error</title>
            <meta http-equiv="refresh" content="0;URL='${req.originalUrl}'">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            </style>
          </head>
          <body>
            <h2>Loading...</h2>
            <p>Please wait while we redirect you.</p>
          </body>
        </html>
      `);
    } catch (fallbackError) {
      console.error('Error sending fallback response:', fallbackError);
      next(error); // Pass to Express error handler
    }
  }
};

// Apply caching middleware for SSR responses
app.use(cache(300)); // Cache for 5 minutes

// Handle all other routes with SSR
app.get('*', renderPage);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).send('Internal Server Error');
});

// Add a proxy endpoint for WordPress category banner images
app.get('/api/wp/category-banner/:categoryId', async (req: express.Request, res: express.Response) => {
  try {
    const categoryId = req.params['categoryId'];
    const wooAuth = await getWooCommerceAuth();
    
    // Set a timeout to prevent hanging requests
    const timeout = 5000;
    
    // Log the request
    console.log(`Fetching category banner for ID: ${categoryId}`);
    
    // Make request to WordPress API
    const response = await axios.get(
      `${process.env['WOOCOMMERCE_URL']!}/wp-json/wp/v2/product_cat/${categoryId}`,
      {
        ...wooAuth,
        timeout: timeout
      }
    );
    
    // Log successful response
    console.log(`Category banner response received for ID: ${categoryId}`);
    
    // Extract banner image URL from response
    let bannerUrl = null;
    
    // Check for ACF banner_image field
    if (response.data.acf && response.data.acf.banner_image) {
      bannerUrl = response.data.acf.banner_image;
    } 
    // Check for yoast_head_json.og_image
    else if (response.data.yoast_head_json && 
             response.data.yoast_head_json.og_image && 
             response.data.yoast_head_json.og_image.length > 0) {
      bannerUrl = response.data.yoast_head_json.og_image[0].url;
    }
    
    // Return the banner URL or null
    res.json({ banner_image: bannerUrl });
    
    // Add cache headers
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
  } catch (error: any) {
    console.error(`Error fetching category banner: ${error.message}`);
    res.status(500).json({ 
      error: 'Failed to fetch category banner',
      message: error.message 
    });
  }
});

// Start the server
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 3000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
    console.log(`Server running in ${process.env['NODE_ENV'] || 'development'} mode`);

  });
}
