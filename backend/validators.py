"""
SupriAI - Validation Module
Input validation and sanitization
"""

from typing import Any, Dict, List, Optional
import re
from datetime import datetime


class ValidationError(Exception):
    """Custom validation error"""
    pass


class Validator:
    """Input validation class"""
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """Validate URL format"""
        if not url:
            raise ValidationError("URL is required")
        
        if len(url) > 2000:
            raise ValidationError("URL is too long (max 2000 characters)")
        
        # Basic URL pattern
        pattern = r'^https?://'
        if not re.match(pattern, url):
            raise ValidationError("Invalid URL format")
        
        return True
    
    @staticmethod
    def validate_duration(duration: float) -> bool:
        """Validate duration value"""
        if not isinstance(duration, (int, float)):
            raise ValidationError("Duration must be a number")
        
        if duration < 0:
            raise ValidationError("Duration cannot be negative")
        
        if duration > 86400:  # 24 hours
            raise ValidationError("Duration too long (max 24 hours)")
        
        return True
    
    @staticmethod
    def validate_engagement_score(score: float) -> bool:
        """Validate engagement score"""
        if not isinstance(score, (int, float)):
            raise ValidationError("Engagement score must be a number")
        
        if score < 0 or score > 100:
            raise ValidationError("Engagement score must be between 0 and 100")
        
        return True
    
    @staticmethod
    def validate_log_entry(data: Dict) -> Dict:
        """Validate log entry data"""
        required_fields = ['url', 'title']
        
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate URL
        Validator.validate_url(data['url'])
        
        # Validate title
        if not data['title'] or not isinstance(data['title'], str):
            raise ValidationError("Title must be a non-empty string")
        
        if len(data['title']) > 500:
            data['title'] = data['title'][:500]
        
        # Validate optional fields
        if 'duration' in data:
            Validator.validate_duration(data['duration'])
        
        if 'engagement_score' in data:
            Validator.validate_engagement_score(data['engagement_score'])
        
        # Validate numeric fields
        numeric_fields = ['max_scroll', 'clicks', 'mouse_distance', 'confidence']
        for field in numeric_fields:
            if field in data:
                if not isinstance(data[field], (int, float)):
                    raise ValidationError(f"{field} must be a number")
                if data[field] < 0:
                    data[field] = 0
        
        return data
    
    @staticmethod
    def validate_goal(data: Dict) -> Dict:
        """Validate goal data"""
        required_fields = ['title', 'target_value']
        
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate title
        if not data['title'] or len(data['title']) > 200:
            raise ValidationError("Title must be between 1 and 200 characters")
        
        # Validate target value
        if not isinstance(data['target_value'], (int, float)) or data['target_value'] <= 0:
            raise ValidationError("Target value must be a positive number")
        
        # Validate current value
        if 'current_value' in data:
            if not isinstance(data['current_value'], (int, float)) or data['current_value'] < 0:
                raise ValidationError("Current value must be a non-negative number")
        
        return data
    
    @staticmethod
    def validate_bookmark(data: Dict) -> Dict:
        """Validate bookmark data"""
        required_fields = ['url', 'title']
        
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate URL
        Validator.validate_url(data['url'])
        
        # Validate title
        if not data['title'] or len(data['title']) > 300:
            raise ValidationError("Title must be between 1 and 300 characters")
        
        return data
    
    @staticmethod
    def validate_note(data: Dict) -> Dict:
        """Validate note data"""
        required_fields = ['title', 'content']
        
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate title
        if not data['title'] or len(data['title']) > 200:
            raise ValidationError("Title must be between 1 and 200 characters")
        
        # Validate content
        if not data['content']:
            raise ValidationError("Content is required")
        
        if len(data['content']) > 10000:
            raise ValidationError("Content is too long (max 10000 characters)")
        
        return data
    
    @staticmethod
    def validate_date_range(start_date: str, end_date: str) -> bool:
        """Validate date range"""
        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            if start > end:
                raise ValidationError("Start date must be before end date")
            
            # Check if range is too large (more than 1 year)
            if (end - start).days > 365:
                raise ValidationError("Date range too large (max 1 year)")
            
            return True
        except ValueError:
            raise ValidationError("Invalid date format")
    
    @staticmethod
    def validate_days_parameter(days: int) -> int:
        """Validate and sanitize days parameter"""
        try:
            days = int(days)
            if days < 1:
                return 1
            if days > 365:
                return 365
            return days
        except (ValueError, TypeError):
            return 7  # default
    
    @staticmethod
    def validate_limit_parameter(limit: int) -> int:
        """Validate and sanitize limit parameter"""
        try:
            limit = int(limit)
            if limit < 1:
                return 10
            if limit > 1000:
                return 1000
            return limit
        except (ValueError, TypeError):
            return 100  # default
    
    @staticmethod
    def sanitize_string(text: str, max_length: Optional[int] = None) -> str:
        """Sanitize string input"""
        if not text:
            return ""
        
        # Remove control characters
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Truncate if needed
        if max_length and len(text) > max_length:
            text = text[:max_length]
        
        return text
