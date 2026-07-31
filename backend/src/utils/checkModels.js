require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTest = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro', 'models/gemini-1.5-flash'];

async function check() {
  for (const m of modelsToTest) {
    try {
      console.log('Testing model:', m);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent('Respond in JSON: {"status": "ok"}');
      console.log('✅ SUCCESS with model:', m);
      console.log('Response:', res.response.text().trim());
      return;
    } catch(e) {
      console.log('❌ Failed:', m, e.message.split('\n')[0]);
    }
  }
}
check();
