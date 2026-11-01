import { isAtRisk, riskTier } from './risk';

// Exports of the at-risk (High and Medium) students list, built entirely in the
// browser from the Students page rows (student + latest record + prediction).

const COLUMNS = [
  'ID',
  'Name',
  'Programme',
  'Year of Study',
  'Units Registered',
  'Fee Balance',
  'Attendance Rate',
  'CAT Score Average',
  'Assignment Submission Rate',
  'Late Submission Rate',
  'Risk Score',
  'Risk Level',
];

// High and Medium risk students, highest risk first.
export function atRiskStudents(rows) {
  return rows
    .filter((s) => s.prediction && isAtRisk(s.prediction.risk_score))
    .sort((a, b) => b.prediction.risk_score - a.prediction.risk_score);
}

// Today's date as YYYY-MM-DD in local time, for filenames.
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Percentages are "25%" in the PDF and plain numbers (25) in the CSV, so
// spreadsheets can sort and calculate with them.
const withPercentSign = (value) => (value == null ? '' : `${value}%`);
const plainNumber = (value) => (value == null ? '' : value);

// One row of cell values in COLUMNS order; percent formats the percentage columns.
function rowValues(s, percent) {
  return [
    s.student_id,
    s.full_name,
    s.programme ?? '',
    s.year_of_study ?? '',
    s.units_registered ?? '',
    s.fee_balance_outstanding ? 'Outstanding' : 'Cleared',
    percent(s.attendance_rate),
    percent(s.cat_score_avg),
    percent(s.assignment_submission_rate),
    percent(s.late_submission_rate),
    percent(s.prediction.risk_percentage),
    riskTier(s.prediction.risk_score),
  ];
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Quotes a CSV field when needed. Values starting with = + - @ are prefixed
// with ' so spreadsheet apps don't run them as formulas.
function csvField(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportAtRiskCsv(students) {
  const lines = [COLUMNS, ...students.map((s) => rowValues(s, plainNumber))].map((row) => row.map(csvField).join(','));
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  download(blob, `edualert-at-risk-students-${today()}.csv`);
}

// Row background colours (light red / light orange), as RGB.
const ROW_FILL = { High: [254, 226, 226], Medium: [255, 237, 213] };

// jsPDF is only loaded when a PDF is exported, keeping it out of the main bundle.
export async function exportAtRiskPdf(students) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('EduAlert — At-Risk Student Report', margin, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} | Total at-risk students: ${students.length}`,
    margin,
    68
  );

  autoTable(doc, {
    startY: 84,
    margin: { left: margin, right: margin, bottom: 50 },
    head: [COLUMNS],
    body: students.map((s) => rowValues(s, withPercentSign)),
    styles: { fontSize: 8, cellPadding: 4, textColor: [30, 41, 59] },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const level = data.row.raw[COLUMNS.length - 1];
      if (ROW_FILL[level]) data.cell.styles.fillColor = ROW_FILL[level];
    },
  });

  // Footer on every page, drawn once the total page count is known.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`EduAlert — Confidential | Page ${page} of ${pageCount}`, pageWidth / 2, pageHeight - 24, {
      align: 'center',
    });
  }

  doc.save(`edualert-at-risk-students-${today()}.pdf`);
}
