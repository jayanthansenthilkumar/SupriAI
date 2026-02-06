# SupriAI Database Backend Feature

## Overview

The SupriAI extension now includes a comprehensive database backend feature that stores all tab browsing history, sessions, and domain statistics for future analysis and insights.

## Architecture

### Database Technology

- **IndexedDB**: Browser-native database for persistent storage
- **Schema Design**: SQLite-compatible structure for future server-side sync
- **Storage Capacity**: Unlimited (browser-dependent, typically several GB)

### Database Schema

#### 1. **tabs** Store

Stores individual tab records with detailed information.

| Field      | Type           | Description                        |
| ---------- | -------------- | ---------------------------------- |
| id         | Integer (Auto) | Primary key                        |
| tabId      | Integer        | Chrome tab ID                      |
| url        | String         | Full URL of the tab                |
| domain     | String         | Domain name (e.g., github.com)     |
| title      | String         | Page title                         |
| favicon    | String         | Favicon URL                        |
| timestamp  | Integer        | Unix timestamp when tab was opened |
| sessionId  | String         | Associated session ID              |
| activeTime | Integer        | Total active time in milliseconds  |
| date       | String         | Date in YYYY-MM-DD format          |
| metadata   | JSON String    | Additional metadata                |

**Indexes**: tabId, url, domain, timestamp, sessionId, date

#### 2. **sessions** Store

Tracks browsing sessions.

| Field           | Type           | Description                            |
| --------------- | -------------- | -------------------------------------- |
| id              | Integer (Auto) | Primary key                            |
| sessionId       | String         | Unique session identifier              |
| startTime       | Integer        | Session start timestamp                |
| endTime         | Integer        | Session end timestamp (null if active) |
| tabCount        | Integer        | Number of tabs in session              |
| totalActiveTime | Integer        | Total active time across all tabs      |

**Indexes**: sessionId, startTime, endTime

#### 3. **domain_stats** Store

Aggregated statistics per domain per day.

| Field           | Type           | Description                      |
| --------------- | -------------- | -------------------------------- |
| id              | Integer (Auto) | Primary key                      |
| domain          | String         | Domain name                      |
| date            | String         | Date in YYYY-MM-DD format        |
| visitCount      | Integer        | Number of visits                 |
| totalActiveTime | Integer        | Total time spent in milliseconds |
| tabCount        | Integer        | Number of tabs opened            |
| lastVisit       | Integer        | Last visit timestamp             |

**Indexes**: domain, date, [domain, date] (composite)

#### 4. **tab_events** Store

Detailed event log for tab activities.

| Field     | Type           | Description                                          |
| --------- | -------------- | ---------------------------------------------------- |
| id        | Integer (Auto) | Primary key                                          |
| tabId     | Integer        | Chrome tab ID                                        |
| eventType | String         | Event type: opened, closed, activated, updated, idle |
| timestamp | Integer        | Event timestamp                                      |
| sessionId | String         | Associated session ID                                |
| url       | String         | Tab URL                                              |
| domain    | String         | Domain name                                          |
| metadata  | JSON String    | Additional event data                                |

**Indexes**: tabId, eventType, timestamp, sessionId

## Features

### 1. Automatic Tab Tracking

- Every tab opened is automatically saved to the database
- Tab events (open, close, activate, idle) are logged
- Active time is tracked and updated every 10 seconds

### 2. Session Management

- New session created on extension install/startup
- Session tracks all tabs opened during that browsing session
- Session statistics updated in real-time

### 3. Domain Statistics

- Daily aggregated statistics per domain
- Tracks visit count, total active time, and tab count
- Enables trend analysis and insights

### 4. Event Logging

- Comprehensive event log for all tab activities
- Useful for debugging and detailed analysis
- Tracks user behavior patterns

## API Reference

### Database Service (`services/database.js`)

#### Initialization

```javascript
await dbService.init();
```

