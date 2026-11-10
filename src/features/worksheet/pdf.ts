import { jsPDF } from 'jspdf';
import { sectionMarks, totalMarks, type WorksheetGroup } from './generate';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const LINE = 5.4;
const MARKS_COL = 14;

/** jsPDF's built-in fonts only cover Latin-1; anything else needs the browser's Print to PDF. */
export function hasUnsupportedChars(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\u0000-ÿ–—‘’“”•…]/.test(text);
}

/** Build the A4 worksheet PDF entirely in the browser: questions only, no answers. */
export function buildWorksheetPdf(title: string, groups: WorksheetGroup[]): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const ensure = (height: number) => {
    if (y + height > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };
  /** Write wrapped lines one by one so long questions flow across pages. */
  const writeLines = (lines: string[], x: number) => {
    for (const line of lines) {
      ensure(LINE);
      doc.text(line, x, y);
      y += LINE;
    }
  };

  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  const titleLines: string[] = doc.splitTextToSize(title || 'Worksheet', PAGE_W - 2 * MARGIN);
  doc.text(titleLines, PAGE_W / 2, y + 4, { align: 'center' });
  y += titleLines.length * 8 + 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text('Name: ______________________________', MARGIN, y);
  doc.text('Date: ____________________', PAGE_W - MARGIN, y, { align: 'right' });
  y += 8;
  doc.setFont('times', 'bold');
  doc.text(`Total Marks: ${totalMarks(groups)}`, PAGE_W - MARGIN, y, { align: 'right' });
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 3, PAGE_W - MARGIN, y + 3);
  y += 12;

  let n = 0;
  for (const g of groups) {
    ensure(LINE * 4);
    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.text(`Section ${g.letter}: ${g.label}`, MARGIN, y);
    doc.setFontSize(10);
    doc.setFont('times', 'italic');
    doc.text(`${g.questions.length} question${g.questions.length === 1 ? '' : 's'} · ${sectionMarks(g)} marks`, PAGE_W - MARGIN, y, { align: 'right' });
    y += 7.5;
    doc.setFontSize(11);

    for (const q of g.questions) {
      n += 1;
      const numW = 9;
      const textX = MARGIN + numW;
      const textW = PAGE_W - MARGIN - MARKS_COL - textX;
      doc.setFont('times', 'normal');
      const lines: string[] = doc.splitTextToSize(q.text, textW);
      const optionLines = (q.options ?? []).map(
        (o, i) => doc.splitTextToSize(`(${String.fromCharCode(97 + i)})  ${o}`, textW - 4) as string[],
      );
      const height = (lines.length + optionLines.reduce((s, l) => s + l.length, 0)) * LINE + 3;
      // Keep a question together on one page when it fits on a page at all.
      if (height < PAGE_H - 2 * MARGIN) ensure(height);
      else ensure(LINE);

      doc.text(`${n}.`, MARGIN, y);
      doc.setFont('times', 'bold');
      doc.text(`[${q.marks}]`, PAGE_W - MARGIN, y, { align: 'right' });
      doc.setFont('times', 'normal');
      writeLines(lines, textX);
      for (const ol of optionLines) writeLines(ol, textX + 4);
      y += 3;
    }
    y += 4;
  }

  const pages = doc.getNumberOfPages();
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.text(`Page ${p} of ${pages}`, PAGE_W / 2, PAGE_H - 9, { align: 'center' });
  }
  return doc;
}
