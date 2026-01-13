# Deployment and Setup Guide

This guide explains how the Blue Collar Job Portal backend and database are deployed, and provides instructions for setting up the project locally.

## Deployment Architecture

### Backend: Render
The Node.js/Express backend is deployed on [Render](https://render.com/).
- **Service Type:** Web Service
- **Runtime:** Node.js
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:** All sensitive keys (DB credentials, API keys) are securely stored in Render's environment variable settings.

### Database: Aiven Cloud DB
The MySQL database is hosted on [Aiven](https://aiven.io/).
- **Database Engine:** MySQL
- **Connection:** The backend connects to Aiven using the `DATABASE_URL` environment variable via Prisma ORM.

---

## Local Setup Instructions

To download, run, and view the app locally, follow these steps.

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn
- Expo Go app on your mobile device (for testing the mobile app)

### 2. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the `backend` directory and add the following configuration.
    
    > **IMPORTANT:** You must set the `ADMIN_EMAIL` and `ADMIN_PASSWORD` here. These will be used to log in as the System Admin.

    ```env
    # Server Configuration
    PORT=5000
    NODE_ENV=development
    
    # Database Connection (MySQL on Aiven or Local)
    DATABASE_URL="mysql://user:password@host:port/database_name?ssl-mode=REQUIRED"
    
    # Authentication
    JWT_SECRET="your_super_secret_jwt_key"
    
    # Admin Credentials (REQUIRED for Admin Login)
    ADMIN_EMAIL="admin@example.com"
    ADMIN_PASSWORD="secureAdminPassword123!"
    
    # AI Services
    GOOGLE_GEMINI_API_KEY="your_google_gemini_api_key"
    COHERE_API_KEY="your_cohere_api_key"
    
    # AWS S3 (File Storage)
    AWS_REGION="ap-southeast-2"
    AWS_BUCKET_NAME="your_s3_bucket_name"
    AWS_ACCESS_KEY_ID="your_aws_access_key"
    AWS_SECRET_ACCESS_KEY="your_aws_secret_key"
    
    # Google Cloud Translation (Optional, if using translation features)
    # GOOGLE_APPLICATION_CREDENTIALS="path/to/google-credentials.json"
    ```


4.  Start the Backend Server:
    ```bash
    npm run dev
    ```
    The server should run on `http://localhost:5000`.

### 3. Frontend (Mobile App) Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
    *(Note: If the frontend code is in the root directory, run this from the root).*

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  **Configure App Settings:**
    Check `app.json` (or `app.config.js`) to ensure the `API_BASE_URL` points to your local backend or the deployed backend.
    
    ```json
    "extra": {
      "API_BASE_URL": "http://<YOUR_LOCAL_IP>:5000" 
    }
    ```
    *Note: When running on a physical device via Expo, use your computer's local IP address (e.g., `192.168.1.x`), not `localhost`.*

4.  Start the Expo Development Server:
    ```bash
    npx expo start
    ```

5.  **Run the App:**
    - **Physical Device:** Scan the QR code with the Expo Go app (Android/iOS).
    - **Emulator:** Press `a` for Android Emulator or `i` for iOS Simulator.

### 4. Accessing the Admin Panel
To access the admin features, use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you defined in the backend `.env` file.
