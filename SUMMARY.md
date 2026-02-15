# Summary: v0.2.0 Rebuild Preparation

## What Was Done

This PR prepares everything needed to rebuild the v0.2.0 release with the missing screenshot commit.

### The Problem
The original v0.2.0 release was tagged at commit `3ac3bd7` ("updated version and readme"), but there was a subsequent commit `8502d0d` ("new screenshot") that should have been included in that release. This commit:
- Removes the text file `screenshots/window-main-png` 
- Adds the actual PNG image `screenshots/window-main.png`

### What's Been Prepared
1. **New v0.2.0 Tag**: A new annotated tag has been created locally pointing to commit `8502d0d` which includes all the changes that should be in v0.2.0
2. **Instructions Document**: `REBUILD_v0.2.0_INSTRUCTIONS.md` provides detailed steps
3. **Automation Script**: `rebuild-v0.2.0.sh` automates the process of deleting and re-pushing the tag

## Next Steps (Manual Actions Required)

Due to GitHub permissions, you need to manually complete these steps:

### Option 1: Use the Automated Script (Recommended)
```bash
# From the repository root
./rebuild-v0.2.0.sh
```
The script will guide you through:
1. Deleting the remote v0.2.0 tag
2. Pushing the new v0.2.0 tag

You'll still need to manually delete the old release on GitHub first.

### Option 2: Manual Process
1. Delete the old v0.2.0 release at: https://github.com/KingKnecht/fireplanner/releases
2. Delete the remote tag:
   ```bash
   git push origin :refs/tags/v0.2.0
   ```
3. Push the new tag:
   ```bash
   git push origin v0.2.0
   ```

### Option 3: Create v0.2.1 Instead
If you prefer not to rebuild v0.2.0, you can create v0.2.1:
```bash
# Delete the local v0.2.0 tag
git tag -d v0.2.0

# Create v0.2.1 tag
git tag -a v0.2.1 8502d0d -m "Version 0.2.1"

# Push it
git push origin v0.2.1
```

## What Happens After Pushing the Tag

The GitHub Actions workflow (`.github/workflows/build-release.yml`) will automatically:
1. Build the Linux AppImage
2. Build the Windows executable  
3. Create a new GitHub release
4. Upload both artifacts to the release

You can monitor the progress at: https://github.com/KingKnecht/fireplanner/actions

## Verification

After the workflow completes, verify:
- ✓ New release exists at: https://github.com/KingKnecht/fireplanner/releases/tag/v0.2.0
- ✓ Release includes Linux `.AppImage` file
- ✓ Release includes Windows `.exe` file
- ✓ The tag points to commit `8502d0d`

## Technical Details

**Old v0.2.0 Tag:**
- Commit: `3ac3bd7` 
- Message: "updated version and readme"

**New v0.2.0 Tag:**
- Commit: `8502d0d`
- Message: "new screenshot"  
- Includes: All changes from `3ac3bd7` plus the screenshot fix

**Commit Difference:**
```
git diff 3ac3bd7..8502d0d
```
Shows only the screenshot file change - this is a minimal, safe change to include in the rebuilt release.
