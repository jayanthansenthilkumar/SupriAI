# SupriAI - API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
Currently, no authentication is required. API key authentication can be enabled in production.

---

## Health & Status Endpoints

### Check Server Health
```http
GET /health
```

**Response:**
```json
{
  "status": "running",
  "service": "SupriAI Backend",
  "version": "1.0.0",
  "timestamp": "2026-01-12T10:30:00"
}
```

### Get API Status
```http
GET /api/status
```

**Response:**
```json
{
  "status": "online",
  "database": "connected",
  "total_sessions": 150,
  "timestamp": "2026-01-12T10:30:00"
}
```

---

## Activity Logging Endpoints

### Log Activity
Log a single learning activity.

```http
POST /log_activity
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "title": "JavaScript Fundamentals",
  "content": "Article content...",
  "duration": 300,
  "engagement": {
    "maxScroll": 85.5,
    "clicks": 10,
    "mouseDistance": 5000
  },
  "timestamp": "2026-01-12T10:30:00"
}
```

**Response:**
```json
{
  "status": "success",
  "log_id": 123,
  "topic": "Programming",
  "confidence": 0.95,
  "engagement_score": 78.5,
  "recommendation": {
    "title": "Next Steps",
    "description": "Try learning about React"
  }
}
```

### Bulk Log
Log multiple activities at once.

```http
POST /bulk_log
Content-Type: application/json
```

**Request Body:**
```json
[
  {
    "url": "https://example.com/article1",
    "title": "Title 1",
    ...
  },
  {
    "url": "https://example.com/article2",
    "title": "Title 2",
    ...
  }
]
```

**Response:**
```json
{
  "status": "success",
  "synced_count": 2
}
```

---

## Analytics Endpoints

### Get Analytics
Get comprehensive analytics data.

```http
GET /get_analytics?days=7
```

**Query Parameters:**
- `days` (optional): Number of days to analyze (1-365, default: 7)

**Response:**
```json
{
  "total_sessions": 50,
  "total_learning_time": 18000,
  "unique_topics": 5,
  "top_topics": [
    {
      "topic": "Programming",
      "count": 25,
      "percentage": 50
    }
  ],
  "weekly_trends": {
    "labels": ["Mon", "Tue", "Wed", ...],
    "data": [2.5, 3.1, 2.8, ...]
  },
  "streak_days": 7,
  "total_points": 1500,
  "user_name": "User",
  "recommendations": []
}
```

### Get Topic Analytics
Get detailed topic breakdown.

```http
GET /api/analytics/topics?days=30
```

**Response:**
```json
{
  "status": "success",
  "topics": [
    {
      "topic": "Programming",
      "count": 50,
      "total_time": 15000,
      "avg_engagement": 75.5
    }
  ]
}
```

### Get Trends
Get learning trends over time.

```http
GET /api/analytics/trends?days=7
```

**Response:**
```json
{
  "status": "success",
  "trends": {
    "daily": [2.5, 3.1, 2.8, 3.5, 2.9, 3.2, 2.7],
    "topics": {...}
  },
  "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
}
```

---

## History Endpoints

### Get History
Get learning history.

```http
GET /api/history?days=30&limit=100&topic=Programming
```

**Query Parameters:**
- `days` (optional): Number of days (default: 30)
- `limit` (optional): Maximum records (default: 100)
- `topic` (optional): Filter by topic

**Response:**
```json
{
  "status": "success",
  "count": 50,
  "history": [
    {
      "id": 1,
      "url": "https://example.com",
      "title": "Article Title",
      "topic": "Programming",
      "duration": 300,
      "timestamp": "2026-01-12T10:30:00"
    }
  ]
}
```

### Search History
Search learning history.

```http
GET /api/history/search?q=javascript&limit=50
```

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Maximum results (default: 50)

**Response:**
```json
{
  "status": "success",
  "count": 10,
  "results": [...]
}
```

### Clear History
Clear all learning history.

```http
DELETE /api/history/clear
```

**Response:**
```json
{
  "status": "success",
  "message": "History cleared",
  "deleted_count": 150
}
```

