CREATE DATABASE IF NOT EXISTS supriai;
USE supriai;

-- Users table (for future multiple user support)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Browsing History / Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1,
    url TEXT NOT NULL,
    title TEXT,
    domain VARCHAR(255),
    visit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INT DEFAULT 0,
    topic VARCHAR(100) DEFAULT 'General',
    engagement_score INT DEFAULT 0,
    source VARCHAR(50) DEFAULT 'extension',
    processed_by_ai BOOLEAN DEFAULT FALSE,
    ai_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes / Reflections
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1,
    title VARCHAR(255),
    content TEXT,
    tags VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1,
    url TEXT NOT NULL,
    title TEXT,
    topic VARCHAR(100),
    resource_type VARCHAR(50) DEFAULT 'Article',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    target_value INT NOT NULL,
    current_value INT DEFAULT 0,
    goal_type VARCHAR(50) DEFAULT 'daily', -- daily, weekly
    icon VARCHAR(50) DEFAULT 'ri-flag-line',
    color VARCHAR(20) DEFAULT '#1a73e8',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Insights / Analytics Cache
CREATE TABLE IF NOT EXISTS ai_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT 1,
    insight_type VARCHAR(50),
    content TEXT,
    confidence_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
