# SupriAI Troubleshooting Guide

This guide helps you resolve common issues with the SupriAI browser extension.

## Summary Feature Issues

### Issue: "Failed to generate summary"

**Possible Causes & Solutions:**

#### 1. API Key Not Configured

**Error:** `Please replace YOUR_GEMINI_API_KEY_HERE with your actual Gemini API key`

**Solution:**

1. Open `config/keys.js`
2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key
3. Get your key from: https://makersuite.google.com/app/apikey
4. Reload the extension in `chrome://extensions/`

#### 2. Invalid API Key

**Error:** `API key is invalid or doesn't have permission`

**Solution:**

1. Verify your API key is correct in `config/keys.js`
2. Make sure you copied the entire key without extra spaces
3. Check that your API key is active in Google AI Studio
4. Try generating a new API key

#### 3. Rate Limit Exceeded

**Error:** `Rate limit exceeded. Please wait a moment and try again.`

**Solution:**

- Wait 1-2 minutes before trying again
- Gemini API has usage limits for free tier
- Check your quota at: https://makersuite.google.com/

#### 4. Invalid Page Type

**Error:** `Please navigate to a webpage (http:// or https://)`

**Solution:**

- The extension cannot summarize:
  - Chrome internal pages (chrome://, chrome-extension://)
  - Local files (file://)
  - Browser settings pages
- Navigate to a regular webpage and try again

#### 5. Content Extraction Failed

**Error:** `No content found on this page to summarize`

**Solution:**

- The page might be:
  - Empty or loading
  - Behind a login wall
  - Using heavy JavaScript that hasn't loaded yet
- Try:
  - Refreshing the page
  - Waiting for the page to fully load
  - Checking if you're logged in (if required)

#### 6. Connection Issues

**Error:** `Could not connect to the page`

**Solution:**

1. Refresh the webpage
2. Reload the extension
3. Close and reopen the extension popup
4. Check your internet connection

## Font Display Issues

### Issue: Fonts not displaying correctly

**Solution:**

1. Check browser console (F12) for font loading errors
2. Verify font files exist in `fonts/` directory:
   - GoogleSans-Regular.woff
   - GoogleSans-Medium.woff
   - GoogleSans-Bold.woff
3. Reload the extension
4. Clear browser cache

## General Extension Issues

### Extension Not Loading

**Solution:**

1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Reload" on the SupriAI extension
4. Check for error messages

### Data Not Showing

**Solution:**

1. Browse some websites first
2. The extension needs time to collect data
3. Check the Overview tab after 5-10 minutes of browsing

### Charts Not Displaying

**Solution:**

1. Check browser console for Chart.js errors
2. Verify `lib/chart.js` exists
3. Reload the extension

## Debugging Steps

### Enable Detailed Logging

1. Open browser console (F12)
2. Go to the Console tab
3. Look for messages starting with:
   - `Sending request to Gemini API...`
   - `Content extracted from:`
   - `Summary generated successfully`

### Check Configuration

Open browser console and type:

```javascript
console.log(CONFIG);
```

Should show:

```javascript
{
  GEMINI_API_KEY: "AIza...", // Your actual key
  API_URL: "https://generativelanguage.googleapis.com/..."
}
```

### Test Content Extraction

1. Open a webpage
2. Open browser console (F12)
3. Type:

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(
    tabs[0].id,
    { action: "getPageContent" },
    (response) => {
      console.log("Content length:", response.content.length);
      console.log("Success:", response.success);
    },
  );
});
```

## Getting Help

If issues persist:

1. **Check Console Errors:**
   - Press F12
   - Go to Console tab
   - Look for red error messages
   - Copy the error message

2. **Verify Installation:**
   - All files present in extension directory
   - No missing dependencies
   - Extension enabled in chrome://extensions/

3. **Test with Simple Page:**
   - Try summarizing a simple news article
   - Avoid complex web apps initially

4. **API Status:**
   - Check Google AI Studio status
   - Verify API quotas not exceeded
   - Test API key with a simple request

## Common Error Messages Reference

| Error Message                    | Cause                     | Solution             |
| -------------------------------- | ------------------------- | -------------------- |
| `Configuration not loaded`       | config/keys.js not loaded | Reload extension     |
| `No active tab found`            | No tab selected           | Click on a tab first |
| `Page content is too short`      | Page has minimal text     | Try a different page |
| `Invalid request`                | Malformed API request     | Check API key format |
| `403 Forbidden`                  | Invalid API key           | Verify API key       |
| `429 Too Many Requests`          | Rate limit hit            | Wait and retry       |
| `Could not establish connection` | Content script issue      | Refresh page         |

## Performance Tips

1. **Faster Summaries:**
   - Use on text-heavy pages
   - Avoid very long articles (>10,000 words)
   - Close unnecessary tabs

2. **Better Results:**
   - Wait for page to fully load
   - Use on well-formatted content
   - Avoid pages with lots of navigation/ads

3. **Resource Usage:**
   - Close inactive tabs regularly
   - Clear old tracking data periodically
   - Monitor memory usage in Task Manager

## Still Having Issues?

1. Uninstall and reinstall the extension
2. Check Chrome version (should be latest)
3. Try in Incognito mode (enable extension in incognito)
4. Review the browser console for specific errors
