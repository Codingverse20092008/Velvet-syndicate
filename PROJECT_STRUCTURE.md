# Velvet Syndicate - Project Structure

## Overview
The project has been separated into **backend** and **frontend** folders for independent deployment.

---

## 📁 Folder Structure

```
d:\Velvet\
├── backend\                 # Express.js API Server
│   ├── server.ts           # Entry point
│   ├── src\
│   │   ├── routes\          # API Routes
│   │   │   ├── auth.ts     # Auth endpoints
│   │   │   ├── cart.ts     # Cart endpoints
│   │   │   ├── orders.ts   # Order endpoints
│   │   │   └── products.ts # Product endpoints
│   │   ├── services\       # Business Logic
│   │   │   ├── auth.service.ts
│   │   │   ├── cart.service.ts
│   │   │   ├── order.service.ts
│   │   │   └── product.service.ts
│   │   ├── lib\            # Utilities
│   │   │   ├── db.ts       # Database connection
│   │   │   ├── schema.ts   # Database schema
│   │   │   ├── auth.ts     # JWT utilities
│   │   │   ├── errors.ts   # Error handling
│   │   │   └── api-handler-express.ts
│   │   └── middleware\     # Express middleware
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend\               # Next.js 14 App
│   ├── app\                # App Router
│   │   ├── (auth)\         # Auth pages
│   │   ├── (shop)\        # Shop pages
│   │   ├── page.tsx        # Homepage
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components\         # React components
│   ├── store\              # Zustand stores
│   ├── lib\                # Frontend utilities
│   ├── public\             # Static assets
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── QA_TEST_REPORT.md       # QA Testing Report
```

---

## 🚀 How to Run

### Step 1: Install Dependencies

**Backend:**
```powershell
cd d:\Velvet\backend
npm install
```

**Frontend:**
```powershell
cd d:\Velvet\frontend
npm install
```

---

### Step 2: Run Backend Server

```powershell
cd d:\Velvet\backend
npm run dev
```

Backend runs on: http://localhost:3001

---

### Step 3: Run Frontend (New Terminal)

```powershell
cd d:\Velvet\frontend
npm run dev
```

Frontend runs on: http://localhost:3000

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/refresh` | PUT | Refresh JWT token |
| `/api/products` | GET | List products |
| `/api/products/:slug` | GET | Get single product |
| `/api/cart` | GET | Get user's cart |
| `/api/cart` | POST | Add item to cart |
| `/api/cart` | PATCH | Update cart item |
| `/api/cart` | DELETE | Remove cart item |
| `/api/orders` | GET | List user orders |
| `/api/orders` | POST | Create order |

---

## 🔗 Communication

- Frontend calls Backend API at `http://localhost:3001/api/*`
- Backend connects to Turso database
- CORS enabled for cross-origin requests

---

## ⚠️ Important Notes

1. **Install dependencies separately** for backend and frontend
2. **Start backend first** (port 3001), then frontend (port 3000)
3. **Environment variables** are set in `.env` (backend) and `.env.local` (frontend)
4. **Database** is shared via Turso (cloud SQLite)

---

## 🧪 Testing

Test backend directly:
```powershell
# Signup
curl -X POST http://localhost:3001/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@test.com","password":"password123"}'

# Get products
curl http://localhost:3001/api/products
```
