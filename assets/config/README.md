# Configuration Setup

This directory contains configuration files for the TabsTracker extension.

## Setting Up API Keys

The extension uses Google's Gemini API for content curation and summarization features.

### Steps to Configure:

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy your API key

2. **Configure the Extension**
   - Open `config/keys.js` in a text editor
   - Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key
   - Save the file

3. **Reload the Extension**
   - Go to `chrome://extensions/`
   - Find "Tab Time Tracker"
   - Click the reload icon

### File Structure:

- **`keys.js`** - Your actual API keys (NEVER commit this file!)
- **`keys.example.js`** - Template file (safe to commit)

### Security Notes:

⚠️ **IMPORTANT**: The `keys.js` file contains sensitive information and is automatically ignored by git. Never commit this file to version control or share it publicly.

### Troubleshooting:

If the AI features aren't working:

1. Verify your API key is correct in `keys.js`
2. Check the browser console for error messages
3. Ensure you have an active internet connection
4. Verify your Gemini API quota hasn't been exceeded
