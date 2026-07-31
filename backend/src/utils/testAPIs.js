require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

async function testAPIs() {
  console.log('==========================================');
  console.log('  TESTING API CREDENTIALS');
  console.log('==========================================');

  // 1. Test Gemini
  console.log('\n--- 1. Testing Gemini LLM ---');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'CONFIGURED (' + process.env.GEMINI_API_KEY.slice(0, 8) + '...)' : 'MISSING');
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    const result = await model.generateContent('Generate a brief test JSON: {"status": "ok"}');
    console.log('✅ Gemini LLM connection SUCCESS!');
    console.log('Response:', result.response.text().trim());
  } catch (err) {
    console.error('❌ Gemini LLM failed:', err.message);
  }

  // 2. Test Dhan
  console.log('\n--- 2. Testing Dhan API ---');
  console.log('DHAN_CLIENT_ID:', process.env.DHAN_CLIENT_ID || 'MISSING');
  console.log('DHAN_ACCESS_TOKEN:', process.env.DHAN_ACCESS_TOKEN ? 'CONFIGURED (length: ' + process.env.DHAN_ACCESS_TOKEN.length + ')' : 'MISSING');

  if (process.env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN) {
    try {
      const res = await axios.get('https://api.dhan.co/v2/fundlimit', {
        headers: {
          'access-token': process.env.DHAN_ACCESS_TOKEN,
          'client-id': process.env.DHAN_CLIENT_ID,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      console.log('✅ Dhan API connection SUCCESS!');
      console.log('Funds data:', res.data);
    } catch (err) {
      console.error('❌ Dhan API failed:', err.response ? JSON.stringify(err.response.data) : err.message);
    }
  } else {
    console.warn('⚠️ Dhan credentials not provided in .env');
  }
}

testAPIs();
