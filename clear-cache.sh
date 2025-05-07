
#!/bin/bash
# Script to clear npm/yarn and Vite caches

echo "🧹 Starting cache cleanup..."

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Clear Vite cache
echo "Clearing Vite cache..."
if [ -d "node_modules/.vite" ]; then
  rm -rf node_modules/.vite
  echo "✅ Vite cache cleared"
else
  echo "ℹ️ No Vite cache found in node_modules/.vite"
fi

# Clear browser caches recommendation
echo ""
echo "🌐 IMPORTANT: Please also clear your browser cache or use incognito mode"
echo ""

echo "✨ Cache cleanup complete! Please restart your development server."
