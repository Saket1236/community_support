# Trip Sutra - Suggest a Place

A production-ready website for hackathon project **Trip Sutra**. This platform allows users to submit new places (temples, monuments, restaurants, etc.) which are then reviewed by an admin.

## 🚀 Features

- **Suggest a Place Form**: Responsive UI with category selection and description.
- **Google Maps Integration**: Interactive location picker with auto-filled coordinates and reverse geocoding (City, State, Country).
- **Admin Dashboard**: Secure, password-protected panel to Approve, Reject, or Delete suggestions.
- **Real-time Updates**: Powered by Firebase Firestore.
- **Modern UI**: Styled with Tailwind CSS to match the mobile app's theme.

## 🛠️ Setup Instructions

### 1. Firebase Setup
- The app is already provisioned with Firebase.
- **Firestore Rules**: Deployed automatically via `firestore.rules`.
- **Authentication**: Google Login and Email/Password are supported.
- **Admin Access**: The default admin is `priyeshkathe@gmail.com`. You can add more admins in the `firestore.rules` or by updating the `users` collection.

### 2. Google Maps API Setup
- Go to the [Google Cloud Console](https://console.cloud.google.com/).
- Create a new project or select an existing one.
- Enable **Maps JavaScript API** and **Geocoding API**.
- Create an **API Key** under Credentials.
- Add this key to your environment variables as `GOOGLE_MAPS_API_KEY`.

### 3. Environment Variables
Create a `.env` file (or set in AI Studio Secrets):
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
GEMINI_API_KEY=your_gemini_key_here
```

## 🐳 Docker Commands

To run the project locally using Docker:

1. **Build the image**:
   ```bash
   docker build -t tripsutra-web .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 tripsutra-web
   ```

## 🌐 Deployment to Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
   - Select your project.
   - Set public directory to `dist`.
   - Configure as a single-page app: `Yes`.
4. Build the app: `npm run build`
5. Deploy: `firebase deploy --only hosting`

## 📂 Project Structure

- `/src/pages`: Contains `SuggestPlace.tsx` and `AdminDashboard.tsx`.
- `/src/firebase.ts`: Firebase initialization and services.
- `/src/theme.ts`: Centralized theme configuration (colors, styles).
- `/firestore.rules`: Security rules for data protection.
- `/firebase-blueprint.json`: Data schema definition.
