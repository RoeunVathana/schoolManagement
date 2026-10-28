# CampusFlow — Student Management / Learning Management System

CampusFlow is a full-stack student and learning management system. React communicates only with the NestJS REST API; NestJS communicates with PostgreSQL through Prisma. pgAdmin 4 is used as the database management GUI.

## Stack

- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT, Swagger and Multer
- Frontend: React, Vite, JavaScript, Axios, React Router, Tailwind CSS, React Hook Form and Recharts
- Database GUI: pgAdmin 4

## PostgreSQL and pgAdmin setup

PostgreSQL is the database server. pgAdmin is only the GUI used to inspect and manage it.

1. Open pgAdmin 4.
2. Connect to your PostgreSQL server.
3. Right-click **Databases** → **Create** → **Database**.
4. Set database name to `schoolManagement`, owner to `postgres`, then click **Save**.
5. Use this connection in `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:Nha1213@localhost:5432/schoolManagement?schema=public"
```

Host: `localhost` · Port: `5432` · Username: `postgres` · Password: `Nha1213` (the password currently accepted by the local PostgreSQL service)

## Local development

### Backend

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run start
```

The API runs at `http://localhost:3000` and Swagger is at `http://localhost:3000/api/docs`.

After migration, refresh pgAdmin and open **Databases → schoolManagement → Schemas → public → Tables**. Prisma creates `users`, `students`, `teachers`, `courses`, `enrollments`, `class_schedules`, `attendance`, `assignments`, `submissions`, `grades`, `exams`, `exam_results`, `announcements`, `notifications`, `refresh_tokens`, `registration_payments`, `academic_years` and `semesters`.

## Student registration payment with KHQR

Student registration supports a dynamic KHQR payment step. One KHQR can be scanned from Bakong or a participating bank application such as ABA. The backend stores the invoice and verifies the payment with Bakong before activating the student account.

Configure these values in `backend/.env` with your real merchant account and Bakong Open API token:

```env
REGISTRATION_PAYMENT_REQUIRED="true"
REGISTRATION_FEE="1.00"
REGISTRATION_CURRENCY="USD"
PAYMENT_QR_EXPIRES_MINUTES="10"
BAKONG_API_URL="https://api-bakong.nbc.gov.kh"
BAKONG_ACCESS_TOKEN="your_bakong_open_api_token"
BAKONG_ACCOUNT_ID="your_aba_or_bakong_account_id"
BAKONG_MERCHANT_NAME="CampusFlow"
BAKONG_MERCHANT_CITY="Phnom Penh"
```

The default is `REGISTRATION_PAYMENT_REQUIRED="false"` so local development continues to work until merchant credentials are configured. When enabled, students receive a QR after registration, the frontend checks payment status, and the backend activates the account only after the amount, currency, destination account and Bakong response match the invoice. Never mark a registration paid from a screenshot or frontend-only action.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. Copy `frontend/.env.example` to `frontend/.env` if the API is hosted somewhere else.

## Seed accounts

The seed creates an administrator, three teachers, ten students, five courses, enrollments, schedules, attendance, assignments, submissions, grades, exams, exam results and announcements.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `vothanarern@mail.com` | `016555637` |
| Teacher | `teacher@school.com` | `Teacher@2026#Strong` |
| Student | `student@school.com` | `Student@2026#Strong` |

Additional seeded teacher/student accounts use `teacher2@school.com`, `teacher3@school.com`, `student2@school.com` through `student10@school.com` with the same strong role passwords. The administrator account is not available through public registration; students and teachers must use their separate role-specific login pages.

Students and teachers can also create their own accounts from the **Register as a student or teacher** link on the login page. The API creates the matching student or teacher profile automatically. Administrators can open **Users & permissions** and toggle create, edit and delete access for each non-admin account. The dashboard includes persistent light/dark theme and English/Khmer language preferences. The selected language is stored in `users.language` through `PATCH /auth/profile`, restored after login, and applied to the shared navigation, dashboard headers and loading states.

Administrators can manage schedules, attendance, announcements and enrollments directly from their sidebar pages with add, edit and delete actions. Courses support PNG, JPG, JPEG and WEBP cover images up to 5 MB; images are stored in `backend/uploads/courses/` and served through `/uploads/courses/...`. Teachers can attach one PDF up to 100 MB or one image (PNG, JPG, JPEG or WEBP) up to 50 MB to each assignment; assignment files are stored in `backend/uploads/assignments/` and served through `/uploads/assignments/...`.

Announcements are role-aware. Administrators can view all announcements and their new announcements notify active teachers and students. Teachers see administrator announcements and their own announcements; teacher announcements notify students enrolled in the selected course, or all active students for a school-wide announcement. The navbar polls notifications, shows an unread count, and supports marking one or all notifications as read.

CRUD access is role-aware: administrators have full access, teachers can create/edit/delete their assigned learning records when their permissions are enabled, and students can create/edit/delete their own homework submissions when their permissions are enabled. Profile updates are available to every authenticated account.

## Docker (optional)

Docker is not required for local development. The recommended setup uses your locally installed PostgreSQL service and pgAdmin 4. Only use Docker Compose if you specifically want containerized services:

```powershell
docker compose up --build
```

The Compose PostgreSQL service is available on port `5432`, the API on `3000`, and the frontend on `5173`. For the requested pgAdmin workflow, connect pgAdmin to `localhost:5432` with database `schoolManagement`, user `postgres`, and the password configured in your local PostgreSQL service.

## API notes

All API responses use `{ success, message, data }`; errors use `{ success: false, message, statusCode }`. Access tokens are short-lived JWTs and refresh tokens are stored hashed in PostgreSQL. Protected endpoints use JWT authentication and role-based access control. Student homework submissions support PDF, DOC/DOCX, TXT, Excel, PowerPoint, ZIP and image files in `backend/uploads/homework/`; PDFs and documents can be up to 100 MB, while images can be up to 50 MB.
