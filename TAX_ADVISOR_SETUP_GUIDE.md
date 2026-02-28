# Tax Advisor Phase 1 — Implementation Guide

## Quick Setup Steps

### 1. Install Dependencies (if needed)

**Frontend** — No new packages required
```bash
# Already have all required dependencies
```

**Firebase Functions** — Ensure dependencies are in place
```bash
cd functions
npm install
# Already have firebase-admin, firebase-functions, node-fetch
```

### 2. Configure Environment Variables

**Frontend (.env.local or Vite config):**
```
VITE_ANTHROPIC_API_KEY=sk-ant-[your-api-key]
```

**Firebase Functions** — Set via Firebase CLI:
```bash
firebase functions:config:set anthropic.api_key="sk-ant-[your-api-key]"
```

OR for local development, create `functions/.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-[your-api-key]
```

### 3. Build and Deploy

**Build frontend:**
```bash
npm run build
```

**Deploy Firebase Functions:**
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 4. Test the Feature

1. Start the app and login as **manager** or **admin**
2. Look for **Tax Advisor** icon (📊 calculator) in the left sidebar
3. Click to open the Tax Advisor page
4. Try one of these example questions:
   - "Do we need to register for VAT?"
   - "What's our estimated tax liability this year?"
   - "Which expenses are tax deductible?"

### 5. Verify All Components Work

**Chat Interface:**
- [ ] Messages appear with correct styling (user blue, assistant white)
- [ ] Input field accepts text
- [ ] Send button works
- [ ] Loading spinner appears while processing
- [ ] Responses include Nigerian tax law citations

**Tax Snapshot (Sidebar):**
- [ ] Current month VAT shows (0 if no sales)
- [ ] Year-to-date CIT shows
- [ ] Next FIRS deadline displays with countdown

**Access Control:**
- [ ] Login as **cashier** → Tax Advisor NOT visible in sidebar
- [ ] Try to access `/tax-advisor` directly → redirects to `/pos`
- [ ] Login as **manager** → Tax Advisor visible and clickable

**Offline Mode:**
- [ ] Disconnect internet
- [ ] Tax Advisor page shows "Offline Mode" notice
- [ ] Input field is disabled
- [ ] Sidebar shows network status

---

## File Structure Created

```
enterprise-pos/
├── services/
│   └── tax/
│       ├── taxSystemPrompt.ts       ← Nigerian tax law knowledge
│       ├── taxTools.ts              ← Tool definitions & implementation
│       └── taxAgentService.ts       ← Frontend service
├── functions/src/
│   ├── taxAgent.ts                  ← Firebase Cloud Function
│   ├── taxSystemPrompt.ts           ← System prompt for function
│   └── taxTools.ts                  ← Tool router for function
├── pages/
│   └── TaxAdvisor.tsx               ← Full chat UI component
├── App.tsx                          ← Updated with route
├── components/Layout.tsx            ← Updated with nav item
├── types.ts                         ← Updated with Tax types
└── config/env.ts                    ← Updated with ANTHROPIC_API_KEY
```

---

## Key Features

### 1. Real Business Data Integration
The Tax Advisor queries your actual POS data through 7 specialized tools:
- Business info (name, registration, revenue)
- Transaction summaries (period totals, refunds)
- VAT collected (monthly breakdown)
- Inventory categories (with tax classifications)
- Employee count (for PAYE planning)
- Tax liability calculations
- Deductible expenses (CITA s.24 qualifying items)

### 2. Nigerian Tax Law Expertise
Comprehensive knowledge of:
- **VAT Act Cap V1** — 7.5% standard rate, exempt items, filing deadlines
- **CITA 2004** — 0%–30% rates based on company size, s.24 deductions
- **PITA** — PAYE bands, Consolidated Relief Allowance
- **WHT** — 5%–10% rates by transaction type
- **FIRS Deadlines** — VAT (21st), PAYE (10th), CIT (6 months after year-end)

### 3. Security & Privacy
- ✅ Claude API key stored server-side in Firebase Function
- ✅ NOT exposed in client-side code
- ✅ Conversation history passed per request (no memory stored)
- ✅ Role-based access (manager/admin only)

### 4. User Experience
- 💬 Real-time chat with tax expert
- 📊 Tax snapshot sidebar with key metrics
- 🔌 Offline detection with graceful messaging
- ⚖️ Mandatory disclaimer on every response

---

## Troubleshooting

**"Tax Advisor requires internet"**
→ Check network connection; feature disabled offline by design

**Claude API errors**
→ Verify ANTHROPIC_API_KEY is set correctly in Firebase config
→ Check API key has sufficient quota at https://console.anthropic.com

**Tools not returning data**
→ Verify Firebase Functions deployed successfully
→ Check Firestore/Dexie database has sample data
→ Mock data in taxTools.ts will be returned if DB is empty

**Cashier can still see Tax Advisor**
→ Clear browser cache
→ Verify hasPermission('manage_settings') check in Layout.tsx

---

## Next Steps (Phase 2)

- [ ] Advanced report generation (tax summaries, filing checklists)
- [ ] Document upload and analysis (invoices, receipts for deductions)
- [ ] AutoPilot filing assistance (pre-fill FIRS forms)
- [ ] Multi-language support (Yoruba, Igbo, Hausa)
- [ ] Integration with FIRS e-Services APIs

---

## Support & Resources

- **Claude Documentation:** https://docs.anthropic.com
- **Nigerian Tax Laws:** https://www.firs.gov.ng
- **Firebase Functions:** https://firebase.google.com/docs/functions
