# FirePlanner - Electron/Vite/Vue Project

A project planning desktop application built with Electron, Vite, and Vue 3 + TypeScript.

## Project Overview

FirePlanner is a visual project planning tool that displays:
- Users as columns
- Weekdays as rows (Monday-Friday)
- Projects as colored rectangles spanning their duration

## Tech Stack

- **Electron**: Desktop application framework
- **Vite**: Fast development and build tool
- **Vue 3**: UI framework with Composition API
- **TypeScript**: Type-safe development
- **Pinia**: State management

## Project Structure

- `electron/` - Main Electron process code
- `src/components/` - Vue components (PlannerGrid, ProjectBlock, ProjectDialog)
- `src/stores/` - Pinia state management
- `src/utils/` - Helper functions (date utilities)
- `src/types.ts` - TypeScript type definitions

## Development

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Conventions

- Use TypeScript for all new files
- Follow Vue 3 Composition API with `<script setup>` syntax
- Place Electron main process code in `electron/` directory
- Place Vue components in `src/components/` directory
- Use Pinia for state management
- Keep date logic in `utils/dateUtils.ts`
- Type all component props and emits