#### Tab Operations

```javascript
// Save a tab
await dbService.saveTab({
  tabId: 123,
  url: "https://github.com",
  domain: "github.com",
  title: "GitHub",
  favicon: "https://github.com/favicon.ico",
  timestamp: Date.now(),
  sessionId: "session_123",
  activeTime: 5000,
});

// Get tabs by domain
const tabs = await dbService.getTabsByDomain("github.com");

// Get tabs by session
const sessionTabs = await dbService.getTabsBySession("session_123");

// Get tabs by date range
const tabs = await dbService.getTabsByDateRange(startDate, endDate);

// Get all tabs
const allTabs = await dbService.getAllTabs(100); // limit to 100
```

#### Session Operations

```javascript
// Create a new session
const sessionId = await dbService.createSession();

// Update a session
await dbService.updateSession(sessionId, {
  endTime: Date.now(),
  tabCount: 10,
  totalActiveTime: 60000,
});

// Get all sessions
const sessions = await dbService.getAllSessions();
```

#### Domain Statistics

```javascript
// Save domain stats
await dbService.saveDomainStats("github.com", "2026-02-06", {
  visitCount: 5,
  activeTime: 120000,
  tabCount: 3,
});

// Get domain stats for date range
const stats = await dbService.getDomainStats("2026-02-01", "2026-02-06");

// Get all domain stats
const allStats = await dbService.getAllDomainStats();
```

#### Event Logging

```javascript
// Log a tab event
await dbService.logTabEvent({
  tabId: 123,
  eventType: "opened", // or 'closed', 'activated', 'updated', 'idle'
  timestamp: Date.now(),
  sessionId: "session_123",
  url: "https://github.com",
  domain: "github.com",
  metadata: {
    /* custom data */
  },
});

// Get events for a tab
const events = await dbService.getTabEvents(123);
```

#### Data Management

```javascript
// Export all data to JSON
const data = await dbService.exportToJSON();

// Clear old data (older than 30 days)
const result = await dbService.clearOldData(30);

// Close database connection
dbService.close();
```

### Database Query Helper (`services/databaseQueryHelper.js`)

#### Quick Queries

```javascript
// Get today's tabs
const todayTabs = await DatabaseQueryHelper.getTodaysTabs();

// Get this week's tabs
const weekTabs = await DatabaseQueryHelper.getThisWeeksTabs();

// Get this month's tabs
const monthTabs = await DatabaseQueryHelper.getThisMonthsTabs();

// Get today's domain stats
const todayStats = await DatabaseQueryHelper.getTodaysDomainStats();

// Get current session data
const sessionData = await DatabaseQueryHelper.getCurrentSessionData();
```

#### Analytics

```javascript
// Get most visited domains
const topDomains = await DatabaseQueryHelper.getMostVisitedDomains(10, "week");

// Get domains with most time spent
const topTimeDomains = await DatabaseQueryHelper.getDomainsWithMostTime(
  10,
  "week",
);

// Get browsing summary
const summary = await DatabaseQueryHelper.getBrowsingSummary("today");
// Returns: { totalTabs, uniqueDomains, totalActiveTime, totalVisits, ... }
```

#### Data Export

```javascript
// Download data as JSON file
await DatabaseQueryHelper.downloadDataAsJSON();

// Export data programmatically
const data = await DatabaseQueryHelper.exportData();
```

#### Utility Functions

```javascript
// Format time
const formatted = DatabaseQueryHelper.formatTime(125000); // "2m 5s"
```

## Usage in Background Script

The enhanced background script (`background-enhanced.js`) automatically:

1. Initializes the database on extension install/startup
2. Creates a new browsing session
3. Tracks all tab activities and saves to database
4. Updates domain statistics every 10 seconds
5. Logs all tab events (open, close, activate, idle)

### Message Handlers

The background script listens for messages from the popup:

