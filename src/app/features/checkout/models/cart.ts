// Interface for cart items
interface CartItem {
    product_id: number;
    quantity: number;
    [key: string]: any; // For additional properties
  }
  // Interface for cart total
  interface CartTotal {
    total: number;
    currency: string;
  }
  // Interface for payment intent response
  interface PaymentIntentResponse {
    success: boolean;
    clientSecret: string;
    paymentIntentId: string;
  }
