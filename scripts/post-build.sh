#!/bin/bash
# Post-build script to copy icon for window and tray support

echo "Copying icon to dist folder..."

# Copy icon (used for both window and tray)
cp resources/icon.png dist/words/resources/

echo "✓ Icon copied successfully"
