# Skill: Automated User Manual & Documentation Generator

This document defines the custom skill workflow for creating comprehensive, screenshot-backed user documentation for web applications.

---

## 1. Overview & Capability Matrix

* **Purpose:** Automate screenshot capture and structure complete user documentation for web applications.
* **Target Stack:** Playwright (Screenshot capture) + VitePress / Docusaurus / MkDocs (Documentation hosting) + Markdown.
* **Supported Roles:** System Admin, Beneficiary, Standard User, Manager.

---

## 2. Playwright Screenshot Automation Script

Save this script as `scripts/capture-docs-screenshots.js`. It runs headlessly, logs into your application, sets a high-DPI viewport for clean imagery, and saves screenshots directly to your documentation assets folder.

```javascript
// scripts/capture-docs-screenshots.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../docs/public/images/screenshots');
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

async function captureScreenshots() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  // Set high-DPI resolution for crisp manual screenshots
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log('📸 Capturing Screenshots...');

  // 1. Login Page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUTPUT_DIR}/01-login.png` });
  console.log(' Saved: 01-login.png');

  // 2. Perform Login (Adjust selectors according to your app)
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });

  // 3. Admin Dashboard Overview
  await page.screenshot({ path: `${OUTPUT_DIR}/02-admin-dashboard.png` });
  console.log(' Saved: 02-admin-dashboard.png');

  // 4. Beneficiary / User Management Page
  await page.goto(`${BASE_URL}/admin/users`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUTPUT_DIR}/03-user-management.png` });
  console.log(' Saved: 03-user-management.png');

  // 5. Reports & Analytics Page
  await page.goto(`${BASE_URL}/admin/reports`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUTPUT_DIR}/04-reports-dashboard.png` });
  console.log(' Saved: 04-reports-dashboard.png');

  await browser.close();
  console.log('✨ All screenshots captured successfully!');
}

captureScreenshots().catch((err) => {
  console.error('❌ Error capturing screenshots:', err);
  process.exit(1);
});
```

---

## 3. Comprehensive User Manual Template (`USER_MANUAL.md`)

Below is the structured Markdown blueprint to use for generating your final user documentation.

```markdown
# Project User Manual

Welcome to the official user manual for **[Project Name]**. This guide provides step-by-step instructions for navigating and utilizing the system effectively.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Getting Started & Authentication](#2-getting-started--authentication)
3. [Role-Based Walkthroughs](#3-role-based-walkthroughs)
   - [Admin Portal](#admin-portal)
   - [Beneficiary / User Portal](#beneficiary--user-portal)
4. [Core Features & Operations](#4-core-features--operations)
5. [Troubleshooting & FAQ](#5-troubleshooting--faq)

---

## 1. System Overview

**[Project Name]** is a web-based dashboard designed to manage workflows, monitor reports, and handle user administration.

### Key Capabilities:
* **Admin Module:** User provisioning, role assignment, system configuration, dynamic report generation.
* **User Module:** Profile management, service request submission, real-time status tracking.

---

## 2. Getting Started & Authentication

### Step 1: Accessing the Application
Navigate to `https://your-domain.com/login` in any modern web browser (Chrome, Firefox, Safari, Edge).

![Login Screen](./images/screenshots/01-login.png)

### Step 2: Logging In
1. Enter your registered email address in the **Email** field.
2. Input your password.
3. Click **Sign In**.
4. If Multi-Factor Authentication (MFA) is enabled, enter the verification code sent to your email/phone.

---

## 3. Role-Based Walkthroughs

### Admin Portal

The Admin Dashboard provides full visibility over system metrics, user requests, and analytical data.

![Admin Dashboard](./images/screenshots/02-admin-dashboard.png)

#### Managing Users
1. Select **User Management** from the sidebar menu.
2. View, filter, or search existing user accounts.
3. Click **Add User** to invite a new administrator or beneficiary.

![User Management](./images/screenshots/03-user-management.png)

---

### Beneficiary / User Portal

Beneficiaries can access their personal portal to view service status and submit requests.

#### Submitting a Request
1. Click on **New Request** from the dashboard home page.
2. Fill in all required fields (marked with an asterisk `*`).
3. Attach relevant documents or images.
4. Click **Submit**. You will receive a confirmation ID immediately.

---

## 4. Core Features & Operations

### Generating Reports
Administrators can generate exportable reports (PDF/Excel) summarizing activity across selected date ranges.

![Reports Page](./images/screenshots/04-reports-dashboard.png)

1. Navigate to **Reports** in the navigation panel.
2. Select your desired date range and filter criteria.
3. Click **Export Report** and choose your preferred format (`.xlsx` or `.pdf`).

---

## 5. Troubleshooting & FAQ

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Invalid Password** | Incorrect credentials entered | Click **Forgot Password?** on the login page to reset. |
| **Access Denied** | Role permissions restriction | Contact your System Administrator to request elevated privileges. |
| **Screenshots/Data Not Loading** | Session timeout or network issue | Refresh the page (`F5` or `Cmd+R`) or clear browser cache. |

---
```