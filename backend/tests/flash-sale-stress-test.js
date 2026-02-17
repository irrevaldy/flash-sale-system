import http from 'k6/http';

export const options = {
  vus: 200,          // 200 concurrent users
  duration: '30s',
};

export default function () {
  http.post('http://localhost:3000/api/sale/purchase', {
    userId: `user-${Math.random()}`
  });
}
