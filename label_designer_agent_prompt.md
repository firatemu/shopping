# Label Designer Module — AI Agent Specification Prompt

## Role & Objective

You are an expert frontend engineer specializing in **industrial label design software**. Your task is to build a fully functional, production-grade **Label Designer Page** as a single-file React component (`.jsx`). This designer is part of a retail/warehouse product management system. Labels will be physically printed on a thermal label printer that supports **ZPL (Zebra Programming Language)** output.

You must produce **zero hallucinated APIs, zero placeholder functions, and zero fake data**. Every feature you implement must be genuinely functional in-browser. If a feature cannot be implemented in the current scope, stub it explicitly with a comment `// FUTURE: <reason>` — never silently fake it.

---

## Tech Stack & Constraints

- **Framework**: React (with hooks: useState, useRef, useEffect, useCallback, useReducer)
- **Styling**: Tailwind CSS utility classes only (no custom CSS files, no styled-components)
- **Icons**: `lucide-react` only (import by name)
- **No external dependencies** beyond what is listed above
- **Single file**: All logic, state, and UI in one `.jsx` file with a default export
- **No localStorage / sessionStorage** — all state lives in React memory
- **No backend calls** in this phase — ZPL export is generated client-side as a string

---

## Core Concepts

### Coordinate System
- The canvas represents the physical label surface
- All positions and dimensions are stored internally in **millimeters (mm)**
- The canvas renders at a configurable **DPI scale** (default: 8px per mm) so 1 mm = 8px on screen
- When exporting to ZPL, convert mm → dots using 8 dots/mm (203 DPI printer default)
- The rendered canvas size **must be pixel-perfect proportional** to the real label — no stretching, no padding distortion

### Label Size
- User sets label width and height in mm via numeric inputs (integer or decimal, min 10mm, max 300mm)
- Default: 100mm × 60mm
- Changing label size resets the canvas but prompts confirmation if elements exist

---

## Canvas & Element System

### Canvas Area
- Rendered as an absolutely-positioned `div` with a white background, drop shadow, and grid overlay (light gray 1mm grid lines at scale)
- Surrounded by a dark workspace background (dark gray/charcoal)
- Canvas is scrollable/pannable if it exceeds the viewport — center it by default
- A ruler (mm units) runs along the top and left edges of the canvas

### Element Model
Each element on the canvas is an object with this shape:
```js
{
  id: string,           // uuid-like: "el_" + Date.now()
  type: string,         // see Element Types below
  x: number,            // mm from left edge
  y: number,            // mm from top edge
  width: number,        // mm
  height: number,       // mm
  rotation: number,     // degrees: 0 | 90 | 180 | 270
  locked: boolean,      // if true, cannot be moved/resized
  zIndex: number,       // stacking order
  // type-specific props below:
  content?: string,     // for text, freeText
  fontSize?: number,    // pt
  fontWeight?: string,  // "normal" | "bold"
  align?: string,       // "left" | "center" | "right"
  fieldKey?: string,    // for bound fields: "productCode", "barcode", etc.
  barcodeType?: string, // "CODE128" | "QR" | "EAN13" | "EAN8" | "CODE39" | "UPCA"
  barcodeValue?: string,// static value or "" to use fieldKey at print time
  showText?: boolean,   // show human-readable text below barcode
  strokeColor?: string, // hex
  strokeWidth?: number, // mm
  fillColor?: string,   // hex or "transparent"
  radius?: number,      // mm, for oval/rounded rect
  lineDirection?: string, // "horizontal" | "vertical" | "diagonal"
}
```

### Element Types

| type | Description |
|------|-------------|
| `boundField` | Displays a product field value (text). Bound to a `fieldKey`. Shows field name as placeholder on canvas. |
| `barcode` | Renders a 1D or 2D barcode using the `barcodeValue` or `fieldKey` at print time. On canvas: render a visual placeholder barcode pattern. |
| `freeText` | Static user-typed text |
| `line` | Straight line (horizontal, vertical, or diagonal) |
| `rect` | Rectangle with optional fill and stroke |
| `oval` | Ellipse/circle with optional fill and stroke |

