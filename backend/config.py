"""
SupriAI Backend Configuration
"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Database
DATABASE_PATH = os.path.join(BASE_DIR, 'data', 'supriai.db')

# Flask
SECRET_KEY = os.environ.get('SECRET_KEY', 'supriai-secret-key-change-in-production')
DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
HOST = os.environ.get('FLASK_HOST', '127.0.0.1')
PORT = int(os.environ.get('FLASK_PORT', 5000))

# CORS - Allow Chrome extension
CORS_ORIGINS = ['chrome-extension://*', 'http://localhost:*']

# ML Model Settings
ML_MODEL_DIR = os.path.join(BASE_DIR, 'ml', 'trained_models')
MIN_DATA_POINTS_FOR_TRAINING = 3
RETRAIN_INTERVAL_HOURS = 6

# Website Categories for Classification
WEBSITE_CATEGORIES = {
    'productive': [
        'github.com', 'stackoverflow.com', 'docs.google.com', 'linkedin.com',
        'medium.com', 'dev.to', 'freecodecamp.org', 'udemy.com', 'coursera.org',
        'kaggle.com', 'leetcode.com', 'hackerrank.com', 'geeksforgeeks.org',
        'w3schools.com', 'mdn.mozilla.org', 'learn.microsoft.com', 'aws.amazon.com',
        'cloud.google.com', 'azure.microsoft.com', 'notion.so', 'trello.com',
        'asana.com', 'jira.atlassian.com', 'figma.com', 'canva.com',
        'scholar.google.com', 'arxiv.org', 'researchgate.net', 'academia.edu'
    ],
    'social': [
        'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'tiktok.com',
        'snapchat.com', 'reddit.com', 'pinterest.com', 'tumblr.com',
        'discord.com', 'telegram.org', 'whatsapp.com'
    ],
    'entertainment': [
        'youtube.com', 'www.youtube.com', 'netflix.com', 'primevideo.com',
        'disneyplus.com', 'hulu.com', 'twitch.tv', 'spotify.com',
        'soundcloud.com', 'apple.com/apple-music', '9gag.com', 'imgur.com',
        'buzzfeed.com', 'boredpanda.com'
    ],
    'news': [
        'bbc.com', 'cnn.com', 'reuters.com', 'nytimes.com', 'theguardian.com',
        'washingtonpost.com', 'news.google.com', 'news.ycombinator.com',
        'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com'
    ],
    'shopping': [
        'amazon.com', 'ebay.com', 'walmart.com', 'flipkart.com',
        'alibaba.com', 'etsy.com', 'shopify.com', 'myntra.com',
        'ajio.com', 'meesho.com'
    ],
    'communication': [
        'mail.google.com', 'outlook.com', 'outlook.live.com', 'yahoo.com',
        'protonmail.com', 'slack.com', 'teams.microsoft.com', 'zoom.us',
        'meet.google.com'
    ]
}

# Productivity weights per category
CATEGORY_PRODUCTIVITY_WEIGHTS = {
    'productive': 1.0,
    'communication': 0.7,
    'news': 0.4,
    'shopping': 0.2,
    'entertainment': 0.1,
    'social': 0.1,
    'unknown': 0.3
}
