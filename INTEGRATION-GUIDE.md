# SupriAI Offline Integration Guide

## Quick Start - Enable Offline Mode

Follow these steps to enable full offline functionality in your SupriAI extension.

---

## Step 1: Update manifest.json

Add the new offline files to your manifest's web_accessible_resources:

```json
"web_accessible_resources": [
    {
        "resources": [
            "dashboard.html",
            "styles.css",
            "libs/*",
            "cursor.css",
            "offline-manager.js",
            "offline-analytics.js",
            "offline-ai.js",
            "offline-status-ui.js",
            "offline-styles.css"
        ],
        "matches": ["<all_urls>"]
    }
]
```

---

## Step 2: Choose Your Background Script

### Option A: Use Enhanced Background Script (Recommended)

Rename your current `background.js` to `background-original.js` as backup:

```powershell
Move-Item background.js background-original.js
Move-Item background-enhanced.js background.js
```

### Option B: Keep Current Background Script

If you want to keep your current background.js, you'll need to manually integrate the offline functionality. See OFFLINE-MODE.md for details.

---

## Step 3: Update dashboard.html

Add these lines in the `<head>` section of dashboard.html:

```html
<!-- Offline Mode Styles -->
<link rel="stylesheet" href="offline-styles.css">
```

Add these lines before the closing `</body>` tag:

```html
<!-- Offline Mode Scripts -->
<script src="offline-manager.js"></script>
<script src="offline-analytics.js"></script>
<script src="offline-ai.js"></script>
<script src="offline-status-ui.js"></script>
```

---

## Step 4: Update popup.html

Add these lines in the `<head>` section:

```html
<link rel="stylesheet" href="offline-styles.css">
```

Add these lines before closing `</body>`:

```html
<script src="offline-status-ui.js"></script>
```

---

## Step 5: Reload Extension

1. Open Chrome Extensions page: `chrome://extensions`
2. Find SupriAI
3. Click the reload icon 🔄
4. Check for any errors in console

---

## Step 6: Test Offline Mode

### Test 1: Check Status Badge
- Look for the status indicator in the header
- Should show green dot with "Online"

### Test 2: Test Offline Analytics
Open browser console and run:
```javascript
chrome.runtime.sendMessage({
    type: 'GET_TODAY_STATS'
}, response => console.log(response));
```

### Test 3: Test Offline AI
```javascript
chrome.runtime.sendMessage({
    type: 'CHAT_MESSAGE',
    data: { message: 'Show my stats' }
}, response => console.log(response));
```

### Test 4: Simulate Offline
1. Open DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Try using the app - everything should still work!

---

## Step 7: Backend Updates (Optional)

If you want the backend to support bulk sync, add this endpoint to your `backend/app.py`:

```python
@app.route('/bulk_log', methods=['POST'])
def bulk_log():
    """Bulk log activities from offline queue"""
    try:
        logs = request.json
        if not isinstance(logs, list):
            return jsonify({'status': 'error', 'message': 'Invalid data format'}), 400
        
        synced_count = 0
        for log_data in logs:
            # Process each log
            database.log_activity(
                url=log_data.get('url', ''),
                title=log_data.get('title', 'Untitled'),
                category=log_data.get('category', 'Other'),
                duration=log_data.get('duration', 0),
                timestamp=log_data.get('timestamp', datetime.now())
            )
            synced_count += 1
        
        return jsonify({
            'status': 'success',
            'synced_count': synced_count
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
```

---

## Verification Checklist

- [ ] Manifest.json updated with new files
- [ ] Background script using enhanced version
- [ ] Dashboard.html includes offline scripts
- [ ] Popup.html includes offline styles
- [ ] Extension reloaded without errors
- [ ] Status badge visible in header
- [ ] IndexedDB created (check DevTools > Application > IndexedDB)
- [ ] Analytics work offline
- [ ] AI chat works offline
- [ ] Data syncs when online

---

## Features You Can Now Use

### 1. **Offline Activity Tracking**
All your browsing activity is tracked even when offline and syncs automatically when you're back online.

### 2. **Offline Analytics**
View your statistics, productivity scores, streaks, and insights without internet.

### 3. **Offline AI Assistant**
Chat with your AI assistant and get intelligent responses based on your local data.

### 4. **Smart Sync**
Data automatically syncs to the server when connection is restored with visual feedback.

### 5. **Connection Status**
Always know your connection status with the visual indicator in the header.

---

## Customization Options

### Change Sync Interval
In `background-enhanced.js`:
```javascript
const SYNC_INTERVAL = 5; // Change to your preferred minutes
```

### Change Cache Duration
In `offline-manager.js`:
```javascript
await offlineManager.cacheData('key', data, 7200000); // 2 hours
```

### Customize AI Responses
Edit `offline-ai.js` knowledge base:
```javascript
this.knowledgeBase = {
    greetings: ['hello', 'hi', 'hey'],
    // Add more keywords
};
```

---

## Troubleshooting

### Status Badge Not Showing?
- Check if offline-status-ui.js is loaded
- Verify the header element exists
- Check browser console for errors

### Data Not Syncing?
- Click the status badge to see sync details
- Check network connection
- Verify backend is running
- Look for errors in console

### Offline Mode Not Working?
- Verify IndexedDB is enabled in browser
- Check if files are loaded (Network tab)
- Ensure no JavaScript errors
- Try in incognito mode

### IndexedDB Errors?
Clear and reinitialize:
```javascript
// In browser console
indexedDB.deleteDatabase('SupriAI_OfflineDB');
location.reload();
```

---

## Need Help?

1. Check the comprehensive [OFFLINE-MODE.md](OFFLINE-MODE.md) documentation
2. Review browser console for errors
3. Check DevTools > Application > IndexedDB
4. Test in incognito mode
5. Verify all files are loaded in Network tab

---

## Next Steps

Once offline mode is working:

1. **Test thoroughly**: Try various scenarios
2. **Monitor storage**: Check IndexedDB size
3. **Optimize sync**: Adjust intervals based on usage
4. **Customize UI**: Modify offline-styles.css
5. **Extend AI**: Add more responses in offline-ai.js

---

**Congratulations! Your SupriAI now works seamlessly online and offline!** 🎉
