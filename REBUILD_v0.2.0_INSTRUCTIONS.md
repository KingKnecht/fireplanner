# Instructions to Rebuild v0.2.0

## Problem
The v0.2.0 release was created at commit `3ac3bd7`, but it was missing commit `8502d0d` which adds the proper screenshot file (`screenshots/window-main.png`).

## Solution
To rebuild v0.2.0 with the missing commit included, you need to:

1. **Delete the old v0.2.0 tag remotely**
   ```bash
   git push origin :refs/tags/v0.2.0
   ```

2. **Delete the old v0.2.0 release on GitHub**
   - Go to https://github.com/KingKnecht/fireplanner/releases
   - Delete the v0.2.0 release

3. **Create and push the new v0.2.0 tag**
   
   The new tag has already been created locally in this PR and points to commit `8502d0d`.
   
   To push it:
   ```bash
   git push origin v0.2.0
   ```

4. **The GitHub Actions workflow will automatically build the release**
   
   Once the tag is pushed, the `build-release.yml` workflow will automatically:
   - Build Linux AppImage
   - Build Windows executable
   - Create a new GitHub release with the artifacts

## What Changed Between Old and New v0.2.0

**Old v0.2.0** (commit `3ac3bd7`): "updated version and readme"

**New v0.2.0** (commit `8502d0d`): Includes the "new screenshot" commit that:
- Removes the text file `screenshots/window-main-png`
- Adds the actual PNG image `screenshots/window-main.png`

## Verification

After pushing the new tag, you can verify:
1. GitHub Actions workflow runs: https://github.com/KingKnecht/fireplanner/actions
2. New release is created: https://github.com/KingKnecht/fireplanner/releases/tag/v0.2.0
3. The release includes both Linux (.AppImage) and Windows (.exe) artifacts

## Alternative: Create v0.2.1 Instead

If you prefer not to rebuild v0.2.0, you can instead:
1. Leave the existing v0.2.0 tag as-is
2. Create a new v0.2.1 tag at commit `8502d0d`
3. Push the v0.2.1 tag to create a new release

This approach is cleaner as it doesn't require deleting existing releases.
