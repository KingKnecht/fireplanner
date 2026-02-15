#!/bin/bash
set -e

echo "=== Rebuild v0.2.0 Script ==="
echo ""
echo "This script will rebuild the v0.2.0 tag to include the missing screenshot commit."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: This script must be run from the repository root directory"
    exit 1
fi

# Check if tag exists locally
if git rev-parse v0.2.0 >/dev/null 2>&1; then
    echo "✓ v0.2.0 tag exists locally"
    CURRENT_TAG_COMMIT=$(git rev-parse v0.2.0)
    echo "  Points to: $CURRENT_TAG_COMMIT"
else
    echo "✗ v0.2.0 tag not found locally"
    exit 1
fi

echo ""
echo "Steps to complete the rebuild:"
echo ""
echo "1. Delete the old v0.2.0 release on GitHub:"
echo "   Visit: https://github.com/KingKnecht/fireplanner/releases"
echo "   Delete the v0.2.0 release"
echo ""
echo "2. Delete the remote v0.2.0 tag:"
echo "   git push origin :refs/tags/v0.2.0"
echo ""
echo "3. Push the new v0.2.0 tag:"
echo "   git push origin v0.2.0"
echo ""
echo "4. The GitHub Actions workflow will automatically create the new release"
echo ""
echo "Press Enter to continue with step 2 (delete remote tag), or Ctrl+C to exit..."
read

echo ""
echo "Deleting remote v0.2.0 tag..."
if git push origin :refs/tags/v0.2.0; then
    echo "✓ Remote tag deleted successfully"
else
    echo "✗ Failed to delete remote tag"
    echo "  You may need to do this manually or check your permissions"
    exit 1
fi

echo ""
echo "Press Enter to continue with step 3 (push new tag), or Ctrl+C to exit..."
read

echo ""
echo "Pushing new v0.2.0 tag..."
if git push origin v0.2.0; then
    echo "✓ New tag pushed successfully"
else
    echo "✗ Failed to push new tag"
    exit 1
fi

echo ""
echo "=== Rebuild Complete ==="
echo ""
echo "The GitHub Actions workflow should now be running."
echo "Check the progress at: https://github.com/KingKnecht/fireplanner/actions"
echo ""
echo "Once complete, verify the new release at:"
echo "https://github.com/KingKnecht/fireplanner/releases/tag/v0.2.0"
