# 🚀 Backend API - Attendance & Activity System

Backend REST API untuk sistem absensi, aktivitas, notifikasi, dan AI assistant. Dibangun dengan **Node.js + Express + TypeScript + MongoDB**, dengan arsitektur modular dan siap production.

---

# 🧱 Tech Stack

* **Runtime**: Node.js (Bun / Node 20+ compatible)
* **Framework**: Express 4
* **Language**: TypeScript
* **Database**: MongoDB + Mongoose
* **Auth**: JWT (Stateless)
* **Cloud Storage**: Cloudinary (signed upload)
* **Logging**: Custom Logger (Winston/Pino style)
* **AI Layer**: Orchestrator Service

---

# 📁 Project Structure

```
src/
├── controllers/       # Logic utama endpoint
├── routes/            # Routing layer (Express)
├── models/            # Mongoose schemas
├── middlewares/       # Auth, rate limit, validator
├── utils/             # Helper (time, geo, logger)
├── service/           # Business logic (AI, notif, dll)
├── config/            # Config (DB, Cloudinary)
└── types/             # Type definitions
```

---

# 🔐 Authentication

Menggunakan JWT:

```
Authorization: Bearer <token>
```

Middleware:

* `authMiddleware` → validasi token
* `roleMiddleware` → restrict akses berdasarkan role

---

# 👤 User Roles

* `admin`
* `super_admin`
* `cleaning_service`
* (custom sesuai WORK_ROLES)

---

# 📌 Core Features

## 1. 🔑 Auth

* Register
* Login
* Logout
* Update Profile

---

## 2. 👥 User Management (Admin)

* Create User
* Get All Users
* Get User Detail
* Update Status (active/inactive)
* Soft Delete User
* Dashboard Stats

---

## 3. 📍 Attendance

* Check-in (GPS + radius validation)
* Check-out
* Sick / izin attendance
* Attendance history (user & admin)
* Late detection + penalty

---

## 4. 📸 Activity

* Create activity dengan dokumentasi (foto)
* History aktivitas user
* Get all activities (admin)

---

## 5. 🔔 Notification

* Get my notifications
* Mark as read
* Mark all as read
* Delete notification
* Send notification (admin only)

---

## 6. 🤖 AI Chat

* Ask AI (guest / authenticated)
* Thread-based conversation
* Rate-limited endpoint

---

## 7. ☁️ Upload (Cloudinary)

* Signed upload via backend
* Folder restriction
* Secure signature generation

---

## 🔑 Auth

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
PATCH  /api/auth/me
```

---

## 👤 Users

```
GET    /api/users/dashboard
POST   /api/users            (admin)
GET    /api/users            (admin)
GET    /api/users/:id        (admin)
PATCH  /api/users/:id/status (admin)
DELETE /api/users/:id        (admin)
```

---

## 📍 Attendance

```
POST   /api/attendance/check-in
POST   /api/attendance/check-out
POST   /api/attendance/sick

GET    /api/attendance/me
GET    /api/attendance       (admin)
```

---

## 📸 Activity

```
POST   /api/activity
GET    /api/activity/me
GET    /api/activity         (admin)
```

---

## 🔔 Notification

```
GET    /api/notifications/me
PATCH  /api/notifications/me/read-all
PATCH  /api/notifications/:id/read
DELETE /api/notifications/:id
POST   /api/notifications/send (admin)
```

---

## 🤖 AI

```
GET    /api/chat/status
POST   /api/chat/ask
POST   /api/chat/ask/private
```

---

## ☁️ Upload

```
GET    /api/upload/signature
```

---

# 🧠 Key Concepts

## 📍 Geo Validation

* Menggunakan koordinat GPS
* Validasi radius lokasi kerja
* Menghitung jarak dengan helper (Haversine)

---

## ⏱️ Time Handling

* Semua waktu berbasis **Jakarta Time**
* Disimpan dalam UTC (database safe)

---

## 🧾 Attendance Logic

* 1 sesi aktif per user
* Auto close session > 18 jam
* Late detection + penalty system

---

## 🔄 Soft Delete

User tidak benar-benar dihapus:

```
status = "inactive"
isVerified = false
```

---

# 🚫 Rate Limiting

Custom in-memory limiter:

* Auth
* Attendance
* AI
* Notification
* Upload

⚠️ Note:
Production disarankan pakai Redis / Upstash

---

# 🚀 Running Project

## Install

```
bun install
```

## Dev

```
bun run dev
```

## Build

```
bun run build
```

## Start

```
bun start
```

---

# ⚠️ Known Considerations

* Rate limiter masih in-memory (tidak cocok untuk multi-instance)
* Beberapa endpoint masih bisa ditingkatkan validasinya
* Perlu indexing MongoDB untuk performa optimal

---

# 🔥 Future Improvements

* Redis-based rate limiter
* Real-time notification (WebSocket / FCM)
* AI streaming response (SSE)
* Audit log system
* Role-based permission (RBAC granular)
* File cleanup (orphan Cloudinary assets)

---

# 🧑‍💻 Author Notes

Backend ini didesain dengan pendekatan:

* modular
* scalable
* production-ready mindset

Fokus utama:

* keamanan (auth + validation)
* performa (query + structure)
* fleksibilitas (extensible architecture)

---

# 💥 License
