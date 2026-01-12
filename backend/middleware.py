"""
SupriAI - Middleware Module
Custom middleware for request processing, logging, and security
"""

from flask import request, jsonify
from functools import wraps
import time
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RequestLogger:
    """Middleware for logging all API requests"""
    
    def __init__(self, app=None):
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        @app.before_request
        def log_request():
            request.start_time = time.time()
            logger.info(f"{request.method} {request.path} - {request.remote_addr}")
        
        @app.after_request
        def log_response(response):
            if hasattr(request, 'start_time'):
                duration = time.time() - request.start_time
                logger.info(
                    f"{request.method} {request.path} - "
                    f"Status: {response.status_code} - "
                    f"Duration: {duration:.3f}s"
                )
            return response


def require_api_key(f):
    """Decorator to require API key for certain endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        
        # For now, this is optional - can be enabled in production
        # if not api_key or api_key != 'your-api-key':
        #     return jsonify({'status': 'error', 'message': 'Invalid API key'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


def validate_json(required_fields=None):
    """Decorator to validate JSON request body"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({
                    'status': 'error',
                    'message': 'Content-Type must be application/json'
                }), 400
            
            if required_fields:
                data = request.get_json()
                missing = [field for field in required_fields if field not in data]
                
                if missing:
                    return jsonify({
                        'status': 'error',
                        'message': f'Missing required fields: {", ".join(missing)}'
                    }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def handle_errors(f):
    """Decorator for consistent error handling"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return jsonify({
                'status': 'error',
                'message': str(e),
                'error_type': 'validation_error'
            }), 400
        except Exception as e:
            logger.error(f"Unexpected error in {f.__name__}: {e}", exc_info=True)
            return jsonify({
                'status': 'error',
                'message': 'An unexpected error occurred',
                'error_type': 'server_error'
            }), 500
    return decorated_function


class PerformanceMonitor:
    """Monitor API performance and log slow requests"""
    
    def __init__(self, app=None, threshold=1.0):
        self.threshold = threshold  # seconds
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        @app.before_request
        def start_timer():
            request.start_time = time.time()
        
        @app.after_request
        def check_performance(response):
            if hasattr(request, 'start_time'):
                duration = time.time() - request.start_time
                
                if duration > self.threshold:
                    logger.warning(
                        f"Slow request detected: {request.method} {request.path} "
                        f"took {duration:.3f}s"
                    )
            
            return response


def sanitize_input(data, max_length=None):
    """Sanitize user input to prevent injection attacks"""
    if isinstance(data, str):
        # Remove potentially dangerous characters
        sanitized = data.strip()
        
        if max_length:
            sanitized = sanitized[:max_length]
        
        # Basic XSS prevention
        sanitized = sanitized.replace('<script>', '').replace('</script>', '')
        
        return sanitized
    
    elif isinstance(data, dict):
        return {k: sanitize_input(v, max_length) for k, v in data.items()}
    
    elif isinstance(data, list):
        return [sanitize_input(item, max_length) for item in data]
    
    return data


def add_cors_headers(response):
    """Add CORS headers to response"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key'
    return response
