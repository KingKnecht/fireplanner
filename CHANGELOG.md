# Changelog

All notable changes to FirePlanner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-15

### Added
- **Project Lanes**: Projects with the same user and overlapping dates are now automatically arranged in parallel lanes based on capacity
- **Enhanced Split Projects**: Visual feedback for split project groups with purple borders and "(split)" label
- **Z-Order Management**: Send to Back and Bring to Front buttons with intelligent overlap detection
- **Capacity Presets**: Quick capacity selection buttons (20%, 25%, 33%, 50%, 75%, 100%) alongside flexible number input (1-100%)
- **Sample Project**: Added `sample_6weeks.fpj` demonstrating all features with 4 users and 17 projects
- **Configuration Documentation**: Comprehensive guide for `config.json` settings including autosave, workingDays, and custom properties

### Changed
- **Capacity Field**: Replaced dropdown with number input field and preset buttons for more flexibility
- **Split Project Behavior**: Buffer and capacity are now independent per split (not synchronized across split blocks)
- **Save Behavior**: Proper Save/Save As implementation - Save uses existing path, Save As always shows dialog
- **UI Organization**: Moved project summary section to top of editor panel
- **Custom Properties**: Made custom properties section collapsible for better space management

### Fixed
- **Date Initialization**: Project creation now respects `workingDays` configuration for default start date
- **Drag & Drop**: Fixed drag-drop positioning to work correctly with custom `workingDays` settings
- **Z-Order Issues**: Projects no longer disappear when sent to back (proper bounds checking prevents negative z-index)
- **Mismatch Detection**: Visual alerts for capacity and buffer mismatches when editing split project groups

## [0.1.0] - 2026-01-XX

### Added
- Initial release of FirePlanner
- Visual project planning with user columns and weekday rows
- Project creation, editing, and deletion
- Project splitting functionality
- User management
- Custom project properties
- Drag and drop project blocks
- File save/load functionality (.fpj format)
- Dark mode UI with PrimeVue components
- Undo/redo support with Pinia history plugin
- Configurable autosave via config.json
- Electron desktop application for Linux, Windows, and macOS

[0.3.0]: https://github.com/yourusername/fireplanner/releases/tag/v0.3.0
[0.1.0]: https://github.com/yourusername/fireplanner/releases/tag/v0.1.0
