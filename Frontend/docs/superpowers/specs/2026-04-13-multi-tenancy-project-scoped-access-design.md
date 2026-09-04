# Multi-Tenancy: Project-Scoped Access Design

**Date:** 2026-04-13  
**Status:** Approved  

---

## Problem Statement

Currently, when a user logs in they are shown a project selection screen and must manually choose which project to work on. This adds friction. Additionally, there is no way to send a user directly into a specific project context.

The goal is to give each project its own login/signup URL so users land directly in their project context without a selection step. Account creation is self-serve but gated — only users whose email has been pre-authorized for a project (via the Implementation Team Resource Form) can register for that project.

---

## Scope

- Add project-specific login and signup routes: `/project/:projectId/login` and `/project/:projectId/signup`
- When admin grants access in the Resource Form, automatically email the user their project signup link
- Validate email authorization against the resource table before allowing account creation
- Lock the session to the project from the URL — no project switching
- Remove the temp-password / admin-created credentials login flow (`temp-login` endpoint)
- Existing `/login` and `/signup` routes remain unchanged

---

## Approach

**Frontend:** Path-based routing. React Router extracts `:projectId` from the URL. Two new components (`ProjectLogin`, `ProjectSignUp`) wrap the existing auth logic with project context. On success, `project_id` and `project_name` are stored in `localStorage` — the same key the rest of the app already reads.

**Backend:** One new Lambda endpoint for validation. The existing Resource Form save Lambda gets one additional step: call the existing Nodemailer email API endpoint with the invite link. No new Lambdas, no new IAM permissions.

---

## User Flows

### New User (no account yet)

```
Admin saves Implementation Team Resource Form
  → record saved to DynamoDB (existing)
  → [NEW] POST to email endpoint:
      to: user_email
      subject: "Access Granted - [Project Name]"
      body: https://erp.com/project/{project_id}/signup

User clicks link → /project/abc123/signup
  → enters Full Name, Email, Password
  → frontend calls: GET /rice/validate-project-access?email=X&project_id=abc123
      ✅ authorized → proceed with Cognito signup → store project_id → /dashboard
      ❌ not authorized → show error: "You are not authorized to register for this project"
```

### Returning User (account exists)

```
User visits /project/abc123/login
  → enters email + password
  → Cognito authenticates
  → frontend calls: GET /rice/validate-project-access?email=X&project_id=abc123
      ✅ authorized → store project_id in localStorage → /dashboard
      ❌ not authorized → show error: "You don't have access to this project"
```

### URL Tampering Prevention

A user who changes the `project_id` in the URL to a project they are not authorized for will be blocked. The `validate-project-access` endpoint queries the resource table by `(email, project_id)` pair. If no record exists, the request is rejected regardless of whether the user has a valid Cognito session.

---

## Frontend Changes

### New Routes in `App.js`

```
/project/:projectId/signup  → ProjectSignUp component
/project/:projectId/login   → ProjectLogin component
/login                      → existing Login (no change)
/signup                     → existing SignUp (no change)
```

### New Components

**`src/components/ProjectLogin.js`**
- Reads `projectId` from `useParams()`
- Renders the same login form as `Login.js`
- After Cognito auth succeeds, calls `validate-project-access` before proceeding
- On success: sets `localStorage.project_id`, `localStorage.project_name`, then navigates to `/dashboard`
- On failure: shows inline error
- Removes all `temp-login` token logic (the `useEffect` checking for `?token` param)

**`src/components/ProjectSignUp.js`**
- Reads `projectId` from `useParams()`
- Renders the same signup form as `SignUp.js`
- Before Cognito signup: calls `validate-project-access` to check email authorization
- On authorized: proceeds with Cognito signup + user-details creation + auto login
- On unauthorized: shows inline error before any Cognito call is made
- On success: sets `localStorage.project_id`, `localStorage.project_name`

### `localStorage` Keys Added on Project Auth

```js
localStorage.setItem('project_id', projectId)    // from URL param
localStorage.setItem('project_name', projectName) // from validate-project-access response
```

These keys are already read by the rest of the app (Dashboard, API calls). No changes needed in Sidebar, Header, or Dashboard.

---

## Backend Changes

### New Endpoint — Validate Project Access

```
GET /rice/validate-project-access

Query params:
  email      (string, required)
  project_id (string, required)

Logic:
  Query resource roster table WHERE user_email = :email AND project_id = :project_id

Response (200):
  { 
    authorized: true, 
    project_name: "Project Alpha",
    user_name: "John Doe"
  }

Response (200, not found):
  { authorized: false }

Response (400):
  { error: "email and project_id are required" }
```

**Implementation:** Node.js Lambda, DynamoDB query on the resource roster table using a GSI on `(project_id, user_email)` or a scan with filter (depending on table size).

---

### Modified Endpoint — Resource Form Save

**Existing:** `POST /rice/post/resource-roster`  
**Addition:** After saving the DynamoDB record, make an HTTP call to the existing Nodemailer email endpoint:

```js
// After successful DynamoDB save
await axios.post(EMAIL_API_ENDPOINT, {
  to: user_email,
  subject: `Access Granted - ${project_name}`,
  html: `
    <p>Hi ${user_name},</p>
    <p>You have been granted access to <strong>${project_name}</strong>.</p>
    <p>Click the link below to create your account:</p>
    <a href="${BASE_URL}/project/${project_id}/signup">Create My Account</a>
    <p>This link is specific to your project. Only your email address 
       (${user_email}) is authorized to register using this link.</p>
  `
});
```

`BASE_URL` and `EMAIL_API_ENDPOINT` stored as Lambda environment variables.

---

### Removed Endpoint Usage

`GET /dev/api/admin/temp-login-new` — no longer called from the frontend. The `useEffect` block in `Login.js` (lines 118–153) is removed as part of the `ProjectLogin` rewrite.

---

## Error States

| Scenario | Message shown |
|---|---|
| Email not in resource table for this project | "You are not authorized to register for this project." |
| User visits project login but has no account | "No account found. Please use your signup link to create an account." |
| User visits project login, has account but wrong project | "You don't have access to this project." |
| validate-project-access API fails | "Unable to verify access. Please try again." |

---

## What Does NOT Change

- Existing `/login` and `/signup` routes and components
- `Sidebar.js`, `Header.js`, `Dashboard.js` — they already use `project_id` from localStorage
- Cognito User Pool configuration
- All other Lambda functions and API endpoints
- The resource form itself (only the save Lambda gets one additional step)
