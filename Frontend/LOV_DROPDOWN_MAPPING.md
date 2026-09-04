# RICEW Template - LOV Dropdown Mapping

## Overview
This document lists all the columns in the RICEW Request Template and their corresponding LOV (List of Values) dropdown configurations.

---

## Column Mapping

| Column | Column Letter | Field Name | LOV Source | LOV Count | Status |
|--------|---------------|------------|------------|-----------|---------|
| A | A | RICEW Name | N/A (Free Text) | - | ✅ No Dropdown |
| B | B | RICEW Type | LOV_Data Column A | 8 options | ⚠️ COMMENTED OUT |
| C | C | RICEW Status | LOV_Data Column B | 17 options | ⚠️ COMMENTED OUT |
| D | D | RICEW Description | N/A (Free Text) | - | ✅ No Dropdown |
| E | E | Process Stream | LOV_Data Column C | 5 options | ⚠️ COMMENTED OUT |
| F | F | Application | LOV_Data Column D | 13 options | ⚠️ COMMENTED OUT |
| G | G | L0 Process | LOV_Data Column E | 18 options | ⚠️ COMMENTED OUT |
| H | H | Module | LOV_Data Column F | 49 options | ⚠️ COMMENTED OUT |
| I | I | Cross Stream Impact | N/A (Free Text) | - | ✅ No Dropdown |
| J | J | Cross Process Stream | LOV_Data Column C | 5 options | ⚠️ COMMENTED OUT |
| K | K | Cross Application | LOV_Data Column D | 13 options | ⚠️ COMMENTED OUT |
| L | L | Cross L0 Process | LOV_Data Column E | 18 options | ⚠️ COMMENTED OUT |
| M | M | Cross Module | LOV_Data Column F | 49 options | ⚠️ COMMENTED OUT |

---

## Detailed LOV Lists

### Column B: RICEW Type (8 options)
**LOV Source:** `LOV_Data!$A$1:$A$8`

1. Alert
2. Analytics Reports
3. Conversions
4. Extensions
5. Integrations
6. Personalization
7. Reports
8. Workflow

---

### Column C: RICEW Status (17 options)
**LOV Source:** `LOV_Data!$B$1:$B$17`

1. Approval Pending
2. Approved
3. Cancelled
4. Client Testing Complete
5. Client Testing In Progress
6. Complete
7. FS Complete
8. FS Work In Progress
9. FUT Complete
10. FUT Work In Progress
11. Hold
12. Rejected
13. RICEW Requested
14. TS Complete
15. TS Work In Progress
16. UT Complete
17. UT Work In Progress

---

### Column E: Process Stream (5 options)
**LOV Source:** `LOV_Data!$C$1:$C$5`

1. Enterprise Resource Planning (ERP)
2. Supply Chain & Manufacturing (SCM)
3. Human Capital Management (HCM)
4. Customer Experience (CX)
5. Fusion Analytics (FAN)

---

### Column F: Application (13 options)
**LOV Source:** `LOV_Data!$D$1:$D$13`

1. Procurement
2. Enterprise Performance Management
3. Project Management
4. Financial Management
5. Risk Management and Compliance
6. Supply Chain Management
7. Product Lifecycle Management
8. Workforce Management
9. Talent Management
10. Marketing
11. Customer Experience
12. Oracle Analytics
13. ERP Analytics

---

### Column G: L0 Process (18 options)
**LOV Source:** `LOV_Data!$E$1:$E$18`

1. Contract Management
2. Supplier Management
3. Requisition-to-Order
4. Procure-to-Pay
5. Project Budgeting and Forecasting
6. Project Initiation-to-Close
7. Record-to-Report
8. Order-to-Cash
9. Audit Management
10. Inventory Management
11. Source-to-Settle
12. Order-to-Fulfill
13. Plan-to-Produce
14. Concept-to-Design
15. Lead-to-Opportunity
16. Quote-to-Order
17. Lead to Loyalty
18. Analyze to Act

---

### Column H: Module (49 options)
**LOV Source:** `LOV_Data!$F$1:$F$49`

