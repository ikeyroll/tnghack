# Tango Wallet Assistant - AI Documentation

This file provides a comprehensive overview of the Tango Wallet Assistant codebase for AI-assisted understanding and modification.

## Project Overview

Tango Wallet Assistant is a hackathon-ready fintech demo web app inspired by Malaysian e-wallet user flows. It features a blue-themed fintech interface with an AI financial assistant named "Tango" that works like a ChatGPT-style assistant within the wallet app.

**Key Features:**
- FAQ answering about wallet limits, balance, security, and fees
- Transfer command interpretation with natural language parsing
- Recipient matching with phonetic fuzzy matching
- WhatsApp screenshot interpretation with scam detection
- Behavior anomaly detection with risk scoring
- Confidence scoring for AI decisions
- Action confirmation before transfers
- Smartwatch assistant simulation
- Phone handoff simulation for secure actions
- Persistent action history with localStorage

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand with persist middleware
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **AI:** Google Gemini API via `@google/genai` (with mock fallbacks)
- **Persistence:** localStorage (via Zustand persist)

## Architecture

### Single-Page Application (SPA) Pattern
The app uses a state-driven phone shell UI where screens are rendered conditionally based on a `screen` state in the Zustand store. This allows for smooth transitions between screens without page reloads.

### Component Hierarchy

```
app/page.tsx (Main orchestrator)
├── PhoneShell (Mobile phone frame)
│   ├── Screen Components (conditional rendering)
│   │   ├── WalletHome
│   │   ├── TransferRecipient
│   │   ├── TransferMoney
│   │   ├── ReceiveScreen
│   │   ├── PrepaidScreen
│   │   ├── DonationScreen
│   │   ├── CashLoanScreen
│   │   ├── WatchSimulator
│   │   ├── Processing
│   │   └── Receipt
│   ├── TransferSheet (Bottom sheet overlay)
│   ├── AuthModal (Biometric/PIN verification overlay)
│   └── TangoAssistant (AI chat overlay with history drawer)
└── Handoff banner (Watch → phone notification)
```

## File Structure

```
tngfinhack/
├── app/
│   ├── page.tsx              # Main app shell with screen routing
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles + phone frame CSS
│   └── api/
│       ├── tango/route.ts           # AI assistant endpoint
│       ├── analyze-whatsapp/route.ts # WhatsApp OCR + scam detection
│       └── detect-risk/route.ts     # Behavior anomaly detection
├── components/
│   ├── PhoneShell.tsx       # Mobile phone frame component
│   ├── WalletHome.tsx       # Home dashboard with shortcuts
│   ├── TransferSheet.tsx    # Transfer options bottom sheet
│   ├── TransferRecipient.tsx # Recipient selection screen
│   ├── TransferMoney.tsx    # Amount entry screen
│   ├── AuthModal.tsx        # Biometric/PIN verification
│   ├── Processing.tsx       # Transfer processing animation
│   ├── Receipt.tsx          # Success receipt screen
│   ├── ReceiveScreen.tsx    # QR code display for receiving money
│   ├── PrepaidScreen.tsx    # Mobile prepaid top-up
│   ├── DonationScreen.tsx   # Charity donations
│   ├── CashLoanScreen.tsx   # Personal financing application
│   ├── TangoAssistant.tsx   # AI chat overlay + history drawer
│   └── WatchSimulator.tsx   # Smartwatch simulation
├── lib/
│   ├── db.ts                # Mock data (recipients, transactions, FAQs)
│   ├── store.ts             # Zustand state management with persist
│   ├── gemini.ts            # Gemini API wrapper
│   └── utils.ts             # Utility functions
├── .env.local               # Environment variables (Gemini API key)
├── .gitignore               # Git ignore patterns
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── tailwind.config.ts       # Tailwind config with custom TNG colors
└── next.config.mjs          # Next.js config
```

## State Management (Zustand Store)

**File:** `lib/store.ts`

### State Schema

