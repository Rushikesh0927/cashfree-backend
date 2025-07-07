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
    res.json({ payment_session_id: response.data.payment_session_id });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate token', details: error.response?.data || error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cashfree backend running on port ${PORT}`);
}); 