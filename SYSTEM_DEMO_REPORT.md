# CampusFlow LMS — System and Demo Report

**Report date:** 31 October 2026  
**System:** CampusFlow LMS / School Management System

## 1. Current live status

| Component | Live address | Result |
|---|---|---|
| Frontend custom domain | https://campusflowlms.xyz | HTTP 200; SSL active |
| Frontend Railway origin | https://frontend-production-85134.up.railway.app | HTTP 200 |
| Backend API | https://schoolmanagement-production-d78b.up.railway.app | Health HTTP 200 |
| Course catalog | `/storefront/courses` | HTTP 200; 2 courses available |
| Frontend JavaScript asset | `/assets/index-D27Ggyei.js` | HTTP 200 |
| Deployment | Railway with campusflowlms.xyz | Online and responding |

The custom root domain `https://campusflowlms.xyz` is the recommended demo URL. The Railway URL is the service origin used for deployment checks. The `www` hostname should be added separately in Porkbun/Railway if a fully secure `https://www.campusflowlms.xyz` address is required.

The frontend and backend are connected and working remotely.

## 2. What the system does

CampusFlow combines a learning management system with a student community:

- Student, teacher, customer and administrator accounts
- Email/password login and Google sign-in for supported roles
- Course catalog, course details and protected course access
- Real Bakong/KHQR course payments and registration payments
- Payment verification by invoice amount, currency and transaction result
- Student dashboard, assignments, homework submissions, grades, exams and certificates
- Teacher courses, schedules, attendance, assignments, submissions and announcements
- Administrator users, permissions, students, teachers, courses, enrollments and reports
- Community posts, image/video media, stories, friends, groups and chat
- English and Khmer language support, light/dark theme and notifications
- Telegram payment notifications when the Railway Telegram settings are configured

## 3. Technology

- **Frontend:** React, Vite, React Router, Axios and Firebase Authentication
- **Backend:** NestJS, TypeScript, JWT and role-based permissions
- **Database:** PostgreSQL through Prisma ORM
- **Payments:** Bakong Open API and dynamic KHQR
- **Hosting:** Railway with HTTPS
- **Media:** local uploads or Firebase Storage, depending on production configuration

## 4. Simple demo steps

### Public visitor demo

1. Open https://campusflowlms.xyz.
2. Show the home page and course catalog.
3. Open `/courses` and select a course.
4. Open `/community` to show public posts and community members.

### Student demo

1. Open `/login/student`.
2. Sign in with the private demo student account or Google sign-in.
3. Open **Student → Courses**.
4. Select a course and choose **Buy course**.
5. Show the generated KHQR and invoice amount.
6. For a real payment demonstration, scan with ABA/Bakong, confirm the amount, and wait for verification.
7. After successful verification, open the course and show assignments, schedule and learning progress.

Do not transfer real money during a presentation unless the owner explicitly wants a live payment demonstration.

### Teacher demo

1. Open `/login/teacher`.
2. Show the teacher dashboard and assigned courses.
3. Open attendance, assignments, submissions, grades, schedule and announcements.
4. Create or edit a demonstration record only in a demo environment.

### Administrator demo

1. Open `/login/admin`.
2. Show students, teachers, courses, users and permissions.
3. Show enrollment, schedule, attendance, announcements and certificate tools.
4. Show Telegram and system settings without displaying tokens or passwords.

## 5. Security and payment checks

The live checks confirmed:

- Frontend and backend use HTTPS.
- Frontend security headers include CSP, HSTS and `X-Frame-Options: DENY`.
- Backend security headers include `X-Frame-Options: DENY` and a restrictive Permissions Policy.
- Unauthenticated course checkout is rejected with HTTP 401.
- Unauthenticated course-payment access is rejected with HTTP 401.
- Unknown payment tokens return HTTP 404.
- Payment confirmation is performed by the backend; a frontend screenshot cannot mark a payment as paid.
- Authentication, rate limiting, CORS, request validation and role permissions are enabled.

## 6. Important demo safety rules

- Never put passwords, JWT secrets, Firebase private keys, database passwords, Bakong tokens or Telegram bot tokens in slides or screenshots.
- Use separate demo accounts and a separate demo database when possible.
- Use a real payment only when the displayed recipient and amount have been checked.
- Do not run database seed commands on the production database.
- Keep Railway, Firebase, GitHub, email and domain accounts protected with 2FA.

## 7. Overall result

**Ready for a normal product demonstration.** The public frontend, backend API, course catalog and security controls are online. A complete paid-course test still requires a signed-in student session and, for a real end-to-end result, a user-controlled ABA/Bakong confirmation.
