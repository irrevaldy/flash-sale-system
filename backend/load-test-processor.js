// load-test-processor.js
// Custom functions for Artillery load testing

/**
 * Generate random user ID for load testing
 */
function generateRandomUser(context, events, done) {
  const randomNum = Math.floor(Math.random() * 100000);
  context.vars.userId = `user${randomNum}@loadtest.com`;
  return done();
}

/**
 * Generate random product ID from a list
 */
function generateRandomProduct(context, events, done) {
  const products = [
    'HEADPHONE-001',
    'LAPTOP-001',
    'WATCH-001',
    'CAMERA-001',
    'TABLET-001'
  ];
  const randomIndex = Math.floor(Math.random() * products.length);
  context.vars.productId = products[randomIndex];
  return done();
}

/**
 * Log response for debugging
 */
function logResponse(context, events, done) {
  console.log('Response status:', context.response?.statusCode);
  console.log('Response body:', context.response?.body);
  return done();
}

/**
 * Set random quantity between 1 and 3
 */
function setRandomQuantity(context, events, done) {
  context.vars.quantity = Math.floor(Math.random() * 3) + 1;
  return done();
}

/**
 * Generate timestamp
 */
function generateTimestamp(context, events, done) {
  context.vars.timestamp = new Date().toISOString();
  return done();
}

module.exports = {
  generateRandomUser,
  generateRandomProduct,
  logResponse,
  setRandomQuantity,
  generateTimestamp
};