```typescript
type FlowState = {
  // Navigation
  screen: Screen;              // Current active screen
  device: "phone" | "watch";   // Current device context
  showTransferSheet: boolean;  // Transfer bottom sheet visibility
  showTango: boolean;          // Tango AI overlay visibility

  // Transfer flow
  recipient?: Recipient;       // Selected recipient
  amount?: number;            // Transfer amount
  note: string;               // Transfer note/memo

  // Wallet state
  balance: number;             // Current wallet balance
  lastReceiptId?: string;      // Last transaction reference

  // Persistent action history
  actionLog: ActionLogEntry[]; // List of logged actions

  // Watch handoff
  handoffMessage?: string;     // Message from watch to phone

  // Actions
  setScreen: (s: Screen) => void;
  setDevice: (d: Device) => void;
  setShowTransferSheet: (v: boolean) => void;
  setShowTango: (v: boolean) => void;
  setRecipient: (r?: Recipient) => void;
  setAmount: (n?: number) => void;
  setNote: (n: string) => void;
  setHandoff: (msg?: string) => void;
  logAction: (entry: Omit<ActionLogEntry, "id" | "ts">) => void;
  clearActionLog: () => void;
  startTransfer: (r: Recipient, amount?: number, note?: string) => void;
  confirmAmount: () => void;
  authenticate: () => Promise<void>;
  completeProcessing: () => void;
  resetToHome: () => void;
};
```

### Persistence Configuration

- **Storage:** localStorage
- **Key:** `tango-wallet-state`
- **Partialize:** Only persists `actionLog` and `balance` (transient UI state is not persisted)
- **Max entries:** 50 action log entries

## Screen Types

```typescript
type Screen =
  | "home"              // Wallet home dashboard
  | "transfer-recipient" // Recipient selection
  | "transfer-money"     // Amount entry
  | "auth"               // Biometric/PIN verification
  | "processing"         // Transfer processing animation
  | "receipt"            // Success receipt
  | "watch"              // Smartwatch simulator
  | "receive"            // QR code for receiving money
  | "prepaid"            // Mobile prepaid top-up
  | "donation"           // Charity donations
  | "cashloan";          // Personal financing application
```

## Action Log Types

```typescript
type ActionLogEntry = {
  id: string;
  ts: number;
  type: "transfer" | "scam-blocked" | "faq" | "whatsapp-upload" | "watch-merchant" | "watch-handoff";
  summary: string;
  details?: Record<string, any>;
};
```

## Mock Data (lib/db.ts)

### Recipients
- 6 mock recipients with names, phone numbers, and avatar colors
- Includes phonetic variants (Rizwan Hakeem, Ridzuan Hakim, Muhammad Rizwan) for fuzzy matching testing

### Transactions
- 5 historical transactions for anomaly detection baseline
- Used to calculate average sent amounts per recipient

### FAQs
- 4 FAQ entries with question/answer pairs and keyword match patterns
- Topics: transfer limit, balance, security, fees

### Scam Signals
- List of common scam indicators for WhatsApp analysis

### Merchants
- 3 mock merchants for watch payment simulation

### Watch Commands
- 2 voice command templates for watch simulator

### WhatsApp Samples
- Normal sample: safe transfer request
- Scam sample: urgent payment with multiple red flags

## API Routes

### POST /api/tango

**Purpose:** Interpret user messages and determine intent

**Request:**
```json
{
  "message": "Pay RM50 to Rizwan"
}
```

**Response:**
```json
{
  "intent": "transfer",
  "amount": 50,
  "recipientQuery": "Rizwan",
  "confidence": 0.92,
  "needsClarification": false,
  "message": "Ready to transfer RM50 to Rizwan Hakeem."
}
```

**Intents:**
- `faq`: Answer wallet-related questions
- `transfer`: Parse transfer commands with amount and recipient
- `unknown`: Fallback when intent cannot be determined

**Fallback:** Uses regex-based mock interpretation when Gemini API is unavailable

### POST /api/analyze-whatsapp

