# CampusFlow LMS — Easy Tester Guide

Use this guide to test the main user journeys without needing to understand the source code.

## Test environment

| Item | Value |
| --- | --- |
| Production website | https://campusflowlms.xyz |
| API health check | https://schoolmanagement-production-d78b.up.railway.app/health |
| Current release | `2c879ea` |
| Supported browsers | Chrome, Edge, Brave, Firefox |
| Languages | English and Khmer |

Use the test accounts supplied by the project owner. Never write real passwords, OTPs, payment tokens, or private user data in a test report.

## How to test

1. Open the production website in a private/incognito window.
2. Complete each test below in order.
3. After each save, upload, payment, or comment action, refresh once and confirm the data remains.
4. Record the test ID, result, browser, time, and a screenshot if something fails.
5. Check the browser console only when investigating a failure; normal users should not see technical errors.

## Quick smoke test

| ID | Test | Steps | Expected result |
| --- | --- | --- | --- |
| SM-01 | Website opens | Open the production URL | The home page loads without a blank screen or server error. |
| SM-02 | Login | Sign in as a student, teacher, and admin using the supplied test accounts | Each account reaches the correct dashboard. |
| SM-03 | Language | Switch English → Khmer, then Khmer → English | Navigation, buttons, headings, loading messages, and alerts change language. |
| SM-04 | Theme | Switch light mode and dark mode | Colors change correctly and text remains readable. |
| SM-05 | Navigation | Open every visible sidebar item for the current role | Each page loads, and the active menu item is highlighted. |
| SM-06 | Refresh | Refresh a page after login | The session remains valid and the page does not get stuck loading. |

## Admin tests

### Courses and payment visibility

1. Sign in as **Admin** and open **Admin → Courses**.
2. Click **Edit** for a course.
3. Confirm the **Allow new payments for this course** checkbox is visible.
4. Untick it and save the course.
5. Open the student course page in another private window.

Expected:

- The course remains visible.
- The student does not see a new-payment/buy button.
- The payment API rejects a new payment attempt.
- Existing enrollments and completed payments remain unchanged.
- The admin course table shows the payment status as **Closed**.

Repeat the test with the checkbox ticked. The buy/payment controls should return, and the table should show **Open**. The course end date also closes new payments automatically after the end of that calendar day.

### Admin content management

For each page below, verify that the admin can view the table, open details, add, edit, and delete a test record where the page supports that action:

- Courses
- Groups/classes
- Materials
- Assignments
- Submissions
- Exams and exam results
- Enrollments
- Users and permissions
- Announcements
- Schedules and attendance

After every change, refresh the page and confirm the table still shows the saved data. Do not delete real production records; use a clearly named test record and remove it after testing.

### Image upload and table display

1. Create or edit a course, material, assignment, or profile that accepts an image.
2. Upload a small PNG or JPG.
3. Save the form and wait for the success message.
4. Refresh the table and open the detail view.

Expected:

- Upload progress/loading is shown in the center of the form.
- The save button cannot create duplicate requests while saving.
- A successful message appears.
- The uploaded image is visible in the table/detail view after refresh.
- Invalid file types or files larger than the page limit are rejected clearly.

## Teacher tests

| ID | Test | Expected result |
| --- | --- | --- |
| TE-01 | Open assigned courses | Teacher sees only courses assigned to that teacher. |
| TE-02 | Add material | Material saves and appears in the material table. |
| TE-03 | Add assignment with image/PDF | The attachment uploads, saves, and can be opened after refresh. |
| TE-04 | Review submission | Student submission details and image/file attachments are visible. |
| TE-05 | Grade submission | Grade/feedback saves and remains after refresh. |
| TE-06 | Chat | Teacher can chat only with students connected through a shared course. Unrelated students are blocked. |
| TE-07 | Chat media | Teacher can send an allowed image or video and the recipient can open it. |
| TE-08 | Comments | Teacher can like, comment, reply, edit/delete their own allowed content, and see reply counts. |

## Student tests

| ID | Test | Expected result |
| --- | --- | --- |
| ST-01 | Browse courses | Public/course list loads with image, title, price, and status. |
| ST-02 | Closed course | A course manually closed by admin does not show a new-payment button. |
| ST-03 | Course access | A purchased/enrolled student can open course materials, assignments, exams, and submissions. |
| ST-04 | Submit work | Student can submit an assignment with the allowed file/image type. |
| ST-05 | Submission status | Student can see submitted, graded, or returned status correctly. |
| ST-06 | Social post | Student can create a post with text, image, or video. |
| ST-07 | Like/comment | Student can like/unlike, add a comment, and see the count update. |
| ST-08 | Reply | Student can click Reply, type an inline reply, submit it, and see the threaded reply. |
| ST-09 | Search | Search returns matching courses/posts and links open the correct page. |

## Payment test

Use only the configured sandbox/test payment process. Do not use a real bank account unless the project owner explicitly authorizes it.

1. Start a payment for an open course.
2. Complete the configured test payment.
3. Confirm the payment-success popup/message appears.
4. Confirm the course access/enrollment is activated.
5. Refresh and confirm the success state remains.
6. Repeat with a closed course and confirm checkout is blocked.

If payment stays pending, record the invoice ID and timestamp. Do not mark a payment successful manually from the browser.

## Search and public visibility

1. Open the public website in an incognito window while logged out.
2. Search for the website name and a course name in Google/Bing.
3. Open the public result and verify the logo, title, description, and page link.
4. Open `https://campusflowlms.xyz/robots.txt` and the sitemap URL configured by the project.

Search-engine changes can take time to appear. A sitemap submission may show “couldn’t fetch” temporarily while the domain, HTTPS, or sitemap URL is not reachable; confirm the sitemap opens directly in the browser first.

## Pass/fail report template

Copy this block for each issue:

```text
Test ID:
Result: PASS / FAIL
Date and time:
Browser and device:
Account role:
URL:
Steps to reproduce:
Expected result:
Actual result:
Screenshot/video:
Console or network error:
``` 

## Release acceptance checklist

- [ ] Production website opens
- [ ] API health returns `status: ok`
- [ ] Student, teacher, and admin login work
- [ ] English/Khmer switch works
- [ ] Light/dark mode works
- [ ] Admin can manage all required content
- [ ] Course payment Open/Closed toggle works
- [ ] Uploads save and remain visible after refresh
- [ ] Teacher can see student submissions
- [ ] Course-based chat permissions work
- [ ] Like/comment/reply works
- [ ] Payment success message appears
- [ ] No blank pages or unhandled server errors
