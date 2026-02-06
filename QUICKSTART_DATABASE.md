# Quick Start Guide: Database Integration

## Overview

This guide will help you integrate the new database backend feature into your SupriAI extension.

## What's Been Created

1. **services/database.js** - Core database service using IndexedDB
2. **services/databaseQueryHelper.js** - Helper functions for easy querying
3. **background-enhanced.js** - Enhanced background script with database integration
4. **schema.sql** - SQLite schema for future server-side sync
5. **examples/database-usage-examples.js** - Usage examples and demos
6. **DATABASE_README.md** - Comprehensive documentation

## Installation Steps

### Step 1: The manifest.json has already been updated

✅ Background service worker changed to `background-enhanced.js`
✅ Database services added to web_accessible_resources

### Step 2: Test the Database Feature

1. **Reload the extension** in Chrome:
   - Go to `chrome://extensions/`
   - Find SupriAI
   - Click the reload icon 🔄

2. **Open the browser console** (F12) and check for:

   ```
   Database initialized successfully
   New session created: session_xxxxx
   ```

3. **Browse some websites** to generate data

4. **Test the database** by opening the browser console and running:
   ```javascript
   // Get today's browsing summary
   chrome.runtime.sendMessage(
     {
       action: "getTabHistory",
     },
     (response) => {
       console.log("Tab History:", response);
     },
   );
   ```

### Step 3: Add Database Features to Your Popup

Add these scripts to `popup.html` (before your existing popup.js):

```html
<script src="services/databaseQueryHelper.js"></script>
```

### Step 4: Use Database Features in popup.js

Add these functions to your `popup.js`:

```javascript
// Display browsing summary
async function displayBrowsingSummary() {
  try {
    const summary = await DatabaseQueryHelper.getBrowsingSummary("today");

    // Update your UI with the summary
    document.getElementById("total-tabs").textContent = summary.totalTabs;
    document.getElementById("unique-domains").textContent =
      summary.uniqueDomains;
    document.getElementById("total-time").textContent =
      summary.totalActiveTimeFormatted;
  } catch (error) {
    console.error("Error getting summary:", error);
  }
}

// Show top domains
async function displayTopDomains() {
  try {
    const topDomains = await DatabaseQueryHelper.getMostVisitedDomains(
      5,
      "today",
    );

    const container = document.getElementById("top-domains-list");
    container.innerHTML = "";

    topDomains.forEach((domain) => {
      const item = document.createElement("div");
      item.className = "domain-item";
      item.innerHTML = `
        <span class="domain-name">${domain.domain}</span>
        <span class="domain-stats">
          ${domain.visitCount} visits | 
          ${DatabaseQueryHelper.formatTime(domain.totalActiveTime)}
        </span>
      `;
      container.appendChild(item);
    });
  } catch (error) {
    console.error("Error displaying top domains:", error);
  }
}

// Call these functions when popup loads
document.addEventListener("DOMContentLoaded", async () => {
  await displayBrowsingSummary();
  await displayTopDomains();
});
```

## Testing the Database

### Option 1: Use the Browser Console

Open the browser console (F12) and run:

```javascript
// Test 1: Get current session data
chrome.runtime.sendMessage(
  {
    action: "getSessionData",
  },
  (response) => {
    console.log("Current Session:", response);
  },
);

// Test 2: Get domain statistics
chrome.runtime.sendMessage(
  {
    action: "getDomainStats",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  },
  (response) => {
    console.log("Domain Stats:", response);
  },
);

// Test 3: Export all data
chrome.runtime.sendMessage(
  {
    action: "exportData",
  },
  (response) => {
    console.log("Exported Data:", response);
  },
);
```

### Option 2: Use the Example Dashboard

1. Open the extension popup
2. Open the browser console (F12)
3. Copy and paste the contents of `examples/database-usage-examples.js`
4. Run: `createDashboard()`

This will display a comprehensive dashboard in the console showing:

- Today's browsing summary
- Top visited domains
- Time-consuming domains
- Productivity analysis

## Available Database Features

### 1. Tab History

```javascript
const tabs = await DatabaseQueryHelper.getTodaysTabs();
const weekTabs = await DatabaseQueryHelper.getThisWeeksTabs();
const monthTabs = await DatabaseQueryHelper.getThisMonthsTabs();
```

### 2. Domain Statistics

```javascript
const stats = await DatabaseQueryHelper.getTodaysDomainStats();
const topDomains = await DatabaseQueryHelper.getMostVisitedDomains(10, "week");
const timeConsumingDomains = await DatabaseQueryHelper.getDomainsWithMostTime(
  10,
  "week",
);
```

### 3. Session Data

```javascript
const sessionData = await DatabaseQueryHelper.getCurrentSessionData();
```

### 4. Browsing Summary

```javascript
const summary = await DatabaseQueryHelper.getBrowsingSummary("today");
// Returns: { totalTabs, uniqueDomains, totalActiveTime, totalVisits, ... }
```

### 5. Data Export

```javascript
await DatabaseQueryHelper.downloadDataAsJSON();
```

### 6. Data Cleanup

```javascript
await DatabaseQueryHelper.clearOldData(30); // Keep last 30 days
```

## Next Steps

1. **Add UI Elements** to your popup to display database statistics
2. **Create Charts** using the domain statistics data
3. **Add Export Button** to allow users to download their data
4. **Implement Search** to find specific tabs in history
5. **Add Filters** to view data by date range or domain

## Troubleshooting

### Database not initializing

- Check the browser console for errors
- Make sure you've reloaded the extension
- Try removing and re-adding the extension

### Data not persisting

- Check if browser is in incognito mode
- Verify IndexedDB is enabled in browser settings
- Check browser storage quota

### Performance issues

- Run `clearOldData()` to remove old records
- Reduce the number of records queried at once
- Use date range filters

## Need Help?

Refer to:

- **DATABASE_README.md** - Comprehensive documentation
- **examples/database-usage-examples.js** - Usage examples
- **schema.sql** - Database schema reference

## Future Enhancements

Consider adding:

- Server-side sync with SQLite database
- Advanced analytics and insights
- Data visualization with charts
- Export to CSV/Excel
- Full-text search across tab history
- User-defined tags for tabs
