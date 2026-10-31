from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "campusflow-system-demo-report.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#10243f")
BLUE = colors.HexColor("#174c92")
TEAL = colors.HexColor("#178f83")
MINT = colors.HexColor("#e8f8f2")
PALE_BLUE = colors.HexColor("#eef5ff")
CORAL = colors.HexColor("#f47b67")
INK = colors.HexColor("#1e293b")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#d7e2ee")
LIGHT = colors.HexColor("#f7fafc")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="ReportTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=27,
    leading=33,
    textColor=NAVY,
    alignment=TA_LEFT,
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="ReportSubtitle",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=11,
    leading=16,
    textColor=MUTED,
    spaceAfter=16,
))
styles.add(ParagraphStyle(
    name="Section",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=16,
    leading=20,
    textColor=NAVY,
    spaceBefore=10,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Subsection",
    parent=styles["Heading3"],
    fontName="Helvetica-Bold",
    fontSize=11,
    leading=14,
    textColor=BLUE,
    spaceBefore=8,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.3,
    leading=14,
    textColor=INK,
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="Small",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8,
    leading=11,
    textColor=MUTED,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="BulletBody",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.2,
    leading=13,
    leftIndent=12,
    firstLineIndent=-8,
    bulletIndent=0,
    textColor=INK,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="CardTitle",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=10,
    leading=13,
    textColor=NAVY,
    spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="CardBody",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.7,
    leading=12,
    textColor=INK,
))
styles.add(ParagraphStyle(
    name="TableHead",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=8.2,
    leading=10,
    textColor=colors.white,
))
styles.add(ParagraphStyle(
    name="TableCell",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.1,
    leading=11,
    textColor=INK,
))
styles.add(ParagraphStyle(
    name="Callout",
    parent=styles["BodyText"],
    fontName="Helvetica-Bold",
    fontSize=10,
    leading=14,
    textColor=TEAL,
))


def P(text, style="Body"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(f"- {text}", styles["BulletBody"])


def status_card(title, body, accent):
    return Table(
        [[P(title, "CardTitle")], [P(body, "CardBody")]],
        colWidths=[54 * mm],
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.7, LINE),
            ("LINEBEFORE", (0, 0), (0, -1), 4, accent),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    )


def page_decor(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 7 * mm, width, 7 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9.5 * mm, "CampusFlow LMS | System and Demo Report")
    canvas.drawRightString(width - 18 * mm, 9.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


class ReportDocTemplate(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=18 * mm,
            bottomMargin=21 * mm,
            title="CampusFlow LMS - System and Demo Report",
            author="CampusFlow LMS",
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="report", frames=frame, onPage=page_decor)])


