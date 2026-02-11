const CONFIG = {
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  API_URL: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
};
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}