# AJF ERP

## Overview
AJF ERP is a comprehensive web application for managing accounts, members, welfare funds, loans, investments, and society operations.

## Prerequisites
- Node.js (v18 or higher recommended)
- npm, pnpm, bun, or yarn

## Installation Steps
1. **Extract the Archive**: Unzip the project archive to a folder on your local machine.
2. **Open Terminal**: Navigate to the root directory of the extracted project in your terminal or command prompt.
3. **Install Dependencies**:
   Run the following command to install all necessary packages:
   ```bash
   npm install
   ```
4. **Environment Configuration**:
   Create a `.env` file in the root directory by copying the `.env.example` file:
   ```bash
   cp .env.example .env
   ```
   Update the variables in the `.env` file if necessary (e.g., database credentials if you connect to an external database).

## Running the Application Locally
To start the development server, run:
```bash
npm run dev
```
The application will typically be accessible at `http://localhost:3000` (or another port if specified in your terminal output).

## Building for Production
To build the application for production deployment, run:
```bash
npm run build
```
This process bundles and optimizes the application, outputting the production-ready static assets to the `dist` directory.

## Deployment Procedure

### Option 1: Static Hosting (Vercel, Netlify, Cloudflare Pages)
If you are deploying the client-side SPA directly:
1. Connect your Git repository to your preferred hosting provider.
2. Set the Build Command to: `npm run build`
3. Set the Publish/Output Directory to: `dist`
4. Deploy the application.

### Option 2: Docker / Containerized Environment (Cloud Run, AWS ECS)
If you wish to containerize the application:
1. Create a `Dockerfile` that copies the project files.
2. Run `npm install` and `npm run build` during the build step.
3. Expose port `3000` (or your preferred port).
4. Start the application using a static file server (like `serve`) or your Node.js backend if a custom server entry point is configured.

### Option 3: Traditional VPS / Shared Hosting
1. Build the app using `npm run build` on your local machine.
2. Upload the contents of the `dist` folder to your web server's public HTML directory (e.g., `/var/www/html` or `public_html`).
3. Ensure your web server (Nginx/Apache) is configured to route all traffic to `index.html` to support client-side routing.

## Technologies Used
- **Frontend Framework**: React 19, Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **PDF Generation**: jsPDF, html2canvas
- **Data Storage**: Client-side storage via localforage / IndexedDB (as currently configured)