def build_story():
    story = []
    story.append(Spacer(1, 8 * mm))
    story.append(P("CampusFlow LMS", "ReportTitle"))
    story.append(P("System status, feature overview and an easy demo guide", "ReportSubtitle"))
    story.append(HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=13))
    story.append(P("Report date: 31 October 2026", "Small"))
    story.append(P("CampusFlow is a full-stack student management and learning platform with online courses, community features and KHQR payments.", "Body"))
    story.append(Spacer(1, 5))

    cards = Table(
        [[
            status_card("Frontend", "HTTP 200\nRailway online", TEAL),
            status_card("Backend API", "Health HTTP 200\nConnected", BLUE),
            status_card("Course catalog", "HTTP 200\n2 courses available", CORAL),
        ]],
        colWidths=[57 * mm, 57 * mm, 57 * mm],
        hAlign="LEFT",
        style=TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]),
    )
    story.append(cards)
    story.append(Spacer(1, 10))
    story.append(P("Overall result: ready for a normal product demonstration. The public frontend, backend API, course catalog and security controls are online.", "Callout"))

    story.append(P("1. Live system status", "Section"))
    status_data = [
        [P("Component", "TableHead"), P("Live address or check", "TableHead"), P("Result", "TableHead")],
        [P("Frontend custom domain", "TableCell"), P("https://campusflowlms.xyz", "TableCell"), P("HTTP 200; SSL active", "TableCell")],
        [P("Frontend Railway origin", "TableCell"), P("https://frontend-production-85134.up.railway.app", "TableCell"), P("HTTP 200", "TableCell")],
        [P("Backend API", "TableCell"), P("https://schoolmanagement-production-d78b.up.railway.app/health", "TableCell"), P("HTTP 200", "TableCell")],
        [P("Course catalog", "TableCell"), P("/storefront/courses", "TableCell"), P("HTTP 200; 2 courses", "TableCell")],
        [P("Frontend asset", "TableCell"), P("/assets/index-D27Ggyei.js", "TableCell"), P("HTTP 200", "TableCell")],
        [P("Hosting", "TableCell"), P("Railway with campusflowlms.xyz", "TableCell"), P("Online", "TableCell")],
    ]
    table = Table(status_data, colWidths=[35 * mm, 94 * mm, 40 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(table)
    story.append(Spacer(1, 6))
    story.append(P("Recommended demo URL: https://campusflowlms.xyz. The Railway URL is the deployment origin. The www hostname needs separate HTTPS configuration if https://www.campusflowlms.xyz is required.", "Small"))

    story.append(P("2. Main system features", "Section"))
    for text in [
        "Student, teacher, customer and administrator accounts.",
        "Email/password login and Google sign-in for supported roles.",
        "Course catalog, course details and protected course access.",
        "Real Bakong/KHQR registration and course payments with backend verification.",
        "Student dashboard, assignments, homework submissions, grades, exams and certificates.",
        "Teacher courses, schedules, attendance, assignments, submissions and announcements.",
        "Administrator users, permissions, students, teachers, courses, enrollments and settings.",
        "Community posts, image/video media, stories, friends, groups, chat and notifications.",
        "English and Khmer language support plus light/dark theme.",
    ]:
        story.append(bullet(text))

    flow = Table([
        [P("Browser", "CardTitle"), P("React + Vite frontend", "CardTitle"), P("NestJS REST API", "CardTitle"), P("PostgreSQL", "CardTitle")],
        [P("User opens the Railway website.", "CardBody"), P("Displays courses, dashboards and community pages.", "CardBody"), P("Handles JWT, roles, payments and business rules.", "CardBody"), P("Stores users, courses, enrollments and payment records.", "CardBody")],
    ], colWidths=[42 * mm, 42 * mm, 42 * mm, 42 * mm])
    flow.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(KeepTogether([
        P("3. Technology and data flow", "Section"),
        flow,
        Spacer(1, 7),
        P("External services: Firebase Authentication for Google sign-in, Bakong Open API for payment verification, and Telegram notifications when configured.", "Body"),
    ]))
    story.append(P("4. Simple demo steps", "Section"))
    story.append(P("Public visitor demo", "Subsection"))
    for text in [
        "Open https://campusflowlms.xyz.",
        "Show the home page and open /courses.",
        "Select a course and show its description, teacher and price.",
        "Open /community to show public posts and community members.",
    ]:
        story.append(bullet(text))

    story.append(P("Student demo", "Subsection"))
    for text in [
        "Open /login/student and sign in using a private demo student account or Google sign-in.",
        "Open Student -> Courses and choose a course.",
        "Click Buy course to display a fresh KHQR and invoice amount.",
        "For a real payment demonstration, scan with ABA or Bakong, confirm the amount, then wait for verification.",
        "After success, open the course and show assignments, schedule and learning progress.",
    ]:
        story.append(bullet(text))

    story.append(P("Teacher demo", "Subsection"))
    for text in [
        "Open /login/teacher.",
        "Show the dashboard and assigned courses.",
        "Open attendance, assignments, submissions, grades, schedule and announcements.",
        "Create or edit records only in a demo environment.",
    ]:
        story.append(bullet(text))

    story.append(P("Administrator demo", "Subsection"))
    for text in [
        "Open /login/admin.",
        "Show students, teachers, courses, users and permissions.",
        "Show enrollments, schedules, attendance, announcements and certificates.",
        "Show Telegram and system settings without displaying tokens or passwords.",
    ]:
        story.append(bullet(text))

    story.append(P("5. Payment demonstration", "Section"))
    payment_box = Table([[P("Safe payment demo", "CardTitle")], [P("Use a fresh QR. QR codes expire after the configured payment window. Check the recipient and amount in ABA/Bakong before confirming. Never make multiple payments if one payment is already pending or the money has been deducted.", "CardBody")]], colWidths=[168 * mm])
    payment_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), MINT),
        ("BOX", (0, 0), (-1, -1), 0.8, TEAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(payment_box)
    story.append(Spacer(1, 8))
    for text in [
        "QR generation is handled by the backend and rendered sharply by the frontend.",
        "The backend checks the invoice amount, currency, destination account and Bakong response.",
        "A frontend screenshot cannot mark a payment as paid.",
        "A complete end-to-end paid test requires a signed-in student and a user-controlled ABA/Bakong confirmation.",
    ]:
        story.append(bullet(text))

    story.append(P("6. Security status", "Section"))
    for text in [
        "HTTPS is enabled on the live frontend and backend.",
        "Frontend security headers include CSP, HSTS and X-Frame-Options: DENY.",
        "Backend security headers include X-Frame-Options: DENY and a restrictive Permissions Policy.",
        "Unauthenticated checkout and course-payment access are rejected with HTTP 401.",
        "Unknown payment tokens return HTTP 404.",
        "Authentication, rate limiting, CORS, request validation and role permissions are enabled.",
    ]:
        story.append(bullet(text))

    story.append(P("7. Demo safety rules", "Section"))
    for text in [
        "Never put passwords, JWT secrets, Firebase private keys, database passwords, Bakong tokens or Telegram bot tokens in slides or screenshots.",
        "Use separate demo accounts and a separate demo database when possible.",
        "Do not run database seed commands on the production database.",
        "Keep Railway, Firebase, GitHub, email and domain accounts protected with 2FA.",
    ]:
        story.append(bullet(text))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=0.8, color=LINE, spaceBefore=4, spaceAfter=8))
    story.append(P("Prepared for easy product demonstration. Live checks were read-only and did not transfer money.", "Small"))
    return story


if __name__ == "__main__":
    document = ReportDocTemplate(str(OUTPUT))
    document.build(build_story())
    print(OUTPUT)
