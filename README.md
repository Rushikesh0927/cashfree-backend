# Cashfree Backend for UPI Payments

This is a minimal Express backend to generate Cashfree payment session tokens for UPI payments.

## Environment Variables
- `APP_ID`: Your Cashfree App ID
- `SECRET_KEY`: Your Cashfree Secret Key

## How to Deploy on Render

1. Push this folder to a GitHub repository.
2. Go to [Render.com](https://render.com/) and create a new Web Service.
3. Connect your GitHub and select this repo.
4. Set the following:
   - **Environment:** Node
   - **Build Command:** (leave blank)
   - **Start Command:** `node index.js`
   - **Environment Variables:**
     - `APP_ID` = your Cashfree App ID
     - `SECRET_KEY` = your Cashfree Secret Key
5. Click **Create Web Service**.
6. After deployment, use the Render URL in your Flutter app for `/generate-token`.

## API
### POST `/generate-token`
**Body:**
```
{
  "order_id": "string",
  "order_amount": number,
  "customer_id": "string",
  "customer_email": "string",
  "customer_phone": "string"
}
```
**Response:**
```
{
  "payment_session_id": "string"
}
``` 