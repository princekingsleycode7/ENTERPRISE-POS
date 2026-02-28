# Monorepo Migration Guide

## Current Status

The project has been converted to a monorepo structure with the following layout:

```
ENTERPRISE-POS/
├── packages/
│   └── shared-services/          # Shared logic, types, stores, database layer
│       ├── src/
│       │   ├── types/            # Shared TypeScript types
│       │   ├── stores/           # Zustand stores (useAuthStore, useCartStore, etc.)
│       │   ├── config/           # Environment configuration
│       │   ├── db/               # Database abstraction layer
│       │   │   ├── DatabaseAdapter.ts    # Interface
│       │   │   ├── adapters/
│       │   │   │   ├── DexieAdapter.ts   # Web implementation
│       │   │   │   └── SQLiteAdapter.ts  # Mobile implementation
│       │   │   ├── factory.ts            # Platform detector
│       │   │   └── index.ts
│       │   ├── services/         # Shared business logic (TBD)
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── web/                          # Vite + React web app
│       ├── src/
│       │   ├── index.tsx         # Entry point
│       │   ├── App.tsx           # Root component
│       │   ├── types.ts          # Re-exports shared types
│       │   ├── pages/            # Existing pages (Login, POS, Inventory, etc.)
│       │   ├── components/       # Existing components
│       │   └── services/         # Web-only services (printer, barcode scanner)
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── index.html
├── mobile/                       # Expo + React Native app
│       ├── src/
│       │   ├── app.tsx           # Root layout
│       │   ├── screens/          # Native screens (TBD)
│       │   └── components/       # Native components (TBD)
│       ├── package.json
│       ├── app.json              # Expo configuration
│       ├── tsconfig.json
│       └── index.js
├── .env.local                    # Shared environment variables
├── package.json                  # Root monorepo config with workspaces
└── tsconfig.base.json            # Shared TypeScript config

```

## ✅ Completed

1. **Monorepo Structure**
   - Created root `package.json` with workspaces: `packages/shared-services`, `web`, `mobile`
   - Set up all directory structures

2. **Shared Services Package** (`packages/shared-services`)
   - Created TypeScript types (`types/index.ts`)
   - Extracted Zustand stores:
     - `useAuthStore` - Authentication and user state
     - `useCartStore` - Cart management
     - `useNotificationStore` - Notifications
     - `useSyncStore` - Sync status
   - Set up environment configuration (`config/env.ts`)
   - Created database abstraction layer:
     - `DatabaseAdapter.ts` - Platform-agnostic interface
     - `DexieAdapter.ts` - Web implementation
     - `SQLiteAdapter.ts` - Mobile implementation
     - `factory.ts` - Runtime platform detection

3. **Web App** (`web/`)
   - Created `package.json` with all dependencies
   - Set up Vite configuration with path aliases
   - Created `index.tsx` entry point
   - Created `App.tsx` with proper imports from shared-services
   - Set up TypeScript configuration

4. **Mobile App** (`mobile/`)
   - Created `package.json` with Expo + React Native dependencies
   - Set up `app.json` for Expo configuration
   - Created app entry point
   - Set up TypeScript configuration

5. **Workspace Configuration**
   - Updated root `package.json` with npm workspaces
   - Created `tsconfig.base.json` for shared TypeScript settings
   - Set up path aliases for `@pos/shared-services`

## ⚠️ Still To Do

### Phase 1: Service Migration (Critical)
- [ ] **Copy all remaining services to shared-services package**
  - Copy `/services/auth/` → `/packages/shared-services/src/services/auth/`
  - Copy `/services/firebase/` → `/packages/shared-services/src/services/firebase/`
  - Copy `/services/inventory/` → `/packages/shared-services/src/services/inventory/`
  - Copy `/services/payment/` → `/packages/shared-services/src/services/payment/`
  - Copy `/services/transactions/` → `/packages/shared-services/src/services/transactions/`
  - Copy `/services/reports/` → `/packages/shared-services/src/services/reports/`
  - Copy `/services/settings/` → `/packages/shared-services/src/services/settings/`

- [ ] **Update `packages/shared-services/src/index.ts`**
  - Export all services from `/src/services/*`

- [ ] **Update services to use shared types**
  - All services should import from `'..../types'` not relative paths

### Phase 2: Web App Migration
- [ ] **Copy remaining web app files to `/web/src/`**
  - Copy all `/components/` → `/web/src/components/`
  - Copy all `/pages/` → `/web/src/pages/`
  - Copy `/services/` (web-specific only like printer) → `/web/src/services/`
  - Note: DO NOT copy services that should be in shared-services

