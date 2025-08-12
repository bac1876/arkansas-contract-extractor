# How to Get ImageMagick (Working Links)

## Option 1: Direct GitHub Release (RECOMMENDED)
Go directly to the GitHub releases page:
https://github.com/ImageMagick/ImageMagick/releases

Look for the latest Windows release (usually named like):
- `ImageMagick-7.1.1-44-Q16-HDRI-x64-dll.exe` (for 64-bit Windows)

## Option 2: Via Ninite (Super Easy)
1. Go to https://ninite.com/
2. They have a simple installer that might include ImageMagick

## Option 3: Portable Version (No Install Required)
1. Download the portable ZIP version
2. Extract to a folder like C:\ImageMagick
3. Add to PATH manually

## Option 4: Alternative Tools (If ImageMagick links are all broken)

### GraphicsMagick (ImageMagick fork)
- http://www.graphicsmagick.org/download.html
- Works the same way as ImageMagick

### Using Python Instead
We could also use Python with Pillow library:
```bash
pip install pdf2image pillow
```

## Option 5: Use Node.js Libraries
Since we already have Node.js, we could use:
```bash
npm install gm
npm install pdf-poppler
```

## The Command We Need
Once any of these are installed, we need to run:
```bash
magick -density 300 contract.pdf page-%d.png
```
Or with GraphicsMagick:
```bash
gm convert -density 300 contract.pdf page-%d.png
```