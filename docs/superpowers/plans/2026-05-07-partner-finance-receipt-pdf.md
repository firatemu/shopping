# Partner Finance Receipt PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partner finance operasyonları (tahsilat, ödeme, bordro fişi) için `ExportService` tabanlı profesyonel PDF makbuz şablonu — A4/A5 ve portrait/landscape destekli.

**Architecture:** `ExportService.generatePartnerFinanceReceiptPdf()` metodu, mevcut `generateCustomerStatementPdf()` ile aynı pdfkit altyapısını ve görsel dili kullanır. `PartnerFinanceController`'a yeni PDF endpoint eklenir. Frontend'de mevcut metin makbuz yerine blob iframe preview'a geçilir.

**Tech Stack:** pdfkit, pdfkit-table yetenekleri (mevcut), ExportService, PartnerFinanceController, TanStack Query, iframe blob URL

---

## Before Starting

Read these files before writing any code:
- `apps/api/src/common/services/export.service.ts` (hatırla: createPdfDoc, loadFonts, formatCurrency, drawTableFooter, getFont, scale/formül yapısı)
- `apps/api/src/modules/partner-finance/partner-finance.service.ts:465-540` (generateOperationReceipt mevcut metin yapısı)
- `apps/api/src/modules/partner-finance/partner-finance.controller.ts` (mevcut receipt endpoint yapısı)
- `apps/web/src/app/(main)/finance/operations/page.tsx` (print butonu mevcut çağrısı)
- `apps/web/src/app/(main)/customers/[id]/statement/preview/page.tsx` (blob iframe preview pattern)

---

## Task 1: ExportService — generatePartnerFinanceReceiptPdf()

**Files:**
- Modify: `apps/api/src/common/services/export.service.ts` (ekle: new method + helper if needed)

- [ ] **Step 1: Add generatePartnerFinanceReceiptPdf() method**

Insert after `generateCustomerStatementPdf()` (after line 543, before the closing `}` of the class).

