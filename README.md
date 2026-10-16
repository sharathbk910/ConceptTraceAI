# ConceptTrace AI

**Tagline:** *Learn • Improve • Succeed*

ConceptTrace AI is a production-oriented, responsive web application and educational SaaS platform designed for Class 10, 11, and 12 students across CBSE, CISCE (ICSE/ISC), Karnataka State Board, NIOS, and other State/UT boards.

---

## 🌟 The Complete Learning Cycle

```
Academic Question
       ↓
Input Extraction & OCR
       ↓
Syllabus Classification & Step-by-Step Explanation
       ↓
Independent Solution Verification (Deterministic mathjs engine)
       ↓
Concept & Mistake Analysis (Prerequisite graph)
       ↓
Targeted Personalized Practice Sessions
       ↓
Real Evidence Progress Tracking & Verified Study-Time Analytics
```

---

## 🚀 Key Features

1. **Authentication & Onboarding (`/login`, `/register`, `/setup-profile`):**
   - Full student registration with email validation, password security rules, and terms consent.
   - First-time education profile setup for Class 10, 11, or 12, Board selection, academic year, language preferences, subject enrollment, and optional syllabus PDF upload.
   - Automatic redirect for incomplete first-time setups and direct dashboard access for returning students.

2. **Home Dashboard (`/home`):**
   - Real database-backed metrics: **Active Days** (days with $\ge 5$ minutes study time), **Tracked Study Time**, **Current Streak**, and **Overall Accuracy**.
   - Visual learning volume chart and subject-wise accuracy chart.
   - Personalized AI Learning Guidance based strictly on evidence (with honest guidance when data is $< 5$ attempts).
   - Weak topics attention highlights and quick action shortcuts.

3. **Ask a Doubt (`/ask` & `/questions/:id`):**
   - Multiline question text and mathematical notation support.
   - File uploads: JPG, PNG, WEBP, and PDF documents with client/server size and mime validation.
   - Modular AI pipeline with input extraction, problem understanding, step-by-step reasoning (explaining **WHY** steps are performed), final answers, and uncertainty notes.
   - **Independent Solution Verification:** Deterministic algebraic substitution and symbolic evaluation using `mathjs`. Accurately reports whether an independent check was executed (`verified`, `partially_verified`, or `needs_review`) and never fabricates unperformed verification.
   - Contextual follow-up Q&A and retry analysis.

4. **Weak Topics & Learning Diagnostics (`/weak-topics`, `/weak-topics/:topicId`):**
   - Classified into 4 rigorous categories based on evidence:
     - **Needs More Evidence:** $< 5$ sample attempts.
     - **Needs Practice:** $\ge 5$ sample attempts and $< 60\%$ accuracy.
     - **Improving:** $\ge 5$ sample attempts and $60\% - 80\%$ accuracy.
     - **Doing Well:** $\ge 5$ sample attempts and $\ge 80\%$ accuracy.
   - Formula: $\text{Accuracy} = \frac{\text{Correct Eligible Attempts}}{\text{Total Checked Attempts}} \times 100$.
   - Identification of prerequisite concept gaps from the syllabus graph.

5. **Practice Engine (`/practice`, `/practice/:sessionId`, `/practice/:sessionId/results`):**
   - Dynamic sessions targeting chosen subjects, topics, question count (3, 5, 10), and difficulty.
   - MCQ and short-answer questions with hints.
   - Server-side answer scoring with duplicate attempt prevention. Answer keys remain strictly server-side until attempted.
   - Instant feedback, explanations, and results review with confetti celebrations for high mastery.

6. **Progress Reports & PDF Export (`/progress`):**
   - 5 functional report tabs: Overview, Learning Graphs (7d/30d/90d), Subject Accuracy, Weak Topics, and Study Activity (30-day heatmap).
   - Real database-driven PDF export generating a professional progress report using `jspdf` and `jspdf-autotable`.

7. **Study-Time Tracking:**
   - Active learning heartbeat every 30 seconds.
   - Automatic pause on document visibility change (`visibilitychange`) or prolonged inactivity ($> 120$ seconds).
   - Deduplicated session logging labeled **"Time tracked on ConceptTrace AI"**.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router 6, Recharts |
| **Backend** | Node.js, Express, TypeScript, Zod, Multer, mathjs, jsPDF |
| **AI Provider** | Modular integration supporting Google Gemini (`@google/genai`) with fallback educational curriculum solver |
| **Database** | PostgreSQL / Supabase with Row Level Security (RLS), triggers, and pre-seeded syllabus topics |

---

## 📁 Project Structure

```
concepttrace-ai/
├── frontend/                     # React + Vite TypeScript frontend
│   ├── src/
│   │   ├── app/                  # App root and router configuration
│   │   ├── components/           # Layout & reusable UI components
│   │   ├── hooks/                # Auth, Toast, and Study-tracker hooks
│   │   ├── lib/                  # API client & Supabase configuration
│   │   ├── pages/                # Authentication, Dashboard, Doubt, Practice, Reports
│   │   └── types/                # TypeScript interface definitions
│   └── package.json
├── backend/                      # Express TypeScript backend API
│   ├── src/
│   │   ├── config/               # Zod-validated environment config
│   │   ├── middleware/           # Auth, RateLimiter, Upload, ErrorHandler
│   │   ├── routes/               # Modular API routes (/api/v1/*)
│   │   ├── schemas/              # Zod schemas for AI, questions, analytics
│   │   ├── services/             # Database, AI pipeline, mathjs verification, PDF
│   │   └── server.ts
│   └── package.json
├── supabase/
│   ├── migrations/               # Production PostgreSQL schema, RLS, triggers, seed
│   └── config.toml
├── .env.example
├── package.json
└── README.md
```

---

## 💻 Local Setup & Development

### 1. Install Dependencies
```bash
# From workspace root
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configure Environment
Copy `.env.example` to `backend/.env`:
```env
PORT=8000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here # Optional: live Gemini vision/reasoning
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Start Development Servers
```bash
npm run dev
```
- Frontend will be available at: `http://localhost:5173`
- Backend API will run at: `http://localhost:8000`

### 5. Build for Production
```bash
npm run build
```
>>>>>>> 12fad76 (feat: complete production implementation of ConceptTrace AI platform)
