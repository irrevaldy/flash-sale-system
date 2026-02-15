// init-sale.js - Initialize flash sale via API

const http = require('http');

const now = new Date();
const startTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

const data = JSON.stringify({
  startTime: startTime,
  endTime: endTime,
  totalStock: 100,
  productName: 'Limited Edition Flash Sale Widget'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/sale/init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🔧 Initializing flash sale...');

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✅ Sale initialized successfully!');
      console.log(JSON.parse(body));
    } else {
      console.log('❌ Failed to initialize sale');
      console.log(body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('Make sure backend is running: cd backend && npm run dev');
});

req.write(data);
req.end();
