# AI Interview Prep Kit (AgentShield)

Build a web application that turns a job description into a personalised interview preparation kit. This project was built for the Full-Stack Engineering Assessment.

![Dashboard Preview](https://via.placeholder.com/1000x500.png?text=AI+Interview+Prep+Kit+-+AgentShield)

## 🚀 Project Overview & Tech Stack

This application takes a Job Description (JD) and a Company URL and autonomously researches the company, extracts requirements, and generates a fully personalized interview prep kit, complete with technical questions, flashcards, and a day-by-day study schedule.

**Tech Stack:**
*   **Frontend:** Next.js + Tailwind CSS (using standard React hooks and `zustand` for state).
*   **Backend:** Node.js + Express + TypeScript.
*   **Database:** MongoDB (Mongoose).
*   **LLM Provider:** Groq API using the `openai/gpt-oss-120b` open-source model.
*   **Scraping:** Cheerio (for DOM parsing) + Axios + `robots-parser` (for respecting `robots.txt`).

*Justification:* The requested stack (Next.js + Tailwind + Node.js + MongoDB) was strictly adhered to. Groq was chosen as the LLM provider due to its extremely generous free tier, insanely fast inference speed, and OpenAI-compatible API interface.

---

## 🛠️ Setup Instructions

### Local Development

1. Clone the repository and install dependencies from the root directory:
```bash
git clone https://github.com/Adityaaun/ai-interview-prep-kit.git
cd ai-interview-prep-kit
npm install
```

2. Create a `.env` file in the `backend/` directory based on `.env.example`:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/trao_assessment
JWT_SECRET=your_super_secret_jwt_key
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

3. Run the development servers concurrently:
```bash
npm run dev --workspace=backend
npm run dev --workspace=frontend
```

### 📦 Running the Batch Entry Point
As per Section 9, a batch evaluation script is provided to generate kits without the UI.

1. Create a `cases.json` file in the root directory following the Appendix B format.
2. Run the evaluate script from the root (or backend) directory:
```bash
npm run evaluate --workspace=backend -- --input ../cases.json --output ../kits.json
```
This script instantiates the exact same `KitGenerator` class used by the API, respects the same rate limits, and safely continues if an individual case fails.

---

## 🧠 High-Level Architecture & Sequencing

The kit generation process is heavily orchestrated to ensure deterministic, reliable results. It relies on a multi-pass architecture rather than a single LLM prompt.

### Step-by-Step Sequencing:
1. **Research (`ResearchPipeline.ts`):** 
   - Crawls the provided company URL and respects `robots.txt`.
   - Ranks all discovered internal links (prioritizing `/careers`, `/jobs`, `/about`) to find hiring context.
   - Extracts exact Job Requirements (Must-Haves vs. Nice-to-Haves) from the pasted JD text.
2. **Drafting (`DraftingService.ts`):** 
   - Generates the Company Brief and Flashcards based on the scraped context and requirements.
   - Generates technical and behavioural questions, strictly mapping them to specific `requirement_ids`.
3. **Coverage Check (`CoverageService.ts`):** *(The Second Pass)*
   - This is purely deterministic TS code. It loops over all generated questions and maps their `requirement_ids` against the extracted "must-have" requirements.
   - If gaps are found, it triggers a second specific LLM draft specifically targeting the missing requirements until coverage is 100%.
4. **Scheduling (`ScheduleService.ts`):**
   - Arithmetic-based allocation. Questions are sorted by difficulty (hardest first).
   - They are divided deterministically across the exact number of `days_available` requested by the user.

---

## 🕷️ Retrieval Approach & Sources
**Tooling:** `axios` for fetching, `cheerio` for parsing, `robots-parser` for compliance.
**Approach:** 
Rather than hardcoding a list of paths, `CrawlerService` fetches the homepage, extracts all `<a>` tags, resolves relative URLs, and scores them using a heuristic algorithm (e.g., `/careers` gets +50 points, deep nested links are penalized). The highest-scoring links are then fetched.
**Sources:** Only the provided company domain is crawled. If the domain times out or returns a 404, the system logs the error and gracefully falls back to generating the kit purely based on the JD.

---

## 💾 State Management (Generated, Edited, Pinned)

The most complex state problem (Section 6) is handled gracefully in `BuilderService.ts`.
Every generated item (Question, Flashcard) is assigned an `origin` property (defaulting to `GENERATED`).

When a user edits a question inline via the UI, the frontend marks that item's origin as `EDITED`.
If the user clicks **Regenerate API** for a specific category:
1. The backend triggers the LLM to draft a fresh batch of questions.
2. `BuilderService.mergeSection()` filters the existing array: it deletes anything marked `GENERATED` in that category, but **keeps** anything marked `EDITED` or `USER_CREATED`.
3. The new LLM questions are appended to the preserved user edits.

---

## 🎨 Creative Feature: Practice Mode Spaced-Repetition

In the **Practice Mode**, flashcards are sorted based on historical user confidence. When a user flips a card, they rate their confidence (1 - Again to 4 - Easy). 
This score is persisted to the MongoDB. On subsequent practice sessions, the flashcards are sorted by `confidence_score` ascending—ensuring the user always studies their weakest concepts first.

---

## ⚖️ Key Design Decisions, Trade-offs & Limitations

1. **Free Tier TPM Rate Limits:** Groq's free tier has an aggressive 8000 Tokens Per Minute limit. 
   - *Trade-off:* To prevent 413 Payload Too Large errors, scraped HTML is aggressively stripped of scripts/styles and the remaining text is truncated to 6000 characters.
   - *Design Decision:* `LLMService.ts` implements an automated recursive Exponential Backoff. If a `429` error is thrown, the system waits for the provider's requested timeout and retries automatically without failing the batch.
2. **Security & SSRF:** 
   - The application fetches user-provided URLs. The `CrawlerService` implements basic SSRF protection by verifying the resolved IP address does not point to private/loopback networks (e.g., `127.0.0.1`, `10.x.x.x`) before initiating the axios request.
3. **Known Limitations:**
   - Single Page Applications (SPAs) that heavily rely on client-side React rendering (with no SSR) may return empty bodies to `cheerio`. A headless browser like Puppeteer would solve this, but was avoided to keep the backend lightweight and fast.