- [ ] **Update all imports in web app**
  - Change `import { useAuthStore } from '../stores/useAuthStore'` 
  - To `import { useAuthStore } from '@pos/shared-services'`
  - Same for types, other stores

- [ ] **Copy config files**
  - Move web-specific config/env.ts functionality to web if needed
  - Copy `.env.local` to root (already done)

### Phase 3: Mobile App Development
- [ ] **Implement SQLiteAdapter completely**
  - Populate with actual SQLite queries using `expo-sqlite`
  - Test all CRUD operations

- [ ] **Create React Native screens**
  - Create `/mobile/src/screens/LoginScreen.tsx`
  - Create `/mobile/src/screens/POSScreen.tsx`
  - Create `/mobile/src/screens/InventoryScreen.tsx`
  - Create `/mobile/src/screens/ReportsScreen.tsx`

- [ ] **Create React Native components**
  - Product list, cart, payment interface
  - Navigation between screens

- [ ] **Handle platform-specific code**
  - Storage: AsyncStorage (mobile) vs localStorage (web)
  - Permissions: Camera/Storage on mobile
  - Hardware: Printer service (web only) vs payment terminal on mobile

### Phase 4: Build & Testing
- [ ] **Test web app**
  - Run: `npm run dev:web`
  - Verify Dexie adapter works
  - Check all imports resolve correctly

- [ ] **Test mobile app**
  - Run: `npm run dev:mobile`
  - Verify SQLite adapter works
  - Check platform-specific code paths

- [ ] **Workspace bundling**
  - Ensure shared-services builds correctly
  - Both web and mobile can import it

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm 9+ (for workspaces support)

### Initial Setup
```bash
cd ENTERPRISE-POS
npm install

# Install dependencies for all workspaces
npm install --workspaces

# Or just the shared services
npm install --workspace=packages/shared-services
```

### Development

**Start Web App:**
```bash
npm run dev:web
# or
cd web && npm run dev
```

**Start Mobile App:**
```bash
npm run dev:mobile
# or
cd mobile && npm run start
```

**Build Web:**
```bash
npm run build:web
```

**Build Mobile (via EAS):**
```bash
npm run build:mobile
```

### Key Import Patterns

**Shared Types:**
```typescript
import { Product, Transaction, Employee } from '@pos/shared-services/types';
// or
import { Product } from '@pos/shared-services';
```

**Shared Stores:**
```typescript
import { useAuthStore, useCartStore } from '@pos/shared-services';
```

**Shared Database:**
```typescript
import { getDatabase, initializeDatabase } from '@pos/shared-services/db';

// Initialize on app startup
const db = await initializeDatabase();

// Then use
const products = await db.getProducts();
```

**Web-only imports:**
```typescript
// Only in web/src files
import { printerService } from './services/printer/printerService';
import { barcodeService } from './services/inventory/barcodeService';
```

**Mobile-only imports:**
```typescript
// Only in mobile/src files
import type { SQLiteDatabase } from 'expo-sqlite';
```

## Environment Variables

All environment variables are in `.env.local` at the root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_KORAPAY_PUBLIC_KEY=...
VITE_MONIEPOINT_TERMINAL_SERIAL=...
NODE_ENV=development
```

For mobile (Expo), prefix with `EXPO_PUBLIC_`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
etc.
```

## Database Adapter Usage

The database adapter pattern allows both platforms to use the same interface:

```typescript
import { initializeDatabase } from '@pos/shared-services';

// On app startup
const db = await initializeDatabase();

// Then use the same methods on both platforms
const products = await db.getProducts();
const transaction = await db.saveTransaction(txn);
const employees = await db.getEmployees();

// It automatically uses:
// - DexieAdapter on web
// - SQLiteAdapter on mobile
```

## Next Steps

1. **Start with Phase 1**: Copy services to shared-services
2. **Update imports**: Make all services reference shared types
3. **Test shared-services build**: `npm run build:services`
4. **Phase 2**: Migrate web app components and pages
5. **Phase 3**: Implement mobile screens
6. **Run tests** on both platforms

## Troubleshooting

### Build fails with "Cannot find module"
- Ensure shared-services is built: `npm run build:services`
- Check path aliases in `tsconfig.base.json`
- Verify workspace dependencies in package.json

### Imports not resolving
- Run `npm install` at root to link workspaces
- Clear node_modules and reinstall if needed
- Check that `@pos/shared-services` is in dependencies

### Mobile app won't start
- Ensure expo-sqlite is installed: `npm install expo-sqlite`
- Check app.json has plugins configured
- Verify TypeScript types are generated from shared-services

---

**Created:** February 28, 2026  
**Status:** Phase 1 Ready - Waiting for service extraction
