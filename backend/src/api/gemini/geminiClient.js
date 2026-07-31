const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

// Fallback models list in order of preference
const MODEL_FALLBACKS = [
  config.gemini.model || 'gemini-2.0-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

function getModel(modelName) {
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3,
      topP: 0.85,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  });
}

/**
 * Call Gemini with automatic model fallback and JSON parsing.
 * @param {string} prompt
 * @returns {Promise<object>}
 */
async function callGemini(prompt) {
  let lastError = null;

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = getModel(modelName);
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      logger.info(`Gemini signal generated successfully using model: ${modelName}`);
      return parsed;
    } catch (err) {
      lastError = err;
      logger.warn(`Gemini call failed with model ${modelName}: ${err.message.split('\n')[0]}`);
      // If 429 quota error, wait 1s before trying next model
      if (err.message.includes('429')) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  logger.error('All Gemini model fallbacks failed:', lastError?.message);
  throw lastError;
}

/**
 * Call Gemini for a chat-style conversation.
 * @param {Array<{role, parts}>} history
 * @param {string} newMessage
 */
async function callGeminiChat(history, newMessage) {
  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model || 'gemini-2.0-flash' });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(newMessage);
    return result.response.text();
  } catch (err) {
    logger.error('Gemini chat call failed:', err.message);
    throw err;
  }
}

module.exports = { callGemini, callGeminiChat };
