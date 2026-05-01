# HKMU 2025/2026 COMP S456F Final Year Project
# AI-Assisted Chatbot for Streamlined Software Requirements Gathering

HKMU FYP 2025/26 Yishu-2\
\
13514988 Leung Wai Chung\
13588511 Wong Sin Ngai\
13506718 Chow Cheuk Wai\
13653626 Tong Sum Long

Supervisor: Dr. Yishu Li

-------------

# Singularity

Singularity is a comprehensive, full-stack Node.js web Agent powered software requirements gathering platform designed for complex workflows. It features modern authentication mechanisms, real-time communication, robust document and media processing, and deep integration with multiple AI services (OpenAI, Hugging Face, XAI). 

Built with Express.js, server-side rendered with EJS, and utilizing Socket.IO for live interactions, Singularity is built to be a highly capable platform for secure, AI-assisted project and file management.

## Key Features

### Advanced Authentication & Security
*   **Passwordless WebAuthn / Passkeys:** Modern, highly secure, and convenient login flows utilizing `@simplewebauthn`.
*   **Traditional & Social Login:** Standard email/password login (hashed via Argon2) alongside Google OAuth2 integration via Passport.js.
*   **Robust Security:** Implements Helmet for HTTP header security, `@dr.pogodin/csurf` for CSRF protection, and secure Express sessions.

### AI Agent Integrations
*   **Multi-Model Support:** Connects and interacts with various AI models using OpenAI, XAI, and Hugging Face Transformers.
*   **Interactive Chat:** Dedicated chat controllers and UI for seamless user-to-agent interactions.
*   **Automated Prompts & Tools:** Built-in AI Agent tools service (`aiAgentToolsService.js`) to expand the capabilities of the AI within the application.

### Document & Media Processing
*   **Document Generation & Parsing:** Read and parse PDFs (`pdf-parse`, `pdfjs-dist`) and DOCX files. Generate new DOCX files (`docx`) or convert formats using LibreOffice (`libreoffice-convert`).
*   **Media Handling:** Audio transcriptions are handled natively via `nodejs-whisper` and `wavefile`, with robust media processing backed by `fluent-ffmpeg`.
*   **File Uploads:** Managed via Multer, with support for chunking and large file handling.

### Scalable Storage
*   **MinIO Integration:** Uses MinIO (an S3-compatible object storage server) for highly scalable, secure, and reliable file and document storage.

### Real-Time Communication
*   **Socket.IO:** Powers real-time chat, live notifications, and asynchronous file processing status updates.

---

## Technology Stack

*   **Backend:** Node.js, Express.js
*   **Database:** SQLite3
*   **Frontend Views:** EJS (Embedded JavaScript templates), Vanilla JS, CSS
*   **Real-Time:** Socket.IO
*   **Storage:** MinIO
*   **AI & Processing:** OpenAI API, Hugging Face, XAI, FFmpeg, Whisper
*   **Security:** Passport.js, SimpleWebAuthn, Helmet, CSURF, Argon2
*   **Logging:** Winston

---

## Project Architecture

```text
singularity/
├── server.js                        # Main application entry point & Socket.IO server setup
├── package.json                     # Project metadata, scripts, and dependencies
├── .env.example                     # Environment variables template
├── public/
│   ├── components/                  # Reusable UI modules (Sidebar, Chat, Modals, Panels)
│   ├── managers/                    # Core business logic routing (Accounts, AI Agents, Projects, Status)
│   ├── services/                    # Database interactors, external APIs, logging, and utilities
│   ├── scripts/                     # Client-side JavaScript logic mapped to views
│   ├── stylesheets/                 # Component and view-specific CSS stylesheets
│   ├── views/                       # Server-rendered EJS Templates (Home, Login, Signup, Profile, etc.)
│   └── img/                         # SVG icons and static image assets
```

---

## Prerequisites & System Requirements

Before setting up the project, ensure your environment meets the following requirements:

1.  **Node.js:** v16.x or higher recommended.
2.  **MinIO Server:** A running instance of MinIO (or equivalent S3-compatible storage) is required for file handling.
3.  **FFmpeg:** Must be installed on the host machine for audio/video processing and transcriptions.
4.  **LibreOffice:** Must be installed on the host machine for document format conversions (`libreoffice-convert`).

---

## Installation & Setup

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd singularity
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
The application relies heavily on environment variables for security and configuration. 

Copy the sample environment file:
```bash
cp .env.example .env
```

Open `.env` and configure the following key sections:

*   **Development Options:**
    *   `NODE_ENV`: Set to `development` or `production`.
    *   `ENABLE_HTTPS`: Set to `true` if running local HTTPS.
    *   `USE_NGINX_SSL`: Set to `true` if behind a reverse proxy handling SSL.
*   **Server Config:** Set your domain, support URLs, and paths to SSL certificates if not using Nginx.
*   **Storage (MinIO):** Provide your `MINIO_ACCESSKEY`, `MINIO_SECRETKEY`, `MINIO_BUCKET`, `MINIO_END_POINT`, and `MINIO_PORT`.
*   **OAuth (Google):** Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
*   **AI API Keys:** Supply `HUGGING_FACE_TOKEN` and `XAI_API_KEY`.

### 4. Running the Server

To start the application:

```bash
npm start
```
*(Note: If you are doing development, you may want to set up `nodemon` or a similar tool, though it is not included in the default scripts).*

The server will start on port `9090` by default (or the `PORT` specified in your environment). 

> **Important Note on HTTPS:** Singularity enforces secure connections. If you start the server without `USE_NGINX_SSL=true` or without valid `SSL_CERT_PATH` and `SSL_KEY_PATH` while `ENABLE_HTTPS=true` is set, the server will output severe warnings. **Never run unencrypted HTTP in production.**

---

## Security Best Practices

*   **CSRF Protection:** The `.env` file contains an `ENABLE_USER_CHECKING` flag. Disabling this turns off CSRF checks. **Never disable this in a production environment.**
*   **Session Management:** Ensure you are using secure cookies (handled automatically when running over HTTPS).
*   **Rate Limiting & File Size:** Be mindful of the `ENFORCE_TRANSCRIPT_TIME_LIMIT` and `ENFORCE_TRANSCRIPT_TIME_MAX` settings to prevent abuse of the Whisper transcription service.
