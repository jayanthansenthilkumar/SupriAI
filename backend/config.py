"""
SupriAI - Configuration Module
Centralized configuration for the backend
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)


class Config:
    """Base configuration"""
    
    # Flask Configuration
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Server Configuration
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    
    # Database Configuration
    DB_PATH = os.path.join(os.path.dirname(__file__), "supri_learning.db")
    DB_POOL_SIZE = int(os.getenv('DB_POOL_SIZE', 5))
    DB_TIMEOUT = float(os.getenv('DB_TIMEOUT', 10.0))
    
    # AI Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    AI_MODEL = os.getenv('AI_MODEL', 'gemini-2.0-flash-exp')
    AI_TIMEOUT = int(os.getenv('AI_TIMEOUT', 30))
    
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'True').lower() == 'true'
    RATE_LIMIT_REQUESTS = int(os.getenv('RATE_LIMIT_REQUESTS', 100))
    RATE_LIMIT_WINDOW = int(os.getenv('RATE_LIMIT_WINDOW', 60))
    
    # Caching
    CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'True').lower() == 'true'
    CACHE_TTL = int(os.getenv('CACHE_TTL', 300))
    
    # Analytics
    MAX_ANALYTICS_DAYS = int(os.getenv('MAX_ANALYTICS_DAYS', 365))
    DEFAULT_ANALYTICS_DAYS = int(os.getenv('DEFAULT_ANALYTICS_DAYS', 7))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'supri_ai.log')
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # Recommendations
    MIN_DATA_POINTS_FOR_RECOMMENDATIONS = int(os.getenv('MIN_DATA_POINTS', 5))
    RECOMMENDATION_LIMIT = int(os.getenv('RECOMMENDATION_LIMIT', 10))
    
    # Content Processing
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 10000))
    MIN_CONFIDENCE_THRESHOLD = float(os.getenv('MIN_CONFIDENCE', 0.3))
    
    # Feature Flags
    ENABLE_AI_FEATURES = os.getenv('ENABLE_AI_FEATURES', 'True').lower() == 'true'
    ENABLE_RECOMMENDATIONS = os.getenv('ENABLE_RECOMMENDATIONS', 'True').lower() == 'true'
    ENABLE_ANALYTICS = os.getenv('ENABLE_ANALYTICS', 'True').lower() == 'true'
    

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    RATE_LIMIT_ENABLED = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    RATE_LIMIT_ENABLED = True


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DB_PATH = ":memory:"


# Configuration dictionary
config_dict = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config(env='default'):
    """Get configuration based on environment"""
    return config_dict.get(env, DevelopmentConfig)
