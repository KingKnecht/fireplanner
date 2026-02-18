# Release Process

This document describes how to create a new release of FirePlanner.

## Prerequisites

- All changes committed and pushed to `master`
- Tests passing locally: `npm run test:run`
- TypeScript compiles without errors: `npx vue-tsc -b --noEmit`
- Application runs correctly: `npm run dev:electron`

## Release Steps

### 1. Update Version Numbers

Update the version in these files:

```bash
# Edit package.json - change "version": "0.x.x"
# Edit package-lock.json - change "version": "0.x.x" in two places (lines 3 and 9)
```

**Semantic Versioning Guide:**
- **Major (x.0.0)**: Breaking changes, incompatible API changes
- **Minor (0.x.0)**: New features, backwards-compatible
- **Patch (0.0.x)**: Bug fixes, backwards-compatible

### 2. Update CHANGELOG.md

Add a new section for the release with today's date:

```markdown
## [0.x.x] - YYYY-MM-DD

### Added
- New feature descriptions

### Changed
- Modified behavior descriptions

### Fixed
- Bug fix descriptions
```

Add the version link at the bottom:
```markdown
[0.x.x]: https://github.com/KingKnecht/fireplanner/releases/tag/v0.x.x
```

### 3. Verify Changes

```bash
# Check all tests pass
npm run test:run

# Verify TypeScript compilation
npx vue-tsc -b --noEmit

# Check git status
git status
```

### 4. Commit Version Changes

```bash
# Stage the version files
git add package.json package-lock.json CHANGELOG.md

# Commit with clear message
git commit -m "Release version 0.x.x"

# Push to remote
git push origin master
```

### 5. Create and Push Git Tag

**Important:** Our repository uses `master` as the default branch, not `main`.

```bash
# Create annotated tag
git tag -a v0.x.x -m "Release version 0.x.x - Brief description"

# Push the tag to trigger GitHub Actions
git push origin v0.x.x
```

### 6. Verify GitHub Actions Build

1. Go to: https://github.com/KingKnecht/fireplanner/actions
2. Watch the build workflow triggered by the tag
3. Wait for Linux and Windows builds to complete
4. Check the GitHub Releases page for the new release with artifacts

### 7. Create GitHub Release (Optional)

If not automatically created, manually create a release:

1. Go to: https://github.com/KingKnecht/fireplanner/releases
2. Click "Draft a new release"
3. Select the tag `v0.x.x`
4. Copy the changelog section for this version into the description
5. Attach any additional files if needed
6. Click "Publish release"

## Common Issues

### Tag Already Exists

If you get "tag already exists" error:

```bash
# Delete local tag
git tag -d v0.x.x

# Delete remote tag (if pushed)
git push origin :refs/tags/v0.x.x

# Recreate the tag
git tag -a v0.x.x -m "Release version 0.x.x - Description"

# Push again
git push origin v0.x.x
```

### Force Update Remote Tag

If the tag exists remotely and you need to update it:

```bash
# Force push to overwrite remote tag
git push origin v0.x.x --force
```

### Build Fails on GitHub Actions

Common causes:
- TypeScript compilation errors
- Test failures
- Missing dependencies
- Type mismatches in test files

Check locally before pushing:
```bash
npm run test:run
npx vue-tsc -b --noEmit
```

## Files to Update Checklist

- [ ] `package.json` - version field
- [ ] `package-lock.json` - version field (2 places)
- [ ] `CHANGELOG.md` - new release section with date
- [ ] `CHANGELOG.md` - version link at bottom
- [ ] All changes committed
- [ ] Tag created with `v` prefix
- [ ] Tag pushed to GitHub

## Post-Release

After a successful release:

1. Verify the release appears on GitHub
2. Download and test the Linux AppImage
3. Download and test the Windows installer (if possible)
4. Update any documentation referencing the version number
5. Announce the release (if applicable)

## Next Development Cycle

After releasing, optionally create an `[Unreleased]` section in CHANGELOG.md for the next version:

```markdown
## [Unreleased]

### Added

### Changed

### Fixed
```

This makes it easy to track changes as you work toward the next release.