---

## Product Field Definitions

These are the draggable field chips available in the left panel. Each maps to a `fieldKey`:

```js
const PRODUCT_FIELDS = [
  { key: "productCode",   label: "Product Code",    icon: "Hash" },
  { key: "productName",   label: "Product Name",    icon: "Tag" },
  { key: "barcode",       label: "Barcode (QR)",    icon: "QrCode" },
  { key: "barcode1D",     label: "Barcode (1D)",    icon: "BarChart2" },
  { key: "salePrice",     label: "Sale Price",      icon: "DollarSign" },
  { key: "currency",      label: "Currency",        icon: "Coins" },
  { key: "color",         label: "Color",           icon: "Palette" },
  { key: "size",          label: "Size",            icon: "Ruler" },
  { key: "brand",         label: "Brand",           icon: "Briefcase" },
  { key: "category",      label: "Category",        icon: "Layers" },
  { key: "stockCode",     label: "Stock Code",      icon: "Archive" },
  { key: "description",   label: "Description",     icon: "FileText" },
  { key: "origin",        label: "Origin Country",  icon: "Globe" },
  { key: "sku",           label: "SKU",             icon: "Package" },
  { key: "weight",        label: "Weight",          icon: "Scale" },
];
```

When a `boundField` is dropped onto the canvas:
- If `fieldKey` is `"barcode"` → create a `barcode` element with `barcodeType: "QR"`
- If `fieldKey` is `"barcode1D"` → create a `barcode` element with `barcodeType: "CODE128"`
- Otherwise → create a `boundField` text element

---

## Drag & Drop — Exact Behavior

### Dragging from Field Panel to Canvas
1. User grabs a field chip from the left panel
2. A ghost element follows the cursor
3. On drop inside the canvas: calculate mm position from drop pixel coordinates relative to canvas origin
4. Snap to 0.5mm grid
5. Create a new element at that position with sensible defaults (e.g., 40mm × 8mm for text, 30mm × 30mm for QR)

### Moving Elements on Canvas
1. Click to select an element → show selection handles (blue border + 8 resize handles)
2. Drag the element body to reposition (update x, y in mm)
3. Snap to 0.5mm grid while dragging
4. Show live mm coordinates in a tooltip during drag

### Resizing Elements
1. Drag any of the 8 corner/edge handles to resize
2. Hold Shift to maintain aspect ratio
3. Minimum size: 3mm × 3mm
4. Show live dimensions in a tooltip during resize

### Multi-select
- Click + drag on empty canvas area to rubber-band select
- Shift+click to add/remove from selection
- Move all selected elements together

---

## Left Panel — Structure

```
┌─────────────────────┐
│  📐 Label Size      │
│  W: [___] mm        │
│  H: [___] mm        │
├─────────────────────┤
│  🗂 Product Fields  │
│  [drag chips list]  │
├─────────────────────┤
│  ✏️ Drawing Tools   │
│  [Free Text]        │
│  [Line]             │
│  [Rectangle]        │
│  [Oval]             │
├─────────────────────┤
│  📋 Layers          │
│  [element list]     │
│  (click=select,     │
│   drag=reorder)     │
└─────────────────────┘
```

### Drawing Tools Behavior
- Click a tool button to activate it (cursor changes)
- Then click-drag on the canvas to draw the shape
- After drawing, tool deactivates and the new element is selected
- Free Text: click on canvas → place a text element → immediately enter inline edit mode

---

## Right Panel — Properties Inspector

Shows properties of the **currently selected element**. Sections:

### For all elements:
- Position: X (mm), Y (mm) — numeric inputs
- Size: W (mm), H (mm) — numeric inputs
- Rotation: 0 / 90 / 180 / 270 — segmented button group
- Lock toggle
- Delete button
- Z-order: Bring Forward / Send Backward / Bring to Front / Send to Back

### For `boundField` / `freeText`:
- Font size (pt): numeric input (6–72)
- Font weight: Normal / Bold toggle
- Text align: Left / Center / Right
- Text color: color picker
- Content (freeText only): textarea