**Purpose:** Analyze WhatsApp screenshot OCR for scam detection

**Request:**
```json
{
  "sample": "normal" | "scam"
}
```

**Response:**
```json
{
  "intent": "transfer",
  "amount": 50,
  "recipientQuery": "Rizwan",
  "risk": "low",
  "reasons": [],
  "ocr": "Hey! Can you send RM50 to Rizwan...",
  "sender": "Aina (saved contact)",
  "message": "I detected a request to send RM50 to Rizwan. Continue?"
}
```

**Risk Levels:**
- `low`: Safe transfer request
- `medium`: Some suspicious elements
- `high`: Multiple scam indicators (blocks transfer)

### POST /api/detect-risk

**Purpose:** Calculate behavior anomaly risk for a transfer

**Request:**
```json
{
  "recipientId": "r1",
  "amount": 500
}
```

**Response:**
```json
{
  "risk": "high",
  "reasons": ["You usually send about RM51.67 to Rizwan Hakeem — RM500 is 9.7x higher."],
  "avg": 51.67,
  "multiplier": 9.7
}
```

## AI Integration (Gemini)

**File:** `lib/gemini.ts`

### Configuration
- **Model:** `gemini-2.0-flash` (configurable via `GEMINI_MODEL` env var)
- **API Key:** `GEMINI_API_KEY` in `.env.local`
- **Response Mode:** JSON-only (`responseMimeType: "application/json"`)

### genJson Function
- Wraps Gemini API calls with JSON schema hints
- Returns structured JSON responses
- Falls back to `null` on error (graceful degradation)
- System instruction ensures Tango persona and JSON-only output

### Fallback Strategy
All API routes have deterministic mock fallbacks that work without an API key:
- `/api/tango`: Regex-based intent parsing
- `/api/analyze-whatsapp`: Pre-defined sample responses
- `/api/detect-risk`: Heuristic risk calculation

## Fuzzy Recipient Matching

**File:** `lib/db.ts`

### phoneticKey Function
Light phonetic normalizer that maps similar-sounding names to the same key:
- Removes vowels and duplicates
- Normalizes `dz`, `zw`, `z`, `s` to `z`
- Example: "Ridzuan" and "Rizwan" both map to similar keys

### findRecipients Function
- Performs direct substring matching first
- Then fuzzy matching using phonetic keys
- Merges results preserving order and removing duplicates
- Ensures "Rizwan" queries match all phonetic variants

## Component Details

### WalletHome
- Blue header with balance display
- Quick action grid (Apply, Cash flow, Transfer, Cards)
- Feature cards (Grow money, BUDI95, GOrewards, Fuel balance)
- Recommended shortcuts (Travel, e-Mas, WalletSafe, Petrol)
- My Favourites shortcuts (Donation, Goal City, CashLoan, ASNB, MY Prepaid, etc.)
- Bottom navigation with center scan button
- Floating Tango AI assistant FAB

### TransferSheet
- Bottom sheet with 4 options:
  - Send money (→ Transfer Recipient)
  - Receive money (→ Receive Screen)
  - Money Packet
  - Gift
- Animated slide-up with Framer Motion

### TransferRecipient
- Tabs: Transfer, Receive, Money Packet, Gift
- Transfer tabs: eWallet, DuitNow, Overseas
- Phone number input with +60 prefix
- Recipient search with fuzzy matching
- Recent recipients list
- Wallet balance footer

### TransferMoney
- Recipient card with verify-name warning
- Amount input with balance hint
- Demo-mode warning when amount exceeds balance
- "Send gift" and "Pick a Greeting" buttons
- Note/memo input (50 char limit)
- "Next" button (gated by amount > 0 only, not by balance for demo)

### AuthModal
- Three verification modes:
  - Face ID (simulated 1.4s delay)
  - Fingerprint (simulated 1.4s delay)
  - 6-digit PIN (manual entry)
- Auto-advances to Processing on success
- Animated scanning effect for biometrics

