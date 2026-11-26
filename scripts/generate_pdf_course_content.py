"""Import the supplied course PDFs into page-sized CampusFlow lesson data.

The PDFs are source material supplied by the project owner.  We keep the
extracted page text in JSON so the reader can show the complete source without
hard-coding a lossy summary into the React component.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pymupdf


PDF_DIR = Path(r"C:\Users\nha\Downloads\Telegram Desktop")
OUTPUT_DIR = Path("frontend/src/pages/course/content/pdf")

SOURCES = {
    "c_programming.pdf": "c_programming",
    "component_computer.pdf": "components-of-computer",
    "cpp_programming.pdf": "cpp_programming",
    "cshap.pdf": "csharp",
    "css.pdf": "css",
    "git.pdf": "git",
    "html.pdf": "html",
    "javascript.pdf": "javascript",
    "mysql.pdf": "mysql",
    "php.pdf": "php",
    "python1.pdf": "python",
    "reactjs.pdf": "react",
}

LANGUAGES = {
    "c_programming": "c",
    "components-of-computer": "text",
    "cpp_programming": "cpp",
    "csharp": "csharp",
    "css": "css",
    "git": "shell",
    "html": "html",
    "javascript": "javascript",
    "mysql": "sql",
    "php": "php",
    "python": "python",
    "react": "javascript",
}


def clean_text(value: str) -> str:
    """Remove PDF control artifacts without changing readable source text."""

    value = value.replace("\x00", "")
    value = value.replace("\ufeff", "")
    # Remove private-use glyphs used by the PDFs for decorative bullets or
    # broken icon placeholders. They render as empty squares in the reader.
    value = re.sub(r"[\ue000-\uf8ff]", "", value)
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    return value.strip()


def heading_for(text: str, page_number: int) -> str:
    # Prefer numbered chapter/unit headings. The first line of a PDF page can
    # be a wrapped paragraph, so a generic capitalized line is only a fallback.
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.match(r"^\d+(?:\.\d+)*\.?\s+", line):
            return line[:180]
    for line in text.splitlines():
        line = line.strip()
        if line and re.match(r"^[A-Z][A-Za-z+#. -]{2,}\s+", line):
            return line[:180]
    return f"Source lesson page {page_number}"


def code_like(line: str, language: str) -> bool:
    stripped = line.strip()
    if not stripped or stripped.startswith("====="):
        return False
    # A few extracted pages contain a prose fragment such as ``switch)``
    # between two examples. It looks code-like to a punctuation heuristic but
    # cannot be a valid standalone statement.
    if re.fullmatch(r"(?:if|else|for|while|switch)\s*[()]+", stripped):
        return False
    # PDF extraction often puts an explanation after a code line. Do not send
    # that prose to the editable runner, especially for compiled languages.
    if " – " in stripped or (" - " in stripped and language != "html"):
        return False
    patterns = [
        r"^<!DOCTYPE", r"^</?[A-Za-z][^>]*>", r"^#include\b", r"^#\s*\w+",
        r"^(?:public|private|protected)\s+(?:class|static|void|interface)",
        r"^(?:const|let|var|function|import|export|return|class|interface)\b",
        r"^(?:def|async\s+def|from)\s+\w+", r"^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b",
        r"^(?:git|npm|composer|php|python|java|dotnet|dart|flutter)\s+",
        r"^(?:using|namespace|package)\s+\w+", r"^\s*[{}()[\];]",
    ]
    if any(re.search(pattern, stripped, re.IGNORECASE) for pattern in patterns):
        return True
    # Keep executable statements and comments that contain Khmer strings or
    # comments. Parentheses alone are common in prose, so require a stronger
    # source marker before accepting a Khmer line as runnable code.
    if language != "html" and re.search(r"[\u1780-\u17ff]", stripped):
        code_marker = re.search(r"[;={}<>#]|//|/\*|\*/", stripped) or re.match(
            r"^(?:print|console\.|cout|cin|printf|scanf|echo|return|raise|throw|yield)\b",
            stripped,
            re.IGNORECASE,
        )
        if not code_marker:
            return False
        return True
    if language in {"c", "cpp", "csharp", "java", "php", "javascript", "python", "sql"}:
        return bool(re.search(r"[{}();=]", stripped)) and len(stripped.split()) <= 12
    return False


def extract_code(text: str, language: str) -> str:
    lines = text.splitlines()
    blocks: list[list[str]] = []
    current: list[str] = []
    blank_lines = 0

    def flush() -> None:
        nonlocal current, blank_lines
        while current and not current[-1].strip():
            current.pop()
        if current:
            blocks.append(current)
        current = []
        blank_lines = 0

    for line in lines:
        # Khmer text inside a code comment can wrap onto a separate PDF line.
        # Join that continuation back to the comment so the extracted example
        # remains valid source instead of ending halfway through a function.
        if current and re.search(r"//\s*[^/]*$", current[-1]) and re.search(r"[\u1780-\u17ff]", line) and not re.match(r"^(?:cout|cin|printf|scanf|console\.|return|if|for|while|else)\b", line.strip(), re.IGNORECASE) and not code_like(line, language):
            current[-1] = f"{current[-1]} {line.strip()}"
            continue
        if code_like(line, language):
            current.append(line.rstrip())
            blank_lines = 0
            continue

        if current and not line.strip():
            blank_lines += 1
            if blank_lines <= 1:
                current.append("")
            else:
                flush()
            continue

        if current:
            flush()

    flush()
    if not blocks:
        return ""

    def score(block: list[str]) -> int:
        code = "\n".join(block)
        score_value = min(len(block), 24)
        if re.search(r"#include|<!DOCTYPE|<html|<\?php|\bSELECT\b|\bCREATE\s+TABLE\b", code, re.IGNORECASE):
            score_value += 12
        if "{" in code and "}" in code:
            score_value += 4
        if "main(" in code or "function " in code or "def " in code:
            score_value += 4
        return score_value

    selected = max(blocks, key=score)
    code = "\n".join(selected[:80]).strip()
    if not code:
        return ""
    return code


def fallback_code(slug: str) -> str:
    return {
        "html": "<h1>CampusFlow lesson</h1>\n<p>Read the source page, then practice the idea.</p>",
        "css": ".lesson-card {\n  padding: 1rem;\n  border: 1px solid #dbe4f0;\n}",
        "javascript": "const topic = 'CampusFlow lesson';\nconsole.log(topic);",
        "react": "function LessonCard() {\n  return <article>CampusFlow lesson</article>;\n}",
        "c_programming": '#include <stdio.h>\n\nint main(void) {\n  puts("CampusFlow lesson");\n  return 0;\n}',
        "cpp_programming": '#include <iostream>\n\nint main() {\n  std::cout << "CampusFlow lesson\\n";\n}',
        "csharp": 'using System;\n\nConsole.WriteLine("CampusFlow lesson");',
        "python": "topic = 'CampusFlow lesson'\nprint(topic)",
        "php": "<?php\necho 'CampusFlow lesson';",
        "mysql": "SELECT 'CampusFlow lesson' AS topic;",
        "git": "git status\ngit log --oneline -5",
        "components-of-computer": "Computer system\n|- Input\n|- Processing\n\\- Output",
    }.get(slug, "// CampusFlow lesson source\n// Read the page and practice the concept.")


def page_lesson(slug: str, source_file: str, page_number: int, raw_text: str) -> dict:
    text = clean_text(raw_text)
    heading = heading_for(text, page_number)
    language = LANGUAGES[slug]
    code = extract_code(text, language) or fallback_code(slug)
    first_lines = [line.strip() for line in text.splitlines() if line.strip()]
    intro_lines = [line for line in first_lines if line != heading][:3]
    intro = " ".join(intro_lines)[:520] or f"Complete source content imported from {source_file}, page {page_number}."
    subject_label = slug.replace("-", " ").replace("_", " ").title()
    return {
        "id": f"pdf-{slug}-page-{page_number}",
        "label": f"PDF {page_number}. {heading}",
        "heading": heading,
        "intro": intro,
        "bodyHeading": f"Detailed lesson notes - {source_file} - page {page_number}",
        "body": text,
        "code": code,
        "preview": {
            "title": f"{subject_label} - PDF page {page_number}",
            "body": "The example is selected from this source page when possible. Read the notes first, then change one value or step and run it again to observe the result.",
        },
        "keywords": [subject_label, f"PDF page {page_number}", heading[:80]],
        "objectives": [
            "Read the complete source page before changing the example.",
            "Identify the main terms, rules and code shown on this page.",
            "Run or rewrite the example and explain the result in your own words.",
        ],
        "sourceFile": source_file,
        "sourcePage": page_number,
    }


def build_course(source_file: str, slug: str) -> dict:
    document = pymupdf.open(str(PDF_DIR / source_file))
    items = [page_lesson(slug, source_file, page_number, page.get_text("text")) for page_number, page in enumerate(document, 1)]
    sections = []
    chunk_size = 5
    for offset in range(0, len(items), chunk_size):
        chunk = items[offset:offset + chunk_size]
        first_page = chunk[0]["sourcePage"]
        last_page = chunk[-1]["sourcePage"]
        sections.append({
            "number": len(sections) + 1,
            "title": f"PDF source lessons - pages {first_page}-{last_page}",
            "items": chunk,
        })
    return {
        "slug": slug,
        "sourceFile": source_file,
        "pageCount": len(document),
        "sections": sections,
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source_file, slug in SOURCES.items():
        output = OUTPUT_DIR / f"{slug}.json"
        output.write_text(json.dumps(build_course(source_file, slug), ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {output} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