```javascript
// Get tab history
chrome.runtime.sendMessage(
  {
    action: "getTabHistory",
    startDate: Date.now() - 86400000, // 24 hours ago
    endDate: Date.now(),
    domain: "github.com", // optional
  },
  (response) => {
    console.log(response.tabs);
  },
);

// Get domain stats
chrome.runtime.sendMessage(
  {
    action: "getDomainStats",
    startDate: "2026-02-01",
    endDate: "2026-02-06",
  },
  (response) => {
    console.log(response.stats);
  },
);

// Get session data
chrome.runtime.sendMessage(
  {
    action: "getSessionData",
    sessionId: "session_123", // optional, defaults to current session
  },
  (response) => {
    console.log(response.tabs);
  },
);

// Export data
chrome.runtime.sendMessage(
  {
    action: "exportData",
  },
  (response) => {
    console.log(response.data);
  },
);

// Clear old data
chrome.runtime.sendMessage(
  {
    action: "clearOldData",
    daysToKeep: 30,
  },
  (response) => {
    console.log(response.result);
  },
);
```

## Integration Steps

### 1. Update manifest.json

Replace `background.js` with `background-enhanced.js`:

```json
{
  "background": {
    "service_worker": "background-enhanced.js"
  }
}
```

### 2. Add Database Scripts to Popup

Add to `popup.html`:

```html
<script src="services/database.js"></script>
<script src="services/databaseQueryHelper.js"></script>
```

### 3. Use in Popup

Example usage in `popup.js`:

```javascript
// Get browsing summary for today
async function showBrowsingSummary() {
  try {
    const summary = await DatabaseQueryHelper.getBrowsingSummary("today");

    console.log(`Total tabs: ${summary.totalTabs}`);
    console.log(`Unique domains: ${summary.uniqueDomains}`);
    console.log(`Total time: ${summary.totalActiveTimeFormatted}`);
    console.log(`Total visits: ${summary.totalVisits}`);

    // Display top domains
    const topDomains = await DatabaseQueryHelper.getMostVisitedDomains(
      5,
      "today",
    );
    topDomains.forEach((domain) => {
      console.log(
        `${domain.domain}: ${domain.visitCount} visits, ${DatabaseQueryHelper.formatTime(domain.totalActiveTime)}`,
      );
    });
  } catch (error) {
    console.error("Error getting summary:", error);
  }
}

// Export data
async function exportBrowsingData() {
  try {
    await DatabaseQueryHelper.downloadDataAsJSON();
    alert("Data exported successfully!");
  } catch (error) {
    console.error("Error exporting data:", error);
    alert("Failed to export data");
  }
}
```

## Data Privacy

- All data is stored locally in the browser's IndexedDB
- No data is sent to external servers
- Users can export and delete their data at any time
- Data persists across browser sessions

## Performance Considerations

- Database operations are asynchronous and non-blocking
- Indexes are created for efficient querying
- Old data can be automatically cleaned up
- Batch operations are used where possible

## Future Enhancements

1. **Server Sync**: Sync data to a server-side SQLite database
2. **Advanced Analytics**: Machine learning-based insights
3. **Data Visualization**: Interactive charts and graphs
4. **Export Formats**: CSV, Excel, PDF export options
5. **Automatic Cleanup**: Configurable data retention policies
6. **Search**: Full-text search across tab history
7. **Tags**: User-defined tags for tabs and sessions

## Troubleshooting

### Database Not Initializing

- Check browser console for errors
- Ensure IndexedDB is enabled in browser settings
- Try clearing browser data and reinstalling extension

### Data Not Persisting

- Check if browser is in incognito mode (IndexedDB may not persist)
- Verify sufficient storage space
- Check for browser storage quota errors

### Performance Issues

- Run `clearOldData()` to remove old records
- Reduce data retention period
- Check browser console for slow query warnings

## Support

For issues or questions, please refer to the main README.md or create an issue in the repository.
