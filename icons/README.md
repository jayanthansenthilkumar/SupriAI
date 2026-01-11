# SupriAI Icons

This folder contains the icon assets for the SupriAI Chrome Extension.

## Icon Specifications

- **16×16**: Toolbar icon (small display)
- **48×48**: Extension management page
- **128×128**: Chrome Web Store and installation dialog

## Design

The icons feature:
- Modern gradient background (blue to purple: #667eea → #764ba2)
- Bold white "S" letter representing SupriAI
- AI-themed node connections (on 48x48 and 128x128)
- Rounded corners for a modern look

## Files

### Generated Files (SVG)
- `icon16.svg` - 16×16 vector icon
- `icon48.svg` - 48×48 vector icon
- `icon128.svg` - 128×128 vector icon

### Required PNG Files
To complete the setup, you need to generate PNG files:

1. **Option 1: Use Icon Generator (Recommended)**
   - Open `icon-generator.html` in your browser
   - Click "Download All Icons" button
   - Save the three PNG files in this folder

2. **Option 2: Convert SVG to PNG**
   - Use an online converter or image editor
   - Convert each SVG to PNG at the specified sizes
   - Save as `icon16.png`, `icon48.png`, `icon128.png`

3. **Option 3: Use Design Software**
   - Open the SVGs in Figma, Adobe Illustrator, or Inkscape
   - Export as PNG at the correct dimensions

## Manifest Configuration

The `manifest.json` has been updated with:

```json
"icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
}
```

## Verification

After generating PNG files:
1. Ensure all three PNG files exist in this folder
2. Reload the extension in Chrome (`chrome://extensions/`)
3. Check that the icon appears correctly in the toolbar
4. Verify the icon shows properly on the extensions management page

## Notes

- PNG format is required for Chrome extensions (SVG is not supported)
- Maintain transparency in the corners for better visual appearance
- Icons should be optimized for size (use compression if needed)
- The gradient and design match the SupriAI brand colors
