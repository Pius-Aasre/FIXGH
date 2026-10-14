# FixGH 🇬🇭

A citizen infrastructure reporting platform for Ghana. Citizens report issues (potholes, burst pipes, etc.) via the mobile app; authorities receive email notifications and view reports on the web dashboard.

## Project Structure

```text
fixGH/
├── frontend/
│   ├── mobile/     # Expo / React Native mobile app (citizen-facing)
│   └── web/        # Vite / React web dashboard (authority-facing)
├── backend/        # Node.js / Express API
├── ai-service/     # Python / FastAPI AI microservice
└── fixgh/          # Python utility service
```

---

## Getting Started

### Mobile App (Expo)

```bash
cd frontend/mobile
npm install
npx expo start
```

Opens options to run on:
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

### Web Dashboard (Vite)

```bash
cd frontend/web
npm install
npm run dev
```

### Backend API (Node.js)

```bash
cd backend
npm install
npm run dev
```

### AI Service (FastAPI)

```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Useful Commands (Mobile)

```bash
# Run from frontend/mobile/
npx expo lint          # lint
npx tsc --noEmit       # typecheck
npx expo-doctor        # diagnose dependency issues
npx expo install --fix # fix incompatible package versions
```

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build](https://docs.expo.dev/eas/)
