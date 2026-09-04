# Redux & Hooks Implementation — Full Reference

> Created: 2026-05-05  
> Branch at time of writing: `TestingBranchDev`  
> Purpose: Complete snapshot of all Redux state management and custom hooks before reverting changes.

---

## 1. Overview

The app uses **Redux Toolkit** (`@reduxjs/toolkit ^2.11.2`) + **react-redux** (`^9.2.0`) for global state management.

The Redux store is provided at the app root in `src/index.js`:

```jsx
import { Provider } from 'react-redux';
import { store } from './redux/store';

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
```

---

## 2. Folder Structure

```
src/
├── hooks/
│   └── useLOV.js                      ← Custom hook: per-component API fetch for LOV dropdowns
│
├── redux/
│   ├── store.js                       ← Combines all slices into one store
│   │
│   ├── slices/
│   │   ├── index.js                   ← Re-exports all slice actions
│   │   ├── staticDataSlice.js         ← Read-only reference data (process areas, countries, etc.)
│   │   ├── lovSlice.js                ← List of Values (business lines, geographies, roles)
│   │   ├── uiSlice.js                 ← UI state (modals, loading, sidebar, notifications)
│   │   └── userDataSlice.js           ← User-created records (RICEW, rosters, project configs)
│   │
│   ├── hooks/
│   │   ├── index.js                   ← Re-exports both hooks
│   │   ├── useAppDispatch.js          ← Typed wrapper around useDispatch
│   │   └── useAppSelector.js          ← Typed wrapper around useSelector
│   │
│   └── selectors/
│       ├── index.js                   ← Re-exports all selectors
│       ├── staticDataSelectors.js     ← Selectors for static data slice
│       └── lovSelectors.js            ← Selectors for LOV slice
│
└── services/
    ├── processAreasService.js         ← API: L0 process areas + full hierarchy (9 batches)
    ├── cloudModulesService.js         ← API: master application modules
    └── processStreamService.js        ← API: master process streams
```

---

## 3. Redux Store — `src/redux/store.js`

```js
import { configureStore } from '@reduxjs/toolkit';
import staticDataSlice from './slices/staticDataSlice';
import lovSlice from './slices/lovSlice';
import uiSlice from './slices/uiSlice';
import userDataSlice from './slices/userDataSlice';

export const store = configureStore({
  reducer: {
    staticData: staticDataSlice,   // state.staticData.*
    lovs: lovSlice,                // state.lovs.*
    ui: uiSlice,                   // state.ui.*
    userData: userDataSlice,       // state.userData.*
  },
});
```

**State shape:**
```
{
  staticData: { processAreas, processHierarchy, countries, industries, cloudModules, processStreams },
  lovs:       { businessLines, geographies, roles },
  ui:         { modals, loading, notifications, sidebar },
  userData:   { ricewRequests, resourceRosters, projectConfigs }
}
```

Each domain follows the same sub-shape:
```js
{
  data: [],        // or {} for hierarchy
  loading: false,
  error: null,
}
```

---

## 4. Slices

### 4.1 `staticDataSlice.js` — `state.staticData`

**Purpose:** Read-only system/reference data fetched from APIs. Never edited by users.

| State Key         | Type   | Description                              |
|-------------------|--------|------------------------------------------|
| `processAreas`    | array  | L0-level process area list               |
| `processHierarchy`| object | Nested L1→L2→L3→L4 tree keyed by l0_id |
| `countries`       | array  | Country reference list                   |
| `industries`      | array  | Industry reference list                  |
| `cloudModules`    | array  | Master application modules               |
| `processStreams`  | array  | Master process streams                   |

**All exported actions:**
```js
// Process Areas
setProcessAreasLoading()
setProcessAreas(payload)         // payload: array
setProcessAreasError(payload)    // payload: error message string

// Process Hierarchy
setProcessHierarchyLoading()
setProcessHierarchy(payload)     // payload: { [l0_id]: [...l1 tree] }
setProcessHierarchyError(payload)

// Countries
setCountriesLoading()
setCountries(payload)
setCountriesError(payload)

// Industries
setIndustriesLoading()
setIndustries(payload)
setIndustriesError(payload)

// Cloud Modules
setCloudModulesLoading()
setCloudModules(payload)
setCloudModulesError(payload)

// Process Streams
setProcessStreamsLoading()
setProcessStreams(payload)
setProcessStreamsError(payload)
```

---

### 4.2 `lovSlice.js` — `state.lovs`

**Purpose:** List of Values used in dropdowns. Users can create new items that must be reflected app-wide.

| State Key       | Type  | Description               |
|-----------------|-------|---------------------------|
| `businessLines` | array | Business line LOV entries |
| `geographies`   | array | Geography LOV entries     |
| `roles`         | array | Role LOV entries          |

