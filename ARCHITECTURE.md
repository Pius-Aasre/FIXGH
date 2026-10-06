# FixGH – Engineering & Architecture Document

This document outlines the technical architecture, engineering standards, and system workflow for FixGH. Based on recent scoping, the platform focuses strictly on **citizen reporting via a mobile app** and **authority notification via email and a web dashboard**. Complex workflows like assigning technicians have been deferred.

## 1. System Overview & Narrative

FixGH empowers citizens to easily report infrastructure issues (potholes, burst pipes, etc.) to the correct authorities. 

*   **Citizen Experience (Mobile App):** Citizens use a 4-tab mobile app to submit reports, browse a news feed regarding Ghana's infrastructure, and track their submission history.
*   **AI Assistance:** When a report is submitted, the AI service automatically classifies the issue, checks for duplicates, and assigns a priority score.
*   **Authority Experience (Email + Web):** Once a report is validated and saved, the backend automatically sends an email to the relevant authority. The email contains a secure link to a **Web Dashboard** where the authority can view the full details of the report. The system currently stops here; downstream processes (dispatching technicians) are handled externally by the authorities for now.

---

## 2. High-Level Engineering Structure

We recommend a **Monorepo** approach (e.g., using Turborepo or Yarn Workspaces) or a well-organized multi-directory structure to keep the stack unified:

```text
fixgh-platform/
│
├── apps/
│   ├── mobile/         # Expo / React Native App (Citizen Facing)
│   ├── backend/        # Node.js / Express API
│   ├── web-dashboard/  # React / Next.js Web Portal (Authority Facing)
│   └── ai-service/     # Python / FastAPI Service
│
└── packages/           # Shared types, linting configs, etc. (optional)
```

---

## 3. Frontend Engineering: Mobile App (Citizen Portal)

**Goal:** A fast, intuitive, and accessible mobile app for Ghanaians to submit reports and view news.

### Tech Stack
*   **Framework:** React Native with Expo (Managed Workflow)
*   **Routing:** Expo Router (File-based navigation)
*   **Styling:** NativeWind (Tailwind CSS)
*   **State Management:** Zustand
*   **Forms & Validation:** React Hook Form + Zod
*   **Maps & Location:** `react-native-maps` & `expo-location`

### The 4-Tab Architecture (`src/app/(tabs)`)
1.  **`index.tsx` (Home):** Quick stats, nearby issue map, and high-priority alerts.
2.  **`report.tsx` (Report):** Multi-step form. Uses `expo-image-picker` for photos and `expo-location` to grab GPS coordinates. Sends data to the Backend API.
3.  **`news.tsx` (News Feed):** Fetches a curated list of infrastructure-related news in Ghana from the backend.
4.  **`profile.tsx` (Profile):** Displays user history (reports submitted) and authentication state.

### Build & Deployment
*   **EAS (Expo Application Services):** Use `eas build` for generating Android `.apk`/`.aab` and iOS `.ipa` files. Use `eas update` for over-the-air (OTA) bug fixes.

---

## 4. Backend Engineering: API & Workflow Orchestration

**Goal:** Securely process reports, communicate with the AI service, store data, and dispatch emails to authorities.

### Tech Stack
*   **Framework:** Node.js + Express.js
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** JWT (JSON Web Tokens)
*   **Email Provider:** SendGrid or AWS SES (via Nodemailer)
*   **Storage:** Cloudinary / AWS S3 for saving report images

### Simplified Data Schema (Prisma)
With the reduced scope, the database is much leaner.
*   **`User`**: ID, Name, Email, PasswordHash, Role (Citizen).
*   **`Report`**: ID, Title, Description, ImageURL, Latitude, Longitude, Category, AI_PriorityScore, Status (Pending, Reviewed), UserID, CreatedAt.
*   **`NewsPost`**: ID, Title, Content, ImageURL, PublishedAt.
*   **`Authority`**: ID, DepartmentName, EmailAddress.

### Core API Endpoints
*   `POST /api/auth/register` & `/login`
*   `POST /api/reports`: Main submission endpoint.
    *   *Logic:* Uploads image to Cloudinary -> Calls AI Service for classification & priority -> Saves to DB -> Looks up corresponding `Authority` -> Sends Email.
*   `GET /api/reports/me`: For the Citizen's Profile tab.
*   `GET /api/news`: Fetches Ghana infrastructure news.

### The Email Notification Workflow
When a report is created, a background job or async function constructs an email template containing a **signed JWT link** or a **secure UUID link** (e.g., `https://fixgh.org/dashboard/report/abc-123`). This link provides read-only access to the web dashboard for that specific report.

---

## 5. Web Dashboard Engineering (Authority Portal)

**Goal:** A lightweight web interface accessible via email links.

### Tech Stack
*   **Framework:** React (Vite) or Next.js
*   **Deployment:** Vercel or Netlify

### Functionality
*   **No Login Required (Tokenized Links):** The URL sent to the authority's email contains a secure token (e.g., `?token=xyz`). 
*   **Report View:** Displays the uploaded image, GPS location on a web map (Leaflet/Mapbox), citizen description, and the AI's priority assessment.
*   *Future Scope:* Buttons to mark the report as "Actioned" or "Rejected".

---

## 6. AI Service Engineering

**Goal:** Enhance reports with automatic classification and priority scoring to help authorities triage emails efficiently.

### Tech Stack
*   **Framework:** Python + FastAPI
*   **Machine Learning:** PyTorch, YOLOv8 (for object detection), OpenCV
*   **Deployment:** Dockerized container hosted on Render, Railway, or AWS ECS.

### Core Endpoints
1.  **`POST /v1/analyze-image`**
    *   Accepts an image file or URL.
    *   Returns detected categories (e.g., `{"category": "pothole", "confidence": 0.92}`).
2.  **`POST /v1/score-priority`**
    *   Accepts category, description, and location.
    *   Returns a priority level (e.g., `High`, `Medium`, `Low`) based on heuristics or an NLP model analyzing the text severity.
3.  **`POST /v1/detect-duplicate`**
    *   Accepts new report data and compares it against recent reports in the same radius to prevent spamming the authority's inbox.

---

## 7. Development & Execution Plan

1.  **Phase 1: Setup & Scaffolding**
    *   Initialize the Expo React Native app with Expo Router.
    *   Initialize the Node.js/Express backend and set up Prisma with PostgreSQL.
2.  **Phase 2: Core Flows (Frontend & Backend)**
    *   Build Citizen Auth (Login/Register).
    *   Build the Report Submission form (Camera/Location) in the mobile app.
    *   Implement the `/api/reports` POST endpoint with Cloudinary image uploads.
3.  **Phase 3: AI & Email Integration**
    *   Spin up the FastAPI service with a basic mock or lightweight model.
    *   Connect the Node.js backend to the FastAPI service.
    *   Implement Nodemailer to send out Authority emails upon successful report processing.
4.  **Phase 4: Authority Web View & Polish**
    *   Build the simple web dashboard to read and display report details based on the email link URL.
    *   Polish the Mobile App UI (News feed, Profile history).
