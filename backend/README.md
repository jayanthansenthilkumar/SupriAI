# SupriAI Backend

Flask-based backend server for the SupriAI Learning Analytics Chrome Extension.

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the server:**
   ```bash
   python app.py
   ```

4. **Server will start at:** `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── app.py              # Main Flask application with all API routes
├── database.py         # SQLite database operations
├── ml_engine.py        # ML/NLP content classification
├── requirements.txt    # Python dependencies
├── supri_learning.db   # SQLite database (auto-created)
└── README.md           # This file
```

## 🔌 API Endpoints

### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/status` | API status with database stats |

### Activity Logging
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/log_activity` | Log a single learning activity |
| POST | `/bulk_log` | Bulk log activities (offline sync) |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get_analytics` | Get dashboard analytics |
| GET | `/api/analytics/topics` | Get topic breakdown |
| GET | `/api/analytics/trends` | Get weekly trends |

### History
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/history` | Get learning history |
| GET | `/api/history/search` | Search history |
| DELETE | `/api/history/clear` | Clear all history |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | Get all goals |
| POST | `/api/goals` | Create a goal |
| PUT | `/api/goals/:id` | Update goal progress |
| DELETE | `/api/goals/:id` | Delete a goal |

### Bookmarks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookmarks` | Get all bookmarks |
| POST | `/api/bookmarks` | Add a bookmark |
| DELETE | `/api/bookmarks/:id` | Delete a bookmark |

### Notes/Reflections
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes |
| POST | `/api/notes` | Create a note |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |

### Schedule
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule` | Get schedule events |
| POST | `/api/schedule` | Create an event |
| DELETE | `/api/schedule/:id` | Delete an event |

### User & Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get user profile |
| PUT | `/api/user` | Update user profile |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

### Achievements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/achievements` | Get all achievements |
| POST | `/api/achievements/check` | Check for new achievements |

### Recommendations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations` | Get personalized recommendations |

## 📊 Database Schema

The SQLite database includes the following tables:

- **users** - User profiles
- **learning_logs** - Activity tracking data
- **goals** - User learning goals
- **bookmarks** - Saved resources
- **notes** - Learning reflections
- **schedule_events** - Calendar events
- **achievements** - Unlocked badges
- **daily_stats** - Aggregated daily statistics
- **settings** - User preferences

## 🧠 ML Engine Features

The ML engine provides:

- **Content Classification** - Automatically categorizes content into topics:
  - Programming, Data Science, Web Development
  - Mathematics, Science, History
  - Business, Design, Language Learning
  - Personal Development, General Interest

- **Engagement Scoring** - Calculates engagement based on:
  - Time spent on page
  - Scroll depth
  - Click interactions
  - Mouse activity

- **Recommendations** - Generates personalized learning suggestions

- **Achievement System** - Tracks and unlocks badges

## 🔧 Development

### Running in Debug Mode
```bash
python app.py
```
Debug mode is enabled by default with auto-reload.

### Running for Production
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Testing API Endpoints
```bash
# Health check
curl http://localhost:5000/health

# Get analytics
curl http://localhost:5000/get_analytics

# Log activity
curl -X POST http://localhost:5000/log_activity \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "title": "Test", "duration": 60}'
```

## 📝 Notes

- The database file (`supri_learning.db`) is automatically created on first run
- CORS is enabled for Chrome extension communication
- Data is stored locally on your machine (privacy-first approach)
- The server must be running for the extension to work properly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use and modify!