### For `barcode`:
- Barcode type selector: CODE128, CODE39, EAN-13, EAN-8, UPC-A, QR Code, PDF-417, DataMatrix
- Static value input (overrides field binding if filled)
- Show text below: checkbox (for 1D barcodes)
- Module width (mm): 0.3 default

### For `line` / `rect` / `oval`:
- Stroke color: color picker
- Stroke width (mm): numeric input
- Fill color: color picker + "Transparent" toggle
- For `rect`: corner radius (mm)

---

## Top Toolbar

Left side:
- App name / logo: "LabelStudio"
- Label name input field (editable, default "New Label")

Center:
- Undo (Ctrl+Z)
- Redo (Ctrl+Y)
- Delete selected
- Duplicate selected
- Group (future)

Right side:
- Zoom: [-] [100%] [+] and fit-to-screen button
- Grid toggle (show/hide grid lines)
- Snap toggle (enable/disable snapping)
- [Export ZPL] button — generates ZPL string and opens a modal with the code + copy button
- [Save Design] button — downloads a `.json` file of the current design state
- [Load Design] button — opens a file picker to load a `.json` design file

---

## Barcode Rendering on Canvas

Use this approach for **visual-only canvas rendering** (not for actual printing):

### QR Code
- Render a placeholder SVG that looks like a QR code grid pattern
- Draw a 25×25 grid of small squares with random-but-deterministic fill (seed from fieldKey)
- Show the field label text below if `showText` is true
- **Do NOT use any barcode library** — draw pure SVG

### 1D Barcodes (CODE128, EAN, etc.)
- Render a placeholder of alternating thin/thick vertical black bars
- Bars generated deterministically from the barcodeType string length
- Show the barcode type name as tiny text below

> **Note to agent**: These are canvas previews only. Actual scannable barcodes are generated at ZPL export time using ZPL barcode commands, not rendered on screen.

---

## ZPL Export Logic

When user clicks **Export ZPL**, generate a ZPL II string. Conversion rules:

```
1 mm = 8 dots (203 DPI)
x_dots = Math.round(element.x * 8)
y_dots = Math.round(element.y * 8)
w_dots = Math.round(element.width * 8)
h_dots = Math.round(element.height * 8)
```

### ZPL Structure:
```
^XA
^PW{labelWidth_dots}
^LL{labelHeight_dots}
... (one block per element, sorted by zIndex) ...
^XZ
```

### Per-element ZPL mapping:

| Element type | ZPL command |
|---|---|
| `boundField` / `freeText` | `^FO{x},{y}^A0{rotation_char},{h_dots},{w_dots}^FD{content or fieldKey placeholder}^FS` |
| `barcode` QR | `^FO{x},{y}^BQN,2,{moduleSize}^FDMM,A{value}^FS` |
| `barcode` CODE128 | `^FO{x},{y}^BY{moduleWidth_dots}^BCN,{h_dots},Y,N,N^FD{value}^FS` |
| `barcode` EAN13 | `^FO{x},{y}^BY{moduleWidth_dots}^BEN,{h_dots},Y^FD{value}^FS` |
| `rect` | `^FO{x},{y}^GB{w},{h},{strokeW_dots},{strokeColor_zpl},0^FS` |
| `line` horizontal | `^FO{x},{y}^GB{w},{strokeW_dots},{strokeW_dots},B,0^FS` |
| `line` vertical | `^FO{x},{y}^GB{strokeW_dots},{h},{strokeW_dots},B,0^FS` |
| `oval` | `^FO{x},{y}^GE{w},{h},{strokeW_dots},B^FS` |

For rotation in ZPL font commands: 0°=N, 90°=R, 180°=I, 270°=B

For bound fields, use the fieldKey as a placeholder: `{${element.fieldKey}}`

> The ZPL export is a **template** — field values are filled at print time by the host application.

Show the generated ZPL in a modal with:
- Monospace textarea (read-only, full ZPL string)
- "Copy to Clipboard" button
- "Download as .zpl" button
- Close button

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Delete / Backspace | Delete selected element(s) |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+D | Duplicate selected |
| Ctrl+A | Select all |
| Escape | Deselect / cancel tool |
| Arrow keys | Nudge selected element 0.5mm |
| Shift+Arrow | Nudge 5mm |
| Ctrl+G | Toggle grid |