**All exported actions:**
```js
// Business Lines
setBusinessLinesLoading()
setBusinessLines(payload)        // payload: array
addBusinessLine(payload)         // payload: single item
setBusinessLinesError(payload)

// Geographies
setGeographiesLoading()
setGeographies(payload)
addGeography(payload)
setGeographiesError(payload)

// Roles
setRolesLoading()
setRoles(payload)
addRole(payload)
setRolesError(payload)
```

---

### 4.3 `uiSlice.js` — `state.ui`

**Purpose:** Pure UI interaction state — not API data.

| State Key       | Type    | Description                                |
|-----------------|---------|--------------------------------------------|
| `modals`        | object  | `{ createLov, editItem, confirmDelete }`   |
| `loading.global`| boolean | Full-page loading spinner                  |
| `notifications` | object  | `{ message, type }` — 'success'/'error'/…  |
| `sidebar.isOpen`| boolean | Sidebar open/closed                        |

**All exported actions:**
```js
openModal(modalName)       // modalName: 'createLov' | 'editItem' | 'confirmDelete'
closeModal(modalName)
toggleModal(modalName)
setGlobalLoading(boolean)
showNotification({ message, type })   // type: 'success' | 'error' | 'warning' | 'info'
clearNotification()
toggleSidebar()
setSidebarOpen(boolean)
```

---

### 4.4 `userDataSlice.js` — `state.userData`

**Purpose:** User-created/managed records with full CRUD.

| State Key        | Type  | Description                   |
|------------------|-------|-------------------------------|
| `ricewRequests`  | array | RICEW request records         |
| `resourceRosters`| array | Resource roster records       |
| `projectConfigs` | array | Project configuration records |

**All exported actions:**
```js
// RICEW Requests
setRicewRequestsLoading()
setRicewRequests(payload)
addRicewRequest(payload)
updateRicewRequest(payload)   // payload must include { id }
deleteRicewRequest(id)
setRicewRequestsError(payload)

// Resource Rosters
setResourceRostersLoading()
setResourceRosters(payload)
addResourceRoster(payload)
updateResourceRoster(payload)
deleteResourceRoster(id)
setResourceRostersError(payload)

// Project Configs
setProjectConfigsLoading()
setProjectConfigs(payload)
addProjectConfig(payload)
updateProjectConfig(payload)
deleteProjectConfig(id)
setProjectConfigsError(payload)
```

---

## 5. Redux Hooks — `src/redux/hooks/`

### `useAppDispatch` — dispatch actions

```js
import { useAppDispatch } from '../redux/hooks';

const dispatch = useAppDispatch();
dispatch(setProcessAreas(data));
```

### `useAppSelector` — read state

```js
import { useAppSelector } from '../redux/hooks';

const data = useAppSelector(state => state.staticData.cloudModules.data);
// or with a named selector:
const data = useAppSelector(selectCloudModules);
```

Both hooks are thin wrappers around `react-redux`'s `useDispatch`/`useSelector` with TypeScript-friendly signatures.

---

## 6. Selectors — `src/redux/selectors/`

### `staticDataSelectors.js`

```js
import {
  selectProcessAreas, selectProcessAreasLoading, selectProcessAreasError,
  selectProcessHierarchy, selectProcessHierarchyLoading, selectProcessHierarchyError,
  selectCountries, selectCountriesLoading, selectCountriesError,
  selectIndustries, selectIndustriesLoading, selectIndustriesError,
  selectCloudModules, selectCloudModulesLoading, selectCloudModulesError,
  selectProcessStreams, selectProcessStreamsLoading, selectProcessStreamsError,
} from '../redux/selectors';
```

### `lovSelectors.js`

```js
import {
  selectAllBusinessLines, selectBusinessLinesLoading, selectBusinessLinesError,
  selectAllGeographies, selectGeographiesLoading, selectGeographiesError,
  selectAllRoles, selectRolesLoading, selectRolesError,
} from '../redux/selectors';
```

---

## 7. Services — `src/services/`

Services call the API using `createApiClient` from `src/utils/apiFactory`. Base URL for all:
```
https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New
```

### `processAreasService.js`

```js
import { getProcessAreas, getProcessHierarchy } from '../services/processAreasService';

// getProcessAreas() → GET /rice/get/allProcessL0
// Returns: [{ stream_name, process_name, description, l0_id }]
// Sorted by numeric part of application_id

// getProcessHierarchy() → 9 parallel batch requests:
//   /allProcessHierarchy/get/batch1 ... batch9
// Returns: { [l0_id]: [ { l1_id, l1_name, l2_items: [ { l2_id, l2_name, l3_items: [...] } ] } ] }
// Each level sorted by numeric part of its ID
```

**Hierarchy tree shape:**
```
{
  "l0_1": [
    {
      l1_id, l1_name,
      l2_items: [
        {
          l2_id, l2_name,
          l3_items: [
            {
              l3_id, l3_name,
              l4_items: [{ l4_id, l4_name }]
            }
          ]
        }
      ]
    }
  ]
}
```

### `cloudModulesService.js`

```js
import { getCloudModules } from '../services/cloudModulesService';

// GET /rice/get/allMasterApplicationModules
// Returns: [{ application, module }]
// Sorted by numeric part of application_id
```