```typescript
async generatePartnerFinanceReceiptPdf(options: {
  tenantName: string;
  tenantTaxId?: string;
  documentNo: string;
  operationDate: string;
  operationKindLabel: string;
  customerLine: string;
  customerCode: string;
  amount: string;
  isCollection: boolean;
  bankAccountInfo?: string;
  description: string;
  paper?: 'A4' | 'A5';
  orientation?: 'portrait' | 'landscape';
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const paper = options.paper ?? 'A4';
      const orientation = options.orientation ?? 'portrait';
      const doc = this.createPdfDoc({ size: paper, layout: orientation, margin: 0 });
      const chunks: Buffer[] = [];

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const scale = pageW / 595.28;
      const marginH = Math.round(36 * scale);
      const contentW = pageW - marginH * 2;

      const ink = '#0f172a';
      const muted = '#64748b';
      const line = '#e2e8f0';
      const accent = '#2563eb';
      const rowAlt = '#f8fafc';

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // White background
      doc.rect(0, 0, pageW, pageH).fill('#ffffff');

      const titleSize = Math.max(12, Math.round(16 * scale));
      const small = Math.max(7, Math.round(9 * scale));
      const h1Y = Math.round(26 * scale);

      // ========== HEADER ==========
      doc
        .fillColor(ink)
        .font(this.getFont('bold'))
        .fontSize(titleSize)
        .text('Cari Hesap Makbuzu', marginH, h1Y, { width: contentW });

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
          `Tarih: ${options.operationDate}`,
          marginH,
          h1Y + Math.round(34 * scale),
          { width: contentW },
        );

      // Accent line
      const lineY = h1Y + Math.round(52 * scale);
      doc.rect(marginH, lineY, contentW, Math.max(1, Math.round(1.5 * scale))).fill(accent);

      // ========== INFO CARD ==========
      const cardY = lineY + Math.round(14 * scale);
      const cardRowH = Math.round(22 * scale);
      const cardLeftW = Math.round(contentW * 0.55);
      const cardRightW = contentW - cardLeftW;

      // Left card: Belge No | Cari
      doc.fillColor(ink).font(this.getFont('bold')).fontSize(small);
      doc.text('Belge No:', marginH, cardY, { width: cardLeftW * 0.4 });
      doc.font(this.getFont()).text(options.documentNo, marginH + cardLeftW * 0.4, cardY, {
        width: cardLeftW * 0.6,
      });

      doc.font(this.getFont('bold')).text('Cari:', marginH, cardY + cardRowH, { width: cardLeftW * 0.4 });
      doc.font(this.getFont()).text(`${options.customerLine} (${options.customerCode})`, marginH + cardLeftW * 0.4, cardY + cardRowH, {
        width: cardLeftW * 0.6,
      });

      // Right card: İşlem Türü | Tutar
      const rightX = marginH + cardLeftW;
      doc.font(this.getFont('bold')).text('İşlem Türü:', rightX, cardY, { width: cardRightW * 0.5 });
      doc.font(this.getFont()).text(options.operationKindLabel, rightX + cardRightW * 0.5, cardY, {
        width: cardRightW * 0.5,
      });

      const amountNum = parseFloat(options.amount);
      const displayAmount = this.formatCurrency(options.amount);
      doc.font(this.getFont('bold')).text('Tutar:', rightX, cardY + cardRowH, { width: cardRightW * 0.5 });
      doc.fillColor('#2563eb').font(this.getFont('bold')).fontSize(Math.max(9, Math.round(11 * scale)));
      doc.text(displayAmount, rightX + cardRightW * 0.5, cardY + cardRowH, {
        width: cardRightW * 0.5,
        align: 'right',
      });
      doc.fillColor(ink);

      // Separator line
      const separatorY = cardY + cardRowH * 2 + Math.round(10 * scale);
      doc.rect(marginH, separatorY, contentW, Math.max(1, Math.round(0.5 * scale))).fill(line);

      // ========== DESCRIPTION TABLE ==========
      const tableTop = separatorY + Math.round(12 * scale);

      // Column definitions
      const colNoteW = Math.round(contentW * 0.7);
      const colAmountW = Math.round(contentW * 0.3);
      const tableWidth = colNoteW + colAmountW;

      // Header row
      const headerRowH = Math.round(24 * scale);
      doc.rect(marginH, tableTop, tableWidth, headerRowH).fill(ink);
      const tableFont = Math.max(6, Math.round(8 * scale));
      doc.fillColor('#ffffff').font(this.getFont('bold')).fontSize(tableFont);
      doc.text('AÇIKLAMA', marginH + 8, tableTop + Math.round(8 * scale), {
        width: colNoteW - 16,
      });
      doc.text('TUTAR (₺)', marginH + colNoteW + 4, tableTop + Math.round(8 * scale), {
        width: colAmountW - 12,
        align: 'right',
      });

      // Data row
      const rowH = Math.round(24 * scale);
      let rowY = tableTop + headerRowH;

      doc.rect(marginH, rowY, tableWidth, rowH).fill('#ffffff');
      doc.strokeColor(line).lineWidth(0.25).moveTo(marginH, rowY + rowH).lineTo(marginH + tableWidth, rowY + rowH).stroke();

      doc.fillColor('#2d3748').font(this.getFont()).fontSize(tableFont);
      const noteMax = orientation === 'landscape' ? 70 : paper === 'A5' ? 35 : 50;
      doc.text((options.description || '—').substring(0, noteMax), marginH + 8, rowY + 6, {
        width: colNoteW - 16,
      });
      doc
        .fillColor(ink)
        .font(this.getFont('bold'))
        .fontSize(tableFont)
        .text(displayAmount, marginH + colNoteW + 4, rowY + 6, {
          width: colAmountW - 12,
          align: 'right',
        });

      // ========== SUMMARY ROW ==========
      rowY += rowH;
      const signLabel = options.isCollection ? 'ALACAK' : 'BORÇ';
      const signColor = options.isCollection ? '#16a34a' : '#b91c1c';

      doc.rect(marginH, rowY, tableWidth, rowH).fill(rowAlt);
      doc
        .strokeColor(line)
        .lineWidth(0.25)
        .moveTo(marginH, rowY + rowH)
        .lineTo(marginH + tableWidth, rowY + rowH)
        .stroke();

      doc
        .fillColor(signColor)
        .font(this.getFont('bold'))
        .fontSize(tableFont)
        .text(`(${signLabel})`, marginH + 8, rowY + 6, { width: colNoteW - 16 })
        .text(displayAmount, marginH + colNoteW + 4, rowY + 6, {
          width: colAmountW - 12,
          align: 'right',
        });

      // Thick divider
      rowY += rowH + Math.round(8 * scale);
      doc.rect(marginH, rowY, tableWidth, Math.max(1, Math.round(2 * scale))).fill(ink);

      // ========== SIGNATURE ROW ==========
      rowY += Math.round(14 * scale);
      doc
        .fillColor(muted)
        .font(this.getFont())
        .fontSize(Math.max(7, Math.round(9 * scale)))
        .text('Hazırlayan: ___________________', marginH, rowY, { width: contentW * 0.45 })
        .text('Onay: ___________________', marginH + contentW * 0.55, rowY, {
          width: contentW * 0.45,
        });

      // ========== FOOTER ==========
      const footerY = pageH - Math.round(50 * scale);
      doc
        .strokeColor(line)
        .lineWidth(0.5)
        .moveTo(marginH, footerY - 12)
        .lineTo(marginH + contentW, footerY - 12)
        .stroke();

      doc
        .fillColor('#718096')
        .font(this.getFont())
        .fontSize(7)
        .text('TextilePOS Makbuz', marginH, footerY - 8);

      doc.text(
        `Oluşturma: ${new Date().toLocaleString('tr-TR')}`,
        marginH + contentW - 180,
        footerY - 8,
        { width: 180, align: 'right' },
      );

      doc.end();
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
```

