const { spawn, execSync } = require('child_process');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Variables to store order ID
let testOrderId = null;
let serverProcess = null;

// Start the server
function startServer() {
  console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  STARTING TEST SERVER ${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
  
  // Start server with test environment variables
  serverProcess = spawn('node', ['-r', './test-env.js', 'index.js'], { 
    stdio: ['inherit', 'pipe', 'pipe']
  });
  
  // Process server output
  serverProcess.stdout.on('data', (data) => {
    console.log(`${colors.cyan}[SERVER] ${colors.reset}${data.toString().trim()}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`${colors.red}[SERVER ERROR] ${colors.reset}${data.toString().trim()}`);
  });
  
  // Return a promise that resolves when server is ready
  return new Promise((resolve) => {
    // Wait a bit for server to start
    setTimeout(() => {
      console.log(`${colors.green}Server started${colors.reset}`);
      resolve();
    }, 2000);
  });
}

// Run API tests
async function runApiTests() {
  console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  RUNNING API TESTS ${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    // Create a child process for the tests
    const testProcess = spawn('node', ['test.js'], { 
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let testOutput = '';
    
    // Process test output
    testProcess.stdout.on('data', (data) => {
      const output = data.toString();
      testOutput += output;
      console.log(output.trim());
      
      // Try to extract the order ID from the output
      const orderIdMatch = output.match(/"order_id":\s*"([^"]+)"/);
      if (orderIdMatch && orderIdMatch[1]) {
        testOrderId = orderIdMatch[1];
      }
    });
    
    testProcess.stderr.on('data', (data) => {
      console.error(`${colors.red}${data.toString().trim()}${colors.reset}`);
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}API tests completed successfully${colors.reset}`);
        resolve();
      } else {
        console.error(`${colors.red}API tests failed with code ${code}${colors.reset}`);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
  });
}

// Run webhook simulator
async function runWebhookSimulator() {
  if (!testOrderId) {
    console.log(`${colors.yellow}No order ID found, skipping webhook test${colors.reset}`);
    return;
  }
  
  console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  TESTING WEBHOOK WITH ORDER: ${testOrderId} ${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
  
  return new Promise((resolve, reject) => {
    const webhookProcess = spawn('node', ['webhook-simulator.js', testOrderId], { 
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    webhookProcess.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });
    
    webhookProcess.stderr.on('data', (data) => {
      console.error(`${colors.red}${data.toString().trim()}${colors.reset}`);
    });
    
    webhookProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}Webhook simulation completed successfully${colors.reset}`);
        resolve();
      } else {
        console.error(`${colors.red}Webhook simulation failed with code ${code}${colors.reset}`);
        reject(new Error(`Webhook simulation failed with code ${code}`));
      }
    });
  });
}

// Stop the server
function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess && !serverProcess.killed) {
      console.log(`${colors.yellow}Shutting down test server...${colors.reset}`);
      
      // Kill the server process
      serverProcess.kill();
      
      // Ensure process is killed
      setTimeout(() => {
        if (!serverProcess.killed) {
          console.log(`${colors.yellow}Force killing server process...${colors.reset}`);
          try {
            process.kill(serverProcess.pid);
          } catch (err) {
            // Ignore errors if process already exited
          }
        }
        resolve();
      }, 1000);
    } else {
      resolve();
    }
  });
}

// Main function to run all tests
async function runAll() {
  try {
    console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}  CASHFREE BACKEND TEST SUITE ${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}========================================${colors.reset}`);
    
    // Start server
    await startServer();
    
    // Run API tests
    await runApiTests();
    
    // Run webhook simulator
    await runWebhookSimulator();
    
    console.log(`${colors.bright}${colors.green}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}  ALL TESTS COMPLETED SUCCESSFULLY ${colors.reset}`);
    console.log(`${colors.bright}${colors.green}========================================${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Test suite failed: ${error.message}${colors.reset}`);
  } finally {
    // Clean up
    await stopServer();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log(`${colors.yellow}\nInterrupted by user${colors.reset}`);
  await stopServer();
  process.exit();
});

// Start the tests
runAll(); 