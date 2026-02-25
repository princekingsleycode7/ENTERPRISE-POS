# Getting Started: Adding Products to Your POS System

## Quick Start Guide

### Step 1: Start the Application
1. Run your POS application
2. Log in with admin credentials
3. Navigate to **Settings** → **Inventory Management** (or direct to Inventory page)

### Step 2: Add Your First Product
1. Click **"+ Add New Product"** button
2. Fill in the form:

| Field | Example | Notes |
|-------|---------|-------|
| Product Name | "Espresso" | Must be unique or descriptive enough to identify |
| SKU | "COF-ESP-001" | Use consistent naming (e.g., CATEGORY-PRODUCT-NUMBER) |
| Category | "Coffee" | Use consistent categories: Coffee, Food, Electronics, etc. |
| Selling Price | 3.50 | Price customers pay |
| Cost Price | 0.50 | What you paid for the product |
| Initial Stock | 100 | Starting inventory quantity |
| Reorder Level | 10 | Alert when stock drops below this |
| Image URL | (optional) | URL to product image |
| Description | (optional) | Additional product details |

3. Click **"Save Product"**
4. You'll see a success message
5. Product appears in inventory list

### Step 3: Populate Your Inventory
Repeat Step 2 for all products. Examples by category:

#### Coffee Shop
```
- Espresso (COF-001, $3.50, Cost $0.50)
- Cappuccino (COF-002, $4.50, Cost $0.80)
- Latte (COF-003, $4.75, Cost $0.90)
- Croissant (BAK-001, $3.00, Cost $0.50)
- Muffin (BAK-002, $3.25, Cost $0.60)
```

#### Retail Store
```
- T-Shirt Blue (CLOTH-001, $29.99, Cost $8.50)
- Jeans (CLOTH-002, $59.99, Cost $18.00)
- Laptop (ELEC-001, $999.99, Cost $650.00)
- USB Cable (ELEC-002, $9.99, Cost $2.50)
```

#### General Store
```
- Milk (GRO-001, $4.99, Cost $2.00)
- Bread (GRO-002, $3.49, Cost $1.50)
- Notebook (STT-001, $2.99, Cost $0.75)
- Pen Pack (STT-002, $1.99, Cost $0.50)
```

---

## Editing Products

1. Go to **Inventory** page
2. Find the product in the list
3. Click **Edit** (pencil icon)
4. Modify fields (note: initial stock cannot be changed in edit)
5. Click **"Save Product"**

---

## Stock Management

### Viewing Stock Status
- **Green**: Stock above reorder level ✓
- **Yellow/Orange**: Stock at or below reorder level ⚠️
- Click **"Filter Low Stock"** to see items that need restocking

### Adjusting Stock
1. Click the **adjustment icon** (↔️) on a product
2. Enter quantity to add/remove
3. Select reason (e.g., "Inventory Correction", "Damage", "Theft")
4. Confirm with PIN
5. Stock updates immediately

### Automatic Stock Updates
Stock automatically decreases when:
- ✓ A sale completes (POS → Cart checkout)
- ✓ Multiple items are sold in one transaction

Stock automatically increases when:
- ✓ A transaction is voided/reversed

---

## Database Synchronization

### How Sync Works
1. **When Online**:
   - Products sync to Firebase automatically
   - Stock updates saved to cloud
   - New products available across all terminals

2. **When Offline**:
   - All changes saved locally
   - Products still available on device
   - Changes sync automatically when reconnected

### Checking Sync Status
- Look at top-right corner for sync indicator
- Green checkmark = Last sync was successful
- Loading spinner = Currently syncing
- Red warning = Sync issues (will retry)

---

## Best Practices

### SKU Naming Convention
Use a pattern that makes sense for your business:
```
[CATEGORY]-[PRODUCT]-[VARIANT/NUMBER]

Examples:
- Coffee: COF-ESP-001, COF-CAP-001
- Clothing: CLOTH-SHIRT-BLUE-M, CLOTH-SHIRT-BLUE-L
- Electronics: ELEC-LAPTOP-DELL, ELEC-CABLE-USB-C
- Groceries: GRO-MILK-2L, GRO-BREAD-WHL
```

### Category Consistency
Keep categories consistent:
- ✓ "Coffee" (not "Coffees" or "Coffee Drinks")
- ✓ "Electronics" (not "Tech" or "Gadgets")
- ✓ "Clothing" (not "Clothes" or "Apparel")

### Pricing Strategy
```
Profit Margin = (Selling Price - Cost) / Selling Price × 100

Examples:
- Espresso: ($3.50 - $0.50) / $3.50 = 85.7% margin
- T-Shirt: ($29.99 - $8.50) / $29.99 = 71.6% margin
- Electronics: ($999.99 - $650) / $999.99 = 35% margin
```

### Stock Levels
Set reorder levels based on:
- **High-turnover items**: 20-50% of average weekly sales
- **Seasonal items**: 10-20% of average weekly sales
- **Specialty items**: Minimum 2-5 units on hand

---

## Troubleshooting

### Product Not Showing in POS
- ✓ Refresh the POS page
- ✓ Check product is marked as "active" (if field exists)
- ✓ Verify product synced (check Inventory page)
- ✓ Try restarting the application

### Stock Not Updating After Sale
- ✓ Check transaction completed successfully
- ✓ Verify product exists in database
- ✓ Check browser console for errors
- ✓ Try syncing manually or going offline/online

### Cannot Add Product
- ✓ Verify you have admin permissions
- ✓ Check all required fields are filled (Name, SKU, Price)
- ✓ Ensure you're connected to internet
- ✓ Try refreshing the page

### Duplicate SKUs
- ✓ Each SKU should be unique
- ✓ If duplicates exist, edit one product with a new SKU
- ✓ Use format: SKU-VARIANT (e.g., COF-001-LARGE)

---

## Support & Questions

If you encounter issues:
1. Check the browser console (F12 → Console tab) for error messages
2. Verify Firebase is connected and has internet
3. Check that products collection exists in Firestore
4. Review Firestore rules allow your user role
5. Try clearing browser cache and refreshing
