"""
Generate SupriAI Icons
Creates icon16.png, icon48.png, and icon128.png
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_gradient_background(size):
    """Create a gradient background from blue to purple"""
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Gradient colors
    start_color = (102, 126, 234)  # #667eea
    end_color = (118, 75, 162)     # #764ba2
    
    for y in range(size):
        # Calculate gradient
        ratio = y / size
        r = int(start_color[0] + (end_color[0] - start_color[0]) * ratio)
        g = int(start_color[1] + (end_color[1] - start_color[1]) * ratio)
        b = int(start_color[2] + (end_color[2] - start_color[2]) * ratio)
        
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    
    return image

def create_rounded_rectangle(size, radius):
    """Create a rounded rectangle mask"""
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size-1, size-1)], radius=radius, fill=255)
    return mask

def create_icon(size, filename):
    """Create a single icon"""
    # Create gradient background
    image = create_gradient_background(size)
    
    # Apply rounded corners
    radius = int(size * 0.2)
    mask = create_rounded_rectangle(size, radius)
    
    # Create a new image with the mask applied
    rounded_image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rounded_image.paste(image, (0, 0), mask)
    
    # Draw the 'S' letter
    draw = ImageDraw.Draw(rounded_image)
    
    # Try to use a good font, fallback to default
    try:
        font_size = int(size * 0.6)
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("segoeui.ttf", int(size * 0.6))
        except:
            font = ImageFont.load_default()
    
    # Get text bounding box
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]
    
    # Draw white 'S'
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Add AI node effects for larger icons
    if size >= 48:
        node_size = int(size * 0.08)
        
        # Top right node
        node_x1 = int(size * 0.75)
        node_y1 = int(size * 0.25)
        draw.ellipse(
            [(node_x1 - node_size, node_y1 - node_size),
             (node_x1 + node_size, node_y1 + node_size)],
            fill=(255, 255, 255, 128)
        )
        
        # Bottom left node
        node_x2 = int(size * 0.25)
        node_y2 = int(size * 0.75)
        draw.ellipse(
            [(node_x2 - node_size, node_y2 - node_size),
             (node_x2 + node_size, node_y2 + node_size)],
            fill=(255, 255, 255, 128)
        )
        
        # Draw connecting lines
        line_width = max(1, int(size * 0.02))
        draw.line(
            [(node_x1, node_y1), (size // 2, size // 2)],
            fill=(255, 255, 255, 76),
            width=line_width
        )
        draw.line(
            [(size // 2, size // 2), (node_x2, node_y2)],
            fill=(255, 255, 255, 76),
            width=line_width
        )
    
    # Save the icon
    image_path = os.path.join(os.path.dirname(__file__), filename)
    rounded_image.save(image_path, 'PNG')
    print(f"✓ Created {filename} ({size}×{size})")

def main():
    """Generate all icon sizes"""
    print("Generating SupriAI Icons...")
    print("-" * 40)
    
    try:
        create_icon(16, 'icon16.png')
        create_icon(48, 'icon48.png')
        create_icon(128, 'icon128.png')
        
        print("-" * 40)
        print("✅ All icons generated successfully!")
        print("\nFiles created:")
        print("  • icons/icon16.png")
        print("  • icons/icon48.png")
        print("  • icons/icon128.png")
        print("\nYou can now reload the extension in Chrome.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure you have Pillow installed:")
        print("  pip install pillow")

if __name__ == "__main__":
    main()
