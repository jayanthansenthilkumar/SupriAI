# SupriAI API Documentation

Complete REST API reference for SupriAI Learning Analytics Backend

**Base URL**: `http://localhost:5000`

---

## 📚 Table of Contents

1. [Library & History](#library--history)
2. [Bookmarks](#bookmarks)
3. [Notes & Reviews](#notes--reviews)
4. [Goals](#goals)
5. [Achievements](#achievements)
6. [Community & Leaderboard](#community--leaderboard)
7. [Statistics](#statistics)
8. [AI Features](#ai-features)
9. [User & Settings](#user--settings)

---

## Library & History

### Get Browsing History
```http
GET /api/history?days=30&limit=100
```

**Query Parameters:**
- `days` (optional): Number of days to fetch (default: 7)
- `limit` (optional): Maximum records (default: 50)
- `topic` (optional): Filter by topic

**Response:**
```json
{
  "status": "success",
  "history": [
    {
      "id": 1,
      "url": "https://example.com",
      "title": "Example Page",
      "topic": "Programming",
      "duration": 300,
      "engagement_score": 85,
      "timestamp": "2026-01-11T10:30:00",
      "is_bookmarked": false
    }
  ]
}
```

---

## Bookmarks

### Get All Bookmarks
```http
GET /api/bookmarks?topic=Programming
```

**Query Parameters:**
- `topic` (optional): Filter by topic

**Response:**
```json
{
  "status": "success",
  "bookmarks": [
    {
      "id": 1,
      "url": "https://example.com",
      "title": "Useful Resource",
      "topic": "Programming",
      "notes": "Great tutorial",
      "created_at": "2026-01-11T10:00:00"
    }
  ]
}
```

### Add Bookmark
```http
POST /api/bookmarks
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "title": "Resource Title",
  "topic": "Programming",
  "notes": "Optional notes",
  "content": "Optional content for auto-classification"
}
```

**Response:**
```json
{
  "status": "success",
  "bookmark_id": 1
}
```

### Delete Bookmark
```http
DELETE /api/bookmarks/{bookmark_id}
```

**Response:**
```json
{
  "status": "success"
}
```

---

## Notes & Reviews

### Get All Notes
```http
GET /api/notes?limit=50
```

**Query Parameters:**
- `limit` (optional): Maximum records (default: 50)

**Response:**
```json
{
  "status": "success",
  "notes": [
    {
      "id": 1,
      "title": "Learning Reflection",
      "category": "reflection",
      "content": "Today I learned...",
      "tags": "javascript,learning",
      "created_at": "2026-01-11T10:00:00"
    }
  ]
}
```

### Create Note
```http
POST /api/notes
```

**Request Body:**
```json
{
  "title": "Note Title",
  "category": "reflection",
  "content": "Note content here",
  "tags": "tag1,tag2,tag3"
}
```

**Categories:** `reflection`, `tip`, `problem`, `resource`, `idea`

**Response:**
```json
{
  "status": "success",
  "note_id": 1
}
```

### Update Note
```http
PUT /api/notes/{note_id}
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "category": "tip",
  "content": "Updated content",
  "tags": "updated,tags"
}
```

### Delete Note
```http
DELETE /api/notes/{note_id}
```

---

## Goals

### Get Goals
```http
GET /api/goals?active=true
```

**Query Parameters:**
- `active` (optional): Filter by active status (default: true)

**Response:**
```json
{
  "status": "success",
  "goals": [
    {
      "id": 1,
      "title": "Read 5 articles",
      "frequency": "weekly",
      "target_value": 5,
      "current_value": 3,
      "unit": "articles",
      "is_active": true,
      "created_at": "2026-01-11T10:00:00"
    }
  ]
}
```

### Create Goal
```http
POST /api/goals
```

**Request Body:**
```json
{
  "title": "Read 5 articles",
  "frequency": "weekly",
  "target_value": 5,
  "current_value": 0,
  "unit": "articles",
  "is_active": true
}
```

**Frequencies:** `daily`, `weekly`, `monthly`, `custom`

**Response:**
```json
{
  "status": "success",
  "goal_id": 1
}
```

### Update Goal
```http
PUT /api/goals/{goal_id}
```

**Request Body:**
```json
{
  "current_value": 4,
  "is_active": true
}
```

### Delete Goal
```http
DELETE /api/goals/{goal_id}
```

---

## Achievements

### Get Achievements
```http
GET /api/achievements
```

**Response:**
```json
{
  "status": "success",
  "achievements": [
    {
      "id": 1,
      "badge_name": "First Steps",
      "badge_icon": "ri-footprint-line",
      "description": "Completed your first learning session",
      "unlocked_at": "2026-01-11T10:00:00"
    }
  ]
}
```

### Check for New Achievements
```http
POST /api/achievements/check
```

**Response:**
```json
{
  "status": "success",
  "new_achievements": [
    {
      "badge_name": "Week Warrior",
      "badge_icon": "ri-fire-line",
      "description": "Maintained a 7-day streak"
    }
  ]
}
```

---

## Community & Leaderboard

### Get Leaderboard
```http
GET /api/community/leaderboard?timeframe=all&limit=10
```

**Query Parameters:**
- `timeframe` (optional): `all`, `month`, `week` (default: all)
- `limit` (optional): Number of users to return (default: 10)

**Response:**
```json
{
  "status": "success",
  "leaderboard": [
    {
      "id": 1,
      "rank": 1,
      "display_name": "User",
      "avatar_initial": "U",
      "total_points": 5000,
      "streak_days": 15,
      "sessions": 254,
      "total_minutes": 11607
    }
  ],
  "user_rank": {
    "rank": 1,
    "display_name": "User",
    "total_points": 5000,
    "streak_days": 15
  }
}
```

### Get Community Stats
```http
GET /api/community/stats
```

**Response:**
```json
{
  "status": "success",
  "stats": {
    "total_users": 100,
    "total_learning_hours": 5000,
    "total_achievements": 250,
    "active_today": 15
  }
}
```

---

## Statistics

### Get Weekly Stats
```http
GET /api/stats/week
```

**Response:**
```json
{
  "status": "success",
  "goals_completed": 3,
  "sessions": 25,
  "total_minutes": 1200
}
```

### Get Dashboard Stats
```http
GET /api/stats
```

**Response:**
```json
{
  "status": "success",
  "total_time": 120000,
  "sessions": 254,
  "focus_score": 85,
  "topics_explored": 12,
  "avg_session": 473,
  "streak": 1
}
```

### Get Analytics
```http
GET /api/analytics?days=30
```

**Query Parameters:**
- `days` (optional): Days to analyze (default: 30)

**Response:**
```json
{
  "status": "success",
  "trend_data": [...],
  "topic_distribution": {...},
  "insights": "You've been exploring...",
  "recommendations": [...]
}
```

---

## AI Features

### Chat with AI
```http
POST /api/chat
```

**Request Body:**
```json
{
  "message": "How can I learn Python?",
  "context": []
}
```

**Response:**
```json
{
  "status": "success",
  "response": "Python is a great language to start with...",
  "intent": "learning_guidance"
}
```

### Get Chat History
```http
GET /api/chat/history?limit=50
```

**Response:**
```json
{
  "status": "success",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "How can I learn Python?",
      "timestamp": "2026-01-11T10:00:00"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Python is a great...",
      "timestamp": "2026-01-11T10:00:05"
    }
  ]
}
```

### Get Recommendations
```http
GET /api/recommendations?days=7
```

**Query Parameters:**
- `days` (optional): Days to analyze (default: 7)

**Response:**
```json
{
  "status": "success",
  "recommendations": [
    {
      "type": "topic",
      "title": "Explore Data Structures",
      "reason": "Based on your recent Python learning",
      "priority": "high"
    }
  ]
}
```

### Generate Resume
```http
POST /api/resume/generate
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "location": "New York, USA"
}
```

**Response:**
```json
{
  "status": "success",
  "resume_id": 1,
  "resume": {
    "personal_info": {...},
    "summary": "...",
    "skills": [...],
    "experience": [...],
    "achievements": [...]
  }
}
```

### Get Latest Resume
```http
GET /api/resume/latest
```

**Response:**
```json
{
  "status": "success",
  "resume": {...}
}
```

### Export Resume
```http
GET /api/resume/export/{format}
```

**Path Parameters:**
- `format`: `pdf`, `docx`, or `json`

**Response:**
- PDF: Binary file download
- DOCX: Binary file download
- JSON: Resume data as JSON

---

## User & Settings

### Get User Profile
```http
GET /api/user
```

**Response:**
```json
{
  "status": "success",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "display_name": "User",
    "avatar_initial": "U",
    "streak_days": 15,
    "total_points": 5000,
    "created_at": "2026-01-01T00:00:00"
  }
}
```

### Update User Profile
```http
PUT /api/user
```

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "display_name": "New Name",
  "avatar_initial": "N"
}
```

### Get Settings
```http
GET /api/settings
```

**Response:**
```json
{
  "status": "success",
  "settings": {
    "productivity_mode": true,
    "break_reminder": true,
    "deep_focus_mode": false,
    "daily_goal_minutes": 120,
    "break_interval_minutes": 25,
    "blocked_sites": ["facebook.com", "twitter.com"]
  }
}
```

### Update Settings
```http
PUT /api/settings
```

**Request Body:**
```json
{
  "productivity_mode": true,
  "break_reminder": true,
  "deep_focus_mode": true,
  "daily_goal_minutes": 180,
  "break_interval_minutes": 30,
  "blocked_sites": ["facebook.com"]
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "status": "error",
  "message": "Error description here"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

---

## Rate Limiting

Currently no rate limiting is implemented. This is a local development server.

---

## Authentication

Currently no authentication is required. All requests use `user_id=1` by default.

---

## CORS

CORS is enabled for all origins (`*`) to allow Chrome extension access.

---

## Testing with PowerShell

```powershell
# GET request
Invoke-WebRequest -Uri "http://localhost:5000/api/history" -UseBasicParsing | Select-Object -ExpandProperty Content

# POST request
$body = @{
    url = "https://example.com"
    title = "Example"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/bookmarks" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## Database Schema

### Main Tables
- `users` - User profiles
- `learning_logs` - Browsing history
- `bookmarks` - Saved resources
- `notes` - Learning notes
- `goals` - Learning goals
- `achievements` - Unlocked achievements
- `chat_history` - AI chat messages
- `generated_resumes` - Resume data
- `history_analysis` - ML analysis results
- `settings` - User preferences

---

**Total Endpoints**: 60+  
**API Version**: 2.0.0  
**Last Updated**: January 11, 2026  
**Status**: Production Ready ✅
