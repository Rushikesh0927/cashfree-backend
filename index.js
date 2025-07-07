const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Use environment variables for security
const APP_ID = process.env.APP_ID;
const SECRET_KEY = process.env.SECRET_KEY;

app.post('/generate-token', async (req, res) => {
  try {
    const { order_id, order_amount, customer_id, customer_phone, customer_email } = req.body;

    // Prepare order payload
    const payload = {
      order_id,
      order_amount,
      order_currency: 'INR',
      customer_details: {
        customer_id,
        customer_email,
        customer_phone,
      }
    };

    // Call Cashfree API to create order and get payment session ID
    const response = await axios.post(
      'https://api.cashfree.com/pg/orders', // Use production endpoint
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
    });
  }
});

// Add a new endpoint to verify payment status
app.get('/verify-payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Call Cashfree API to get order details
    const response = await axios.get(
      `https://api.cashfree.com/pg/orders/${orderId}`,
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
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to verify payment',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 