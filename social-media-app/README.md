# Circle Up — Social Media Platform

**Circle Up** is a full-stack social media platform built with a microservice architecture. Users can register, log in, follow others, create image/video posts, browse a paginated feed, watch short reels, and chat with followers in real time.

---

## Table of Contents

1. [Repository Structure](#repository-structure)
2. [High-Level Architecture](#high-level-architecture)
3. [Microservices Overview](#microservices-overview)
4. [User Service (port 8057)](#1-user-service-port-8057)
5. [Chat Microservice (port 8086)](#2-chat-microservice-port-8086)
6. [Post / Media Service (port 8090)](#3-post--media-service-port-8090)
7. [Legacy Registration Service — circleup-backend](#4-legacy-registration-service--circleup-backend)
8. [Frontend — React + Vite](#5-frontend--react--vite)
9. [Authentication & Session Flow](#authentication--session-flow)
10. [API Reference](#api-reference)
11. [Data Models](#data-models)
12. [Technology Stack](#technology-stack)
13. [Getting Started](#getting-started)

---

## Repository Structure

```
SOCIAL-MEDIA-PLATFORM/
├── social-media-app/          # React + Vite frontend (this folder)
├── socappback/
│   ├── microservice/          # Chat Microservice  (Spring Boot, MongoDB, WebSocket)
│   ├── circleup-backend/      # Legacy user-registration service (Spring Boot, MySQL)
│   ├── backend/               # (empty — placeholder)
│   └── hi/                    # (scratch / module-info stub)
├── chat-service/              # (empty — placeholder)
└── post-service/              # (empty — placeholder)
```

> **Note:** The **User Service** (port 8057) and the **Post/Media Service** (port 8090) are called by the frontend but their source code is not committed to this repository. Their APIs are fully documented below, inferred from frontend usage.

---

## High-Level Architecture

```mermaid
graph TD
    Browser["🌐 Browser\nReact + Vite\nlocalhost:5173"]

    subgraph Backend Services
        US["User Service\nSpring Boot\n:8057"]
        CS["Chat Microservice\nSpring Boot\n:8086"]
        PS["Post/Media Service\nSpring Boot\n:8090"]
    end

    subgraph Databases
        MySQL[(MySQL\nprojecttable)]
        MongoDB1[(MongoDB Atlas\nchatdb)]
        MongoDB2[(MongoDB Atlas\npostsdb)]
    end

    Cloud["☁️ Cloudinary\nImage & Video CDN"]

    Browser -->|REST + JWT| US
    Browser -->|REST + JWT| CS
    Browser -->|WebSocket /ws| CS
    Browser -->|REST + JWT| PS
    Browser -->|Multipart Upload| Cloud

    US --> MySQL
    CS --> MongoDB1
    PS --> MongoDB2
    PS -->|Image URL stored| Cloud
```

---

## Microservices Overview

| Service | Port | Language | Database | Key Responsibility |
|---|---|---|---|---|
| User Service | 8057 | Java / Spring Boot | MySQL | Auth, JWT, profile, follow/unfollow, search, email change |
| Chat Microservice | 8086 | Java / Spring Boot | MongoDB Atlas | Real-time messaging (WebSocket + REST history) |
| Post / Media Service | 8090 | Java / Spring Boot | MongoDB Atlas | Create posts & reels, feed, likes, comments |
| circleup-backend *(legacy)* | 8090 | Java / Spring Boot | MySQL | Basic user registration (early prototype) |

---

## 1. User Service (port 8057)

The central identity and social-graph service. Source code is not in this repository but all endpoints are inferred from the frontend.

### Architecture

```mermaid
flowchart LR
    FE["Frontend\n(React)"]
    UC["UserController\n/users/**"]
    US["UserService"]
    JwtUtil["JWT Utility\n(sign / validate)"]
    Mail["Spring Mail\n(Gmail SMTP)"]
    DB[(MySQL)]
    CDN["Cloudinary"]

    FE -->|Bearer token| UC
    UC --> US
    US --> DB
    US --> JwtUtil
    US --> Mail
    FE -->|Upload image| CDN
    CDN -->|secure_url| FE
    FE -->|POST profilePic URL| UC
```

### Responsibilities

- **Registration & Login** — stores hashed passwords; issues signed JWT on login
- **JWT** — token payload contains `email`, `fullName`, `profilePic`; stored in a browser cookie (`userSession`, 1-day expiry)
- **Follow / Unfollow** — maintains bidirectional follower / following lists
- **User Search** — search by full name or email; returns list with profile details
- **Profile Updates** — change display name, update profile picture URL (after Cloudinary upload)
- **Email Change Flow** — sends confirmation email with signed token; user approves / rejects via `/updateemail` page
- **Password Recovery** — sends reset link to registered email

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/signup` | None | Register a new account |
| POST | `/users/login` | None | Login; returns `200::<jwt>` |
| GET | `/users/getfullname` | Bearer | Get logged-in user's full name |
| GET | `/users/getfollowers` | Bearer | JSON array of follower objects |
| GET | `/users/getfollowing` | Bearer | JSON array of following objects |
| POST | `/users/follow` | Bearer | Follow another user by `targetEmail` |
| GET | `/users/search/{query}` | Bearer | Search users by name or email |
| GET | `/users/forgetpassword/{email}` | None | Send password-reset email |
| POST | `/users/updateprofilepic` | Bearer | Update profile picture URL |
| POST | `/users/updatefullname` | Bearer | Update display name |
| POST | `/users/request-email-change` | Bearer | Send confirmation to `newEmail` |
| GET | `/users/confirm-email-change?token=` | None | Approve email change |
| POST | `/users/cancel-email-change` | None | Cancel email change |

### Response Format

All responses follow the pattern `<status_code>::<message_or_data>`, e.g.:

```
200::Registration done successfully
401::email id already exists
200::<jwt_token>
```

---

## 2. Chat Microservice (port 8086)

Source: `socappback/microservice/`

### Architecture

```mermaid
flowchart TB
    FE["React Chat UI"]

    subgraph Chat Microservice [:8086]
        SEC["Spring Security\nJWT Filter"]
        CC["ChatController\n/api/chat/**"]
        WSC["WebSocketConfig\n/ws"]
        WH["ChatWebSocketHandler"]
        CS2["ChatService"]
        JWTSvc["JwtService"]
        MR["MessageRepository"]
        UR["UserRepository"]
    end

    MongoDB2[(MongoDB Atlas\nchatdb)]

    FE -->|"POST /api/chat/sync-user\nGET /api/chat/messages/**"| SEC
    FE -->|"WS /ws?token=Bearer..."| WSC
    SEC -->|validates Bearer| JWTSvc
    SEC --> CC
    CC --> CS2
    WSC --> WH
    WH -->|"save message"| CS2
    WH -->|"push to recipient session"| FE
    CS2 --> MR
    CS2 --> UR
    MR --> MongoDB2
    UR --> MongoDB2
```

### Internal Components

| Class | Package | Role |
|---|---|---|
| `MicroserviceApplication` | `com.chat.microservice` | Spring Boot entry point |
| `SecurityConfig` | `config` | Stateless JWT filter chain; `/ws/**` is open |
| `JwtAuthenticationFilter` | `config` | Reads `Authorization: Bearer` header, sets `SecurityContext` |
| `JwtHandshakeInterceptor` | `config` | Validates JWT during WebSocket handshake; injects `email` attribute |
| `WebSocketConfig` | `config` | Registers `/ws` endpoint; allowed origin `localhost:5173` |
| `ChatController` | `controller` | REST: sync-user, fetch message history |
| `ChatWebSocketHandler` | `websocket` | In-memory session map; fan-out to recipient on message receipt |
| `ChatService` | `service` | Business logic: sync user, query/save messages |
| `JwtService` | `service` | Parses HMAC-signed JWT; returns email as subject |
| `Message` | `model` | MongoDB document — sender, receiver, content, timestamp, read |
| `User` | `model` | MongoDB document — email, fullName, profilePic, followers, following |
| `MessageRepository` | `repository` | Spring Data MongoDB — bidirectional conversation query |
| `UserRepository` | `repository` | Spring Data MongoDB — find by email |

### WebSocket Session Flow

```mermaid
sequenceDiagram
    participant Alice as Alice (Browser)
    participant WS as WebSocketHandler
    participant DB as MongoDB

    Alice->>WS: Connect /ws (JWT in header)
    WS->>WS: Validate JWT → extract email
    WS->>WS: sessions.put("alice@x.com", session)

    Alice->>WS: TextMessage {receiverEmail, content}
    WS->>DB: save(message)
    WS->>WS: sessions.get("bob@x.com")
    WS-->>Bob: TextMessage (if online)
    WS-->>Alice: Echo message back

    Alice->>WS: Disconnect
    WS->>WS: sessions.remove("alice@x.com")
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/chat/sync-user` | Bearer | Upsert user data (name, pic, followers, following) into chatdb |
| GET | `/api/chat/messages/{userEmail}/{otherEmail}` | Bearer | Retrieve full conversation history between two users |
| WS | `/ws` | Bearer (header) | Persistent WebSocket for real-time message delivery |

### Configuration (`application.properties`)

```properties
server.port=8086
spring.data.mongodb.uri=mongodb+srv://...@cluster0.okbkntf.mongodb.net/
spring.data.mongodb.database=chatdb
jwt.secret=<shared-secret-matching-user-service>
```

---

## 3. Post / Media Service (port 8090)

Source code is not committed to this repository. APIs are inferred from frontend (`Post.jsx`, `Home.jsx`, `Reels.jsx`).

### Architecture

```mermaid
flowchart LR
    FE["React UI"]
    CDN["☁️ Cloudinary"]
    PS["Post/Media Service\n:8090"]
    DB[(MongoDB Atlas\npostsdb)]

    FE -->|Image → Cloudinary preset 'sample'| CDN
    CDN -->|secure_url| FE
    FE -->|"POST /api/posts\n{postType, name, description, url}"| PS
    FE -->|"GET /api/home-posts?skip=n"| PS
    FE -->|"POST /api/posts/{id}/like"| PS
    FE -->|"POST /api/posts/{id}/comment"| PS
    FE -->|"GET /api/reels"| PS
    PS --> DB
```

### Post Types

| `postType` | Upload method | Where stored |
|---|---|---|
| `image` | Frontend uploads to Cloudinary first; URL passed to service | Cloudinary CDN |
| `video` (reel) | Multipart `file` streamed directly to service | Service-managed storage |

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/posts` | Bearer | Create a post; body is `multipart/form-data` with `postData` JSON + optional `file` |
| GET | `/api/posts` | Bearer | List the authenticated user's posts |
| GET | `/api/posts/{id}` | Bearer | Get a single post or reel by ID |
| GET | `/api/home-posts?skip={n}` | Bearer | Paginated home feed (5 per page, images only) |
| POST | `/api/posts/{id}/like` | Bearer | Toggle like on a post |
| POST | `/api/posts/{id}/comment` | Bearer | Add comment `{text}` to a post |
| GET | `/api/reels` | Bearer | Get all video reels |

### Post Document Structure (inferred)

```json
{
  "_id": "...",
  "userEmail": "alice@example.com",
  "postType": "image",
  "name": "Sunset",
  "description": "Beautiful evening",
  "url": "https://res.cloudinary.com/...",
  "likes": ["bob@example.com"],
  "comments": [
    { "userEmail": "bob@example.com", "text": "Amazing!" }
  ]
}
```

---

## 4. Legacy Registration Service — circleup-backend

Source: `socappback/circleup-backend/`

This is an early prototype of the user service. It provides only basic user registration backed by MySQL and has since been superseded by the full User Service.

### Architecture

```mermaid
flowchart LR
    FE["Frontend"]
    UC["UserController\n/users/signup"]
    USvc["UserService"]
    UR["UserRepository\n(JPA)"]
    MySQL[(MySQL\nprojecttable\ntable: userst)]

    FE -->|POST /users/signup| UC
    UC --> USvc
    USvc -->|validateEmail + save| UR
    UR --> MySQL
```

### Components

| Class | Role |
|---|---|
| `CircleupBackendApplication` | Spring Boot entry point |
| `UserController` | Exposes `POST /users/signup` |
| `UserService` | Checks for duplicate email; saves new user |
| `UserRepository` | JPA repository with custom email-validation query |
| `User` | JPA entity — `fullname`, `email` (PK), `password` |

### Configuration

```properties
server.port=8090
spring.datasource.url=jdbc:mysql://localhost:3306/projecttable
spring.jpa.hibernate.ddl-auto=update
```

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/users/signup` | None | Register; returns `200::Registration done successfully` or `401::email id already exists` |

---

## 5. Frontend — React + Vite

Source: `social-media-app/`

### Component Tree

```mermaid
graph TD
    main["main.jsx\n(BrowserRouter)"]
    App["App.jsx\n/ — Landing page"]
    Dashboard["Dashboard.jsx\n/dashboard"]
    MailChange["MailChange.jsx\n/updateemail"]
    ReelsPage["Reels.jsx\n/reel/:id"]
    PostPage["Home.jsx\n/post/:id"]

    Home["Home.jsx\nFeed"]
    Search["Search.jsx\nDiscover users"]
    Chat["Chat.jsx\nMessaging"]
    Reels2["Reels.jsx\nShort videos"]
    Profile["Profile.jsx\nUser profile"]

    Post["Post.jsx\nCreate post"]
    UserPost["UserPost.jsx\nMy posts grid"]
    Settings["Settings.jsx\nAccount settings"]

    main --> App
    main --> Dashboard
    main --> MailChange
    main --> ReelsPage
    main --> PostPage

    Dashboard --> Home
    Dashboard --> Search
    Dashboard --> Chat
    Dashboard --> Reels2
    Dashboard --> Profile

    Profile --> Post
    Profile --> UserPost
    Profile --> Settings
```

### Page / Component Details

| Component | Route / Location | Description |
|---|---|---|
| `App.jsx` | `/` | Landing page with background video, login and signup modals |
| `Dashboard.jsx` | `/dashboard` | Authenticated shell: top bar, side navigation, content outlet |
| `Home.jsx` | `/dashboard` → Home tab, `/post/:id` | Paginated image feed; like, comment, share (copy link) |
| `Search.jsx` | `/dashboard` → Search tab | Debounced user search (500 ms); follow button |
| `Chat.jsx` | `/dashboard` → Chat tab | List followers; open real-time chat; WebSocket via `socket.io-client` |
| `Reels.jsx` | `/dashboard` → Reels tab, `/reel/:id` | Video reel player with play/pause, mute, like, comment |
| `Profile.jsx` | `/dashboard` → Profile tab | Tabs: Posts, Followers, Settings |
| `Post.jsx` | Inside Profile → Posts tab | Create image or video post; images uploaded to Cloudinary |
| `UserPost.jsx` | Inside Profile → Posts tab | Grid of logged-in user's own posts |
| `Settings.jsx` | Inside Profile → Settings tab | Update profile pic, full name, change email |
| `MailChange.jsx` | `/updateemail?token=` | Email-change confirmation page (approve / reject) |

### Routing

```mermaid
flowchart LR
    Root["/"] --> App
    Dashboard_Route["/dashboard"] --> Dashboard_Comp["Dashboard\n(renders active tab)"]
    Reel_Route["/reel/:id"] --> Reels_Comp["Reels (single reel)"]
    UpdateEmail_Route["/updateemail"] --> MailChange_Comp["MailChange"]
    Post_Route["/post/:id"] --> Home_Comp["Home (single post)"]
```

### State & API Layer (`api.js`)

```js
BaseUrl     = "http://localhost:8057/"   // User Service
BaseChatUrl = "http://localhost:8086/"   // Chat Microservice
BasePostUrl = "http://localhost:8090/"   // Post / Media Service
```

| Utility | Purpose |
|---|---|
| `callApi(method, url, data, handler, headers)` | Generic `fetch` wrapper; parses response as text |
| `setSession(name, value, days)` | Writes a secure cookie with expiry |
| `getSession(name)` | Reads a cookie value by name |

### Authentication in the Frontend

```mermaid
sequenceDiagram
    participant User
    participant React
    participant UserSvc as User Service :8057

    User->>React: Enter email + password → Login
    React->>UserSvc: POST /users/login
    UserSvc-->>React: 200::<jwt_token>
    React->>React: setSession("userSession", jwt, 1)
    React->>React: Redirect to /dashboard

    Note over React: On every API call:
    React->>React: getSession("userSession") → token
    React->>UserSvc: GET /users/getfullname\nAuthorization: Bearer <token>
```

---

## Authentication & Session Flow

```mermaid
sequenceDiagram
    participant Browser
    participant UserSvc as User Service :8057
    participant ChatSvc as Chat Service :8086
    participant PostSvc as Post Service :8090

    Browser->>UserSvc: POST /users/login {email, password}
    UserSvc-->>Browser: 200::<signed_JWT>
    Browser->>Browser: Store JWT in cookie "userSession"

    Browser->>PostSvc: GET /api/home-posts\nAuthorization: Bearer <JWT>
    PostSvc-->>Browser: [] posts JSON

    Browser->>ChatSvc: WebSocket /ws\nAuthorization: Bearer <JWT>
    ChatSvc->>ChatSvc: JwtHandshakeInterceptor validates token
    ChatSvc-->>Browser: Connection accepted
    Browser->>ChatSvc: TextMessage {receiverEmail, content}
    ChatSvc-->>Browser: Echo + deliver to recipient
```

**JWT Payload** (claims embedded by User Service):

```json
{
  "sub": "alice@example.com",
  "email": "alice@example.com",
  "fullName": "Alice Smith",
  "profilePic": "https://res.cloudinary.com/..."
}
```

The Chat Service and Post Service both validate the same JWT using the shared `jwt.secret`. The Chat Service additionally stores a trimmed user snapshot in MongoDB (via `POST /api/chat/sync-user`) so it can display names and avatars inside chat without calling the User Service.

---

## API Reference

### Complete Endpoint Summary

```mermaid
graph LR
    subgraph "User Service :8057"
        U1[POST /users/signup]
        U2[POST /users/login]
        U3[GET /users/getfullname]
        U4[GET /users/getfollowers]
        U5[GET /users/getfollowing]
        U6[POST /users/follow]
        U7[GET /users/search/:query]
        U8[GET /users/forgetpassword/:email]
        U9[POST /users/updateprofilepic]
        U10[POST /users/updatefullname]
        U11[POST /users/request-email-change]
        U12[GET /users/confirm-email-change]
        U13[POST /users/cancel-email-change]
    end

    subgraph "Chat Microservice :8086"
        C1[POST /api/chat/sync-user]
        C2[GET /api/chat/messages/:user/:other]
        C3[WS /ws]
    end

    subgraph "Post/Media Service :8090"
        P1[POST /api/posts]
        P2[GET /api/posts]
        P3[GET /api/posts/:id]
        P4[GET /api/home-posts]
        P5[POST /api/posts/:id/like]
        P6[POST /api/posts/:id/comment]
        P7[GET /api/reels]
    end
```

---

## Data Models

### Chat Microservice — MongoDB

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string fullName
        string profilePic
        UserReference[] followers
        UserReference[] following
        Date createdAt
    }
    MESSAGE {
        string id PK
        string senderEmail
        string receiverEmail
        string content
        Date timestamp
        boolean read
    }
    USER_REFERENCE {
        string email
        string fullName
    }
    USER ||--o{ USER_REFERENCE : "followers / following"
```

### circleup-backend — MySQL

```mermaid
erDiagram
    USERST {
        string email PK "E-mail Id"
        string fullname "Full Name"
        string password "Password"
    }
```

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React | 19.x |
| **Frontend bundler** | Vite + SWC plugin | 6.x |
| **Frontend routing** | React Router DOM | 7.x |
| **HTTP client** | Fetch API / Axios | — / 1.8 |
| **WebSocket client** | socket.io-client | 4.8 |
| **Utility** | lodash (debounce) | 4.17 |
| **Backend framework** | Spring Boot | 3.4.x |
| **Java version** | Java 17 (Chat), Java 21 (legacy) | — |
| **Build tool** | Maven | — |
| **Chat DB** | MongoDB Atlas | — |
| **Legacy user DB** | MySQL 8 | — |
| **JWT library** | JJWT (jjwt-api) | 0.12.6 |
| **Security** | Spring Security | 6.x |
| **Boilerplate** | Lombok | — |
| **Media CDN** | Cloudinary | cloud: `dyrotsqsv` |

---

## Getting Started

### Prerequisites

- Node.js 18+, npm
- Java 17+ and Maven
- MongoDB Atlas account (or local MongoDB)
- MySQL 8 (for circleup-backend)
- Cloudinary account (upload preset `sample`)

### 1. Frontend

```bash
cd social-media-app
npm install
npm run dev        # http://localhost:5173
```

### 2. Chat Microservice

```bash
cd socappback/microservice
# Edit src/main/resources/application.properties:
#   spring.data.mongodb.uri=<your-atlas-uri>
#   jwt.secret=<shared-secret>
./mvnw spring-boot:run   # http://localhost:8086
```

### 3. Legacy Registration Service (optional)

```bash
cd socappback/circleup-backend
# Edit src/main/resources/application.properties:
#   spring.datasource.url=jdbc:mysql://localhost:3306/projecttable
#   spring.datasource.username=root
#   spring.datasource.password=<your-password>
./mvnw spring-boot:run   # http://localhost:8090
```

### 4. User Service & Post Service

These services are not yet committed to the repository. Ensure both are running at `localhost:8057` and `localhost:8090` respectively before using the full application.

### Environment Summary

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| User Service | http://localhost:8057 |
| Chat Microservice | http://localhost:8086 |
| Post / Media Service | http://localhost:8090 |
