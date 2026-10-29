# CampusFlow — Student Management / Learning Management System

CampusFlow is a full-stack student and learning management system. React communicates only with the NestJS REST API; NestJS communicates with PostgreSQL through Prisma. pgAdmin 4 is used as the database management GUI.

## Stack

- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT, Firebase Admin, Swagger and Multer
- Frontend: React, Vite, JavaScript, Axios, Firebase Authentication, React Router, Tailwind CSS, React Hook Form and Recharts
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

### Administrator password recovery

Administrator accounts cannot be registered publicly. If the administrator forgets the password, open `http://localhost:5173/login/admin`, select **Forgot administrator password?**, and complete the email OTP flow. The code is single-use, expires after 10 minutes, allows up to five attempts, and all existing administrator refresh sessions are revoked after a successful reset.

Configure an SMTP mailbox in `backend/.env` before requesting a code:

```env
MAIL_HOST="smtp.gmail.com"
MAIL_PORT="587"
MAIL_SECURE="false"
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-gmail-app-password"
MAIL_FROM="CampusFlow <your-email@gmail.com>"
PASSWORD_RESET_OTP_EXPIRES_MINUTES="10"
```

For Gmail, use a Google App Password with two-step verification enabled; do not use the normal Gmail password. Restart the backend after changing these values. The OTP is never returned by the API and is never stored in plaintext.

The database migration creates the `password_reset_otps` table automatically:

```powershell
cd backend
npx prisma migrate dev --name add_admin_password_reset_otp
npx prisma generate
```

After migration, refresh pgAdmin and open **Databases → schoolManagement → Schemas → public → Tables**. Prisma creates `users`, `students`, `teachers`, `courses`, `enrollments`, `course_payments`, `class_schedules`, `attendance`, `assignments`, `submissions`, `grades`, `exams`, `exam_results`, `announcements`, `notifications`, `refresh_tokens`, `registration_payments`, `academic_years` and `semesters`.

## Student registration payment with KHQR

Student registration supports a dynamic KHQR payment step. One KHQR can be scanned from Bakong or a participating bank application such as ABA. The backend stores the invoice and verifies the payment with Bakong before activating the student account.

Configure these values in `backend/.env` with your real merchant account and Bakong Open API token:

```env
REGISTRATION_PAYMENT_REQUIRED="true"
REGISTRATION_FEE="1.00"
REGISTRATION_CURRENCY="USD"
PAYMENT_QR_EXPIRES_MINUTES="10"
BAKONG_API_URL="https://api-bakong.nbc.gov.kh"
BAKONG_API_ENABLED="true"
BAKONG_API_TOKEN="your_bakong_open_api_token"
BAKONG_ACCOUNT_ID="your_aba_or_bakong_account_id"
MERCHANT_NAME="CampusFlow"
MERCHANT_CITY="Phnom Penh"
MERCHANT_PHONE="85512345678"
STORE_LABEL="CampusFlow"
```

The default is `REGISTRATION_PAYMENT_REQUIRED="false"` so local development continues to work until merchant credentials are configured. When enabled, students receive a QR after registration, the frontend checks payment status, and the backend activates the account only after the amount, currency, destination account and Bakong response match the invoice. Never mark a registration paid from a screenshot or frontend-only action.

## Student course purchase with Bakong KHQR

Students can browse all active courses at `http://localhost:5173/student/courses`. A course is marked **Not purchased** until it has an active enrollment. Selecting **Buy course** creates a course invoice using the course price/currency, displays a dynamic KHQR, and accepts payment from Bakong or ABA. The backend calls Bakong Open API `POST /v1/check_transaction_by_md5`, verifies the invoice amount, currency and destination account, and only then creates the active enrollment. Assignments, schedules, exams and submissions are filtered to active enrollments, so students cannot bypass payment by calling the REST API directly.

Course prices default to `1.00 USD` for existing courses. Administrators can set the course `price` and `currency` through the course API/database before publishing a paid course. Do not expose `BAKONG_API_TOKEN` in frontend code or commit the real token to source control.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. Copy `frontend/.env.example` to `frontend/.env` if the API is hosted somewhere else.

## Google sign-in with Firebase

Google sign-in is available for student and teacher accounts. The administrator account remains password-managed and cannot be created or accessed through Google sign-in.

1. Open the Firebase Console for project `midterm-fe002`.
2. Open **Authentication** → **Sign-in method**.
3. Enable the **Google** provider and save it.
4. In **Authentication** → **Settings** → **Authorized domains**, confirm `localhost` is listed for local development.
5. The supplied Firebase web configuration is already included in `frontend/src/config/firebase.js`. You can override it with the variables in `frontend/.env.example`.
6. Restart both servers after changing environment variables.

The React client signs in with Google and sends the Firebase ID token to `POST /auth/google`. NestJS verifies that token with Firebase Admin before issuing the application's normal access and refresh JWTs. On the first Google sign-in, the backend creates the matching student or teacher profile and stores the Firebase UID in `users.firebaseUid`; later sign-ins reuse that account.

For local verification, `backend/.env` contains `FIREBASE_PROJECT_ID="midterm-fe002"`. If Firebase Admin reports a credential error on your machine, open Firebase Console → **Project settings** → **Service accounts**, generate a private key, and set these backend variables without committing them:

```env
FIREBASE_PROJECT_ID="midterm-fe002"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@midterm-fe002.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

The backend endpoint expects `{ "idToken": "...", "role": "STUDENT" }` or `{ "idToken": "...", "role": "TEACHER" }`. Never send Firebase tokens directly to PostgreSQL or store them in the database.

## Seed accounts

The seed creates an administrator, three teachers, ten students, five courses, enrollments, schedules, attendance, assignments, submissions, grades, exams, exam results and announcements.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `mouychheak3227@gmail.com` | `016555637` |
| Teacher | `teacher@school.com` | `Teacher@2026#Strong` |
| Student | `student@school.com` | `Student@2026#Strong` |

Additional seeded teacher/student accounts use `teacher2@school.com`, `teacher3@school.com`, `student2@school.com` through `student10@school.com` with the same strong role passwords. The administrator account is not available through public registration; students and teachers must use their separate role-specific login pages.

Students and teachers can also create their own accounts from the **Register as a student or teacher** link on the login page. The API creates the matching student or teacher profile automatically. Administrators can open **Users & permissions** and toggle create, edit and delete access for each non-admin account. The dashboard includes persistent light/dark theme and English/Khmer language preferences. The selected language is stored in `users.language` through `PATCH /auth/profile`, restored after login, and applied to the shared navigation, dashboard headers and loading states.

Administrators can manage schedules, attendance, announcements and enrollments directly from their sidebar pages with add, edit and delete actions. Courses and profile images support PNG, JPG, JPEG and WEBP files up to 50 MB; course images are stored in `backend/uploads/courses/`, profile images are stored in `backend/uploads/profiles/`, and both are served through `/uploads/...`. Teachers can attach one PDF up to 100 MB or one image (PNG, JPG, JPEG or WEBP) up to 50 MB to each assignment; assignment files are stored in `backend/uploads/assignments/` and served through `/uploads/assignments/...`.

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
