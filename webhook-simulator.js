const axios = require('axios');
const crypto = require('crypto');

// Base URL for API requests
const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Get the order ID from command line arguments
const orderId = process.argv[2];

if (!orderId) {
  console.error(`${colors.red}Error: Please provide an order ID as an argument${colors.reset}`);
  console.error(`Usage: node webhook-simulator.js ORDER_ID`);
  process.exit(1);
}

// Create webhook payload
const webhookPayload = {
  data: {
    order: {
      order_id: orderId,
      order_status: 'PAID',
      order_amount: 1.00,
      order_currency: 'INR',
      payment_session_id: `dummy_session_${Date.now()}`,
      order_status_update_time: new Date().toISOString(),
    },
    payment: {
      payment_id: `payment_${Date.now()}`,
      payment_status: 'SUCCESS',
      payment_method: 'UPI',
      payment_time: new Date().toISOString(),
    },
    customer_details: {
      customer_id: 'test_customer',
      customer_phone: '9090407368',
      customer_email: 'test@example.com'
    },
  },
  event_time: new Date().toISOString(),
  type: 'PAYMENT_SUCCESS_WEBHOOK'
};

// Generate signature (if WEBHOOK_SECRET is set)
function generateSignature(payload) {
  try {
    // Use the same webhook secret as in test-env.js
    const webhookSecret = 'test_webhook_secret';
    
    if (!webhookSecret) return null;
    
    return crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
  } catch (error) {
    console.error(`${colors.red}Error generating signature:${colors.reset}`, error);
    return null;
  }
}

// Send webhook request
async function sendWebhook() {
  console.log(`${colors.bright}${colors.blue}======= CASHFREE WEBHOOK SIMULATOR =======${colors.reset}`);
  console.log(`${colors.yellow}Simulating payment success webhook for order: ${orderId}${colors.reset}`);
  console.log(`${colors.blue}Webhook payload:${colors.reset}`, JSON.stringify(webhookPayload, null, 2));
  
  try {
    // Generate signature
    const signature = generateSignature(webhookPayload);
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (signature) {
      headers['x-webhook-signature'] = signature;
      console.log(`${colors.yellow}Added webhook signature${colors.reset}`);
    }
    
    // Send webhook request
    const response = await axios.post(
      `${BASE_URL}/webhook/payment`, 
      webhookPayload,
      { headers }
    );
    
    console.log(`${colors.green}✓ Webhook sent successfully:${colors.reset}`, response.data);
    
    // Verify payment status after webhook
    console.log(`\n${colors.bright}Verifying payment status after webhook...${colors.reset}`);
    const verifyResponse = await axios.get(`${BASE_URL}/verify-payment/${orderId}`);
    console.log(`${colors.green}✓ Payment status:${colors.reset}`, verifyResponse.data);
    
  } catch (error) {
    console.error(`${colors.red}✗ Error sending webhook:${colors.reset}`, 
      error.response?.data || error.message);
  }
}

// Execute
sendWebhook(); 