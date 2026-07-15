import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/with-auth';
import { notFound } from '@/lib/api-result';
import { getProjectRaw } from '@/domains/projects/queries';
import { getLatestCompletedCalc } from '@/domains/calculations/queries';
import { listUnits } from '@/domains/units/queries';
import type { EquipmentPackages, MoistureBalance, EquipmentPackage } from '@/domains/equipment/types';
import type { DesignCondition } from '@/domains/weather/types';
import PDFDocument from 'pdfkit';

/**
 * GET /api/projects/:projectId/report
 *
 * Generates a PDF report for the latest calculation run.
 * Includes: project info, weather station, design conditions,
 * peak loads, good/better/best equipment packages, moisture balance.
 */

// Layout constants
const MARGIN = 50;
const PAGE_WIDTH = 612; // US Letter
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const COL_WIDTH = CONTENT_WIDTH / 3;

function drawLine(doc: PDFKit.PDFDocument, y: number, width = CONTENT_WIDTH) {
  doc.moveTo(MARGIN, y).lineTo(MARGIN + width, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a365d').text(title, MARGIN);
  const y = doc.y + 2;
  drawLine(doc, y);
  doc.moveDown(0.4);
  doc.fillColor('#333333');
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, width: number) {
  doc.fontSize(8).font('Helvetica').fillColor('#666666').text(label, x, doc.y, { width });
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333').text(value || '—', x, doc.y, { width });
  doc.moveDown(0.3);
}

function drawPackageCard(
  doc: PDFKit.PDFDocument,
  pkg: EquipmentPackage,
  x: number,
  y: number,
  width: number,
  highlighted: boolean,
) {
  const cardHeight = 220;
  const pad = 8;

  // Card background
  if (highlighted) {
    doc.rect(x, y, width, cardHeight).fill('#f0f7ff');
    doc.rect(x, y, width, 28).fill('#1a365d');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff').text(pkg.title, x + pad, y + 8, { width: width - 2 * pad, align: 'center' });
  } else {
    doc.rect(x, y, width, cardHeight).fill('#f9fafb');
    doc.rect(x, y, width, 28).fill('#4a5568');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff').text(pkg.title, x + pad, y + 8, { width: width - 2 * pad, align: 'center' });
  }

  let cy = y + 36;
  doc.fillColor('#333333');

  doc.fontSize(7).font('Helvetica').fillColor('#888888').text('Equipment', x + pad, cy, { width: width - 2 * pad });
  cy += 10;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#333333').text(pkg.equipment, x + pad, cy, { width: width - 2 * pad });
  cy += 14;
  doc.fontSize(8).font('Helvetica').fillColor('#666666').text(`SEER2 ${pkg.seer2} / HSPF2 ${pkg.hspf2}`, x + pad, cy, { width: width - 2 * pad });
  cy += 16;

  doc.fontSize(7).font('Helvetica').fillColor('#888888').text('Ventilation', x + pad, cy, { width: width - 2 * pad });
  cy += 10;
  doc.fontSize(8.5).font('Helvetica').fillColor('#333333').text(pkg.ventilation, x + pad, cy, { width: width - 2 * pad });
  cy += 16;

  doc.fontSize(7).font('Helvetica').fillColor('#888888').text('Moisture Control', x + pad, cy, { width: width - 2 * pad });
  cy += 10;
  doc.fontSize(8.5).font('Helvetica').fillColor('#333333').text(pkg.moisture, x + pad, cy, { width: width - 2 * pad });
  cy += 18;

  // Metrics
  doc.fontSize(8).font('Helvetica').fillColor('#666666').text('Annual Cost:', x + pad, cy, { continued: true }).font('Helvetica-Bold').fillColor('#333333').text(` $${pkg.annualCost.toLocaleString()}/yr`);
  cy += 13;
  doc.fontSize(8).font('Helvetica').fillColor('#666666').text('Comfort Score:', x + pad, cy, { continued: true }).font('Helvetica-Bold').fillColor('#333333').text(` ${pkg.comfortScore}/100`);
  cy += 13;
  doc.fontSize(8).font('Helvetica').fillColor('#666666').text('Moisture:', x + pad, cy, { continued: true });
  const passColor = pkg.moisturePass ? '#27ae60' : '#c0392b';
  doc.font('Helvetica-Bold').fillColor(passColor).text(` ${pkg.moisturePass ? 'PASS' : 'FAIL'}`);
}

export const GET = withAuth(async (_req: NextRequest, { params }, user) => {
  const { projectId } = await params;

  // Fetch project
  const project = await getProjectRaw(projectId, user.organization_id);
  if (!project) return notFound('Project');

  // Fetch latest calculation with results
  const calc = await getLatestCompletedCalc(projectId);
  if (!calc?.equipment_packages) {
    return notFound('No completed calculation found. Run a calculation first.');
  }

  const pkgs = calc.equipment_packages as EquipmentPackages;
  const moisture = calc.moisture_balance as MoistureBalance;

  // Fetch dwelling units
  const units = await listUnits(projectId);

  const ws = project.weather_station;
  const dc: DesignCondition[] = project.design_conditions ?? [];

  // Generate PDF
  const doc = new PDFDocument({ size: 'LETTER', margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // -- Page 1: Header --
  doc.rect(0, 0, PAGE_WIDTH, 80).fill('#1a365d');
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff').text('Tinsmith Calculation Report', MARGIN, 22);
  doc.fontSize(10).font('Helvetica').fillColor('#b0c4de').text('HVAC Equipment Selection & Moisture Balance Analysis', MARGIN, 50);
  doc.y = 95;
  doc.fillColor('#333333');

  // -- Project Info --
  sectionTitle(doc, 'Project Information');
  const projY = doc.y;
  labelValue(doc, 'Project Name', project.name, MARGIN, COL_WIDTH);
  labelValue(doc, 'Building Type', project.building_type, MARGIN, COL_WIDTH);
  doc.y = projY;
  const address = [project.address, project.city, project.state, project.zip_code].filter(Boolean).join(', ');
  labelValue(doc, 'Address', address, MARGIN + COL_WIDTH, COL_WIDTH);
  labelValue(doc, 'Units', `${units.length} dwelling unit(s)`, MARGIN + COL_WIDTH, COL_WIDTH);
  doc.y = projY;
  labelValue(doc, 'Submitted By', calc.submitted_by_name || '—', MARGIN + 2 * COL_WIDTH, COL_WIDTH);
  labelValue(doc, 'Date', new Date(calc.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), MARGIN + 2 * COL_WIDTH, COL_WIDTH);

  // -- Weather Station --
  if (ws) {
    sectionTitle(doc, 'Weather Station');
    const wsY = doc.y;
    labelValue(doc, 'Station', ws.name, MARGIN, CONTENT_WIDTH * 0.5);
    doc.y = wsY;
    labelValue(doc, 'WMO ID', ws.id, MARGIN + CONTENT_WIDTH * 0.5, COL_WIDTH * 0.5);
    labelValue(doc, 'Elevation', ws.elevation, MARGIN + CONTENT_WIDTH * 0.5, COL_WIDTH * 0.5);
  }

  // -- Design Conditions Table --
  if (dc.length > 0) {
    sectionTitle(doc, 'Design Conditions (ASHRAE 2021 HOF)');

    const cols = [
      { label: 'Condition', width: 100 },
      { label: 'Dry Bulb (F)', width: 80 },
      { label: 'Wet Bulb (F)', width: 80 },
      { label: 'Dew Point (F)', width: 80 },
      { label: 'Humidity Ratio', width: 80 },
      { label: 'Description', width: 92 },
    ];

    // Header row
    let tx = MARGIN;
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#666666');
    for (const col of cols) {
      doc.text(col.label, tx, doc.y, { width: col.width });
      tx += col.width;
    }
    doc.moveDown(0.3);
    drawLine(doc, doc.y);
    doc.moveDown(0.2);

    // Data rows
    for (const row of dc) {
      tx = MARGIN;
      const rowY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
      doc.text(row.condition, tx, rowY, { width: cols[0].width }); tx += cols[0].width;
      doc.font('Helvetica').fillColor('#333333');
      doc.text(row.db?.toString() ?? '—', tx, rowY, { width: cols[1].width }); tx += cols[1].width;
      doc.text(row.wb?.toString() ?? '—', tx, rowY, { width: cols[2].width }); tx += cols[2].width;
      doc.text(row.dp?.toString() ?? '—', tx, rowY, { width: cols[3].width }); tx += cols[3].width;
      doc.text(row.hr?.toString() ?? '—', tx, rowY, { width: cols[4].width }); tx += cols[4].width;
      doc.fontSize(7).fillColor('#888888').text(row.label, tx, rowY, { width: cols[5].width });
      doc.y = rowY + 14;
    }
  }

  // -- Peak Loads --
  sectionTitle(doc, 'Peak Load Summary');
  const loadY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
  doc.text(`${pkgs.peakCooling.value.toLocaleString()} ${pkgs.peakCooling.unit}`, MARGIN, loadY, { width: COL_WIDTH });
  doc.fontSize(8).font('Helvetica').fillColor('#888888').text('Peak Cooling Load', MARGIN);
  doc.y = loadY;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
  doc.text(`${pkgs.peakHeating.value.toLocaleString()} ${pkgs.peakHeating.unit}`, MARGIN + COL_WIDTH, loadY, { width: COL_WIDTH });
  doc.fontSize(8).font('Helvetica').fillColor('#888888').text('Peak Heating Load', MARGIN + COL_WIDTH);
  doc.y = loadY;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
  const deficitSign = pkgs.moistureDeficit.value >= 0 ? '+' : '';
  doc.text(`${deficitSign}${pkgs.moistureDeficit.value} ${pkgs.moistureDeficit.unit}`, MARGIN + 2 * COL_WIDTH, loadY, { width: COL_WIDTH });
  doc.fontSize(8).font('Helvetica').fillColor('#888888').text('Moisture Surplus Removal', MARGIN + 2 * COL_WIDTH);

  // -- Equipment Packages --
  sectionTitle(doc, 'Equipment Recommendations');
  doc.moveDown(0.3);

  const cardsY = doc.y;
  const cardGap = 8;
  const cardW = (CONTENT_WIDTH - 2 * cardGap) / 3;

  drawPackageCard(doc, pkgs.good, MARGIN, cardsY, cardW, false);
  drawPackageCard(doc, pkgs.better, MARGIN + cardW + cardGap, cardsY, cardW, true);
  drawPackageCard(doc, pkgs.best, MARGIN + 2 * (cardW + cardGap), cardsY, cardW, false);

  doc.y = cardsY + 230;

  // -- Page 2: Moisture Balance --
  if (moisture) {
    doc.addPage();

    doc.rect(0, 0, PAGE_WIDTH, 50).fill('#1a365d');
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#ffffff').text('Moisture Balance Detail', MARGIN, 18);
    doc.y = 65;

    // Water In table
    sectionTitle(doc, 'Water In (pints/day)');
    for (const entry of moisture.waterIn) {
      const rowY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#333333').text(entry.source, MARGIN, rowY, { width: CONTENT_WIDTH * 0.7 });
      doc.font('Helvetica-Bold').text(entry.pintsPerDay.toString(), MARGIN + CONTENT_WIDTH * 0.7, rowY, { width: CONTENT_WIDTH * 0.3, align: 'right' });
      doc.moveDown(0.2);
    }
    drawLine(doc, doc.y);
    doc.moveDown(0.2);
    const totalInY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333').text('Total Water In', MARGIN, totalInY, { width: CONTENT_WIDTH * 0.7 });
    doc.text(moisture.totalIn.toString(), MARGIN + CONTENT_WIDTH * 0.7, totalInY, { width: CONTENT_WIDTH * 0.3, align: 'right' });

    doc.moveDown(1);

    // Water Out table
    sectionTitle(doc, 'Water Out (pints/day)');
    for (const entry of moisture.waterOut) {
      const rowY = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#333333').text(entry.source, MARGIN, rowY, { width: CONTENT_WIDTH * 0.7 });
      doc.font('Helvetica-Bold').text(entry.pintsPerDay.toString(), MARGIN + CONTENT_WIDTH * 0.7, rowY, { width: CONTENT_WIDTH * 0.3, align: 'right' });
      doc.moveDown(0.2);
    }
    drawLine(doc, doc.y);
    doc.moveDown(0.2);
    const totalOutY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333').text('Total Water Out', MARGIN, totalOutY, { width: CONTENT_WIDTH * 0.7 });
    doc.text(moisture.totalOut.toString(), MARGIN + CONTENT_WIDTH * 0.7, totalOutY, { width: CONTENT_WIDTH * 0.3, align: 'right' });

    doc.moveDown(1.5);

    // Net balance summary
    const passBg = moisture.pass ? '#eafaf1' : '#fdecea';
    const summaryY = doc.y;
    doc.rect(MARGIN, summaryY, CONTENT_WIDTH, 36).fill(passBg);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333');
    const balanceSign = moisture.netBalance >= 0 ? '+' : '';
    doc.text(`Net Balance: ${balanceSign}${moisture.netBalance} pints/day`, MARGIN + 12, summaryY + 6, { width: CONTENT_WIDTH * 0.7 });
    doc.fontSize(8).font('Helvetica').fillColor('#888888').text('Negative = net moisture removal', MARGIN + 12, summaryY + 22);
    const passColorText = moisture.pass ? '#27ae60' : '#c0392b';
    doc.fontSize(12).font('Helvetica-Bold').fillColor(passColorText).text(
      moisture.pass ? 'PASS' : 'FAIL',
      MARGIN + CONTENT_WIDTH * 0.7, summaryY + 10,
      { width: CONTENT_WIDTH * 0.3 - 12, align: 'right' }
    );

    // Dwelling units summary
    if (units.length > 0) {
      doc.y = summaryY + 60;
      sectionTitle(doc, 'Dwelling Units');
      for (const unit of units) {
        const unitY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333').text(unit.name, MARGIN, unitY, { width: CONTENT_WIDTH * 0.4 });
        doc.font('Helvetica').fillColor('#666666');
        doc.text(`${unit.bedrooms ?? '—'} BR`, MARGIN + CONTENT_WIDTH * 0.4, unitY, { width: 60 });
        doc.text(`${unit.floor_area?.toLocaleString() ?? '—'} sq ft`, MARGIN + CONTENT_WIDTH * 0.4 + 60, unitY, { width: 100 });
        doc.text(unit.unit_type || '—', MARGIN + CONTENT_WIDTH * 0.4 + 160, unitY, { width: 120 });
        doc.moveDown(0.3);
      }
    }
  }

  // Footer on all pages
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).font('Helvetica').fillColor('#aaaaaa');
    doc.text(
      `Tinsmith — ${project.name} — Page ${i + 1} of ${pages.count} — Generated ${new Date().toLocaleDateString('en-US')}`,
      MARGIN, 752, { width: CONTENT_WIDTH, align: 'center' }
    );
  }

  doc.end();

  const pdfBuffer = await pdfReady;
  const filename = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length.toString(),
    },
  });
});
