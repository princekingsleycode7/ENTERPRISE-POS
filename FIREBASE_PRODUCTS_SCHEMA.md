# Firebase Products Schema & Database Structure

## Overview
The POS system has been updated to **pull all products exclusively from Firebase Firestore**. Seed/mock data has been removed. Products are now a multipurpose store system (like Walmart) that supports any type of inventory.

---

## Firestore Collection: `products`

### Schema Definition

```typescript
interface Product {
  id?: string;                    // Firebase auto-generated ID (primary key)
  sku: string;                    // Stock Keeping Unit (unique identifier)
  name: string;                   // Product name (e.g., "Espresso", "Laptop", "Shirt")
  description?: string;           // Optional product description
  category: string;               // Category (e.g., "Coffee", "Electronics", "Clothing")
  price: number;                  // Selling price (in store currency)
  cost: number;                   // Cost price (for profit calculation)
  stock_quantity: number;         // Current quantity in inventory
  reorder_level: number;          // Minimum stock threshold (triggers reorder alerts)
  imageUrl?: string;              // Optional product image URL
  created_at?: string;            // ISO timestamp when created
  updated_at?: string;            // ISO timestamp of last update
}
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Auto | Firebase auto-generated document ID |
| `sku` | string | ✓ | Unique product code (e.g., "COF001", "ELEC-LAPTOP-001") |
| `name` | string | ✓ | Product display name |
| `description` | string | Optional | Detailed product description |
| `category` | string | ✓ | Product category for organization |
| `price` | number | ✓ | Selling price per unit |
| `cost` | number | ✓ | Cost price per unit |
| `stock_quantity` | number | ✓ | Current inventory count |
| `reorder_level` | number | ✓ | Alert threshold for low stock |
| `imageUrl` | string | Optional | URL to product image |
| `created_at` | string | Auto | ISO timestamp (set on creation) |
| `updated_at` | string | Auto | ISO timestamp (updated on changes) |

---

## Sample Data Structure (for reference)

```json
{
  "products": {
    "prod_coffee_001": {
      "sku": "COF001",
      "name": "Espresso",
      "description": "Single shot of espresso",
      "category": "Coffee",
      "price": 3.50,
      "cost": 0.50,
      "stock_quantity": 100,
      "reorder_level": 10,
      "imageUrl": "https://example.com/espresso.jpg",
      "created_at": "2026-02-25T10:30:00.000Z",
      "updated_at": "2026-02-25T10:30:00.000Z"
    },
    "prod_laptop_001": {
      "sku": "ELEC-LAPTOP-001",
      "name": "MacBook Pro 16-inch",
      "description": "High-performance laptop",
      "category": "Electronics",
      "price": 2499.99,
      "cost": 1800.00,
      "stock_quantity": 5,
      "reorder_level": 2,
      "imageUrl": "https://example.com/macbook.jpg",
      "created_at": "2026-02-25T12:00:00.000Z",
      "updated_at": "2026-02-25T12:00:00.000Z"
    },
    "prod_shirt_001": {
      "sku": "CLOTH-SHIRT-001",
      "name": "Cotton T-Shirt (Blue)",
      "description": "Classic blue cotton t-shirt",
      "category": "Clothing",
      "price": 29.99,
      "cost": 8.50,
      "stock_quantity": 250,
      "reorder_level": 50,
      "imageUrl": "https://example.com/tshirt-blue.jpg",
      "created_at": "2026-02-25T14:15:00.000Z",
      "updated_at": "2026-02-25T14:15:00.000Z"
    }
  }
}
```

---

## Suggested Firestore Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Products: Admins and managers can read/write, cashiers can only read
    match /products/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null && 
        request.auth.token.role in ['admin', 'manager'];
    }

    // Transactions: Authenticated users can create, read own/all with proper role
    match /transactions/{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.token.role in ['admin', 'manager'];
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## System Changes Made

### 1. **Removed Seed Data** ✓
   - Deleted `seedDefaultProducts()` method from syncService
   - Removed fallback to mock data
   - Products now **MUST** come from Firebase

### 2. **Updated syncService.ts** ✓
   - `syncProductsFromFirebase()`: Now clears local DB and loads ONLY from Firebase
   - No seed data fallback - database remains empty until admin adds products
   - Proper error logging if sync fails

### 3. **Updated transactionService.ts** ✓
   - **New method:** `updateProductStockAfterSale(productId, quantity)`
     - Decrements stock when transaction is completed
     - Updates both offline (Dexie) and online (Firebase) databases
     - Works even when offline, syncs when reconnected
   
   - **Updated method:** `voidTransaction()`
     - Automatically restores product stock when transaction is voided
     - Restores all items in the voided transaction
     - Maintains stock integrity

### 4. **ProductForm (No Changes Needed)** ✓
   - Already has all necessary fields:
     - ✓ Product Name (required)
     - ✓ SKU (required)
     - ✓ Category
     - ✓ Selling Price
     - ✓ Cost Price
     - ✓ Initial Stock
     - ✓ Reorder Level
     - ✓ Image URL
     - ✓ Description
   - Admin UI is fully functional and connected

---

## How It Works

### Adding Products (Admin)
1. Admin goes to **Inventory** page
2. Clicks **"Add New Product"**
3. Fills in all product details
4. Clicks **"Save Product"**
5. Product is added to Firebase and synced locally

### Selling Products (POS)
1. Products load from Firebase into offline database
2. Cashier scans/searches for product
3. Product is added to cart
4. When transaction completes → **stock automatically decrements**
5. Updates sync to Firebase when online

### Voiding Transactions
1. Manager/Admin voids a transaction
2. **Stock is automatically restored** for all items
3. Changes sync to Firebase when online

### Low Stock Alerts
1. Inventory page shows products below `reorder_level`
2. Alert icon displays for low stock items
3. Manager can manually adjust stock or reorder

---

## Database Initialization Flow

```
App Start
  ↓
syncService.init()
  ├─ seedDefaultAdmin() → Creates default admin if none exist
  ├─ (NO seedDefaultProducts anymore)
  └─ syncProductsFromFirebase() → Loads products from Firebase
       ├─ If online → Fetch from Firebase
       └─ If offline → Use cached local data
  ↓
App Ready (with products from Firebase)
```

---

## Important Notes

1. **Empty Database**: The products collection in Firebase starts empty. Admin must add products via the Inventory UI.

2. **Stock Management**: Stock is automatically updated:
   - Decremented when sales complete
   - Restored when transactions are voided
   - Can be manually adjusted via Inventory page

3. **Offline Mode**: 
   - Products sync to local cache when online
   - Changes to stock sync when connection is restored
   - All updates use Dexie for offline-first architecture

4. **Multipurpose Store**: The schema supports any product type:
   - Coffee/Beverages
   - Food/Bakery
   - Electronics
   - Clothing
   - Books
   - Any retail inventory

---

## Next Steps

1. **Populate Products**: Add products to Firestore `products` collection via admin UI
2. **Set Categories**: Use consistent category names across products
3. **Configure Reorder Levels**: Set appropriate minimum stock thresholds
4. **Test Transactions**: Complete test sales to verify stock decrements
5. **Monitor**: Use Inventory page to track stock levels and low-stock items
