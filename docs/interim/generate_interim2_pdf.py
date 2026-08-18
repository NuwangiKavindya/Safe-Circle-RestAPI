import os
import sys
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip cover page header/footer

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#1A365D"))

        # Header
        self.drawString(54, 750, "SafeCircle: Interim Submission 02 Report")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))
        self.drawRightString(612 - 54, 750, "NSBM Green University | Software Engineering")
        self.setStrokeColor(colors.HexColor("#CBD5E0"))
        self.setLineWidth(0.5)
        self.line(54, 742, 612 - 54, 742)

        # Footer
        self.line(54, 48, 612 - 54, 48)
        self.drawString(54, 34, "Nuwangi Kavindya Premawansha (ID: 28867)")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 34, page_str)
        self.restoreState()

def clean_md_formatting(text):
    if not text:
        return ""
    # Escape raw XML special characters before adding HTML tags
    # Handle bold
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Handle inline code
    text = re.sub(r'`(.*?)`', r'<font name="Courier" color="#2C7A7B">\1</font>', text)
    return text

def create_interim2_pdf(input_md_path, output_pdf_path):
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Palette
    primary_color = colors.HexColor("#1A365D")
    secondary_color = colors.HexColor("#2B6CB0")
    accent_color = colors.HexColor("#319795")
    dark_neutral = colors.HexColor("#2D3748")
    light_bg = colors.HexColor("#F7FAFC")
    border_color = colors.HexColor("#E2E8F0")

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=primary_color,
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'Header3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=dark_neutral,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=dark_neutral,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#2C7A7B")
    )

    tbl_header_style = ParagraphStyle(
        'TblHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    tbl_cell_style = ParagraphStyle(
        'TblCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=dark_neutral
    )

    story = []

    with open(input_md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    in_code_block = False
    code_lines = []
    current_table_rows = []

    def flush_table():
        nonlocal current_table_rows
        if not current_table_rows:
            return
        
        table_data = []
        for r_idx, row in enumerate(current_table_rows):
            row_cells = []
            for c in row:
                c_formatted = clean_md_formatting(c)
                p_style = tbl_header_style if r_idx == 0 else tbl_cell_style
                row_cells.append(Paragraph(c_formatted, p_style))
            table_data.append(row_cells)

        num_cols = len(current_table_rows[0])
        col_width = 504.0 / num_cols
        
        t = Table(table_data, colWidths=[col_width]*num_cols)
        t_style = [
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, border_color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]
        # Alternating row background
        for idx in range(1, len(table_data)):
            if idx % 2 == 0:
                t_style.append(('BACKGROUND', (0, idx), (-1, idx), colors.HexColor("#F7FAFC")))
            else:
                t_style.append(('BACKGROUND', (0, idx), (-1, idx), colors.white))

        t.setStyle(TableStyle(t_style))
        story.append(Spacer(1, 4))
        story.append(t)
        story.append(Spacer(1, 6))
        current_table_rows = []

    for line in lines:
        line_str = line.rstrip('\r\n')

        # Code block parsing
        if line_str.startswith('```'):
            flush_table()
            if in_code_block:
                in_code_block = False
                code_text = "<br/>".join(
                    c.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace(' ', '&nbsp;')
                    for c in code_lines
                )
                t = Table([[Paragraph(code_text, code_style)]], colWidths=[504])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EDF2F7")),
                    ('BOX', (0, 0), (-1, -1), 0.5, border_color),
                    ('PADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(Spacer(1, 4))
                story.append(t)
                story.append(Spacer(1, 6))
                code_lines = []
            else:
                in_code_block = True
                code_lines = []
            continue

        if in_code_block:
            code_lines.append(line_str)
            continue

        # Markdown Table Row Parsing
        if line_str.startswith('|') and '|' in line_str[1:]:
            if '---' in line_str:
                continue
            cols = [c.strip() for c in line_str.split('|')[1:-1]]
            if cols:
                current_table_rows.append(cols)
            continue
        else:
            flush_table()

        if not line_str.strip():
            story.append(Spacer(1, 3))
            continue

        # Document Header 1
        if line_str.startswith('# '):
            text = line_str[2:].strip()
            if "SafeCircle:" in text:
                story.append(Spacer(1, 10))
                story.append(Paragraph("RESEARCH THESIS PROGRESS REPORT", ParagraphStyle('SubHeader', fontName='Helvetica-Bold', fontSize=10, textColor=accent_color, spaceAfter=6)))
                story.append(Paragraph("SAFECIRCLE: Intelligent Mobile Security System", title_style))
                story.append(Paragraph("Interim Submission 02 | Faculty of Computing, NSBM Green University", subtitle_style))
                story.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=15))
            else:
                story.append(Spacer(1, 8))
                story.append(Paragraph(clean_md_formatting(text), h1_style))
                story.append(HRFlowable(width="100%", thickness=1, color=secondary_color, spaceAfter=6))
            continue

        # Header 2 (Chapters / Sections)
        if line_str.startswith('## '):
            text = line_str[3:].strip()
            story.append(Spacer(1, 6))
            story.append(Paragraph(clean_md_formatting(text), h1_style))
            story.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceAfter=6))
            continue

        # Header 3
        if line_str.startswith('### '):
            text = line_str[4:].strip()
            story.append(Paragraph(clean_md_formatting(text), h2_style))
            continue

        # Header 4
        if line_str.startswith('#### '):
            text = line_str[5:].strip()
            story.append(Paragraph(clean_md_formatting(text), h3_style))
            continue

        # Horizontal Rule
        if line_str.strip() == '---':
            story.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=6, spaceAfter=6))
            continue

        # Bullet list item
        if line_str.startswith('* ') or line_str.startswith('- '):
            text = line_str[2:].strip()
            formatted = clean_md_formatting(text)
            story.append(Paragraph(f"• {formatted}", bullet_style))
            continue

        # Numbered list item
        if len(line_str) > 2 and line_str[0].isdigit() and line_str[1:3] in ['. ', ') ']:
            formatted = clean_md_formatting(line_str)
            story.append(Paragraph(formatted, bullet_style))
            continue

        # Normal text paragraph
        formatted = clean_md_formatting(line_str)
        story.append(Paragraph(formatted, body_style))

    flush_table()
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully compiled Interim 2 PDF report to: {output_pdf_path}")

if __name__ == '__main__':
    md_path = "/Users/nuwangi/Desktop/research/safe-circle/docs/interim-2.md"
    pdf_path = "/Users/nuwangi/Desktop/research/safe-circle/docs/interim/interim-2.pdf"
    create_interim2_pdf(md_path, pdf_path)
