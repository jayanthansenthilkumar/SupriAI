"""
SupriAI - Data Export Service
Export learning data in various formats
"""

import json
import csv
from datetime import datetime
from typing import List, Dict
import io


class DataExporter:
    """Export learning data to various formats"""
    
    @staticmethod
    def to_json(logs: List[Dict], filename: str = None) -> str:
        """Export logs to JSON format"""
        data = {
            'exported_at': datetime.now().isoformat(),
            'total_records': len(logs),
            'data': logs
        }
        
        json_str = json.dumps(data, indent=2)
        
        if filename:
            with open(filename, 'w') as f:
                f.write(json_str)
        
        return json_str
    
    @staticmethod
    def to_csv(logs: List[Dict], filename: str = None) -> str:
        """Export logs to CSV format"""
        if not logs:
            return ""
        
        output = io.StringIO()
        
        # Get all unique keys
        fieldnames = set()
        for log in logs:
            fieldnames.update(log.keys())
        
        fieldnames = sorted(list(fieldnames))
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(logs)
        
        csv_str = output.getvalue()
        output.close()
        
        if filename:
            with open(filename, 'w', newline='') as f:
                f.write(csv_str)
        
        return csv_str
    
    @staticmethod
    def generate_report(analytics: Dict) -> Dict:
        """Generate a comprehensive learning report"""
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_sessions': analytics.get('total_sessions', 0),
                'total_hours': analytics.get('total_learning_time', 0) / 3600,
                'unique_topics': analytics.get('unique_topics', 0),
                'current_streak': analytics.get('streak_days', 0)
            },
            'top_topics': analytics.get('top_topics', []),
            'weekly_trend': analytics.get('weekly_trends', {}),
            'recommendations': analytics.get('recommendations', [])
        }
        
        return report
    
    @staticmethod
    def generate_markdown_report(analytics: Dict, logs: List[Dict]) -> str:
        """Generate a markdown formatted report"""
        report_lines = [
            "# Learning Analytics Report",
            f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "\n## Summary",
            f"- **Total Sessions:** {analytics.get('total_sessions', 0)}",
            f"- **Total Learning Time:** {analytics.get('total_learning_time', 0) / 3600:.2f} hours",
            f"- **Current Streak:** {analytics.get('streak_days', 0)} days",
            f"- **Unique Topics:** {analytics.get('unique_topics', 0)}",
            "\n## Top Topics"
        ]
        
        top_topics = analytics.get('top_topics', [])
        for i, topic in enumerate(top_topics[:5], 1):
            report_lines.append(f"{i}. **{topic['topic']}** - {topic['count']} sessions")
        
        report_lines.append("\n## Recommendations")
        recommendations = analytics.get('recommendations', [])
        for rec in recommendations[:5]:
            report_lines.append(f"- {rec.get('title', 'No title')}: {rec.get('description', '')}")
        
        return "\n".join(report_lines)


class DataImporter:
    """Import learning data from external sources"""
    
    @staticmethod
    def from_json(json_str: str) -> List[Dict]:
        """Import data from JSON string"""
        try:
            data = json.loads(json_str)
            if isinstance(data, dict) and 'data' in data:
                return data['data']
            elif isinstance(data, list):
                return data
            else:
                return []
        except json.JSONDecodeError:
            return []
    
    @staticmethod
    def from_csv(csv_str: str) -> List[Dict]:
        """Import data from CSV string"""
        try:
            input_stream = io.StringIO(csv_str)
            reader = csv.DictReader(input_stream)
            return list(reader)
        except:
            return []