### `processStreamService.js`

```js
import { getProcessStreams } from '../services/processStreamService';

// GET /rice/get/allMasterProcessStreams
// Returns: raw API array sorted by stream_id (localeCompare)
```

---

## 8. Custom Hook — `src/hooks/useLOV.js`

**Independent** of Redux. Fetches a LOV from any API endpoint per component instance.

```js
const { options, loading, error } = useLOV(apiUrl, valueKey, labelKey);
```

**Parameters:**
| Param      | Default                    | Description                               |
|------------|----------------------------|-------------------------------------------|
| `apiUrl`   | required                   | Full endpoint URL to fetch                |
| `valueKey` | `'SI_organization_name'`   | Field from API item to use as option value|
| `labelKey` | `'SI_organization_name'`   | Field from API item to use as option label|

**Returns:**
```js
{
  options: [{ value, label, ...rawApiFields }],
  loading: boolean,
  error: string | null,
}
```

**Features:**
- Gets Cognito ID token and attaches as `Authorization: Bearer <token>` header
- Auto-retry: up to 3 attempts with exponential backoff (1s, 2s, 4s) on 5xx/429 errors
- Re-runs when `apiUrl`, `valueKey`, or `labelKey` change

---

## 9. Components Using Redux

### `ProcessAreasTable.js`

```js
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { selectProcessAreas, selectProcessAreasLoading,
         selectProcessHierarchy, selectProcessHierarchyLoading } from '../redux/selectors';
import { setProcessAreasLoading, setProcessAreas, setProcessAreasError,
         setProcessHierarchyLoading, setProcessHierarchy, setProcessHierarchyError }
  from '../redux/slices/staticDataSlice';
import { getProcessAreas, getProcessHierarchy } from '../services/processAreasService';

// Pattern: load once, cache in Redux, skip reload if data already present
useEffect(() => {
  // if processAreasData.length === 0 → dispatch loading → fetch → dispatch set/error
  // if Object.keys(hierarchyData).length === 0 → same for hierarchy
}, [dispatch]);
```

### `CloudModulesTable.js`

```js
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { selectCloudModules, selectCloudModulesLoading } from '../redux/selectors';
import { setCloudModulesLoading, setCloudModules, setCloudModulesError }
  from '../redux/slices/staticDataSlice';
import { getCloudModules } from '../services/cloudModulesService';
```

### `ProcessStreamTable.js`

```js
import { useAppDispatch, useAppSelector } from '../redux/hooks';
// Uses selectProcessStreams + setProcessStreams pattern
// Fetches via getProcessStreams from processStreamService
```

---

## 10. Standard Usage Patterns

### Load-once with cache check

```js
useEffect(() => {
  if (existingData.length === 0) {
    dispatch(setXLoading());
    fetchX()
      .then(data => dispatch(setX(data)))
      .catch(err => dispatch(setXError(err.message)));
  }
}, [dispatch]);
```

### Read in any component

```js
const data = useAppSelector(selectX);
const loading = useAppSelector(selectXLoading);
```

### Add item after create

```js
dispatch(addX(newItem));
```

### Update item

```js
dispatch(updateX({ id: itemId, ...updatedFields }));
```

### Delete item

```js
dispatch(deleteX(itemId));
```

---

## 11. Dependencies to Re-install

After reverting, run:

```bash
npm install @reduxjs/toolkit react-redux
```

Versions in use:
- `@reduxjs/toolkit`: `^2.11.2`
- `react-redux`: `^9.2.0`

---

## 12. Re-implementation Checklist

To rebuild this Redux setup from scratch:

- [ ] `npm install @reduxjs/toolkit react-redux`
- [ ] Create `src/redux/store.js` with configureStore
- [ ] Create `src/redux/slices/staticDataSlice.js`
- [ ] Create `src/redux/slices/lovSlice.js`
- [ ] Create `src/redux/slices/uiSlice.js`
- [ ] Create `src/redux/slices/userDataSlice.js`
- [ ] Create `src/redux/slices/index.js` (re-export all)
- [ ] Create `src/redux/hooks/useAppDispatch.js`
- [ ] Create `src/redux/hooks/useAppSelector.js`
- [ ] Create `src/redux/hooks/index.js` (re-export both)
- [ ] Create `src/redux/selectors/staticDataSelectors.js`
- [ ] Create `src/redux/selectors/lovSelectors.js`
- [ ] Create `src/redux/selectors/index.js` (re-export all)
- [ ] Create `src/services/processAreasService.js`
- [ ] Create `src/services/cloudModulesService.js`
- [ ] Create `src/services/processStreamService.js`
- [ ] Create `src/hooks/useLOV.js`
- [ ] Wrap `<App />` with `<Provider store={store}>` in `src/index.js`
- [ ] Update `ProcessAreasTable.js`, `CloudModulesTable.js`, `ProcessStreamTable.js` to use Redux