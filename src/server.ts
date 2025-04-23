import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bootstrap from './main.server';
import cors from 'cors'; // استيراد cors
import Stripe from 'stripe'; // استيراد Stripe
import axios from 'axios'; // استيراد axios

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine();

// تهيئة Stripe
const stripe = new Stripe('sk_test_51RGe88QGs0QbDBZ8kPNscx2fpIbg7m7poHhpU4KmRie4FSirvfUoq42Fp0mps66nJOM298M8Oatr7lmngYyCSc3J00C4NgXJfU');

// إعدادات WooCommerce API
const wooCommerceApiUrl = 'https://adventures-hub.com/wp-json/wc/v3/orders';
const wooCommerceAuth = {
  auth: {
    username: 'ck_74222275d064648b8c9f21284e42ed37f8595da5',
    password: 'cs_4c9f3b5fd41a135d862e973fc65d5c049e05fee4'
  }
};

// إعداد CORS للسماح بالطلبات من localhost:4200
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// معالجة طلبات OPTIONS (Preflight)
app.options('*', cors());

// تحليل جسم الطلبات بصيغة JSON
app.use(express.json());

// نقطة نهاية لمعالجة الدفع وإنشاء الطلب
// نقطة نهاية لمعالجة الدفع وإنشاء الطلب
app.post('/api/create-order', async (req, res) => {
  const { payment_method_id, order_data } = req.body;

  if (!payment_method_id || !order_data) {
    return res.status(400).json({ success: false, message: 'بيانات غير كاملة' });
  }

  try {
    // احسب المبلغ الإجمالي (يجب تعديله بناءً على بيانات الطلب)
    const total = order_data.line_items.reduce((sum: number, item: any) => {
      // افتراضي: السعر لكل عنصر 1000 فلس (10 AED). استبدل بالسعر الحقيقي
      return sum + item.quantity * 1000;
    }, 0);

    // إنشاء PaymentIntent مع إعدادات automatic_payment_methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'aed',
      payment_method: payment_method_id,
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // منع طرق الدفع التي تتطلب إعادة توجيه
      }
    });

    if (paymentIntent.status === 'succeeded') {
      // إنشاء الطلب في WooCommerce
      const wooCommerceOrder = await axios.post(wooCommerceApiUrl, {
        ...order_data,
        payment_method: 'stripe',
        transaction_id: paymentIntent.id,
        status: 'processing',
        set_paid: true
      }, wooCommerceAuth);

      return res.json({ success: true, order_id: wooCommerceOrder.data.id });
    } else {
      return res.status(400).json({ success: false, message: `فشل الدفع: حالة الدفع ${paymentIntent.status}` });
    }
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(400).json({ success: false, message: `خطأ في معالجة الطلب: ${error.message}` });
  }
});

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html'
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
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
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}