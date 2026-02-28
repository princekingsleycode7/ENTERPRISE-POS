# Monorepo Command Reference

## Workspace Management

### Install All Dependencies
```bash
npm install

# Install for specific workspace
npm install --workspace=web
npm install --workspace=packages/shared-services
```

### Build All
```bash
# Build everything
npm run build

# Build specific workspace
npm run build:services      # Shared services only
npm run build:web           # Web app only
npm run build:mobile        # Mobile app only
```

## Development Servers

### Web Development
```bash
npm run dev:web

# or from web directory
cd web && npm run dev

# Access at http://localhost:3000
```

### Mobile Development
```bash
npm run dev:mobile

# or from mobile directory
cd mobile && npm run start

# Options when you see the prompt:
# - Press 'a' for Android
# - Press 'i' for iOS
# - Press 'w' for Web preview
# - Press 'j' to open DevTools
```

## Type Checking

### Check Types in All Workspaces
```bash
npm run type-check
```

### Check Specific Workspace
```bash
npm run type-check --workspace=web
npm run type-check --workspace=packages/shared-services
```

## Package-Specific Commands

### Shared Services Package
```bash
cd packages/shared-services

# Development watch mode
npm run dev

# Build TypeScript
npm run build

# Type check
npm run type-check
```

### Web App
```bash
cd web

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Mobile App
```bash
cd mobile

# Start Expo server
npm run start

# Build for Android
npm run android

# Build for iOS
npm run ios

# Build via EAS (for production)
npm run build
```

## Dependency Management

### Add Dependency to Shared Services
```bash
npm install zustand --workspace=packages/shared-services
```

### Add Dev Dependency to Web
```bash
npm install --save-dev typescript --workspace=web
```

### Add to Mobile
```bash
npm install expo-sqlite --workspace=mobile
```

### Remove Dependency
```bash
npm uninstall zustand --workspace=packages/shared-services
```

## Monorepo Maintenance

### Check Workspace Status
```bash
# List workspaces
npm workspaces list

# See dependency graph
npm ls
```

### Clean Up
```bash
# Remove all node_modules
rm -rf node_modules
rm -rf packages/shared-services/node_modules
rm -rf web/node_modules
rm -rf mobile/node_modules

# Remove build artifacts
rm -rf packages/shared-services/dist
rm -rf web/dist
rm -rf mobile/.expo

# Reinstall everything
npm install
```

### Link Workspaces (if issues)
```bash
# Force yarn/npm to relink workspaces
npm install --no-save

# or remove lock file and reinstall
rm package-lock.json
npm install
```

## Development Workflow

### Starting Fresh
```bash
# 1. Install everything
npm install

# 2. Build shared services (if not auto-built)
npm run build:services

# 3. Start web OR mobile
npm run dev:web
# OR
npm run dev:mobile
```

### Modifying Shared Code

#### After changing shared-services code:
```bash
# Option 1: Auto-watch mode (runs in background)
npm run dev --workspace=packages/shared-services

# Option 2: Manual rebuild when needed
npm run build:services

# Then restart your dev server
npm run dev:web
# OR
npm run dev:mobile
```

#### After changing types or interfaces:
```bash
# Rebuild shared services
npm run build:services

# Type checking in dependent apps
npm run type-check --workspace=web
npm run type-check --workspace=mobile
```

### Debugging

#### Shared Services
```bash
cd packages/shared-services
npm run dev  # Watch mode for TypeScript compilation
```

#### Web App
```bash
cd web
npm run dev

# Open browser DevTools (F12)
# React DevTools browser extension recommended
```

#### Mobile App
```bash
cd mobile
npm run start

# Open DevTools in Expo app or web preview
# React Native DevTools available for debugging
```

## Testing Setup (Future)

```bash
# When testing is added

# Test all workspaces
npm test

# Test specific workspace
npm test --workspace=packages/shared-services
npm test --workspace=web
npm test --workspace=mobile
```

## Building for Production

### Web
```bash
cd web
npm run build

# Output in web/dist/
```

### Mobile (via EAS)
```bash
# First time setup
cd mobile
eas init

# Build for distribution
eas build --platform android --distribution apk
eas build --platform ios --distribution app-store
```

## Environment Variables

### Web Development
Uses `.env.local` at root - automatically picked up by Vite

### Mobile Development
Uses `.env.local` at root - Expo converts `VITE_*` to `EXPO_PUBLIC_*`

### Create .env.local
```bash
cp .env.local.example .env.local
# Edit with your API keys
```

## Troubleshooting Commands

### Clear All Caches
```bash
# Remove all build outputs
find . -name dist -type d -exec rm -rf {} +
find . -name .expo -type d -exec rm -rf {} +
find . -name build -type d -exec rm -rf {} +

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

### Check Node/npm Version
```bash
node --version    # Should be 18+
npm --version     # Should be 9+
```

### Verify Workspaces
```bash
npm ls --depth=0

# Should show:
# modern-pos-monorepo
# ├── @pos/shared-services
# ├── pos-mobile
# └── pos-web
```

### Debug Imports
```typescript
// In any file, check what's being imported
import * as sharedServices from '@pos/shared-services';
console.log(Object.keys(sharedServices));

// Should show:
// ['useAuthStore', 'useCartStore', 'ENV', 'IDatabase', ...]
```

## Git Workflow

### Clone Monorepo
```bash
git clone <repo-url>
cd ENTERPRISE-POS
npm install
```

### Before Pushing
```bash
# Type check everywhere
npm run type-check

# Build to verify everything compiles
npm run build:services
npm run build:web

# You can build mobile separately
```

### After Pulling
```bash
# Install any new dependencies
npm install

# Rebuild shared services
npm run build:services
```

## Performance Tips

### Speed Up Development
```bash
# Only build what changed
npm run dev --workspace=web

# Don't rebuild shared-services if you didn't change it
# Just restart the dev server

# For mobile, Expo rebuilds incrementally
npm run start
```

### Cache Optimization
```bash
# npm caches in ~/.npm
# If getting stale packages, clear cache
npm cache clean --force
npm install
```

## VSCode Integration

### Recommended Extensions
- TypeScript Vue Plugin
- Tailwind CSS IntelliSense  
- React Native Tools
- Thunder Client (for API testing)
- ESLint
- Prettier

### VSCode Workspace Settings
Create `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Debug Configuration
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Web App",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/web/src"
    }
  ]
}
```

---

**Last Updated:** February 28, 2026  
**For Issues:** See MONOREPO_MIGRATION_GUIDE.md
