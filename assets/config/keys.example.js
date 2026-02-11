// API Configuration Example
// Copy this file to keys.js and add your actual API keys

const CONFIG = {
  // Gemini API Configuration
  // Get your API key from: https://makersuite.google.com/app/apikey
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  
  // Gemini API URL - Using v1 endpoint with gemini-1.5-flash model
  API_URL: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
};

// Make CONFIG available globally
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
