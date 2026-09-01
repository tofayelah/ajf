import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const secret = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-do-not-use-in-prod';
const token = jwt.sign(
  { userId: 'USR-0001', role: 'SUPER_ADMIN', username: 'SYSTEM' },
  secret,
  { expiresIn: '1h' }
);

const params = [{
  memberId: 'AJM-0001',
  collectionMonth: '2026-08',
  paidAmount: 500,
  discount: 0,
  paymentMethod: 'CASH', // The UI actually sends 'CASH' or 'Cash'?
  receivedBy: 'SYSTEM'
}];

fetch('http://localhost:3000/api/accounting/action', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ action: 'postCollection', params })
}).then(res => res.text()).then(text => console.log(text)).catch(console.error);
