<div align="center">

# Singularity

**AI-Assisted Software Requirements Gathering Platform**

*HKMU Final Year Project 2025/2026 — COMP S456F*

[![Node.js](https://img.shields.io/badge/Node.js-v16%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![MinIO](https://img.shields.io/badge/MinIO-Object%20Storage-C72E49?logo=minio&logoColor=white)](https://min.io/)

---

**Team Members**

| Student ID | Name |
|---|---|
| 13514988 | Leung Wai Chung |
| 13588511 | Wong Sin Ngai |
| 13506718 | Chow Cheuk Wai |
| 13653626 | Tong Sum Long |

**Supervisor:** Dr. Yishu Li

</div>

---

## Overview

Singularity is a comprehensive, full-stack web platform that leverages AI agents to streamline and automate the software requirements gathering process. Built on Node.js and Express.js, it provides a secure, real-time collaborative environment where teams can interact with multiple AI models, manage project documents, and process rich media — all within a single, unified interface.

The platform is designed for complex enterprise workflows, featuring modern authentication, scalable object storage, and deep integrations with leading AI providers including OpenAI, xAI, and Hugging Face.

---

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration Reference](#configuration-reference)
- [Running the Server](#running-the-server)
- [Security](#security)
- [Team](#team)

---

## Key Features

### Authentication & Security
- **Passwordless WebAuthn / Passkeys** — Modern, phishing-resistant login flows via `@simplewebauthn/server`.
- **Social & Traditional Login** — Google OAuth2 via Passport.js, and email/password authentication hashed with Argon2.
- **Enterprise-Grade Security** — HTTP header hardening via Helmet, CSRF protection via `@dr.pogodin/csurf`, and secure session management.

### AI Agent Integration
- **Multi-Model Support** — Connects to OpenAI, xAI (Grok), and Hugging Face Transformers from a single interface.
- **Interactive Chat** — Dedicated chat controller and UI for seamless, context-aware user-to-agent interactions.
- **Extensible Agent Tooling** — A built-in AI Agent Tools Service (`aiAgentToolsService.js`) expands what agents can do within the application, enabling complex, multi-step workflows.

### Document & Media Processing
- **Document Parsing** — Extract content from PDF files (`pdf-parse`, `pdfjs-dist`) and a wide range of Office formats including DOCX, XLSX, PPTX, and ODP via `officeparser`.
- **Document Generation & Conversion** — Generate new DOCX files programmatically (`docx`) and convert between document formats using LibreOffice (`libreoffice-convert`).
- **Audio Transcription** — Native audio transcription powered by `nodejs-whisper` and `wavefile`, with media processing via `fluent-ffmpeg`.
- **File Uploads** — Managed via Multer, with support for chunked transfers and large file handling.

### Real-Time Communication
- **Socket.IO** — Powers live chat, real-time notifications, and asynchronous processing status updates throughout the platform.

### Scalable Storage
- **MinIO Integration** — S3-compatible object storage for secure, scalable, and reliable file and document management.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (v16+) |
| **Backend Framework** | Express.js |
| **Database** | SQLite3 |
| **Frontend** | EJS Templates, React, Vanilla JS, CSS |
| **Real-Time** | Socket.IO |
| **Object Storage** | MinIO |
| **AI Services** | OpenAI API, xAI (Grok), Hugging Face |
| **Document Processing** | LibreOffice, pdf-parse / pdfjs-dist, OfficeParser |
| **Media Processing** | FFmpeg, Whisper (`nodejs-whisper`) |
| **Authentication** | Passport.js, SimpleWebAuthn, Argon2 |
| **Security** | Helmet, CSURF, Express-Session |
| **Logging** | Winston |

---

## Architecture

```
singularity/
├── server.js                        # Application entry point & Socket.IO server setup
├── package.json                     # Project metadata, scripts, and dependencies
├── .env.example                     # Environment variable template
│
└── public/
    ├── components/                  # Reusable UI modules (Sidebar, Chat, Modals, Panels)
    ├── managers/                    # Core business logic (Accounts, AI Agents, Projects, Status)
    ├── services/                    # Database layer, external APIs, logging, and utilities
    ├── scripts/                     # Client-side JavaScript mapped to views
    ├── stylesheets/                 # Component and view-specific CSS
    ├── views/                       # Server-rendered EJS templates (Home, Login, Signup, Profile, etc.)
    └── img/                         # SVG icons and static image assets
```

---

## Prerequisites

Ensure the following are installed and available on your system before proceeding:

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | v16.x or higher | Core runtime |
| **MinIO** | Latest | S3-compatible object storage instance required |
| **FFmpeg** | Any stable | Required for audio/video processing and transcription |
| **LibreOffice** | Any stable | Required for document format conversion |
| **xAI API Key** | — | Required to enable core system functionality |
| **Dedicated GPU** | — | Highly recommended for Whisper transcription performance |

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd singularity
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Whisper Model

The system requires a Whisper model to be downloaded locally for transcription services. Run the following and follow the interactive prompts to select and download your preferred model:

```bash
npx nodejs-whisper download
```

### 4. Configure Environment Variables

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure each section. See the [Configuration Reference](#configuration-reference) below for a full description of every variable.

---

## Configuration Reference

The `.env` file is divided into the following sections:

#### Development Options
| Variable | Description |
|---|---|
| `NODE_ENV` | Set to `development` or `production` |
| `ENABLE_HTTPS` | Set to `true` to enable local HTTPS |
| `USE_NGINX_SSL` | Set to `true` when running behind a reverse proxy (e.g., Nginx) that handles SSL termination |

#### Server Configuration
| Variable | Description |
|---|---|
| `PORT` | Server port (default: `9090`) |
| `DOMAIN` | Your application's domain |
| `SSL_CERT_PATH` | Path to your SSL certificate file |
| `SSL_KEY_PATH` | Path to your SSL private key file |

#### Storage (MinIO)
| Variable | Description |
|---|---|
| `MINIO_END_POINT` | MinIO server hostname or IP |
| `MINIO_PORT` | MinIO server port |
| `MINIO_ACCESSKEY` | MinIO access key |
| `MINIO_SECRETKEY` | MinIO secret key |
| `MINIO_BUCKET` | Target MinIO bucket name |

#### Authentication (Google OAuth2)
| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 Client Secret |

#### AI Services
| Variable | Description |
|---|---|
| `XAI_API_KEY` | xAI (Grok) API key — required for core functionality |
| `HUGGING_FACE_TOKEN` | Hugging Face API token |

#### Transcription Controls
| Variable | Description |
|---|---|
| `ENFORCE_TRANSCRIPT_TIME_LIMIT` | Enable time limits on Whisper transcription jobs |
| `ENFORCE_TRANSCRIPT_TIME_MAX` | Maximum allowed duration (in seconds) per transcription job |

#### Security
| Variable | Description |
|---|---|
| `ENABLE_USER_CHECKING` | Enables CSRF protection. **Must never be disabled in production.** |

---

## Running the Server

Once configuration is complete, start the application with:

```bash
npm start
```

The server will start on port `9090` by default, or on whichever `PORT` is specified in your `.env` file.

> **⚠️ HTTPS Warning:** Singularity enforces secure connections. Starting the server without a valid SSL configuration (`USE_NGINX_SSL=true`, or valid `SSL_CERT_PATH`/`SSL_KEY_PATH` with `ENABLE_HTTPS=true`) will produce severe warnings. **Never serve this application over unencrypted HTTP in a production environment.**

For development with live reloading, consider configuring `nodemon`:

```bash
npx nodemon server.js
```

---

## Security

Singularity is built with a security-first approach. The following measures are active by default:

- **CSRF Protection** — All state-mutating requests are protected by CSRF tokens. This is controlled by the `ENABLE_USER_CHECKING` flag and **must remain enabled in production at all times.**
- **Password Hashing** — All passwords are hashed using Argon2, the winner of the Password Hashing Competition, before being stored.
- **HTTP Header Hardening** — Helmet middleware sets secure HTTP response headers to mitigate common web vulnerabilities (XSS, clickjacking, etc.).
- **Secure Sessions** — Session cookies are automatically set to secure-only mode when running over HTTPS.
- **Abuse Prevention** — The `ENFORCE_TRANSCRIPT_TIME_LIMIT` and `ENFORCE_TRANSCRIPT_TIME_MAX` settings limit abuse of the Whisper transcription service.
- **WebAuthn / Passkeys** — Supports phishing-resistant, hardware-backed authentication as an alternative to passwords.

---

## Team

| Role | Name | Student ID |
|---|---|---|
| Developer | Leung Wai Chung | 13514988 |
| Developer | Wong Sin Ngai | 13588511 |
| Developer | Chow Cheuk Wai | 13506718 |
| Developer | Tong Sum Long | 13653626 |
| **Supervisor** | **Dr. Yishu Li** | — |

---

<div align="center">

*HKMU COMP S456F Final Year Project — Academic Year 2025/2026*

</div>