- [ ] **Step 2: Run build to verify no syntax errors**

```bash
cd /home/azem/projects/shopping/apps/api && npm run build 2>&1 | tail -10
```
Expected: success (no new warnings related to export.service.ts)

- [ ] **Step 3: Commit**

```bash
cd /home/azem/projects/shopping && git add apps/api/src/common/services/export.service.ts && git commit -m "feat(api): add generatePartnerFinanceReceiptPdf() to ExportService"
```

---

## Task 2: PartnerFinanceService — generateOperationReceiptPdf()

**Files:**
- Modify: `apps/api/src/modules/partner-finance/partner-finance.service.ts` (ekle: generateOperationReceiptPdf method)

- [ ] **Step 1: Add generateOperationReceiptPdf() after generateOperationReceipt()**

Find the end of `generateOperationReceipt()` (around line 555 in the file) and add after it:

```typescript
async generateOperationReceiptPdf(
  tenantId: string,
  id: string,
  options?: { paper?: 'A4' | 'A5'; orientation?: 'portrait' | 'landscape' },
) {
  const op = await this.prisma.partnerFinanceOperation.findFirst({
    where: { id, tenantId, isDeleted: false },
    include: { customer: true, bankAccount: true },
  });
  if (!op) throw new NotFoundException('İşlem bulunamadı');

  const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundException('Tenant bulunamadı');

  const KIND_LABEL: Record<string, string> = {
    CASH_COLLECTION: 'Nakit tahsilat',
    CARD_COLLECTION: 'Kredi kartı tahsilat (POS)',
    TRANSFER_IN: 'Gelen havale/EFT',
    CHECK_RECEIVED: 'Alınan çek',
    PROMISSORY_RECEIVED: 'Alınan senet',
    CASH_PAYMENT: 'Nakit ödeme',
    CARD_PAYMENT: 'Firma kredi kartı ödemesi',
    TRANSFER_OUT: 'Giden havale/EFT',
    CHECK_ISSUED: 'Verilen çek',
    PROMISSORY_ISSUED: 'Verilen senet',
    DEBIT_VOUCHER: 'Borç dekontu',
    CREDIT_VOUCHER: 'Alacak dekontu',
  };

  const custName = op.customer.companyName
    ?? `${op.customer.name} ${op.customer.surname ?? ''}`.trim();

  const isCollection = [
    'CASH_COLLECTION', 'CARD_COLLECTION', 'TRANSFER_IN',
    'CHECK_RECEIVED', 'PROMISSORY_RECEIVED', 'CREDIT_VOUCHER',
  ].includes(op.kind);

  return this.exportService.generatePartnerFinanceReceiptPdf({
    tenantName: tenant.name,
    tenantTaxId: tenant.taxId ?? undefined,
    documentNo: op.documentNo,
    operationDate: new Date(op.operationDate).toLocaleDateString('tr-TR'),
    operationKindLabel: KIND_LABEL[op.kind] ?? op.kind,
    customerLine: custName,
    customerCode: op.customer.code,
    amount: op.amount.toString(),
    isCollection,
    bankAccountInfo: op.bankAccount
      ? `${op.bankAccount.name} (${op.bankAccount.accountNumber ?? '—'})`
      : undefined,
    description: op.description ?? '—',
    paper: options?.paper,
    orientation: options?.orientation,
  });
}
```

Inject `ExportService` in the constructor if not already present. Check if `ExportService` is already imported/injected in `PartnerFinanceService`. If not, add to constructor params and module.

- [ ] **Step 2: Run build**

```bash
cd /home/azem/projects/shopping/apps/api && npm run build 2>&1 | grep -E "error|ERROR|partner-finance" | head -20
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /home/azem/projects/shopping && git add apps/api/src/modules/partner-finance/partner-finance.service.ts && git commit -m "feat(api): add generateOperationReceiptPdf() to PartnerFinanceService"
```

---

## Task 3: PartnerFinanceController — PDF endpoint

**Files:**
- Modify: `apps/api/src/modules/partner-finance/partner-finance.controller.ts` (ekle: new GET endpoint)

- [ ] **Step 1: Add PDF receipt endpoint**

Find the existing `GetReceipt` endpoint (around `@Get(':id/receipt')`). Add after it:

