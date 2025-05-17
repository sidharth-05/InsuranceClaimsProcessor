# InsuranceClaimsProcessor
React-based SWE internship take-home: upload insurance claim docs, extract insured entity names via LLM, and match to internal IDs. PDF parsing incomplete—manual text input to LLM works well.

# 🧾 Insurance Claim Parser

A modern single-page web app that extracts the **primary insured name** from uploaded insurance claim files and matches it against a known list using fuzzy matching.

Built with **Next.js 14**, **React 18**, **TypeScript**, **Tailwind CSS**, and **OpenAI GPT-4 Turbo**.

---

## 🚀 Getting Started

### 1. Setup & Run Instructions

git clone https://github.com/sidharth-05/InsuranceClaimsProcessor.git
cd insurance-claims-processor
npm install
npm start

### 2. Environment setup:
Copy .env.example to .env and fill in required API keys (e.g., GROQ_API_KEY for LLM extraction).

### 3. Architecture Notes
This application is a Next.js-based web tool for processing insurance claim documents. Users upload claim files (.pdf, .docx, or .txt), which are parsed for text content. The system then uses a hybrid approach for extracting the insured entity name: pattern matching and, if available, a large language model (LLM, specifically Llama 3 via Groq API). The extracted name is compared against a database of known entities using normalized string similarity (Levenshtein distance).
The UI provides real-time feedback on upload and extraction status, displays extraction and matching results, and allows for manual overrides. The architecture prioritizes transparency, showing confidence scores and top matches for each extraction. For reliability, file parsing is simplified: text files are read directly, while PDFs and DOCX files use placeholder extraction (users are encouraged to paste content for best results)

### 4. Assumptions & Trade-offs
File Parsing: PDF and DOCX extraction uses placeholders for speed and reliability; accurate extraction requires manual content input. This avoids complex parsing dependencies but sacrifices some automation.
LLM Dependency: The insured name extraction leverages an LLM if an API key is present; otherwise, a robust pattern-matching fallback is used. This ensures the system works in development or offline but may be less accurate than the LLM.
Entity Matching: String similarity uses normalization and Levenshtein distance, which is robust for minor spelling differences but can mis-rank entities with similar names.
File Types & Size: Only .pdf, .docx, and .txt files are accepted, with a 10MB size limit for performance and security.
Transparency: The system always displays extraction/matching confidence and the top five entity matches for user review, prioritizing explainability over silent automation

### 5. Needed Developments / Bugs
Uploading PDF functions not viable yet, manual text input required.
