const CONFIG = {
  GEMINI_API_KEY: 'AIzaSyB1LrW5sPkGDZlHsjv8qzhNlyHFSxBawkA',
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
};
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}