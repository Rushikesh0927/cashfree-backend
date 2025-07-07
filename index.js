const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Use environment variables for security
const APP_ID = process.env.APP_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Store payment statuses in memory (in production, use a database)
const paymentStatuses = {};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Cashfree payment backend is running',
    environment: IS_PRODUCTION ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

// Generate token endpoint
app.post('/generate-token', async (req, res) => {
  try {
    const { order_id, order_amount, customer_id, customer_phone, customer_email } = req.body;

    // Validate phone number
    let validPhone = customer_phone ? customer_phone.toString().trim() : '';
    // Remove non-digit characters
    validPhone = validPhone.replace(/\D/g, '');
    
    // Ensure valid Indian phone format (10 digits)
    if (validPhone.length > 10) {
      // Take the last 10 digits
      validPhone = validPhone.substring(validPhone.length - 10);
    } else if (validPhone.length < 10) {
      // Use default test number if too short
      validPhone = "9090407368";
    }
    
    console.log(`Processing order ${order_id} with validated phone: ${validPhone}`);

    // Prepare order payload
    const payload = {
      order_id,
      order_amount,
      order_currency: 'INR',
      customer_details: {
        customer_id,
        customer_email,
        customer_phone: validPhone,
      }
    };

    // Determine the correct Cashfree API endpoint based on environment
    const apiEndpoint = IS_PRODUCTION 
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    // Call Cashfree API to create order and get payment session ID
    const response = await axios.post(
      apiEndpoint,
      payload,
      {
        headers: {
          'x-client-id': APP_ID,
          'x-client-secret': SECRET_KEY,
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json',
        }
      }
    );

    // Store initial payment status as 'PENDING'
    paymentStatuses[order_id] = {
      status: 'PENDING',
      updated_at: new Date().toISOString(),
    };

    // Return the payment session ID to the client
    res.json({
      success: true,
      payment_session_id: response.data.payment_session_id,
      order_id: response.data.order_id,
      cf_order_id: response.data.cf_order_id,
    });
  } catch (error) {
    console.error('Error generating token:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to generate payment token',
      error: IS_PRODUCTION ? null : (error.message || 'Unknown error'),
    });
  }
});

// Webhook endpoint for payment status updates from Cashfree
app.post('/webhook/payment', (req, res) => {
  try {
    const requestData = req.body;
    console.log('Received webhook:', JSON.stringify(requestData));
    
    // Verify webhook authenticity (implement proper verification in production)
    const signature = req.headers['x-webhook-signature'];
    if (IS_PRODUCTION && !verifyWebhookSignature(requestData, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
    
    // Process the webhook data
    const orderId = requestData.data?.order?.order_id;
    const orderStatus = requestData.data?.order?.order_status;
    
    if (orderId && orderStatus) {
      // Update payment status in our storage
      paymentStatuses[orderId] = {
        status: orderStatus,
        updated_at: new Date().toISOString(),
        data: requestData.data,
      };
      
      console.log(`Updated payment status for order ${orderId} to ${orderStatus}`);
    }
    
    // Acknowledge receipt of webhook
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Add a new endpoint to verify payment status
app.get('/verify-payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // First check our local cache
    if (paymentStatuses[orderId] && paymentStatuses[orderId].status === 'PAID') {
      return res.json({
        success: true,
        order_id: orderId,
        status: 'PAID',
        is_paid: true,
        payment_details: paymentStatuses[orderId].data || {
          amount: 'unknown',
          currency: 'INR',
          payment_method: 'unknown',
          payment_time: paymentStatuses[orderId].updated_at,
        }
      });
    }
    
    // Determine the correct Cashfree API endpoint based on environment
    const apiEndpoint = IS_PRODUCTION 
      ? `https://api.cashfree.com/pg/orders/${orderId}`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    // Call Cashfree API to get order details
    const response = await axios.get(
      apiEndpoint,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': APP_ID,
          'x-client-secret': SECRET_KEY,
        }
      }
    );
    
    // Check payment status
    const paymentStatus = response.data.order_status;
    const isPaymentComplete = paymentStatus === 'PAID';
    
    // Update our local cache
    paymentStatuses[orderId] = {
      status: paymentStatus,
      updated_at: new Date().toISOString(),
      data: response.data,
    };
    
    res.json({
      success: true,
      order_id: response.data.order_id,
      status: paymentStatus,
      is_paid: isPaymentComplete,
      payment_details: {
        amount: response.data.order_amount,
        currency: response.data.order_currency,
        payment_method: response.data.payment_method,
        payment_time: response.data.order_status === 'PAID' ? response.data.order_status_update_time : null,
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error.response?.data || error.message);
    
    // If we have a cached status, return that
    const { orderId } = req.params;
    if (paymentStatuses[orderId]) {
      return res.json({
        success: true,
        order_id: orderId,
        status: paymentStatuses[orderId].status,
        is_paid: paymentStatuses[orderId].status === 'PAID',
        payment_details: paymentStatuses[orderId].data || {
          amount: 'unknown',
          currency: 'INR',
          payment_method: 'unknown',
          payment_time: paymentStatuses[orderId].updated_at,
        },
        source: 'cache',
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to verify payment',
      error: IS_PRODUCTION ? null : (error.message || 'Unknown error'),
    });
  }
});

// Function to verify webhook signature
function verifyWebhookSignature(payload, signature) {
  // In production, implement proper signature verification
  // using the webhook secret provided by Cashfree
  if (!signature || !WEBHOOK_SECRET) return false;
  
  try {
    // This is a simplified example - implement proper HMAC verification in production
    const calculatedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === calculatedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
  console.log(`API URL: ${IS_PRODUCTION ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'}`);
}); 