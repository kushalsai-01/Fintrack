# 🔐 Google OAuth Setup Guide for FinTrack Pro

## 🎯 Quick Answer: Can I Use Google Login Right Now?

**NO** - You need to set up Google OAuth first (takes 5-10 minutes, FREE).

---

## ✅ OPTION 1: Use Email/Password Login (READY NOW)

**No setup needed!** Just use:

### Registration
1. Go to http://localhost:3001
2. Click "Register"
3. Enter your email, name, password
4. Click "Create Account"

### Or Use Demo Account
```
Email: demo@fintrack.pro
Password: Demo@123
```

This works **immediately** with no configuration!

---

## 🔑 OPTION 2: Setup Google OAuth (5-10 minutes)

If you want "Sign in with Google" button, follow these steps:

### Step 1: Create Google Cloud Project (FREE)

1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name: `FinTrack Pro`
4. Click "Create"

### Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Configure Consent Screen"
   - User Type: **External**
   - App name: `FinTrack Pro`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Skip (click "Save and Continue")
   - Test users: Add your email
   - Click "Save and Continue"

3. Click "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `FinTrack Pro Web`
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback`
     - `http://localhost:3001/auth/callback` (optional)
   - Click "Create"

4. **Copy the credentials shown**:
   - Client ID: `1234567890-abc123xyz.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-abc123xyz`

### Step 4: Update backend/.env

Open `backend/.env` and replace:

```env
# Google OAuth
GOOGLE_CLIENT_ID=1234567890-abc123xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Step 5: Restart Backend

```powershell
# Stop the backend (Ctrl+C in terminal)
# Start again
cd backend
npm run dev
```

### Step 6: Test Google Login

1. Go to http://localhost:3001
2. Click "Sign in with Google" button
3. Select your Google account
4. Grant permissions
5. You'll be redirected back and logged in! ✅

---

## 🔧 How It Works

```
User clicks "Sign in with Google"
        ↓
Frontend redirects to: /api/auth/google
        ↓
Backend redirects to: Google OAuth consent page
        ↓
User approves and Google redirects back to:
    /api/auth/google/callback
        ↓
Backend creates/finds user in MongoDB
        ↓
Backend generates JWT tokens
        ↓
Backend redirects to: Frontend with tokens
        ↓
Frontend saves tokens and logs in user ✅
```

---

## 🎁 GitHub OAuth (Alternative)

Prefer GitHub? Setup is even easier:

### Quick Steps:
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Application name: `FinTrack Pro`
   - Homepage URL: `http://localhost:3001`
   - Callback URL: `http://localhost:5000/api/auth/github/callback`
4. Click "Register application"
5. Copy Client ID and generate Client Secret
6. Update backend/.env:
   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```
7. Restart backend

---

## ⚡ Testing Without OAuth

**You can test the entire app WITHOUT OAuth using:**

### Email/Password Login
```
1. Register: http://localhost:3001/register
2. Enter your details
3. Login immediately
```

### Demo Account (Pre-created)
```
Email: demo@fintrack.pro
Password: Demo@123
```

The demo account has sample data to explore!

---

## 🚀 Recommendation

**For Testing**: Use email/password or demo account - **works immediately!**

**For Production**: Setup Google OAuth - gives users a familiar "Sign in with Google" experience.

---

## 📝 OAuth Status in Your Project

| Feature | Status | Action Needed |
|---------|--------|---------------|
| Email/Password Login | ✅ Ready | None - works now! |
| Google OAuth Backend | ✅ Code Complete | Add API credentials |
| GitHub OAuth Backend | ✅ Code Complete | Add API credentials |
| Frontend OAuth Buttons | ✅ UI Ready | Backend needs credentials |

**Your OAuth routes are already coded in**:
- [backend/src/routes/oauth.ts](backend/src/routes/oauth.ts)
- [backend/src/controllers/authController.ts](backend/src/controllers/authController.ts)
- [frontend/src/pages/Login.tsx](frontend/src/pages/Login.tsx) has the buttons

**Just needs API keys to activate!**

---

## 💡 My Recommendation

**Start testing with email/password now.**

You can add Google OAuth later when you're ready to deploy to production - it only takes 10 minutes!

---

**Ready to start the app?** Run:
```powershell
.\start-dev.ps1
cd backend; npm run dev
cd frontend; npm run dev
cd ml-service; python run.py
```

Then login with: **demo@fintrack.pro** / **Demo@123**
