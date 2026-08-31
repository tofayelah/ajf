# Financial Accounting Application - Installation & Deployment Guide

## Overview
This is a robust, full-stack financial accounting application featuring a double-entry ledger system, cash/bank reconciliation, transaction idempotency, and D3.js-based diagnostic flow visualizations. It is built using **React, TypeScript, Vite, Tailwind CSS**, and an **Express.js** backend.

---

## 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes with Node.js)

---

## 2. Local Development Setup

Follow these steps to run the application locally in development mode:

1. **Extract the Archive:**
   Unzip the provided project archive into your desired directory.

2. **Install Dependencies:**
   Open your terminal, navigate to the project root, and run:
   ```bash
   npm install
   ```

3. **Start the Development Server:**
   Launch the Vite and Express development environment:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`. Hot-module reloading (HMR) is enabled for frontend changes, and `tsx` will automatically recompile backend changes.

---

## 3. Production Build & Execution

To run the application in a production-like environment (highly recommended for performance and stability):

1. **Build the Project:**
   ```bash
   npm run build
   ```
   *This command executes Vite to compile the frontend Single Page Application (SPA) into static files, and uses `esbuild` to bundle the Express server into a standalone `dist/server.cjs` file.*

2. **Start the Production Server:**
   ```bash
   npm start
   ```
   *This will run `node dist/server.cjs`. The Express server will handle API routes and statically serve the React frontend on port 3000.*

---

## 4. Deployment Guide

### Option A: Deploying to Google Cloud Run (Recommended Containerized Approach)

This application is structurally optimized for Google Cloud Run containerization.

1. **Create a `Dockerfile`** in the root of your project:
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   
   # Copy package files and install dependencies
   COPY package*.json ./
   RUN npm ci
   
   # Copy source code
   COPY . .
   
   # Build the application
   RUN npm run build
   
   # Expose the standard port
   EXPOSE 3000
   
   # Start the production server
   CMD ["npm", "start"]
   ```

2. **Deploy using Google Cloud CLI**:
   ```bash
   gcloud run deploy financial-app \
     --source . \
     --port 3000 \
     --allow-unauthenticated \
     --region us-central1
   ```

### Option B: Deploying to a Virtual Private Server (VPS / EC2 / DigitalOcean)

If deploying to a standard Linux server:
1. Transfer the source code to your server.
2. Run `npm install` and `npm run build`.
3. Use a process manager like **PM2** to keep the app running continuously:
   ```bash
   npm install -g pm2
   pm2 start npm --name "financial-app" -- start
   ```
4. Map your domain to the application using a reverse proxy like **Nginx**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 5. Database & Persistence Note
By default, this application utilizes a local JSON persistence layer (`database.json`) acting as an embedded database for self-contained execution. Ensure that the deployment environment has write-access to the local filesystem, or mount a persistent volume if deploying via Docker/Kubernetes to avoid data loss on container restarts.
