# Tango Wallet Assistant

Hackathon demo of a Malaysian-style e-wallet (blue theme) with an AI assistant named **Tango** powered by Gemini (`@google/genai`) with mock fallbacks for offline demo stability.

## Features

- Wallet home with balance, quick actions, favourites grid, bottom nav, floating scan
- Transfer bottom sheet → Recipient page → Transfer Money → Auth (Face ID / Fingerprint / PIN) → Processing → Receipt
- **Tango AI**:
  - FAQ (`What is my transfer limit?`)
  - Transfer command (`Pay RM50 to Rizwan` → multi-match + confidence + pick)
  - WhatsApp screenshot upload (normal & scam samples) → OCR + risk analysis
  - Scam detection with reasons and blocked flow
  - Behaviour anomaly detection (`Pay RM500 to Rizwan` → risk: high)
  - Confirmation → prefills Transfer Money flow
- **Smartwatch simulator**:
  - `Pay merchant RM10` → QR + success
  - `Transfer RM500 to Rizwan` → secure hand-off to phone

## Tech

- Next.js 14 (App Router) · React 18 · TypeScript
- Tailwind CSS · shadcn-style primitives · lucide-react icons
- Framer Motion for animations
- Zustand for flow state (handles prefill from Tango / watch hand-off)
- `@google/genai` (Gemini) via server routes with mock fallback

## Run

```bash
npm install
cp .env.example .env.local   # optional, add GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000 – the app renders inside a phone frame on desktop and full-screen on mobile.

### Demo script (exact flow)

1. Wallet home
2. Tap the floating sparkle button → Tango opens
3. Ask: `What is my transfer limit?`
4. Ask: `Pay RM50 to Rizwan` → choose 1 of 3 matches (Rizwan Hakeem / Ridzuan Hakim / Muhammad Rizwan)
5. Transfer Money screen opens prefilled → tap Next
6. Authenticate (Face ID / Fingerprint / PIN) → Processing → Receipt → Done
7. Reopen Tango → tap **Upload WhatsApp** → pick recipient → transfer flow
8. Tap **Upload scam sample** → Tango warns and blocks
9. Ask: `Pay RM500 to Rizwan` → Tango detects unusual behaviour (10x avg) → confirm override
10. Home → tap the centre blue scan button → **Watch Simulator**
11. Tap `"Pay merchant RM10"` → watch shows QR + success
12. Tap `"Transfer RM500 to Rizwan"` → watch asks phone to continue → phone auto-opens Transfer Money

## Security note (demo only)

No real money. No real biometrics. No payment gateway. `/api/*` only performs AI interpretation and risk scoring; all persistence is in-memory / client state.

## API routes

- `POST /api/tango` — interpret a user message (intent / amount / recipientQuery / confidence)
- `POST /api/analyze-whatsapp` — simulated OCR + scam classification (`{ sample: "normal" | "scam" }`)
- `POST /api/detect-risk` — behaviour anomaly score for (recipientId, amount)

All routes fall back to deterministic mock logic when `GEMINI_API_KEY` is not set.

## Structure

```
app/
  page.tsx                   # phone shell with state-driven screens
  layout.tsx, globals.css
  api/
    tango/route.ts
    analyze-whatsapp/route.ts
    detect-risk/route.ts
components/
  PhoneShell.tsx
  WalletHome.tsx
  TransferSheet.tsx
  TransferRecipient.tsx
  TransferMoney.tsx
  AuthModal.tsx
  Processing.tsx
  Receipt.tsx
  TangoAssistant.tsx
  WatchSimulator.tsx
lib/
  db.ts         # mock data (recipients, txns, FAQ, scam, merchants, watch cmds)
  store.ts      # Zustand flow state
  gemini.ts     # server-side Gemini wrapper with JSON mode
  utils.ts
```

### Wear OS note
The watch simulator is a visual mock. A real Wear OS client would be built with Kotlin + Jetpack Compose for Wear, using the Wearable Data Layer to trigger deep links (`tango://transfer?...`) on the phone when secure authentication is required.
