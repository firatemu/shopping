import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Turkish character + ₺ support:
 * Prefer Noto Sans (excellent Unicode coverage), fallback to DejaVu Sans on Ubuntu.
 *
 * We intentionally resolve from multiple locations because __dirname differs between
 * ts-node (src/...) and compiled dist (dist/...).
 */
const FONT_CANDIDATES = {
  regular: [
    // project-relative (if you later add fonts into repo)
    path.join(process.cwd(), 'src/fonts/NotoSans-Regular.ttf'),
    path.join(process.cwd(), 'fonts/NotoSans-Regular.ttf'),
    path.join(__dirname, '../../fonts/NotoSans-Regular.ttf'),
    // common Ubuntu locations
    '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansDisplay-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  ],
  bold: [
    path.join(process.cwd(), 'src/fonts/NotoSans-Bold.ttf'),
    path.join(process.cwd(), 'fonts/NotoSans-Bold.ttf'),
    path.join(__dirname, '../../fonts/NotoSans-Bold.ttf'),
    '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansDisplay-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  ],
};

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  // Lazy-load font buffers
  private fontBuffers: { regular?: Buffer; bold?: Buffer } = {};

  private firstExistingPath(paths: string[]): string | undefined {
    for (const p of paths) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {
        // ignore
      }
    }
    return undefined;
  }

  /** Load font buffers on demand */
  private loadFonts() {
    if (!this.fontBuffers.regular) {
      try {
        const regularPath = this.firstExistingPath(FONT_CANDIDATES.regular);
        const boldPath = this.firstExistingPath(FONT_CANDIDATES.bold);
        if (!regularPath || !boldPath) {
          throw new Error('No suitable font files found');
        }
        this.fontBuffers.regular = fs.readFileSync(regularPath);
        this.fontBuffers.bold = fs.readFileSync(boldPath);
        this.logger.log(`PDF fonts loaded: regular=${regularPath} bold=${boldPath}`);
      } catch (err) {
        this.logger.warn(
          'Could not load Unicode fonts (Noto/DejaVu). Falling back to Helvetica (may break TR chars/₺).',
        );
      }
    }
  }

  /** PDF document oluşturucu — font desteği ile */
  private createPdfDoc(options?: ConstructorParameters<typeof PDFDocument>[0]) {
    this.loadFonts();
    const doc = new PDFDocument({ size: 'A4', margin: 0, ...options });

    // Register embedded fonts if available
    if (this.fontBuffers.regular) {
      doc.registerFont('NotoSans', this.fontBuffers.regular);
      doc.registerFont('NotoSans-Bold', this.fontBuffers.bold);
      // Set default font immediately to avoid garbled characters.
      doc.font('NotoSans');
    }

    return doc;
  }

  /** Get font name with fallback */
  private getFont(style: 'regular' | 'bold' = 'regular'): string {
    return this.fontBuffers.regular
      ? style === 'bold'
        ? 'NotoSans-Bold'
        : 'NotoSans'
      : 'Helvetica';
  }

  /** Format currency with Turkish Lira symbol */
  private formatCurrency(value: string): string {
    if (!value || value === '0' || value === '0.00') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    // Format with Turkish locale: 1.234,56 ₺
    return `${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
  }

  /**
   * Generate Excel file from tabular data.
   */
  async generateExcel(options: {
    sheetName: string;
    columns: Array<{ header: string; key: string; width?: number }>;
    rows: any[];
    title?: string;
  }): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SoftShopping';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(options.sheetName);

    // Title row
    if (options.title) {
      sheet.mergeCells(1, 1, 1, options.columns.length);
      const titleCell = sheet.getCell('A1');
      titleCell.value = options.title;
      titleCell.font = { size: 14, bold: true };
      titleCell.alignment = { horizontal: 'center' };
      sheet.addRow([]);
    }

    // Header
    sheet.columns = options.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? 18,
    }));

    const headerRow = sheet.getRow(options.title ? 3 : 1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E86AB' } };
    headerRow.alignment = { horizontal: 'center' };

    // Data rows
    for (const row of options.rows) {
      sheet.addRow(row);
    }

    // Auto-filter
    sheet.autoFilter = {
      from: { row: options.title ? 3 : 1, column: 1 },
      to: { row: sheet.rowCount, column: options.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Excel generated: ${options.sheetName} — ${options.rows.length} rows`);
    return Buffer.from(buffer);
  }

  /**
   * Generate PDF report.
   */
  async generatePdf(options: {
    title: string;
    subtitle?: string;
    sections: Array<{ heading: string; content: string | string[][] }>;
    footer?: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = this.createPdfDoc({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font(this.getFont('bold')).text(options.title, { align: 'center' });
      if (options.subtitle) {
        doc.fontSize(10).font(this.getFont()).text(options.subtitle, { align: 'center' });
      }
      doc.moveDown(1.5);

      // Sections
      for (const section of options.sections) {
        doc.fontSize(14).font(this.getFont('bold')).text(section.heading);
        doc.moveDown(0.5);

        if (typeof section.content === 'string') {
          doc.fontSize(10).font(this.getFont()).text(section.content);
        } else {
          // Table
          const tableData = section.content;
          if (tableData.length > 0) {
            const colWidth = (doc.page.width - 100) / tableData[0].length;
            for (let i = 0; i < tableData.length; i++) {
              const row = tableData[i];
              const y = doc.y;
              for (let j = 0; j < row.length; j++) {
                const x = 50 + j * colWidth;
                if (i === 0) {
                  doc.font(this.getFont('bold')).fontSize(9);
                } else {
                  doc.font(this.getFont()).fontSize(9);
                }
                doc.text(row[j]?.toString() ?? '', x, y, { width: colWidth - 5, align: 'left' });
              }
              doc.moveDown(0.3);
            }
          }
        }
        doc.moveDown(1);
      }

      // Footer
      doc
        .fontSize(8)
        .font(this.getFont())
        .text(
          options.footer ?? `SoftShopping — ${new Date().toLocaleDateString('tr-TR')}`,
          50,
          doc.page.height - 50,
          { align: 'center' },
        );

      doc.end();
    });
  }

  /**
   * Kurumsal Cari Hesap Ekstresi PDF'i
   * - Türkçe karakter desteği (Ubuntu font)
   * - Türk parası simgesi (₺)
   * - Profesyonel kurumsal tasarım
   */
  async generateCustomerStatementPdf(options: {
    tenantName: string;
    tenantTaxId?: string;
    tenantAddress?: string;
    tenantPhone?: string;
    customerLine: string;
    customerCode: string;
    customerTaxId?: string;
    customerAddress?: string;
    periodNote?: string;
    balanceNote: string;
    openingBalance?: string;
    closingBalance?: string;
    totalDebit?: string;
    totalCredit?: string;
    paper?: 'A4' | 'A5';
    orientation?: 'portrait' | 'landscape';
    rows: Array<{
      date: string;
      typeLabel: string;
      document: string;
      note: string;
      debit: string;
      credit: string;
      balance: string;
    }>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const paper = options.paper ?? 'A4';
        const orientation = options.orientation ?? 'portrait';
        const doc = this.createPdfDoc({ size: paper, layout: orientation, margin: 0 });
        const chunks: Buffer[] = [];

        const pageW = doc.page.width;
        const pageH = doc.page.height;
        const scale = pageW / 595.28; // relative to A4 portrait width
        const marginH = Math.round(36 * scale);
        const contentW = pageW - marginH * 2;

        // Minimal palette
        const ink = '#0f172a';
        const muted = '#64748b';
        const line = '#e2e8f0';
        const accent = '#2563eb';
        const rowAlt = '#f8fafc';

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let pageNum = 1;
        const bottomMargin = Math.round(50 * scale);

        // Minimal white background
        doc.rect(0, 0, pageW, pageH).fill('#ffffff');

        // ========== HEADER (minimal) ==========
        const titleSize = Math.max(12, Math.round(16 * scale));
        const small = Math.max(7, Math.round(9 * scale));
        const h1Y = Math.round(26 * scale);

        doc
          .fillColor(ink)
          .font(this.getFont('bold'))
          .fontSize(titleSize)
          .text('Cari Hesap Ekstresi', marginH, h1Y, { width: contentW });

        doc
          .fillColor(muted)
          .font(this.getFont())
          .fontSize(small)
          .text(options.tenantName, marginH, h1Y + Math.round(18 * scale), {
            width: contentW * 0.65,
          });

        doc
          .fillColor(muted)
          .font(this.getFont())
          .fontSize(small)
          .text(
            `Tarih: ${new Date().toLocaleDateString('tr-TR')} · ${options.periodNote || 'Tüm Dönemler'}`,
            marginH,
            h1Y + Math.round(34 * scale),
            { width: contentW },
          );

        // Accent line
        const lineY = h1Y + Math.round(52 * scale);
        doc.rect(marginH, lineY, contentW, Math.max(1, Math.round(1.5 * scale))).fill(accent);

        // ========== SUMMARY (single row) ==========
        const summaryY = lineY + Math.round(10 * scale);
        const debitText = this.formatCurrency(options.totalDebit || '0');
        const creditText = this.formatCurrency(options.totalCredit || '0');
        const closingText = options.closingBalance
          ? this.formatCurrency(options.closingBalance)
          : options.balanceNote;

        doc
          .fillColor(ink)
          .font(this.getFont('bold'))
          .fontSize(Math.max(8, Math.round(10 * scale)))
          .text('Borç:', marginH, summaryY, { continued: true })
          .font(this.getFont())
          .text(` ${debitText}   `, { continued: true })
          .font(this.getFont('bold'))
          .text('Alacak:', { continued: true })
          .font(this.getFont())
          .text(` ${creditText}   `, { continued: true })
          .font(this.getFont('bold'))
          .text('Kapanış:', { continued: true })
          .font(this.getFont())
          .text(` ${closingText}`);

        // ========== CUSTOMER ==========
        const custY = summaryY + Math.round(18 * scale);
        doc
          .fillColor(muted)
          .font(this.getFont())
          .fontSize(small)
          .text(
            `Cari: ${options.customerLine} · Kod: ${options.customerCode}${options.customerTaxId ? ` · VKN: ${options.customerTaxId}` : ''}`,
            marginH,
            custY,
            { width: contentW },
          );

        // ========== TRANSACTIONS TABLE ==========
        // Minimal layout: go straight into the table after header/summary/customer line.
        const currentY = custY + Math.round(26 * scale);

        const tableTop = currentY;

        // Column definitions
        const weights =
          orientation === 'landscape'
            ? [0.11, 0.14, 0.16, 0.3, 0.1, 0.1, 0.09]
            : [0.12, 0.14, 0.16, 0.27, 0.11, 0.11, 0.09];

        const cols = [
          { header: 'Tarih', width: Math.max(50, Math.floor(contentW * weights[0])) },
          { header: 'İşlem Türü', width: Math.max(70, Math.floor(contentW * weights[1])) },
          { header: 'Belge No', width: Math.max(70, Math.floor(contentW * weights[2])) },
          { header: 'Açıklama', width: Math.max(110, Math.floor(contentW * weights[3])) },
          {
            header: 'Borç (₺)',
            width: Math.max(55, Math.floor(contentW * weights[4])),
            align: 'right' as const,
          },
          {
            header: 'Alacak (₺)',
            width: Math.max(60, Math.floor(contentW * weights[5])),
            align: 'right' as const,
          },
          {
            header: 'Bakiye (₺)',
            width: Math.max(60, Math.floor(contentW * weights[6])),
            align: 'right' as const,
          },
        ];

        // Calculate column positions
        const colX: number[] = [marginH];
        for (let i = 0; i < cols.length - 1; i++) {
          colX.push(colX[i] + cols[i].width);
        }

        const tableWidth = cols.reduce((sum, c) => sum + c.width, 0);

        // Table header
        const headerRowH = Math.round(24 * scale);
        doc.rect(marginH, tableTop, tableWidth, headerRowH).fill(ink);

        const tableFont = Math.max(6, Math.round(8 * scale));
        doc.fillColor('#ffffff').font(this.getFont('bold')).fontSize(tableFont);
        for (let i = 0; i < cols.length; i++) {
          const xPos = colX[i] + (cols[i].align === 'right' ? cols[i].width - 8 : 8);
          doc.text(cols[i].header, xPos, tableTop + Math.round(8 * scale), {
            width: cols[i].width - 12,
            align: cols[i].align || 'left',
          });
        }

        // Table rows
        let rowY = tableTop + headerRowH;
        const rowH = Math.round(20 * scale);
        let isAlternate = false;

        for (const row of options.rows) {
          // Check if we need a new page
          if (rowY + rowH > pageH - bottomMargin) {
            // Draw footer on current page
            this.drawTableFooter(doc, pageNum, pageH, bottomMargin, marginH, contentW);

            // New page
            doc.addPage({ size: paper, layout: orientation, margin: 0 });
            pageNum++;
            rowY = 40;

            // Repeat header on new page
            doc.rect(marginH, rowY, tableWidth, headerRowH).fill(ink);
            doc.fillColor('#ffffff').font(this.getFont('bold')).fontSize(tableFont);
            for (let i = 0; i < cols.length; i++) {
              const xPos = colX[i] + (cols[i].align === 'right' ? cols[i].width - 8 : 8);
              doc.text(cols[i].header, xPos, rowY + Math.round(8 * scale), {
                width: cols[i].width - 12,
                align: cols[i].align || 'left',
              });
            }
            rowY += headerRowH;
          }

          // Row background
          const bgColor = isAlternate ? rowAlt : '#ffffff';
          doc.rect(marginH, rowY, tableWidth, rowH).fill(bgColor);

          // Row border
          doc
            .strokeColor(line)
            .lineWidth(0.25)
            .moveTo(marginH, rowY + rowH)
            .lineTo(marginH + tableWidth, rowY + rowH)
            .stroke();

          // Row data
          doc.fillColor('#2d3748').font(this.getFont()).fontSize(tableFont);

          // Date
          doc.text(row.date, colX[0] + 6, rowY + 6, { width: cols[0].width - 12 });
          // Type
          doc.text(row.typeLabel, colX[1] + 6, rowY + 6, { width: cols[1].width - 12 });
          // Document
          doc.text(row.document, colX[2] + 6, rowY + 6, { width: cols[2].width - 12 });
          // Note
          const noteMax = orientation === 'landscape' ? 60 : paper === 'A5' ? 28 : 40;
          doc.text(row.note.substring(0, noteMax), colX[3] + 6, rowY + 6, {
            width: cols[3].width - 12,
          });
          // Debit
          doc.text(row.debit ? this.formatCurrency(row.debit) : '-', colX[4] + 4, rowY + 6, {
            width: cols[4].width - 12,
            align: 'right',
          });
          // Credit
          doc.text(row.credit ? this.formatCurrency(row.credit) : '-', colX[5] + 4, rowY + 6, {
            width: cols[5].width - 12,
            align: 'right',
          });
          // Balance
          const balanceColor = parseFloat(row.balance) >= 0 ? ink : '#b91c1c';
          doc
            .fillColor(balanceColor)
            .font(this.getFont('bold'))
            .fontSize(tableFont)
            .text(this.formatCurrency(row.balance), colX[6] + 4, rowY + 6, {
              width: cols[6].width - 12,
              align: 'right',
            });

          isAlternate = !isAlternate;
          rowY += rowH;
        }

        // ========== FOOTER ==========
        this.drawTableFooter(doc, pageNum, pageH, bottomMargin, marginH, contentW);

        doc.end();
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  private drawTableFooter(
    doc: PDFKit.PDFDocument,
    pageNum: number,
    pageH: number,
    bottomMargin: number,
    marginH: number,
    contentW: number,
  ) {
    const footerY = pageH - bottomMargin;

    // Separator line
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .moveTo(marginH, footerY - 15)
      .lineTo(marginH + contentW, footerY - 15)
      .stroke();

    // Footer text
    doc
      .fillColor('#718096')
      .font(this.getFont())
      .fontSize(7)
      .text('SoftShopping Cari Hesap Ekstresi', marginH, footerY - 8);

    doc.text(
      `Sayfa ${pageNum} · Oluşturma: ${new Date().toLocaleString('tr-TR')}`,
      marginH + contentW - 150,
      footerY - 8,
      { width: 150, align: 'right' },
    );
  }
}