```typescript
@Get(':id/receipt/pdf')
@ApiOperation({ summary: 'Download partner finance operation receipt as PDF' })
@ApiQuery({ name: 'paper', required: false, enum: ['A4', 'A5'] })
@ApiQuery({ name: 'orientation', required: false, enum: ['portrait', 'landscape'] })
async getReceiptPdf(
  @Param('id') id: string,
  @Query('paper') paper?: 'A4' | 'A5',
  @Query('orientation') orientation?: 'portrait' | 'landscape',
) {
  const user = Request.user;
  const buffer = await this.partnerFinanceService.generateOperationReceiptPdf(
    user.tenantId,
    id,
    { paper, orientation },
  );
  const filename = `makbuz_${id.substring(0, 8)}.pdf`;
  return new StreamableFile(new ReadableBuffer(buffer), {
    disposition: `attachment; filename="${filename}"`,
    type: 'application/pdf',
  });
}
```

Note: If `StreamableFile` from `@nestjs/common` or a custom wrapper is not available, use the same pattern as `customer.controller.ts` for PDF downloads — return `Response` with buffer directly.

Check how `customer.controller.ts` returns PDF (around line 150) for the exact pattern used.

- [ ] **Step 2: Run build**

```bash
cd /home/azem/projects/shopping/apps/api && npm run build 2>&1 | grep -E "error|ERROR" | head -10
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /home/azem/projects/shopping && git add apps/api/src/modules/partner-finance/partner-finance.controller.ts && git commit -m "feat(api): add GET /partner-finance/operations/:id/receipt/pdf endpoint"
```

---

## Task 4: Frontend — operations list page print button → PDF

**Files:**
- Modify: `apps/web/src/app/(main)/finance/operations/page.tsx`

- [ ] **Step 1: Find and replace the print handler**

Find the existing print button handler in the component (around line 69 where `api.get(`/partner-finance/operations/${opId}/receipt`)` is called). Replace the entire print flow with blob iframe preview.

The new pattern should:
1. Show a small modal or inline panel with paper/orientation selectors
2. On select/confirm, fetch `GET /api/v1/partner-finance/operations/:id/receipt/pdf?paper=A4&orientation=portrait` with `responseType: 'blob'`
3. Create `URL.createObjectURL(blob)` and open in iframe OR `window.open()` with blob URL

Reference the pattern from `apps/web/src/app/(main)/customers/[id]/statement/preview/page.tsx`.

The key change is `api.get(...{ responseType: 'blob' })` then create blob URL for the iframe source.

- [ ] **Step 2: Run build**

```bash
cd /home/azem/projects/shopping && npm run build --workspace=apps/web 2>&1 | grep -E "error|ERROR" | head -10
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /home/azem/projects/shopping && git add apps/web/src/app/\(main\)/finance/operations/page.tsx && git commit -m "feat(web): upgrade operations print to PDF with paper/orientation selectors"
```

---

## Task 5: Frontend — operations detail page download button

**Files:**
- Modify: `apps/web/src/app/(main)/finance/operations/[id]/page.tsx`

- [ ] **Step 1: Add paper/orientation selectors + download button**

Read the current detail page to understand its structure. Add:
1. A small form group with `paper` dropdown (A4/A5) and `orientation` dropdown (portrait/landscape)
2. A "PDF İndir" button that calls `downloadAuthenticatedFile('/partner-finance/operations/:id/receipt/pdf', { params: { paper, orientation } })`
3. An iframe preview panel that reloads when paper/orientation changes

Reference the customer statement preview page for the exact component structure and state management pattern.

- [ ] **Step 2: Run build**

```bash
cd /home/azem/projects/shopping && npm run build --workspace=apps/web 2>&1 | grep -E "error|ERROR" | head -10
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd /home/azem/projects/shopping && git add "apps/web/src/app/(main)/finance/operations/[id]/page.tsx" && git commit -m "feat(web): add PDF download with paper/orientation to operations detail page"
```

---

## Task 6: Final verification

- [ ] **Step 1: Full build**

```bash
cd /home/azem/projects/shopping && npm run build --workspace=apps/api && npm run build --workspace=apps/web
```
Expected: both pass

- [ ] **Step 2: Prisma validate**

```bash
cd /home/azem/projects/shopping/apps/api && npx prisma validate && npx prisma generate
```
Expected: success

- [ ] **Step 3: Commit**

```bash
cd /home/azem/projects/shopping && git add -A && git commit -m "feat: partner finance receipt PDF with A4/A5 and portrait/landscape support"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| PDF şablonu (ExportService) | Task 1 |
| A4/A5 kağıt desteği | Task 1 |
| Portrait/landscape desteği | Task 1 |
| API endpoint | Task 3 |
| Frontend preview | Task 4 |
| Detail page download | Task 5 |
| Görsel dil (accent, palette) | Task 1 (matches customer statement) |
