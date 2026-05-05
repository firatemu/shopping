import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
    private readonly logger = new Logger(ExportService.name);

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
        workbook.creator = 'TextilePOS';
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
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text(options.title, { align: 'center' });
            if (options.subtitle) {
                doc.fontSize(10).font('Helvetica').text(options.subtitle, { align: 'center' });
            }
            doc.moveDown(1.5);

            // Sections
            for (const section of options.sections) {
                doc.fontSize(14).font('Helvetica-Bold').text(section.heading);
                doc.moveDown(0.5);

                if (typeof section.content === 'string') {
                    doc.fontSize(10).font('Helvetica').text(section.content);
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
                                    doc.font('Helvetica-Bold').fontSize(9);
                                } else {
                                    doc.font('Helvetica').fontSize(9);
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
            doc.fontSize(8).font('Helvetica')
                .text(options.footer ?? `TextilePOS — ${new Date().toLocaleDateString('tr-TR')}`, 50, doc.page.height - 50, { align: 'center' });

            doc.end();
        });
    }
}
