# Token Storage Architecture

## Current Setup: Context + localStorage

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND APP                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Components (Login, Dashboard, etc.)                   │
│         ↓                                               │
│  useAuth() Hook  ← Get tokens from Context             │
│         ↓                                               │
│  AuthContext     ← Source of truth in memory           │
│         ↓                                               │
│  localStorage    ← Persists across page refresh        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. **On Login**
```javascript
// src/components/Login.js
login({
  id_token: "eyJ...",
  access_token: "eyJ...",
  refresh_token: "eyJ...",
  expires_in: 28800
})
```
↓
```javascript
// src/context/AuthContext.js - login() function
localStorage.setItem('id_token', tokens.id_token);           // Persist
localStorage.setItem('access_token', tokens.access_token);   // Persist
localStorage.setItem('refresh_token', tokens.refresh_token); // Persist
localStorage.setItem('expires_in', tokens.expires_in);       // Persist

setIdToken(tokens.id_token);                   // Save to Context state
setAccessToken(tokens.access_token);           // Save to Context state
setRefreshToken(tokens.refresh_token);         // Save to Context state
setIsLoggedIn(true);                           // Save to Context state
```

### 2. **On Page Refresh**
```javascript
// src/context/AuthContext.js - Component Initialization
const [idToken, setIdToken] = useState(() => 
  localStorage.getItem('id_token') || null  // ← Read from localStorage
);
const [accessToken, setAccessToken] = useState(() => 
  localStorage.getItem('access_token') || null
);
const [refreshToken, setRefreshToken] = useState(() => 
  localStorage.getItem('refresh_token') || null
);
```
↓ Context state is populated from localStorage ✅

### 3. **Component Usage**
```javascript
// src/components/ProcessStreamTable.js
const { idToken, accessToken } = useAuth();  // Get from Context (fast, in-memory)

// Use token in API call
const headers = {
  'Authorization': `Bearer ${idToken}`
};
```

### 4. **API Factory**
```javascript
// src/utils/apiFactory.js
export const createApiClient = (baseURL, authContext = null) => {
  // Try Context first, fallback to localStorage
  const token = authContext?.idToken || localStorage.getItem('id_token');
};
```

### 5. **Token Expires (401 Error)**
```javascript
// src/utils/apiFactory.js - Response Interceptor
if (error.response.status === 401) {
  // Call logout API
  const accessToken = authContext?.accessToken || localStorage.getItem('access_token');
  await axios.post(API_CONFIG.LOGOUT_API_URL, {}, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  // Clear all localStorage
  localStorage.removeItem('id_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('expires_in');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
}
```

---

## Architecture Summary

| Layer | Storage | Purpose | Survives Refresh? |
|-------|---------|---------|-------------------|
| **Components** | useAuth() | Access tokens via Context | ✅ (via localStorage) |
| **Context State** | RAM | Fast in-memory access | ❌ (lost on refresh) |
| **localStorage** | Disk | Persistent storage | ✅ (survives refresh) |
| **Backend (Cognito)** | Server | Token validation | ✅ (source of truth) |

---

## Files Updated

### ✅ [src/context/AuthContext.js](src/context/AuthContext.js)
- Reads tokens from localStorage on app load
- Stores tokens in Context state
- Provides useAuth() hook for components

### ✅ [src/utils/apiFactory.js](src/utils/apiFactory.js)
- Accepts optional authContext parameter
- Tries to get token from Context first
- Falls back to localStorage if Context not provided
- Calls logout API when token expires (401)
- Clears all localStorage on token expiry

### ✅ [src/components/ProcessStreamTable.js](src/components/ProcessStreamTable.js)
- Uses useAuth() to get idToken from Context
- No direct localStorage access

### ℹ️ [src/utils/cognito-auth.js](src/utils/cognito-auth.js)
- Helper functions that read from localStorage
- Used by other utilities
- No changes needed (localStorage is correct here)

---

## Best Practices Followed

✅ **Single Source of Truth**: localStorage is the persistent source
✅ **Fast Access**: Context provides in-memory access for components
✅ **Auto-Persistence**: Page refresh automatically restores tokens
✅ **Graceful Fallback**: API factory falls back to localStorage if Context missing
✅ **Clean Logout**: All tokens and user data cleared on expiry

---

## Usage in Components

```javascript
// Any component can use tokens from Context
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { idToken, accessToken, refreshToken, isLoggedIn } = useAuth();
  
  // All tokens available from Context (not localStorage)
  // Persists across page refresh (via localStorage)
  // Fast access (in-memory, no disk reads)
  
  return (
    <div>
      {isLoggedIn ? 'Logged In' : 'Not Logged In'}
    </div>
  );
}
```

---

## Token Lifecycle

```
1. LOGIN
   ├─ Backend returns tokens
   ├─ Save to localStorage (persistent)
   └─ Save to Context (in-memory)

2. USE APP
   ├─ Components get tokens from Context (fast)
   └─ API calls include token in Authorization header

3. PAGE REFRESH
   ├─ App loads
   ├─ AuthContext reads tokens from localStorage
   └─ User stays logged in ✅

4. TOKEN EXPIRES (8 hours)
   ├─ Backend returns 401
   ├─ API Factory detects 401
   ├─ Calls logout API
   ├─ Clears all localStorage
   ├─ Context becomes empty
   └─ User logged out ✅

5. LOGOUT
   ├─ User clicks logout button
   ├─ Call logout API
   ├─ Clear localStorage
   ├─ Clear Context state
   └─ Redirect to login ✅
```

---

## No More Direct localStorage Access in Components

**Before:**
```javascript
const token = localStorage.getItem('id_token');  // Direct access
```

**After:**
```javascript
const { idToken } = useAuth();  // Via Context
```

This ensures:
- Consistent token access across app
- Single point of update (AuthContext)
- Easy to add features (token refresh, warning, etc.)