---

## State Management

Use `useReducer` for canvas state. The reducer handles these action types:

```js
ADD_ELEMENT       // payload: element object
UPDATE_ELEMENT    // payload: { id, changes }
DELETE_ELEMENTS   // payload: [id, ...]
REORDER_ELEMENT   // payload: { id, direction: "up"|"down"|"front"|"back" }
SET_SELECTION     // payload: [id, ...]
SET_LABEL_SIZE    // payload: { width, height }
LOAD_DESIGN       // payload: full state object
UNDO / REDO       // no payload — manage history stack inside reducer
```

Maintain an `undoStack` and `redoStack` (arrays of state snapshots, max 50 entries each).

---

## Visual Design Requirements

- **Theme**: Industrial / utilitarian — dark workspace (#1a1a2e), white canvas, blue accent (#2563eb)
- **Left panel**: Dark sidebar (#0f172a) with section dividers
- **Right panel**: Light panel (#f8fafc) with grouped sections
- **Top bar**: Dark (#1e293b) with white text
- **Selected element**: Blue border (#2563eb) with white square handles
- **Font**: Use `JetBrains Mono` for coordinates/values, `Inter` for UI text (load from Google Fonts CDN)
- **Animations**: Subtle — panel transitions 150ms ease, tooltip fade 100ms
- **Canvas grid**: rgba(0,0,0,0.08) lines at every 5mm, rgba(0,0,0,0.04) at every 1mm

---

## What NOT to Do (Hallucination Guards)

- ❌ Do NOT import `jsbarcode`, `qrcode`, `react-dnd`, or any library not listed in Tech Stack
- ❌ Do NOT use `document.execCommand` (deprecated)
- ❌ Do NOT reference `window.print()` for label printing
- ❌ Do NOT fabricate ZPL commands — only use the exact commands specified above
- ❌ Do NOT use `localStorage` or `sessionStorage`
- ❌ Do NOT create a fake "preview with real barcode" — canvas barcodes are always visual placeholders
- ❌ Do NOT add a "Send to Printer" feature — it is explicitly out of scope in this phase
- ❌ Do NOT use inline `style` objects for layout — Tailwind classes only (except for calculated pixel positions on the canvas which MUST use inline style for dynamic values)
- ❌ Do NOT use `any` TypeScript types — this is plain JSX, no TypeScript

---

## Deliverable

A single `.jsx` file that:
1. Exports a default React component `LabelDesigner`
2. Is fully self-contained (no imports beyond React, lucide-react, Tailwind)
3. Renders a complete, working label designer matching all specifications above
4. Has clear, commented code sections for: State, Reducer, Canvas Rendering, Drag Logic, ZPL Export, UI Panels
5. Works without any build step warnings related to missing props or undefined variables

---

## Implementation Order (follow this sequence to minimize errors)

1. Define constants: `PRODUCT_FIELDS`, `BARCODE_TYPES`, `MM_TO_PX` scale factor
2. Define the element factory function `createElement(type, overrides)` with all defaults
3. Define the `reducer` function with all action types
4. Build the canvas rendering layer (elements as absolute-positioned divs at mm×scale px)
5. Implement mouse event handlers: select, drag-move, drag-resize, rubber-band select
6. Build the Left Panel (label size inputs, field chips, drawing tool buttons, layer list)
7. Build the Right Panel (property inspector, switching based on selected element type)
8. Build the Top Toolbar (undo/redo, zoom, export buttons)
9. Implement drag-from-panel-to-canvas using HTML5 Drag API (`draggable`, `onDragStart`, `onDrop`)
10. Implement ZPL export function and modal
11. Implement JSON save/load
12. Add keyboard shortcuts via `useEffect` on `keydown`
13. Final polish: tooltips, grid rendering, ruler marks

---

*End of specification. Build exactly what is described. Do not add unrequested features. Do not omit any specified feature.*
