const axios = require('axios');

// Base URL for API requests
const BASE_URL = 'http://localhost:3000';

// Test data for payment creation
const testOrderData = {
  order_id: `TEST_${Date.now()}`,
  order_amount: 1.00, // minimal test amount
  customer_id: 'test_customer',
  customer_phone: '9090407368',
  customer_email: 'test@example.com'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Test health check endpoint
async function testHealthCheck() {
  console.log(`${colors.bright}Testing Health Check Endpoint...${colors.reset}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/`);
    console.log(`${colors.green}✓ Health check successful:${colors.reset}`, response.data);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Health check failed:${colors.reset}`, error.message);
    return false;
  }
}

// Test token generation endpoint
async function testTokenGeneration() {
  console.log(`${colors.bright}Testing Token Generation...${colors.reset}`);
  
  try {
    console.log(`${colors.blue}Request data:${colors.reset}`, testOrderData);
    const response = await axios.post(`${BASE_URL}/generate-token`, testOrderData);
    
    if (response.data.success && response.data.payment_session_id) {
      console.log(`${colors.green}✓ Token generated successfully:${colors.reset}`, {
        order_id: response.data.order_id,
        success: response.data.success,
        payment_session_id: `${response.data.payment_session_id.substring(0, 10)}...` // Show only part of token for security
      });
      return response.data;
    } else {
      console.log(`${colors.yellow}⚠ Token generation response unexpected:${colors.reset}`, response.data);
      return null;
    }
  } catch (error) {
    console.error(`${colors.red}✗ Token generation failed:${colors.reset}`, 
      error.response?.data || error.message);
    return null;
  }
}

// Test payment verification endpoint
async function testPaymentVerification(orderId) {
  console.log(`${colors.bright}Testing Payment Verification...${colors.reset}`);
  
  try {
    const response = await axios.get(`${BASE_URL}/verify-payment/${orderId}`);
    console.log(`${colors.green}✓ Payment verification response:${colors.reset}`, response.data);
    return response.data;
  } catch (error) {
    console.error(`${colors.red}✗ Payment verification failed:${colors.reset}`, 
      error.response?.data || error.message);
    return null;
  }
}

// Run all tests sequentially
async function runAllTests() {
  console.log(`${colors.bright}${colors.blue}======= TESTING CASHFREE BACKEND =======${colors.reset}`);
  console.log(`${colors.yellow}Make sure the server is running at ${BASE_URL}${colors.reset}`);
  
  // Test health check
  const healthCheckSuccess = await testHealthCheck();
  if (!healthCheckSuccess) {
    console.log(`${colors.red}Server may not be running. Stopping tests.${colors.reset}`);
    return;
  }
  
  console.log('\n');
  
  // Test token generation
  const tokenData = await testTokenGeneration();
  if (!tokenData) {
    console.log(`${colors.red}Token generation failed. Cannot continue testing.${colors.reset}`);
    return;
  }
  
  console.log('\n');
  
  // Test payment verification
  await testPaymentVerification(tokenData.order_id);
  
  console.log(`\n${colors.bright}${colors.blue}======= TESTING COMPLETE =======${colors.reset}`);
}

// Start the tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test execution error:${colors.reset}`, error);
}); 