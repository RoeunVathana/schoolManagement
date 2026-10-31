from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, HRFlowable, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "storage-deployment-upgrade-guide.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#10243f")
BLUE = colors.HexColor("#174c92")
TEAL = colors.HexColor("#178f83")
CORAL = colors.HexColor("#f47b67")
MINT = colors.HexColor("#e8f8f2")
PALE_BLUE = colors.HexColor("#eef5ff")
INK = colors.HexColor("#1e293b")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#d7e2ee")
LIGHT = colors.HexColor("#f7fafc")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=31, textColor=NAVY, spaceAfter=6))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED, spaceAfter=12))
styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=NAVY, spaceBefore=10, spaceAfter=7))
styles.add(ParagraphStyle(name="Subsection", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=BLUE, spaceBefore=7, spaceAfter=4))
styles.add(ParagraphStyle(name="Body", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.4, leading=14, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="BulletText", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3, leading=13, leftIndent=12, firstLineIndent=-8, textColor=INK, spaceAfter=3))
styles.add(ParagraphStyle(name="HeadCell", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.3, leading=10, textColor=colors.white))
styles.add(ParagraphStyle(name="Cell", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.4, leading=11, textColor=INK))
styles.add(ParagraphStyle(name="CardTitle", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=NAVY, spaceAfter=3))
styles.add(ParagraphStyle(name="CardBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.6, leading=12, textColor=INK))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10.5, leading=15, textColor=TEAL, spaceAfter=6))


def P(text, style="Body"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(f"- {text}", styles["BulletText"])


def footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 7 * mm, width, 7 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9.5 * mm, "CampusFlow LMS | Storage Upgrade Guide")
    canvas.drawRightString(width - 18 * mm, 9.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


class ReportDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=21 * mm, title="CampusFlow LMS - Storage Deployment and Upgrade Guide", author="CampusFlow LMS")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates([PageTemplate(id="report", frames=frame, onPage=footer)])


def card(title, body, color):
    return Table([[P(title, "CardTitle")], [P(body, "CardBody")]], colWidths=[52 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 4, color),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))


def build_story():
    story = [Spacer(1, 7 * mm), P("CampusFlow LMS", "TitleBig"), P("Storage deployment and easy upgrade guide", "Subtitle"), HRFlowable(width="100%", thickness=1.2, color=TEAL, spaceAfter=12)]
    story.append(P("Short answer: the system has 3 core services. It does not currently prove that a separate file-storage server is attached. File uploads use the backend uploads folder by default, while Firebase Storage is an optional cloud mode.", "Callout"))

    story.append(Table([[card("Frontend service", "1 Railway service\nWebsite files only", TEAL), card("Backend service", "1 Railway service\nAPI and uploads", BLUE), card("Database service", "1 PostgreSQL service\nData only", CORAL)]], colWidths=[56 * mm, 56 * mm, 56 * mm], style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 5)])))
    story.append(Spacer(1, 10))

    story.append(P("1. How many storage locations are there?", "Section"))
    rows = [
        [P("Location", "HeadCell"), P("Count", "HeadCell"), P("Purpose", "HeadCell"), P("Current status", "HeadCell")],
        [P("PostgreSQL", "Cell"), P("1", "Cell"), P("Users, courses, enrollments and payment records", "Cell"), P("Required and online", "Cell")],
        [P("Backend /app/uploads", "Cell"), P("0 or 1", "Cell"), P("Course files, profiles, homework and other uploads", "Cell"), P("Code supports local storage; Railway volume not confirmed", "Cell")],
        [P("Firebase Storage bucket", "Cell"), P("0 or 1", "Cell"), P("Cloud media for community posts, stories, chat and groups", "Cell"), P("Optional; depends on Railway variables", "Cell")],
        [P("Telegram archive", "Cell"), P("0 or 1", "Cell"), P("Backup/archive only; not used to serve files", "Cell"), P("Optional", "Cell")],
    ]
    table = Table(rows, colWidths=[37 * mm, 20 * mm, 64 * mm, 47 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(table)

    story.append(P("2. Current storage behavior", "Section"))
    for text in [
        "The application writes many uploads to the backend folder: /app/uploads.",
        "Community media can use Firebase Storage when MEDIA_STORAGE is set to firebase or google.",
        "The exact Railway volume count and the production MEDIA_STORAGE value are external settings, so they cannot be proven from source code alone.",
        "Local workspace test only: backend/uploads contains 19 files, about 7.7 MB. This is not the production usage number.",
        "The live frontend and backend were last checked successfully with HTTP 200.",
    ]:
        story.append(bullet(text))

    story.append(P("3. Simple picture", "Section"))
    flow = Table([
        [P("Users", "CardTitle"), P("Frontend", "CardTitle"), P("Backend", "CardTitle"), P("Storage", "CardTitle")],
        [P("Browser or mobile", "CardBody"), P("React website", "CardBody"), P("NestJS API", "CardBody"), P("PostgreSQL + uploads volume or Firebase bucket", "CardBody")],
    ], colWidths=[42 * mm, 42 * mm, 42 * mm, 42 * mm])
    flow.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), PALE_BLUE), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.45, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story.append(flow)

    story.append(PageBreak())
    story.append(P("4. Easiest upgrade now: add one Railway Volume", "Section"))
    story.append(P("This is the lowest-code change because the current upload paths already use /app/uploads.", "Body"))
    for text in [
        "Open Railway and select the Backend service.",
        "Choose Volumes -> Add Volume.",
        "Set the mount path to /app/uploads.",
        "Deploy the backend and test one profile image, one course file and one community post.",
        "If the service reports a permission error, set RAILWAY_RUN_UID=0 and redeploy.",
        "Do not delete the old files until the new volume is verified and backed up.",
    ]:
        story.append(bullet(text))

    story.append(P("Railway storage sizes", "Subsection"))
    size_rows = [
        [P("Plan", "HeadCell"), P("Default volume size", "HeadCell"), P("Upgrade note", "HeadCell")],
        [P("Free / Trial", "Cell"), P("0.5 GB", "Cell"), P("Small testing only", "Cell")],
        [P("Hobby", "Cell"), P("5 GB", "Cell"), P("Good starting point for a small demo", "Cell")],
        [P("Pro", "Cell"), P("Up to 1 TB self-service", "Cell"), P("Best for larger production media", "Cell")],
    ]
    sizes = Table(size_rows, colWidths=[35 * mm, 45 * mm, 86 * mm], repeatRows=1)
    sizes.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.45, LINE), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(sizes)
    story.append(Spacer(1, 7))
    story.append(P("Railway says paid-plan volumes can be resized live. A volume is attached to a service, so attach it to the Backend service, not the Frontend service.", "Body"))

    story.append(P("5. Best long-term upgrade: Firebase Storage", "Section"))
    story.append(P("Use one Firebase Storage bucket for scalable cloud media. The code already supports the cloud mode for community media.", "Body"))
    for text in [
        "Enable Storage in the Firebase project.",
        "Set MEDIA_STORAGE=firebase in Railway backend variables.",
        "Set FIREBASE_PROJECT_ID and FIREBASE_STORAGE_BUCKET.",
        "Keep FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY only in Railway Variables; never put them in the frontend or report.",
        "Upload a test story or post and confirm its URL uses firebasestorage.googleapis.com.",
        "Later migrate course files, homework and profile uploads so all user media uses the same cloud bucket.",
    ]:
        story.append(bullet(text))

    story.append(P("6. My recommendation", "Section"))
    recommendation = Table([[P("Now", "CardTitle"), P("Add one Railway Volume at /app/uploads. This protects current uploads with minimal code change.", "CardBody")], [P("Later", "CardTitle"), P("Move all user media to one Firebase Storage bucket for easier scaling and multiple server replicas.", "CardBody")]], colWidths=[25 * mm, 143 * mm])
    recommendation.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), MINT), ("BOX", (0, 0), (-1, -1), 0.8, TEAL), ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#b9e7da")), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story.append(recommendation)
    story.append(Spacer(1, 8))
    story.append(P("Official references", "Subsection"))
    story.append(P("https://docs.railway.com/volumes/reference<br/>https://docs.railway.com/volumes<br/>https://firebase.google.com/docs/storage/web/start", "Small"))
    return story


if __name__ == "__main__":
    ReportDoc(str(OUTPUT)).build(build_story())
    print(OUTPUT)
