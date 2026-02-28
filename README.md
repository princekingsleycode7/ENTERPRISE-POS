# 🏪 Enterprise POS System

A modern, full-featured **Point of Sale (POS) system** built with **React**, **TypeScript**, and **Firebase**. Designed for retail and food service businesses with comprehensive inventory management, real-time reporting, and multi-payment support.

<div align="center">

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Latest-orange?logo=firebase)
![Vite](https://img.shields.io/badge/Vite-6.2-purple?logo=vite)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## ✨ Features

### 🛒 **Point of Sale**
- Fast product search and barcode scanning
- Real-time inventory tracking
- Multi-payment methods (Cash, Card, Bank Transfer, Moniepoint)
- Cart management with quantity controls
- Transaction holding and retrieval
- Automated receipt printing
- Responsive mobile-first design

### 📊 **Inventory Management**
- Live stock tracking with reorder alerts
- CSV bulk import functionality
- Stock adjustment with audit trails
- Product categorization
- Low stock notifications
- SKU-based product lookup

### 💰 **Payment Processing**
- **Cash Payments**: With automatic change calculation
- **KoraPay Integration**: Online card payments & bank transfers
- **Moniepoint POS**: Terminal-based card and transfer payments
- **Payment History**: Complete transaction records
- **Reconciliation**: Daily settlement reports

### 📈 **Reporting & Analytics**
- **Sales Summary**: Daily/Weekly/Monthly revenue tracking
- **Product Performance**: Best-sellers and slow movers
- **Employee Performance**: Sales by cashier with commissions
- **Real-time Dashboards**: Live sales metrics
- **Export Capabilities**: CSV/PDF report generation

### 🔐 **Security & Access Control**
- PIN-based employee authentication
- Role-based access control (RBAC)
- Permission system for critical operations
- 30-minute auto-logout
- Comprehensive audit logs
- Activity tracking

### 🔌 **Offline Capabilities**
- Local database with IndexedDB
- Automatic sync to Firebase when online
- Offline transaction processing
- Data persistence across sessions
- Conflict resolution

### 📱 **Responsive Design**
- Mobile-optimized POS interface
- Tablet-friendly product grid
- Desktop analytics dashboard
- Touch-friendly controls
- Dark mode support

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Client-side routing
- **Zustand** - State management

### Backend & Data
- **Firebase** - Backend as a Service
  - Firestore - NoSQL database
  - Authentication - User management
  - Storage - File uploads
  - Cloud Functions - Serverless backend
- **Dexie.js** - IndexedDB wrapper for offline data

### Payment Integration
- **KoraPay** - Card & bank transfer payments
- **Moniepoint** - POS terminal integration
- **ESC/POS** - Printer communication

### UI Components & Icons
- **Lucide React** - Beautiful icons
- **Material Icons** - Android Material Design icons
- **Recharts** - Data visualization

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ 
- **npm** or **yarn**
- Firebase project with credentials
- (Optional) Printer with ESC/POS support

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/enterprise-pos.git
cd enterprise-pos

# Install dependencies
npm install
```

### 2. Environment Configuration

Create `.env.local` in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Payment Gateways (Optional)
VITE_KORAPAY_PUBLIC_KEY=your_korapay_key
VITE_MONIEPOINT_API_KEY=your_moniepoint_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Firestore Database, Authentication, and Storage
3. Download credentials and add to `.env.local`
4. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
```

---

## 📁 Project Structure

```
ENTERPRISE-POS/
├── components/              # Reusable React components
│   ├── auth/               # Authentication components
│   ├── pos/                # POS-specific components
│   ├── inventory/          # Inventory management
│   ├── reports/            # Reporting components
│   ├── settings/           # Settings & configuration
│   └── common/             # Shared utilities
├── pages/                  # Page components (routes)
│   ├── POS.tsx
│   ├── Inventory.tsx
│   ├── Reports.tsx
│   ├── Transactions.tsx
│   ├── Settings.tsx
│   └── AuditLogs.tsx
├── services/               # Business logic
│   ├── firebase/           # Firebase services
│   ├── payment/            # Payment processing
│   ├── offline/            # Offline sync
│   └── printer/            # Printer integration
├── stores/                 # Zustand state stores
│   ├── useAuthStore.ts
│   ├── useCartStore.ts
│   ├── useNotificationStore.ts
│   └── useSyncStore.ts
├── hooks/                  # Custom React hooks
├── mobile/                 # Mobile-specific code
├── functions/              # Cloud Functions (backend)
├── config/                 # Configuration files
├── types.ts                # TypeScript type definitions
├── App.tsx                 # Main app component
├── index.tsx               # React entry point
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

---

## 🎯 Core Features Detail

### Point of Sale Interface
- **Barcode Scanning**: Real-time product lookup by SKU
- **Quick Search**: Filter products by name or code
- **Category Navigation**: Browse by product categories
- **Quantity Controls**: Increment/decrement items easily
- **Transaction Hold**: Pause and resume sales
- **NumPad Input**: Touch-friendly number entry for mobile

### Inventory System
- **Stock Tracking**: Real-time inventory updates
- **Reorder Alerts**: Automatic warnings at low stock levels
- **CSV Import**: Bulk add/update products
- **Product Images**: Visual product identification
- **Pricing Tiers**: Support for cost/selling prices
- **Multi-location**: Track inventory across locations

### Payment Flow
1. **Select Method**: Choose payment type
2. **Process Payment**: Handle via appropriate gateway
3. **Verification**: Confirm transaction
4. **Receipt**: Generate and print receipt
5. **Logging**: Store transaction record

### Offline Mode
- All data synced to local IndexedDB
- Transactions process offline
- Automatic sync when connection restored
- Conflict resolution mechanisms
- Persistent cart state

---

## 🔧 Configuration

### Store Settings
Navigate to **Settings → Store Settings** to configure:
- Store name and address
- Tax rates
- Currency
- Receipt templates
- Printer settings
- Moniepoint terminal serial

### Employee Management
- Add/delete employees
- Set roles and permissions
- Configure commissions
- Manage access levels

### Payment Gateways

#### KoraPay
```typescript
// Configured in services/payment/korapayService.ts
- Online card payments
- Bank transfers
- Recurring payments
```

#### Moniepoint
```typescript
// Configured in services/payment/moniepointService.ts
- POS terminal integration
- Card purchases
- POS transfers
```

---

## 📱 Mobile Version

The system includes a fully responsive mobile POS interface:

```bash
# Mobile components are in: components/pos/MobilePOS.tsx
# Mobile cart is in: components/pos/MobileCart.tsx
```

Features:
- Full-screen product browsing
- Optimized touch controls
- Simplified payment interface
- Floating cart button
- Bottom navigation bar

---

## 🚀 Deployment

### Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy

# View logs
firebase functions:log
```

### Using Vite Preview

```bash
npm run preview
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

---

## 🔐 Security Considerations

- **Authentication**: PIN-based with Firebase Auth
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: Firestore security rules
- **Payment PCI**: Gateway-handled, never stored locally
- **Audit Logs**: Comprehensive activity tracking
- **Session Management**: Auto-logout after 30 minutes
- **Rate Limiting**: Protect against brute force

---

## 🌐 API & Services

### Firestore Collections

```
users/
  └── {userId}
      ├── documents (transactions, inventory)
      └── settings

products/
  ├── category
  ├── name
  ├── sku
  ├── price
  ├── cost
  └── stock_quantity

transactions/
  ├── items
  ├── payment_method
  ├── employee_id
  ├── total
  └── created_at

employees/
  ├── name
  ├── role
  ├── permissions
  └── commission_rate
```

### Key Services

```typescript
// Authentication
firebaseService.auth.signIn(pin)

// Transactions
transactionService.createTransaction(txn)
transactionService.getTransactions()

// Inventory
inventoryService.updateStock(productId, quantity)
inventoryService.importCSV(file)

// Payments
korapayService.initializePayment(amount)
moniepointService.initializePayment(amount)

// Reporting
reportService.getSalesSummary(dateRange)
reportService.getEmployeePerformance()
```

---

## 🧪 Testing

```bash
# Run tests (if configured)
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## 📊 Database Schema

### Products
```json
{
  "id": "string",
  "name": "string",
  "sku": "string",
  "category": "string",
  "price": "number",
  "cost": "number",
  "stock_quantity": "number",
  "reorder_level": "number",
  "imageUrl": "string",
  "created_at": "timestamp"
}
```

### Transactions
```json
{
  "id": "string",
  "transaction_number": "string",
  "employee_id": "string",
  "items": [...],
  "subtotal": "number",
  "tax": "number",
  "total": "number",
  "payment_method": "string",
  "payment_status": "string",
  "payment_reference": "string",
  "created_at": "timestamp"
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use functional components
- Keep components under 300 lines
- Document complex logic

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🐛 Troubleshooting

### "Firebase is not initialized"
- Ensure `.env.local` has correct Firebase credentials
- Verify Firebase project is enabled

### Offline mode not syncing
- Check browser IndexedDB in DevTools
- Verify network connectivity
- Check `syncService` logs

### Payment gateway errors
- Verify API keys in `.env.local`
- Check payment gateway status page
- Review error logs in Firebase Cloud Functions

### Printer not connecting
- Ensure ESC/POS printer is networked
- Check printer IP/serial settings
- Verify CUPS/printer driver installation

---

## 📞 Support

For issues, features, or questions:
- Open an issue on GitHub
- Check existing documentation
- Review error logs in browser console

---

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev)
- [Firebase](https://firebase.google.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite](https://vitejs.dev)

---

**Made with ❤️ for modern retail experiences**

