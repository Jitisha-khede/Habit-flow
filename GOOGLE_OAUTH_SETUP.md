# Google OAuth Setup Instructions

This guide will help you set up Google OAuth authentication for the Collaborative Habit Tracker application.

## Prerequisites

Before proceeding, make sure you have:
- A Google account
- Access to the Google Cloud Console
- Node.js installed on your system
- The backend and frontend code properly set up

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a project" dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Habit Tracker OAuth")
5. Click "Create"

## Step 2: Enable Google+ API

1. In your Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"
4. Also search for "Google OAuth2 API" and enable it if available

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" for user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: "Collaborative Habit Tracker"
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the Scopes page, click "Save and Continue" (default scopes are fine)
7. On Test users page, you can add test emails or skip for now
8. Click "Save and Continue"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Choose "Web application" as the application type
4. Give it a name: "Habit Tracker Web Client"
5. Under "Authorized JavaScript origins", add:
   - `http://localhost:5173` (for frontend development)
   - `http://localhost:5000` (for backend development)
6. Under "Authorized redirect URIs", add:
   - `http://localhost:5000/api/auth/google/callback`
7. Click "Create"
8. Copy the Client ID and Client Secret that are displayed

## Step 5: Install Dependencies

### Backend Dependencies
You'll need to install the required packages. Since PowerShell execution policies may prevent npm from running, you can:

**Option 1: Change PowerShell execution policy temporarily**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
cd backend
npm install
Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope CurrentUser
```

**Option 2: Use Command Prompt**
```cmd
cd backend
npm install
```

**Option 3: Manual installation**
If npm still doesn't work, you can manually copy the `node_modules` from another Node.js project or use a different terminal.

### Frontend Dependencies
For the frontend, since we removed the react-google-login package (as it's deprecated), the current setup uses a direct redirect approach that doesn't require additional frontend packages.

## Step 6: Configure Environment Variables

### Backend Configuration
1. Copy the `.env.example` file to `.env` in the backend directory:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Google OAuth credentials:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/collaborative-habit-tracker
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   NODE_ENV=development
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_actual_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   FRONTEND_URL=http://localhost:5173
   ```

### Frontend Configuration
1. Make sure your frontend `.env` file has:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

## Step 7: Start the Application

### Start Backend
```bash
cd backend
npm run dev
```

### Start Frontend
```bash
cd frontend
npm run dev
```

## Step 8: Test Google OAuth

1. Open your browser and go to `http://localhost:5173`
2. Navigate to the login page
3. Click the "Continue with Google" button
4. You should be redirected to Google's OAuth consent screen
5. After granting permission, you should be redirected back to your app's dashboard

## Troubleshooting

### Common Issues

**1. "Error 400: redirect_uri_mismatch"**
- Make sure the redirect URI in your Google Cloud Console matches exactly: `http://localhost:5000/api/auth/google/callback`

**2. "This app isn't verified"**
- This is normal for development. Click "Advanced" then "Go to [App Name] (unsafe)"

**3. PowerShell execution policy errors**
- Try using Command Prompt instead of PowerShell
- Or temporarily change execution policy as shown above

**4. MongoDB connection issues**
- Make sure MongoDB is running on your system
- Check that the connection string in your `.env` file is correct

**5. CORS errors**
- Ensure the frontend URL in your backend CORS configuration matches your frontend URL

### Production Considerations

For production deployment:

1. **Verify your app** in Google Cloud Console to remove the "unverified app" warning
2. **Update redirect URIs** to use your production domain
3. **Use HTTPS** for all OAuth redirects in production
4. **Secure your environment variables** - never commit actual credentials to version control
5. **Set appropriate CORS origins** for your production domains

## Features Added

The Google OAuth integration adds:

1. **"Continue with Google" button** on the login page
2. **Automatic account creation** for new Google users
3. **Account linking** if a user with the same email already exists
4. **Seamless authentication flow** with JWT tokens
5. **Avatar support** from Google profile pictures

## Security Notes

- Google OAuth users don't need passwords - they authenticate via Google
- The system generates a random password for OAuth users for database compatibility
- JWT tokens are still used for session management after OAuth authentication
- User data is minimal - only profile information needed for the app

That's it! Your collaborative habit tracker now supports Google OAuth authentication alongside traditional email/password login.