---

## Goals Endpoints

### Get Goals
Get all user goals.

```http
GET /api/goals
```

**Response:**
```json
{
  "status": "success",
  "goals": [
    {
      "id": 1,
      "title": "Learn Python",
      "description": "Complete Python course",
      "goal_type": "weekly",
      "target_value": 10,
      "current_value": 5,
      "progress": 50,
      "is_completed": false
    }
  ]
}
```

### Create Goal
Create a new goal.

```http
POST /api/goals
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Learn React",
  "description": "Complete 10 hours of React learning",
  "goal_type": "weekly",
  "target_value": 10,
  "unit": "hours",
  "topic": "Web Development"
}
```

**Response:**
```json
{
  "status": "success",
  "goal_id": 2,
  "message": "Goal created successfully"
}
```

### Update Goal
Update goal progress.

```http
PUT /api/goals/1
Content-Type: application/json
```

**Request Body:**
```json
{
  "current_value": 7
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Goal updated"
}
```

### Delete Goal
Delete a goal.

```http
DELETE /api/goals/1
```

**Response:**
```json
{
  "status": "success",
  "message": "Goal deleted"
}
```

---

## Bookmarks Endpoints

### Get Bookmarks
Get all bookmarks.

```http
GET /api/bookmarks
```

**Response:**
```json
{
  "status": "success",
  "bookmarks": [
    {
      "id": 1,
      "url": "https://example.com",
      "title": "Great Article",
      "topic": "Programming",
      "notes": "Must read later",
      "created_at": "2026-01-12T10:30:00"
    }
  ]
}
```

### Add Bookmark
Add a new bookmark.

```http
POST /api/bookmarks
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "title": "Interesting Article",
  "topic": "Programming",
  "notes": "Save for later"
}
```

**Response:**
```json
{
  "status": "success",
  "bookmark_id": 5
}
```

### Delete Bookmark
Delete a bookmark.

```http
DELETE /api/bookmarks/1
```

**Response:**
```json
{
  "status": "success",
  "message": "Bookmark deleted"
}
```

---

## Export Endpoints

### Export Data
Export learning data.

```http
GET /api/export?format=json&days=30
```

**Query Parameters:**
- `format` (optional): Export format (json, csv, markdown)
- `days` (optional): Number of days to export

**Response:**
```json
{
  "status": "success",
  "format": "json",
  "data": {...}
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description",
  "error_type": "validation_error"
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (validation error)
- `404`: Not Found
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

---

## Rate Limiting

- **Default Limit**: 100 requests per 60 seconds per IP
- **Logging Endpoints**: 200 requests per 60 seconds
- **Response Header**: `X-RateLimit-Remaining` (when available)

When rate limit is exceeded:
```json
{
  "status": "error",
  "message": "Rate limit exceeded. Please try again later."
}
```

---

## Best Practices

1. **Error Handling**: Always check `status` field in response
2. **Rate Limits**: Implement exponential backoff for retries
3. **Validation**: Validate data before sending to API
4. **Timeouts**: Set appropriate request timeouts (5-10 seconds)
5. **Batch Operations**: Use bulk endpoints when logging multiple activities

---

## Examples

### JavaScript Example
```javascript
// Using the API client
const apiClient = new APIClient('http://localhost:5000');

// Log activity
const result = await apiClient.logActivity({
  url: 'https://example.com',
  title: 'Article Title',
  duration: 300,
  engagement: {
    maxScroll: 85,
    clicks: 10,
    mouseDistance: 5000
  }
});

// Get analytics
const analytics = await apiClient.getAnalytics(7);
```

### Python Example
```python
import requests

# Log activity
response = requests.post('http://localhost:5000/log_activity', json={
    'url': 'https://example.com',
    'title': 'Article Title',
    'duration': 300
})

data = response.json()
print(f"Topic: {data['topic']}")
```

---

## Changelog

### Version 2.0.0
- Added rate limiting
- Added caching
- Enhanced error handling
- Added validation
- Improved documentation

### Version 1.0.0
- Initial API release
