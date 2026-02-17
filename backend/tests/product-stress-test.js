import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // ramp up to 10 users
    { duration: '20s', target: 50 },   // ramp up to 50 users
    { duration: '20s', target: 100 },  // ramp up to 100 users
    { duration: '30s', target: 0 },    // ramp down
  ],
};

export default function () {
  const res = http.get('http://localhost:3000/api/products');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