### Processing
- Animated "Transferring your money safely..." message
- Rotating send icon with scale animation
- Dots animation for loading state
- Auto-advances to Receipt after 2.2s

### Receipt
- Green success header with checkmark icon
- Amount and recipient display
- Transaction details (phone, note, date/time, reference, status)
- "Done" button to return home
- Logs completed transfer to action log

### ReceiveScreen
- Blue header with tabs (Transfer, Receive, Money Packet, Gift)
- White card with recipient name
- CSS-grid generated QR code mosaic with finder squares
- "Download QR code" button
- "Enter specific amount" button
- TransferMate Soundbox promotion banner
- DuitNow footer

### PrepaidScreen
- Service carousel (SOS Top Up, Eastel, Sell Devices, Buy Phones, Postpaid Bills, Hua Broadband)
- Tabs: Top Up, Auto Renewal, History
- Contact card with phone number
- Filters: Suggested, Internet, Credit
- Selectable reload plans with pricing and duration
- Sticky bottom bar with total and "Top up" button

### DonationScreen
- Hero section with amber "Donate now" button
- Illustrated banner for disaster relief
- Progress bars for 3 causes with raised/goal amounts
- Share buttons per cause

### CashLoanScreen
- Amber hero card with hand-coins icon
- Configurable fields:
  - Financing amount (RM100 - RM150,000)
  - Financing duration (1-5 years)
  - Monthly income
  - Employment type
- T&C checkbox gating "Calculate now" button
- "What we offer" 2x2 grid
- Bottom tab bar (Submit now / My applications)

### TangoAssistant
- Full-screen chat overlay
- Message types:
  - User/AI text bubbles
  - Recipient selection list with confidence
  - Transfer confirmation with risk assessment
  - Scam warning with reasons
  - Image upload indicator
- Suggestion chips for common queries
- WhatsApp upload simulation (normal + scam samples)
- History drawer with action timeline
- Persistent action logging
- Clock button with count badge in header

### WatchSimulator
- Dark gradient background simulating watch face
- Round watch body with side button
- Voice command tiles:
  - "Pay merchant RM10" → QR + success
  - "Transfer RM500 to Rizwan" → phone handoff
- Animated states: idle, listening, merchant, merchant-success, handoff
- Logs watch actions to action log

## Demo Flow

### Basic Transfer Flow
1. Home → Tap "Transfer" quick action
2. Transfer Sheet → Tap "Send money"
3. Transfer Recipient → Search/select recipient
4. Transfer Money → Enter amount
5. Auth Modal → Choose verification method
6. Processing → Animated transfer
7. Receipt → Success confirmation
8. Done → Return to home

### Tango AI Transfer Flow
1. Home → Tap floating Tango button
2. Ask: "Pay RM50 to Rizwan"
3. Tango shows recipient options (fuzzy matching)
4. Tap recipient → Confirm bubble with risk assessment
5. Tap "Continue to transfer" → Prefilled Transfer Money
6. Auth → Processing → Receipt
7. Open Tango history → See logged transfer

### WhatsApp Scam Detection Flow
1. Tango → Tap "Upload WhatsApp"
2. Select "Suspicious WhatsApp screenshot"
3. Tango shows OCR text + scam warning
4. Shows reasons (urgent, unknown sender, suspicious wording)
5. Transfer is blocked
6. History shows "scam-blocked" entry

### Watch Handoff Flow
1. Home → Tap center scan button
2. Watch Simulator → Tap "Transfer RM500 to Rizwan"
3. Watch shows handoff animation
4. Phone shows handoff banner
5. Transfer Money opens prefilled
6. Auth → Processing → Receipt
7. History shows "watch-handoff" entry

## Custom Tailwind Configuration

**File:** `tailwind.config.ts

### Custom Colors
- `tng-blue`: `#0057d9` (primary brand color)
- `tng-sky`: `#e0f2fe` (light blue accent)

