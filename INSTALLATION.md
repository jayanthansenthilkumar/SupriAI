# SupriAI - Installation & Setup Guide

## 📋 Prerequisites

Before you begin, ensure you have:

- **Python 3.8 or higher** ([Download Python](https://www.python.org/downloads/))
- **Google Chrome browser** ([Download Chrome](https://www.google.com/chrome/))
- **pip** (comes with Python)
- **Git** (optional, for cloning)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Get the Project
```bash
# If you have Git
git clone <repository-url>
cd SupriAI

# Or download and extract the ZIP file
```

### Step 2: Backend Setup
```bash
# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Create configuration file
cp .env.example .env

# Start the server
python app.py
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║           SupriAI Backend Server Started              ║
║              http://localhost:5000                    ║
╚═══════════════════════════════════════════════════════╝
```

### Step 3: Install Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `SupriAI` folder (the main project folder, not the backend folder)
5. The extension icon should appear in your browser toolbar

### Step 4: Verify Installation
1. Click the SupriAI extension icon
2. You should see "Active" status with a green dot
3. Visit any educational website
4. The extension will automatically track your learning activity

**That's it! You're ready to go!** 🎉

---

## 📦 Detailed Installation

### Backend Installation

#### 1. Create Virtual Environment (Recommended)
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

#### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Dependencies installed:**
- Flask - Web framework
- Flask-CORS - Cross-origin support
- python-dotenv - Environment variables
- google-generativeai - AI features (optional)

#### 3. Configure Environment
```bash
# Copy example configuration
cp .env.example .env

# Edit .env file with your preferred editor
notepad .env  # Windows
nano .env     # macOS/Linux
```

**Configuration options:**
```env
# Server Configuration
DEBUG=False
HOST=0.0.0.0
PORT=5000

# AI Configuration (Optional - uses local AI if not provided)
GEMINI_API_KEY=your-gemini-api-key-here

# Rate Limiting
RATE_LIMIT_ENABLED=True
RATE_LIMIT_REQUESTS=100

# Caching
CACHE_ENABLED=True
CACHE_TTL=300

# Features
ENABLE_AI_FEATURES=True
ENABLE_RECOMMENDATIONS=True
```

#### 4. Start the Server
```bash
python app.py
```

**Alternative: Using Flask CLI**
```bash
export FLASK_APP=app.py
export FLASK_ENV=development
flask run
```

**Server will run on:** `http://localhost:5000`

---

### Extension Installation

#### Method 1: Load Unpacked (Development)
1. Open Chrome: `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Navigate to and select the `SupriAI` folder
5. Extension installed! ✅

#### Method 2: From ZIP
1. Download the project ZIP
2. Extract to a permanent location
3. Follow Method 1 steps

**Important:** Don't delete the folder after installation!

---

## ⚙️ Configuration Guide

### Backend Configuration

#### Basic Configuration (`backend/.env`)
```env
# Required Settings
DEBUG=False                    # Set to True for development
SECRET_KEY=change-this-key     # Change in production
PORT=5000                      # Server port

# Optional AI Features
GEMINI_API_KEY=                # Leave empty to use local AI

# Performance Settings
DB_POOL_SIZE=5                 # Database connections
CACHE_TTL=300                  # Cache duration (seconds)

# Security
RATE_LIMIT_ENABLED=True
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Features
ENABLE_AI_FEATURES=True
ENABLE_RECOMMENDATIONS=True
ENABLE_ANALYTICS=True
```

#### Advanced Configuration
Edit `backend/config.py` for more options:
- Multiple environment configs
- Custom database paths
- API timeouts
- Logging levels

### Extension Configuration

The extension works automatically with default settings. To customize:

1. **Backend URL**: Edit `background.js`
```javascript
const SERVER_URL = "http://localhost:5000";  // Change if needed
```

2. **Tracking Intervals**: Edit `content.js`
```javascript
const CONFIG = {
    MIN_DURATION: 5,        // Minimum seconds before logging
    SYNC_INTERVAL: 30000,   // Sync frequency (ms)
    IDLE_TIMEOUT: 60000,    // Idle detection (ms)
};
```

---

## 🔧 Troubleshooting

### Backend Issues

#### Issue: `pip: command not found`
**Solution:** Install pip
```bash
# Windows
python -m ensurepip --upgrade

# macOS
python3 -m ensurepip --upgrade
```

#### Issue: `ModuleNotFoundError: No module named 'flask'`
**Solution:** Install requirements
```bash
cd backend
pip install -r requirements.txt
```

#### Issue: `Port 5000 already in use`
**Solution:** Change port in `.env`
```env
PORT=5001
```
Then update extension's `background.js` to match.

#### Issue: Database errors
**Solution:** Delete and reinitialize database
```bash
cd backend
rm supri_learning.db
python app.py  # Will create new database
```

### Extension Issues

#### Issue: Extension doesn't appear
**Solution:**
1. Check Developer mode is enabled
2. Refresh `chrome://extensions/` page
3. Check for error messages in Extensions page

#### Issue: "Offline" status
**Solution:**
1. Ensure backend server is running
2. Check `http://localhost:5000/health` in browser
3. Check firewall settings
4. Verify SERVER_URL in `background.js`

#### Issue: Data not syncing
**Solution:**
1. Check browser console (F12) for errors
2. Verify backend is running
3. Clear extension storage:
   - Go to `chrome://extensions/`
   - Click "Details" on SupriAI
   - Click "Clear storage"
4. Reload extension

#### Issue: High memory usage
**Solution:**
1. Clear old data: Click extension → Clear History
2. Reduce sync frequency in `content.js`
3. Restart browser

---

## 🧪 Testing Installation

### Test Backend
```bash
# Test health endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"running","service":"SupriAI Backend",...}
```

**Or open in browser:** `http://localhost:5000/health`

### Test Extension
1. Click extension icon
2. Check for "Active" status
3. Visit any website
4. Click extension → "Open Dashboard"
5. Verify data is being tracked

---

## 📊 Verification Checklist

- [ ] Python 3.8+ installed
- [ ] Backend dependencies installed
- [ ] `.env` file created
- [ ] Backend server running on port 5000
- [ ] Extension loaded in Chrome
- [ ] Extension shows "Active" status
- [ ] Health endpoint returns success
- [ ] Dashboard opens correctly
- [ ] Activity tracking works

---

## 🔄 Updating

### Update Backend
```bash
cd backend
git pull  # If using Git
pip install -r requirements.txt  # Update dependencies
python app.py  # Restart server
```

### Update Extension
1. Download latest version
2. Go to `chrome://extensions/`
3. Click "Update" button
4. Or remove and reinstall

---

## 🗑️ Uninstallation

### Remove Extension
1. Go to `chrome://extensions/`
2. Find SupriAI
3. Click "Remove"
4. Confirm removal

### Remove Backend
```bash
# Stop server (Ctrl+C)

# Remove files
cd ..
rm -rf SupriAI  # macOS/Linux
rmdir /s SupriAI  # Windows

# Optional: Remove virtual environment
deactivate
rm -rf venv
```

### Clean Browser Data
1. Extension stores data locally
2. Removing extension clears data automatically
3. Or manually: Extension → Details → Clear storage

---

## 🔐 Security Recommendations

### For Development
```env
DEBUG=True
RATE_LIMIT_ENABLED=False
```

### For Production
```env
DEBUG=False
SECRET_KEY=generate-strong-random-key
RATE_LIMIT_ENABLED=True
GEMINI_API_KEY=your-production-key
```

**Generate secure key:**
```python
import secrets
print(secrets.token_hex(32))
```

---

## 📱 Platform-Specific Notes

### Windows
- Use `python` command (not `python3`)
- Use backslashes `\` in paths
- PowerShell or Command Prompt both work
- Firewall may prompt for permission

### macOS
- Use `python3` command
- May need to allow in Security & Privacy settings
- Use Terminal

### Linux
- Use `python3` command
- May need `sudo` for system-wide installation
- Use package manager for Python if not installed

---

## 🆘 Getting Help

### Common Resources
1. Check [IMPROVEMENTS.md](IMPROVEMENTS.md) for features
2. Read [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API details
3. Review error logs in backend console
4. Check browser console (F12) for extension errors

### Debug Mode
Enable debug mode in `.env`:
```env
DEBUG=True
LOG_LEVEL=DEBUG
```

This will show detailed logs in the backend console.

---

## ✅ Success Indicators

You'll know installation is successful when:

1. ✅ Backend server starts without errors
2. ✅ Health endpoint returns status "running"
3. ✅ Extension icon appears in Chrome
4. ✅ Extension popup shows "Active" status
5. ✅ Dashboard opens and displays data
6. ✅ Activity is tracked when browsing
7. ✅ Analytics are generated
8. ✅ No errors in browser console

---

## 🎯 Next Steps

After installation:

1. **Explore Dashboard**: Click extension → "Open Dashboard"
2. **Set Goals**: Create learning goals in the dashboard
3. **Browse Content**: Visit educational websites
4. **Check Analytics**: View your learning statistics
5. **Export Data**: Try exporting your learning data
6. **Customize**: Adjust settings to your preferences

---

## 📞 Support

Need help? Check:
- Error messages in backend console
- Browser console (F12) for extension errors
- Ensure all prerequisites are installed
- Verify configuration files are correct
- Test with default settings first

---

**Happy Learning with SupriAI!** 🚀📚

*Version 2.0.0 - Complete installation guide for the improved SupriAI system*
