
import os

content = 'GEMINI_API_KEY="AIzaSyALIVyNYKSNRXbDEHf6c0leDYNzj2D_tdw"'
file_path = 'backend/.env'

# Ensure directory exists
os.makedirs('backend', exist_ok=True)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Successfully wrote {len(content)} bytes to {file_path}")
