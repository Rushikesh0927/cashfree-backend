# Cashfree Payment Backend

A Node.js backend service for processing UPI payments with Cashfree Payment Gateway, featuring automatic payment confirmation.

## Features

- Generate payment tokens for Cashfree UPI payments
- Process webhook notifications from Cashfree
- Automatically verify payment status
- Support for both sandbox and production environments

## Prerequisites

- Node.js 16 or higher
- Cashfree merchant account with API credentials
- Render.com account for deployment

## Environment Variables

The following environment variables must be set:

- `APP_ID`: Your Cashfree App ID
- `SECRET_KEY`: Your Cashfree Secret Key
- `WEBHOOK_SECRET`: Secret key for verifying webhook signatures
- `PORT`: Port for the server to listen on (default: 3000)
- `NODE_ENV`: Set to 'production' in production environment

## Local Development

1. Clone the repository
2. Create a `.env` file in the root directory based on `.env-example`
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

- `GET /`: Health check endpoint
- `POST /generate-token`: Generate payment token for Cashfree
- `POST /webhook/payment`: Webhook endpoint for Cashfree payment notifications
- `GET /verify-payment/:orderId`: Verify payment status for an order

## Deployment to Render

### Option 1: One-Click Deploy with render.yaml

1. Fork this repository to your GitHub account
2. Log in to your Render account
3. Click the "New +" button and select "Blueprint"
4. Connect your GitHub account and select this repository
5. Render will automatically detect the `render.yaml` file and create the service
6. Configure environment variables in the Render dashboard

### Option 2: Manual Deployment

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. Click the "New +" button and select "Web Service"
3. Connect your GitHub repository or provide the public GitHub repo URL
4. Configure the service with the following settings:
   - **Name**: cashfree-backend
   - **Environment**: Node
   - **Build Command**: npm install
   - **Start Command**: node index.js
5. Add the required environment variables in the "Environment" section
6. Click "Create Web Service"

## Configuring Your Flutter App

Update your Flutter app's `payment_service.dart` file to point to your new Render backend URL:

```dart
// For production use your Render backend URL
final String backendUrl = 'https://your-cashfree-backend.onrender.com';
```

## Testing

Use the Cashfree sandbox environment for testing by setting the appropriate API endpoint in your `.env` file. 