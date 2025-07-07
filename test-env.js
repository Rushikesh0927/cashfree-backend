// This script sets up environment variables for testing
// To use: node -r ./test-env.js index.js

// Cashfree test credentials
process.env.APP_ID = 'TEST12345678';
process.env.SECRET_KEY = 'TEST_SECRET_KEY_12345678';
process.env.WEBHOOK_SECRET = 'test_webhook_secret';
process.env.PORT = '3000';
process.env.NODE_ENV = 'development';

console.log('Test environment variables set!'); 