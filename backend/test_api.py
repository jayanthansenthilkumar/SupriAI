"""
Quick API Test Script for SupriAI Backend
Run this to verify all endpoints are working
"""

import requests
from datetime import datetime

API_URL = "http://127.0.0.1:8000"

def test_health():
    print("\n[TEST] Testing health endpoint...")
    response = requests.get(f"{API_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_history_bulk():
    print("\n[TEST] Testing history bulk ingestion...")
    payload = {
        "url": "https://github.com/python/cpython",
        "title": "Python GitHub Repository",
        "visited_at": datetime.now().isoformat(),
        "duration_seconds": 120,
        "topic": "Programming",
        "source": "test_script",
        "metadata": {"test": True}
    }
    response = requests.post(f"{API_URL}/api/history/bulk", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_history_list():
    print("\n[TEST] Testing history list...")
    response = requests.get(f"{API_URL}/api/history?limit=5")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Found {len(data)} history items")
    if data:
        print(f"Sample: {data[0].get('title', 'N/A')[:50]}")
    return response.status_code == 200

def test_analytics_summary():
    print("\n[TEST] Testing analytics summary...")
    response = requests.get(f"{API_URL}/api/analytics/summary")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Total visits: {data.get('total_visits', 0)}")
    print(f"Total domains: {data.get('total_domains', 0)}")
    return response.status_code == 200

def test_bookmarks():
    print("\n[TEST] Testing bookmarks...")
    # Create bookmark
    payload = {"url": "https://python.org", "title": "Python Official Site"}
    response = requests.post(f"{API_URL}/api/bookmarks", json=payload)
    print(f"Create Status: {response.status_code}")
    
    # List bookmarks
    response = requests.get(f"{API_URL}/api/bookmarks")
    print(f"List Status: {response.status_code}")
    print(f"Total bookmarks: {len(response.json())}")
    return response.status_code == 200

def test_notes():
    print("\n[TEST] Testing notes...")
    # Create note
    payload = {
        "title": "Test Note",
        "content": "This is a test note from the API test script",
        "tags": "test,api"
    }
    response = requests.post(f"{API_URL}/api/notes", json=payload)
    print(f"Create Status: {response.status_code}")
    
    # List notes
    response = requests.get(f"{API_URL}/api/notes")
    print(f"List Status: {response.status_code}")
    print(f"Total notes: {len(response.json())}")
    return response.status_code == 200

def test_dataset_export():
    print("\n[TEST] Testing dataset export...")
    response = requests.get(f"{API_URL}/api/dataset?limit=10")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Dataset rows: {data.get('count', 0)}")
    return response.status_code == 200

def main():
    print("="*60)
    print("[INFO] SupriAI Backend API Test Suite")
    print("="*60)
    
    tests = [
        ("Health Check", test_health),
        ("History Bulk Ingest", test_history_bulk),
        ("History List", test_history_list),
        ("Analytics Summary", test_analytics_summary),
        ("Bookmarks", test_bookmarks),
        ("Notes", test_notes),
        ("Dataset Export", test_dataset_export),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"[ERROR] Error: {e}")
            results.append((name, False))
    
    print("\n" + "="*60)
    print("[INFO] Test Results Summary")
    print("="*60)
    for name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} - {name}")
    
    passed_count = sum(1 for _, p in results if p)
    print(f"\n{passed_count}/{len(results)} tests passed")
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Cannot connect to backend!")
        print("Make sure the server is running on http://127.0.0.1:8000")
        print("Start it with: python main.py")
