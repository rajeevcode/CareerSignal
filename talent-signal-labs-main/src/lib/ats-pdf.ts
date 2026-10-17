import jsPDF from "jspdf";
import type { AtsReport, AtsCheckItem } from "@/lib/ats-checker.functions";

const CATS: Record<AtsCheckItem["category"], string> = {
  structure: "Section Structure",
  formatting: "Formatting",
  contact: "Contact",
  content: "Content Quality",
  keywords: "Keywords",
};

const STATUS_LABEL: Record<AtsCheckItem["status"], string> = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL",
};

const STATUS_RGB: Record<AtsCheckItem["status"], [number, number, number]> = {
  pass: [16, 163, 74],
  warn: [217, 119, 6],
  fail: [220, 38, 38],
};

export function exportAtsReportPdf(report: AtsReport, opts?: { targetRole?: string }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (need: number) => {
    if (y + need > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (
    s: string,
    size: number,
    opt?: { bold?: boolean; color?: [number, number, number]; maxWidth?: number; indent?: number },
  ) => {
    const x = margin + (opt?.indent ?? 0);
    doc.setFont("helvetica", opt?.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opt?.color ?? [33, 33, 33]));
    const lines = doc.splitTextToSize(s, opt?.maxWidth ?? contentW - (opt?.indent ?? 0));
    const lh = size * 1.3;
    ensure(lines.length * lh);
    doc.text(lines, x, y + size);
    y += lines.length * lh;
  };

  const rule = () => {
    ensure(12);
    doc.setDrawColor(220);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 4, pageW - margin, y + 4);
    y += 12;
  };

  // Header
  text("ATS Compliance Report", 22, { bold: true });
  text(
    `Generated ${new Date().toLocaleString()}${opts?.targetRole ? ` · Target: ${opts.targetRole}` : ""}`,
    9,
    { color: [120, 120, 120] },
  );
  y += 8;

  // Score block
  ensure(70);
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentW, 64, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(20, 20, 20);
  doc.text(`${report.score}`, margin + 16, y + 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text("/ 100 ATS score", margin + 70, y + 44);

  const counts = report.checks.reduce(
    (a, c) => ({ ...a, [c.status]: (a[c.status] ?? 0) + 1 }),
    { pass: 0, warn: 0, fail: 0 } as Record<AtsCheckItem["status"], number>,
  );
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(
    `${counts.pass} pass   ${counts.warn} warn   ${counts.fail} fail`,
    margin + contentW - 16,
    y + 28,
    { align: "right" },
  );
  doc.text(
    `${report.stats.wordCount} words · ${report.stats.bulletCount} bullets · ${Math.round(
      report.stats.actionVerbsRatio * 100,
    )}% action verbs · ${report.stats.quantifiedBullets} quantified`,
    margin + contentW - 16,
    y + 48,
    { align: "right" },
  );
  y += 76;

  if (report.summary) {
    text("Summary", 13, { bold: true });
    text(report.summary, 10, { color: [70, 70, 70] });
    y += 6;
  }

  if (report.topFixes.length) {
    rule();
    text("Top Fixes (priority order)", 13, { bold: true });
    y += 2;
    report.topFixes.forEach((f, i) => {
      text(`${i + 1}. ${f}`, 10, { indent: 8 });
      y += 2;
    });
  }

  if (report.keywordSuggestions.length) {
    rule();
    text("Suggested Keywords", 13, { bold: true });
    text(report.keywordSuggestions.join(" · "), 10, { color: [70, 70, 70] });
  }

  // Checklist grouped by category
  rule();
  text("Detailed Checklist", 14, { bold: true });
  y += 4;

  (Object.keys(CATS) as AtsCheckItem["category"][]).forEach((cat) => {
    const items = report.checks.filter((c) => c.category === cat);
    if (!items.length) return;

    ensure(28);
    text(CATS[cat], 12, { bold: true, color: [40, 40, 40] });
    y += 2;

    items.forEach((c) => {
      ensure(40);
      const [r, g, b] = STATUS_RGB[c.status];
      // status pill
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, y + 2, 38, 14, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(STATUS_LABEL[c.status], margin + 19, y + 12, { align: "center" });

      // label + detail
      const labelX = margin + 48;
      const labelW = contentW - 48;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(25, 25, 25);
      const labelLines = doc.splitTextToSize(c.label, labelW);
      doc.text(labelLines, labelX, y + 12);
      let blockH = labelLines.length * 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(95, 95, 95);
      const detailLines = doc.splitTextToSize(c.detail, labelW);
      doc.text(detailLines, labelX, y + 12 + labelLines.length * 12 + 2);
      blockH += detailLines.length * 11 + 2;

      if (c.fix) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text("Fix:", labelX, y + 12 + blockH + 4);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(70, 70, 70);
        const fixLines = doc.splitTextToSize(c.fix, labelW - 24);
        doc.text(fixLines, labelX + 22, y + 12 + blockH + 4);
        blockH += fixLines.length * 11 + 4;
      }

      y += Math.max(20, blockH + 12);
    });
    y += 4;
  });

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`CareerSignal · ATS Report · Page ${i} of ${pages}`, pageW / 2, pageH - 20, {
      align: "center",
    });
  }

  doc.save(`ats-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