1. Supplier Management
2. Procurement Contracts
3. Purchasing
4. Self-Service Procurement and Supplier Portal
5. Sourcing
6. Financial Consolidation and Close Cloud Service (FCCS)
7. Tax Reporting Cloud Service (TRCS)
8. Account Reconciliation Cloud Service (ARCS)
9. Narrative Reporting
10. Enterprise Data Management Cloud (EDMCS)
11. Profitability and Cost Management Cloud Service (PCMCS)
12. Enterprise Planning and Budgeting Cloud Service (EPBCS)
13. Planning and Budgeting Cloud Service (PBCS)
14. Project Costing
15. Project Portfolio Management (PPM)
16. Project Financial Management
17. Project Contract Management
18. Grants Management
19. Project Billing
20. Project Control
21. Resource Management
22. Project Procurement
23. Fixed Assets (FA)
24. Accounts Payable (AP)
25. General Ledger (GL)
26. Accounts Receivable (AR)
27. Advanced Collections
28. Advanced Financial Controls (AFC)
29. Financial Reporting Compliance (FRC)
30. Risk Management Cloud (ORMC)
31. Advanced Access Controls (AAC)
32. Configurator Modeling
33. Innovation Management
34. Product Master Data Management (MDM)
35. Product Development
36. Workforce Labor Optimization
37. Time and Labor
38. Workforce Health and Safety
39. Workforce Scheduling
40. Absence Management
41. Career Development
42. Compensation
43. Recruiting
44. Performance Management
45. Unity Customer Data Platform
46. Eloqua Marketing Automation
47. Responsys Campaign Management
48. CrowdTwist Loyalty and Engagement
49. Financial Analytics

---

## Cross-Stream Columns

The template includes **Cross-Stream Impact** fields to capture dependencies across different process streams:

- **Column I (Cross Stream Impact):** Free text field to describe the cross-stream impact
- **Column J (Cross Process Stream):** Uses the same LOV as Process Stream (Column E)
- **Column K (Cross Application):** Uses the same LOV as Application (Column F)
- **Column L (Cross L0 Process):** Uses the same LOV as L0 Process (Column G)
- **Column M (Cross Module):** Uses the same LOV as Module (Column H)

**Note:** Cross-stream columns (J, K, L, M) share the same LOV lists as their corresponding primary columns (E, F, G, H).

---

## How to Enable/Disable Dropdowns

### Current Status
**All dropdowns are COMMENTED OUT** - Users can type any value in columns B, C, E, F, G, H, J, K, L, M.

### To Enable a Specific Dropdown

1. Open `src/utils/excelTemplateUtils.js`
2. Find the section for the column you want to enable (search for the column letter)
3. Remove the `/*` and `*/` comment markers around the `mainSheet.dataValidations.add()` block

**Example - Enable RICEW Type dropdown (Column B):**

```javascript
// Column B: RICEW Type - Dropdown validation (LOV: 8 options from LOV_Data column A)
// REMOVE THIS: /*
mainSheet.dataValidations.add('B2:B1001', {
    type: 'list',
    allowBlank: true,
    formulae: ['LOV_Data!$A$1:$A$8'],
    showErrorMessage: true,
    errorStyle: 'error',
    errorTitle: 'Invalid Input',
    error: 'Please select a valid RICEW Type from the dropdown list'
});
// REMOVE THIS: */
```

### To Enable All Dropdowns

Remove all `/*` and `*/` comment markers from the data validation section in `excelTemplateUtils.js`.

---

## Code Location

**File:** `src/utils/excelTemplateUtils.js`

**Lines:** 251-433 (Data Validation section - updated)

**LOV Data Definition:** Lines 7-141 (LOV_DATA constant)

---

## Validation Rules

### Text Fields (No Dropdown)
- **Column A (RICEW Name):** Max 100 characters
- **Column D (RICEW Description):** Max 240 characters
- **Column I (Cross Stream Impact):** Free text (no length limit)

### Dropdown Fields (Currently Commented Out)
- **Column B (RICEW Type):** Must match one of 8 values
- **Column C (RICEW Status):** Must match one of 17 values
- **Column E (Process Stream):** Must match one of 5 values
- **Column F (Application):** Must match one of 13 values
- **Column G (L0 Process):** Must match one of 18 values
- **Column H (Module):** Must match one of 49 values
- **Column J (Cross Process Stream):** Must match one of 5 values (same as Column E)
- **Column K (Cross Application):** Must match one of 13 values (same as Column F)
- **Column L (Cross L0 Process):** Must match one of 18 values (same as Column G)
- **Column M (Cross Module):** Must match one of 49 values (same as Column H)

---

## Notes

1. **LOV_Data Sheet:** All dropdown values are stored in a hidden sheet called `LOV_Data`
2. **Excel Formula References:** Each dropdown uses an Excel formula like `LOV_Data!$A$1:$A$8`
3. **Validation is Optional:** With dropdowns commented out, users can type any value
4. **Upload Validation:** The `parseRICEWTemplate()` function still validates values against LOV lists during upload
5. **Cross-Stream Columns:** Columns J, K, L, M use the same LOV lists as columns E, F, G, H respectively

---

**Last Updated:** 2025-12-10
