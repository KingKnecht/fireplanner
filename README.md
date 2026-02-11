# FirePlanner

A project planning desktop application built with Electron, Vite, and Vue 3 + TypeScript.

## Features

- **Visual Project Planning**: Grid-based interface with users as columns and weekdays as rows
- **Project Management**: Create, edit, and delete projects with a visual dialog
- **Date Range Display**: Projects displayed as colored rectangles spanning their duration
- **Weekend Filtering**: Only weekdays (Monday-Friday) are shown in the planner
- **User Management**: Add and manage team members
- **Responsive Interface**: Clean, modern UI with intuitive interactions

## Project Structure

```
fireplanner/
├── electron/             # Electron main process files
│   ├── main.ts          # Main process entry point
│   └── preload.ts       # Preload script for IPC
├── src/
│   ├── components/      # Vue components
│   │   ├── PlannerGrid.vue     # Main grid component
│   │   ├── ProjectBlock.vue    # Project rectangle display
│   │   └── ProjectDialog.vue   # Create/edit dialog
│   ├── stores/          # Pinia state management
│   │   └── plannerStore.ts     # Main application store
│   ├── utils/           # Utility functions
│   │   └── dateUtils.ts        # Date manipulation helpers
│   ├── types.ts         # TypeScript type definitions
│   ├── App.vue          # Root component
│   └── main.ts          # Application entry point
├── dist/                # Built renderer process
└── dist-electron/       # Built main process
```

## Tech Stack

- **Electron**: Desktop application framework
- **Vite**: Fast build tool and development server
- **Vue 3**: Progressive JavaScript framework with Composition API
- **TypeScript**: Type-safe JavaScript
- **Pinia**: State management for Vue

## Development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

This will:
- Start the Vite dev server for hot module replacement
- Build the Electron main process
- Launch the Electron application window
- Open DevTools automatically

## Usage

### Adding Users
1. Click "Add User" button in the header
2. Enter the user name
3. Users appear as columns in the planner

### Creating Projects
- **Option 1**: Click "New Project" button in the header
- **Option 2**: Double-click on any user column in the grid

### Editing Projects
- Double-click on any project rectangle to edit its details

### Project Dialog
- **Name**: Project title
- **User**: Assign to a team member
- **Start Date**: Project start date
- **End Date**: Project end date (must be after start date)
- **Color**: Visual color for the project rectangle

## Building

Build the application for production:

```bash
npm run build
```

This will:
- Compile TypeScript and build the Vue app
- Package the Electron application
- Create a distributable in the `release/` directory

## Configuration

Electron Builder configuration is in `package.json` under the `build` section:
- **appId**: `com.fireplanner.app`
- **Output directory**: `release/`
- **Supported platforms**: macOS (DMG), Windows (NSIS), Linux (AppImage)


