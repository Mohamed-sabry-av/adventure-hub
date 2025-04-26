import express, { Request, Response } from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import axios, { AxiosResponse } from 'axios';

// Initialize Express app
const app = express();

// Initialize Stripe with secret key
const stripe = new Stripe('sk_test_51RGe88QGs0QbDBZ8kPNscx2fpIbg7m7poHhpU4KmRie4FSirvfUoq42Fp0mps66nJOM298M8Oatr7lmngYyCSc3J00C4NgXJfU', {
});

// WooCommerce API configuration
const wooCommerceApiUrl = 'https://adventures-hub.com/wp-json/wc/v3/orders';
const tabbyApiUrl = 'https://adventures-hub.com/wp-json/tabby/v1/create-payment';
const wooCommerceAuth = {
  auth: {
    username: 'ck_74222275d064648b8c9f21284e42ed37f8595da5',
    password: 'cs_4c9f3b5fd41a135d862e973fc65d5c049e05fee4',
  },
};

// Middleware
app.use(express.json());

// CORS configuration to support Angular SSR and development
app.use(
  cors({
    origin: [
      'https://adventures-hub.com', // Production domain
      'http://localhost:4200', // Angular development (HTTP)
      'https://localhost:4200', // Angular development (HTTPS)
      'http://localhost:4000', // SSR server (HTTP)
      'https://localhost:4000', // SSR server (HTTPS)
    ],
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Interface for Order Data to ensure type safety
interface OrderData {
  payment_method: string;
  payment_method_title: string;
  billing: any;
  shipping: any;
  line_items: any[];
  coupon_lines?: any[];
  customer_id: number;
  status: string;
  set_paid: boolean;
}

// Create Order Endpoint
/**
 * Creates an order in WooCommerce and processes payment based on the payment method
 * @route POST /api/create-order
 * @param payment_method_id - Optional Stripe payment method ID
 * @param order_data - Order details (payment method, billing, shipping, etc.)
 */
app.post('/api/create-order', async (req: Request, res: Response) => {
  const { payment_method_id, order_data }: { payment_method_id?: string; order_data?: OrderData } = req.body;

  // Validate request body
  if (!order_data) {
    console.warn('Missing order data');
    return res.status(400).json({ success: false, message: 'Order data is missing' });
  }

  if (!['cod', 'stripe', 'googlePay', 'applePay', 'walletPayment', 'tabby'].includes(order_data.payment_method)) {
    console.warn(`Invalid payment method: ${order_data.payment_method}`);
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }

  try {
    console.log('Creating order in WooCommerce', { order_data });

    // Create order in WooCommerce
    const wooResponse: AxiosResponse = await axios.post(
      wooCommerceApiUrl,
      {
        ...order_data,
        status: 'pending',
        set_paid: false,
      },
      wooCommerceAuth
    );

    const orderId = wooResponse.data.id;
    const totalAmount = Math.round(parseFloat(wooResponse.data.total) * 100); // Convert to cents

    console.log(`Order created successfully: ${orderId}`, { totalAmount });

    if (payment_method_id && ['stripe', 'googlePay', 'applePay', 'walletPayment'].includes(order_data.payment_method)) {
      // Process payment with Stripe
      console.log('Processing Stripe payment', { payment_method_id });
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'aed',
        payment_method: payment_method_id,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      if (paymentIntent.status === 'succeeded') {
        // Update WooCommerce order status
        await axios.put(
          `${wooCommerceApiUrl}/${orderId}`,
          {
            status: 'processing',
            set_paid: true,
            transaction_id: paymentIntent.id,
          },
          wooCommerceAuth
        );

        console.log(`Stripe payment succeeded for order: ${orderId}`, { paymentIntentId: paymentIntent.id });
        return res.json({ success: true, order_id: orderId });
      } else {
        console.warn(`Stripe payment failed for order: ${orderId}`, { status: paymentIntent.status });
        return res.status(400).json({ success: false, message: `Payment failed: status ${paymentIntent.status}` });
      }
    } else if (order_data.payment_method === 'tabby') {
      // Process payment with Tabby
      console.log('Processing Tabby payment', { orderId });
      const tabbyResponse: AxiosResponse = await axios.post(tabbyApiUrl, { order_id: orderId });
      console.log(`Tabby checkout created for order: ${orderId}`, { tabbyData: tabbyResponse.data });
      return res.json({ success: true, order_id: orderId, tabby_checkout: tabbyResponse.data });
    } else {
      // For COD (Cash on Delivery)
      await axios.put(
        `${wooCommerceApiUrl}/${orderId}`,
        {
          status: 'processing',
          set_paid: order_data.payment_method === 'cod' ? false : true,
        },
        wooCommerceAuth
      );

      console.log(`COD order processed: ${orderId}`);
      return res.json({ success: true, order_id: orderId });
    }
  } catch (error: any) {
    console.error('Error processing order:', error.message, { stack: error.stack });
    return res.status(500).json({ success: false, message: `Error processing order: ${error.message}` });
  }
});

// Get Tabby payment session for an order
/**
 * Creates a Tabby payment session for a specific order
 * @route POST /api/tabby-checkout
 * @param order_id - WooCommerce order ID
 */
app.post('/api/tabby-checkout', async (req: Request, res: Response) => {
  const { order_id } = req.body;

  // Validate request body
  if (!order_id || !Number.isInteger(order_id)) {
    console.warn('Invalid or missing order ID', { order_id });
    return res.status(400).json({ success: false, message: 'Order ID is missing or invalid' });
  }

  try {
    console.log('Creating Tabby payment session', { order_id });
    const tabbyResponse: AxiosResponse = await axios.post(tabbyApiUrl, { order_id });
    console.log(`Tabby payment session created for order: ${order_id}`, { tabbyData: tabbyResponse.data });
    return res.json({ success: true, tabby_checkout: tabbyResponse.data });
  } catch (error: any) {
    console.error('Error creating Tabby payment:', error.message, { stack: error.stack });
    return res.status(500).json({ success: false, message: `Error creating Tabby payment: ${error.message}` });
  }
});

// Update order status endpoint
/**
 * Updates the status of a WooCommerce order
 * @route PUT /api/update-order/:orderId
 * @param orderId - WooCommerce order ID
 * @param status - New order status (pending, processing, completed, failed)
 * @param transaction_id - Optional transaction ID
 */
app.put('/api/update-order/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, transaction_id } = req.body;

  // Validate request body
  if (!orderId || !status) {
    console.warn('Missing order ID or status', { orderId, status });
    return res.status(400).json({ success: false, message: 'Order ID and status are required' });
  }

  if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
    console.warn('Invalid status', { status });
    return res.status(400).json({ success: false, message: 'Invalid order status' });
  }

  if (transaction_id && typeof transaction_id !== 'string') {
    console.warn('Invalid transaction ID', { transaction_id });
    return res.status(400).json({ success: false, message: 'Transaction ID must be a string' });
  }

  try {
    console.log('Updating order status', { orderId, status });
    const updateData: any = {
      status,
      set_paid: status === 'processing' || status === 'completed',
    };

    if (transaction_id) {
      updateData.transaction_id = transaction_id;
    }

    await axios.put(`${wooCommerceApiUrl}/${orderId}`, updateData, wooCommerceAuth);
    console.log(`Order status updated: ${orderId}`, { status });
    return res.json({ success: true, message: 'Order status updated' });
  } catch (error: any) {
    console.error('Error updating order:', error.message, { stack: error.stack });
    return res.status(500).json({ success: false, message: `Error updating order: ${error.message}` });
  }
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing or SSR integration
export default app;