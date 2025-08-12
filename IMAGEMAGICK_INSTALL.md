# Installing ImageMagick on Windows

## Option 1: Download from Official Website
1. Go to: https://imagemagick.org/script/download.php#windows
2. Download: ImageMagick-7.1.1-43-Q16-HDRI-x64-dll.exe
3. Run the installer as Administrator
4. Make sure to check "Install development headers and libraries for C and C++"
5. Check "Add application directory to your system path"

## Option 2: Using Chocolatey (as Administrator)
```powershell
# Open PowerShell as Administrator
choco install imagemagick -y
```

## Option 3: Portable Version
1. Download the portable version (no installation required)
2. Extract to a folder like C:\ImageMagick
3. Add C:\ImageMagick to your PATH environment variable

## Verify Installation
```bash
magick -version
```

## Once Installed
The extraction will work perfectly with this command:
```bash
magick -density 300 contract.pdf page-%d.png
```

This will convert your PDF to high-quality PNG images that GPT-4 Vision API can process accurately.