### Custom Animations
- `fade-in`: Fade in animation
- `slide-up`: Slide up animation
- `pulse-slow`: Slow pulse animation

### Custom CSS (globals.css)
- `.phone-frame`: Mobile phone frame styling with rounded corners, notch, and shadow
- `.chat-bubble-ai`: Tango AI message bubble styling
- `.chat-bubble-user`: User message bubble styling
- `.notch`: Phone notch styling

## Environment Variables

**File:** `.env.local` (not committed to git)

```env
GEMINI_API_KEY=AIzaSyCESdcRX5WhrMSBmpKznZvJVW_oH4RdEyc
GEMINI_MODEL=gemini-2.0-flash
```

## Security Notes

- **No real payments:** All transactions are mock only
- **No real biometrics:** Face ID, fingerprint, and PIN are simulated
- **No real payment gateway:** No external payment processing
- **Demo mode:** Amount validation relaxed to allow exceeding wallet balance for anomaly testing
- **API keys:** Gemini API key should be kept secure and not committed to version control

## How to Run

```bash
# Install dependencies
npm install

# (Optional) Set up environment variables
cp .env.example .env.local
# Edit .env.local and add GEMINI_API_KEY

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open http://localhost:3000 to view the app.

## Key Design Decisions

1. **State-driven routing:** Using Zustand screen state instead of Next.js routing for smoother transitions and easier state sharing between screens.

2. **Persistent action log:** localStorage persistence ensures users can see their history across sessions, useful for demonstrating the AI assistant's capabilities.

3. **Phonetic fuzzy matching:** Lightweight approach to handle Malaysian name variations (Ridzuan/Rizwan) without complex NLP libraries.

4. **Graceful AI degradation:** All AI features have deterministic mock fallbacks, ensuring the demo works reliably even without API keys.

5. **Single-page phone shell:** All screens render within a single phone frame component, maintaining the mobile app feel on desktop.

6. **Partial persistence:** Only action log and balance are persisted; transient UI state (current screen, modals) resets on refresh for a clean demo experience.

## Extension Points

### Adding New Screens
1. Add screen type to `Screen` union in `lib/store.ts`
2. Create component in `components/`
3. Add conditional render in `app/page.tsx`
4. Add navigation from existing screens

### Adding New Action Log Types
1. Add type to `ActionLogEntry["type"]` union in `lib/store.ts`
2. Add icon mapping in `TangoAssistant.tsx` `iconFor` function
3. Call `logAction` at appropriate event points

### Adding New API Endpoints
1. Create route in `app/api/[endpoint]/route.ts`
2. Use `genJson` for AI integration with mock fallback
3. Return structured JSON responses

### Adding New WhatsApp Samples
1. Add entry to `WHATSAPP_SAMPLES` in `lib/db.ts`
2. Update `simulateWhatsApp` in `TangoAssistant.tsx` to include new sample button

### Adding New Watch Commands
1. Add entry to `WATCH_COMMANDS` in `lib/db.ts`
2. Update `runCommand` handler in `WatchSimulator.tsx` for new command type

## Testing Checklist

- [ ] Basic transfer flow completes end-to-end
- [ ] Tango AI responds to FAQ queries
- [ ] Tango AI parses transfer commands
- [ ] Fuzzy matching returns all Rizwan variants
- [ ] WhatsApp normal sample triggers transfer flow
- [ ] WhatsApp scam sample blocks with reasons
- [ ] Behavior anomaly detection shows high risk for unusual amounts
- [ ] Watch merchant payment shows QR and success
- [ ] Watch handoff opens phone Transfer Money prefilled
- [ ] Action history persists across page refresh
- [ ] Action history drawer shows all action types
- [ ] Clear action history removes all entries
- [ ] All new screens (Receive, Prepaid, Donation, CashLoan) navigate correctly
- [ ] Home shortcuts navigate to correct screens
- [ ] Amount exceeding balance shows demo warning but allows transfer
- [ ] Auth modal works with all three verification methods
- [ ] Receipt logs completed transfer to action log
