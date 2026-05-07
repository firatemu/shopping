'use client';

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Archive,
  BarChart2,
  Briefcase,
  ChevronDown,
  Circle,
  Coins,
  Copy,
  DollarSign,
  Download,
  FileText,
  Globe,
  Grid3X3,
  Hash,
  Layers,
  Lock,
  Maximize2,
  Minus,
  MousePointer2,
  Package,
  Palette,
  Plus,
  QrCode,
  Redo2,
  Ruler,
  Save,
  Scale,
  Square,
  Tag,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { api } from '@/lib/api';

// State
const BASE_MM_TO_PX = 8;
const DOTS_PER_MM = 8;
const MIN_LABEL_MM = 10;
const MAX_LABEL_MM = 300;
const MIN_ELEMENT_MM = 3;
const HISTORY_LIMIT = 50;

const PRODUCT_FIELDS = [
  { key: 'productCode', label: 'Ürün Kodu', icon: Hash },
  { key: 'productName', label: 'Ürün Adı', icon: Tag },
  { key: 'barcode', label: 'Karekod (QR)', icon: QrCode },
  { key: 'barcode1D', label: 'Barkod (1D)', icon: BarChart2 },
  { key: 'salePrice', label: 'Satış Fiyatı', icon: DollarSign },
  { key: 'currency', label: 'Para Birimi', icon: Coins },
  { key: 'color', label: 'Renk', icon: Palette },
  { key: 'size', label: 'Beden', icon: Ruler },
  { key: 'brand', label: 'Marka', icon: Briefcase },
  { key: 'category', label: 'Kategori', icon: Layers },
  { key: 'stockCode', label: 'Stok Kodu', icon: Archive },
  { key: 'description', label: 'Açıklama', icon: FileText },
  { key: 'origin', label: 'Menşei Ülke', icon: Globe },
  { key: 'sku', label: 'SKU', icon: Package },
  { key: 'weight', label: 'Ağırlık', icon: Scale },
];

const BARCODE_TYPES = ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPCA', 'QR', 'PDF417', 'DataMatrix'];
const ROTATIONS = [0, 90, 180, 270];

const initialState = {
  labelName: 'Yeni Etiket',
  labelWidth: 100,
  labelHeight: 60,
  elements: [],
  selectedIds: [],
  undoStack: [],
  redoStack: [],
};

function snap(value, enabled = true) {
  return enabled ? Math.round(value * 2) / 2 : value;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function uid() {
  return `el_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function snapshot(state) {
  return {
    labelName: state.labelName,
    labelWidth: state.labelWidth,
    labelHeight: state.labelHeight,
    elements: state.elements,
    selectedIds: state.selectedIds,
  };
}

function withHistory(state, next) {
  return {
    ...next,
    undoStack: [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT),
    redoStack: [],
  };
}

function createElement(type, overrides = {}) {
  const base = {
    id: uid(),
    type,
    x: 5,
    y: 5,
    width: 40,
    height: 8,
    rotation: 0,
    locked: false,
    zIndex: overrides.zIndex ?? 1,
    content: '',
    fontSize: 12,
    fontWeight: 'normal',
    align: 'left',
    fieldKey: '',
    barcodeType: 'CODE128',
    barcodeValue: '',
    showText: true,
    strokeColor: '#000000',
    strokeWidth: 0.3,
    fillColor: 'transparent',
    radius: 0,
    lineDirection: 'horizontal',
    textColor: '#000000',
    moduleWidth: 0.3,
  };

  const typedDefaults = {
    boundField: { width: 42, height: 8, content: overrides.fieldKey || 'field' },
    barcode: { width: overrides.barcodeType === 'QR' ? 30 : 45, height: overrides.barcodeType === 'QR' ? 30 : 16 },
    freeText: { width: 45, height: 10, content: 'Yeni metin' },
    line: { width: 35, height: 3, lineDirection: 'horizontal', strokeWidth: 0.4 },
    rect: { width: 35, height: 18 },
    oval: { width: 24, height: 18 },
  };

  return { ...base, ...(typedDefaults[type] || {}), ...overrides };
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ELEMENT': {
      const elements = [...state.elements, action.payload];
      return withHistory(state, { ...state, elements, selectedIds: [action.payload.id] });
    }
    case 'UPDATE_ELEMENT': {
      const elements = state.elements.map((el) => (el.id === action.payload.id ? { ...el, ...action.payload.changes } : el));
      return action.skipHistory ? { ...state, elements } : withHistory(state, { ...state, elements });
    }
    case 'UPDATE_ELEMENTS': {
      const byId = new Map(action.payload.map((item) => [item.id, item.changes]));
      const elements = state.elements.map((el) => (byId.has(el.id) ? { ...el, ...byId.get(el.id) } : el));
      return action.skipHistory ? { ...state, elements } : withHistory(state, { ...state, elements });
    }
    case 'DELETE_ELEMENTS': {
      const ids = new Set(action.payload);
      const elements = state.elements.filter((el) => !ids.has(el.id));
      return withHistory(state, { ...state, elements, selectedIds: state.selectedIds.filter((id) => !ids.has(id)) });
    }
    case 'REORDER_ELEMENT': {
      const target = state.elements.find((el) => el.id === action.payload.id);
      if (!target) return state;
      const sorted = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = sorted.findIndex((el) => el.id === target.id);
      let nextIndex = currentIndex;
      if (action.payload.direction === 'up') nextIndex = clamp(currentIndex + 1, 0, sorted.length - 1);
      if (action.payload.direction === 'down') nextIndex = clamp(currentIndex - 1, 0, sorted.length - 1);
      if (action.payload.direction === 'front') nextIndex = sorted.length - 1;
      if (action.payload.direction === 'back') nextIndex = 0;
      sorted.splice(currentIndex, 1);
      sorted.splice(nextIndex, 0, target);
      const zById = new Map(sorted.map((el, index) => [el.id, index + 1]));
      const elements = state.elements.map((el) => ({ ...el, zIndex: zById.get(el.id) || el.zIndex }));
      return withHistory(state, { ...state, elements });
    }
    case 'SET_SELECTION':
      return { ...state, selectedIds: action.payload };
    case 'SET_LABEL_SIZE':
      return withHistory(state, {
        ...state,
        labelWidth: action.payload.width,
        labelHeight: action.payload.height,
        elements: [],
        selectedIds: [],
      });
    case 'SET_LABEL_NAME':
      return { ...state, labelName: action.payload };
    case 'RESET_DESIGN':
      return withHistory(state, {
        ...initialState,
        labelName: 'Yeni Etiket',
      });
    case 'LOAD_DESIGN':
      return withHistory(state, {
        ...state,
        labelName: action.payload.labelName || 'Yeni Etiket',
        labelWidth: clamp(Number(action.payload.labelWidth) || 100, MIN_LABEL_MM, MAX_LABEL_MM),
        labelHeight: clamp(Number(action.payload.labelHeight) || 60, MIN_LABEL_MM, MAX_LABEL_MM),
        elements: Array.isArray(action.payload.elements) ? action.payload.elements : [],
        selectedIds: [],
      });
    case 'PUSH_HISTORY':
      return { ...state, undoStack: [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT), redoStack: [] };
    case 'UNDO': {
      const previous = state.undoStack[state.undoStack.length - 1];
      if (!previous) return state;
      return {
        ...state,
        ...previous,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, snapshot(state)].slice(-HISTORY_LIMIT),
      };
    }
    case 'REDO': {
      const next = state.redoStack[state.redoStack.length - 1];
      if (!next) return state;
      return {
        ...state,
        ...next,
        undoStack: [...state.undoStack, snapshot(state)].slice(-HISTORY_LIMIT),
        redoStack: state.redoStack.slice(0, -1),
      };
    }
    default:
      return state;
  }
}

function getRotationChar(rotation) {
  return ({ 0: 'N', 90: 'R', 180: 'I', 270: 'B' }[rotation] || 'N');
}

function mmToDots(mm) {
  return Math.round(Number(mm || 0) * DOTS_PER_MM);
}

function escapeZpl(value) {
  return String(value ?? '').replace(/\^/g, ' ').replace(/~/g, ' ');
}

function fieldPlaceholder(el) {
  return el.barcodeValue?.trim() || (el.fieldKey ? `{${el.fieldKey}}` : el.content || '');
}

function generateZpl(state) {
  const lines = ['^XA', `^PW${mmToDots(state.labelWidth)}`, `^LL${mmToDots(state.labelHeight)}`];
  const sorted = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);

  sorted.forEach((el) => {
    const x = mmToDots(el.x);
    const y = mmToDots(el.y);
    const w = mmToDots(el.width);
    const h = mmToDots(el.height);
    const stroke = Math.max(1, mmToDots(el.strokeWidth || 0.3));
    const moduleWidth = Math.max(1, mmToDots(el.moduleWidth || 0.3));

    if (el.type === 'boundField' || el.type === 'freeText') {
      const value = el.type === 'boundField' ? `{${el.fieldKey}}` : el.content;
      lines.push(`^FO${x},${y}^A0${getRotationChar(el.rotation)},${h},${w}^FD${escapeZpl(value)}^FS`);
      return;
    }

    if (el.type === 'barcode') {
      const value = escapeZpl(fieldPlaceholder(el));
      if (el.barcodeType === 'QR') {
        const qrMagnification = clamp(Math.round((el.width * DOTS_PER_MM) / 25), 1, 10);
        lines.push(`^FO${x},${y}^BQN,2,${qrMagnification}^FDMM,A${value}^FS`);
        return;
      }
      if (el.barcodeType === 'CODE128') {
        lines.push(`^FO${x},${y}^BY${moduleWidth}^BCN,${h},${el.showText ? 'Y' : 'N'},N,N^FD${value}^FS`);
        return;
      }
      if (el.barcodeType === 'EAN13') {
        lines.push(`^FO${x},${y}^BY${moduleWidth}^BEN,${h},${el.showText ? 'Y' : 'N'}^FD${value}^FS`);
        return;
      }
      // FUTURE: ZPL mappings for CODE39, EAN8, UPCA, PDF417 and DataMatrix were not specified in the source prompt.
      return;
    }

    if (el.type === 'rect') {
      lines.push(`^FO${x},${y}^GB${w},${h},${stroke},B,0^FS`);
      return;
    }

    if (el.type === 'line') {
      if (el.lineDirection === 'vertical') lines.push(`^FO${x},${y}^GB${stroke},${h},${stroke},B,0^FS`);
      else lines.push(`^FO${x},${y}^GB${w},${stroke},${stroke},B,0^FS`);
      return;
    }

    if (el.type === 'oval') {
      lines.push(`^FO${x},${y}^GE${w},${h},${stroke},B^FS`);
    }
  });

  lines.push('^XZ');
  return lines.join('\n');
}

function downloadText(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function deterministicBits(seed, count) {
  let value = 0;
  for (let i = 0; i < seed.length; i += 1) value = (value * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    value = (value * 1664525 + 1013904223 + i) >>> 0;
    return value % 5 !== 0;
  });
}

function BarcodePreview({ element }) {
  if (element.barcodeType === 'QR') {
    const bits = deterministicBits(element.fieldKey || element.barcodeValue || 'QR', 625);
    const isFinder = (x, y, ox, oy) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    const finderFill = (x, y, ox, oy) => {
      const rx = x - ox;
      const ry = y - oy;
      return rx === 0 || ry === 0 || rx === 6 || ry === 6 || (rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4);
    };
    return (
      <svg className="w-full h-full" viewBox="0 0 25 25" aria-hidden>
        <rect width="25" height="25" fill="white" />
        {bits.map((filled, index) => {
          const x = index % 25;
          const y = Math.floor(index / 25);
          const finder =
            isFinder(x, y, 1, 1) || isFinder(x, y, 17, 1) || isFinder(x, y, 1, 17);
          if (finder) {
            const black = isFinder(x, y, 1, 1)
              ? finderFill(x, y, 1, 1)
              : isFinder(x, y, 17, 1)
                ? finderFill(x, y, 17, 1)
                : finderFill(x, y, 1, 17);
            if (!black) return null;
            return <rect key={index} x={x} y={y} width="1" height="1" fill="black" />;
          }
          if (!filled) return null;
          return <rect key={index} x={x} y={y} width="1" height="1" fill="black" />;
        })}
      </svg>
    );
  }

  const bars = deterministicBits(element.barcodeType || 'CODE128', 42);
  return (
    <div className="w-full h-full bg-white flex items-end justify-center gap-[1px] px-1 pt-1">
      {bars.map((filled, index) => (
        <div
          key={index}
          className={filled ? 'bg-black' : 'bg-transparent'}
          style={{ width: index % 3 === 0 ? 3 : 1, height: `${55 + ((index * 7) % 35)}%` }}
        />
      ))}
    </div>
  );
}

function ToolButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors ${
        active ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function NumberInput({ label, value, min, max, step = 0.5, onChange }) {
  return (
    <label className="space-y-1 text-xs text-slate-600">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 font-mono text-xs text-slate-900"
      />
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-b border-slate-200 p-4">
      <h3 className="mb-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <ChevronDown className="h-3.5 w-3.5" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function formatPreviewPrice(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(number);
}

function makePreviewData(variant) {
  if (!variant) return null;
  const product = variant.product || {};
  const price = variant.salePrice ?? product.salePrice ?? 0;
  return {
    productCode: product.supplierCode || product.id?.slice(0, 8) || '',
    productName: product.name || '',
    barcode: variant.barcode || '',
    barcode1D: variant.barcode || '',
    salePrice: formatPreviewPrice(price),
    currency: 'TRY',
    color: variant.color || '',
    size: variant.size || '',
    brand: product.brand || '',
    category: product.category || '',
    stockCode: product.supplierCode || '',
    description: product.description || '',
    origin: 'Türkiye',
    sku: `${product.supplierCode || product.id?.slice(0, 8) || 'SKU'}-${variant.colorCode || ''}${variant.sizeCode || ''}`,
    weight: '',
  };
}

function resolvePreviewText(element, previewData) {
  if (element.type === 'freeText') return element.content;
  if (!previewData) return element.type === 'boundField' ? `{${element.fieldKey}}` : element.barcodeValue || element.fieldKey || element.barcodeType;
  if (element.type === 'boundField') return previewData[element.fieldKey] || `{${element.fieldKey}}`;
  if (element.type === 'barcode') return element.barcodeValue?.trim() || previewData[element.fieldKey] || previewData.barcode || '';
  return '';
}

function getApiErrorMessage(error, fallback) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;
  const text = Array.isArray(message) ? message.join(', ') : message;
  if (status === 404) return `${fallback} API endpoint bulunamadı. API sunucusunu yeniden başlatın.`;
  if (status === 403) return `${fallback} Bu kullanıcı rolünün şablon kaydetme yetkisi yok.`;
  if (status === 401) return `${fallback} Oturum süresi dolmuş, yeniden giriş yapın.`;
  return text ? `${fallback} ${text}` : fallback;
}

function PreviewCanvas({ state, sortedElements, previewData, scaleFactor }) {
  return (
    <div
      className="relative mx-auto overflow-hidden bg-white shadow-sm ring-1 ring-slate-300"
      style={{ width: state.labelWidth * scaleFactor, height: state.labelHeight * scaleFactor }}
    >
      {sortedElements.map((el) => {
        const previewText = resolvePreviewText(el, previewData);
        const previewBarcodeElement = el.type === 'barcode' ? { ...el, barcodeValue: previewText } : el;
        return (
          <div
            key={`preview-${scaleFactor}-${el.id}`}
            className="absolute overflow-hidden"
            style={{
              left: el.x * scaleFactor,
              top: el.y * scaleFactor,
              width: el.width * scaleFactor,
              height: el.height * scaleFactor,
              zIndex: el.zIndex,
              transform: `rotate(${el.rotation}deg)`,
              transformOrigin: 'center',
            }}
          >
            {el.type === 'barcode' ? (
              <div className="relative h-full w-full">
                <BarcodePreview element={previewBarcodeElement} />
                {el.showText ? (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white px-1 font-mono text-black"
                    style={{ fontSize: Math.max(6, scaleFactor * 3) }}
                  >
                    {previewText}
                  </span>
                ) : null}
              </div>
            ) : el.type === 'boundField' || el.type === 'freeText' ? (
              <div
                className="flex h-full w-full items-center overflow-hidden"
                style={{
                  color: el.textColor,
                  fontSize: Math.max(4, el.fontSize * scaleFactor * 0.18),
                  fontWeight: el.fontWeight,
                  justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                }}
              >
                {previewText}
              </div>
            ) : el.type === 'line' ? (
              <div
                className="h-full w-full"
                style={{
                  borderTop: el.lineDirection !== 'vertical' ? `${Math.max(1, el.strokeWidth * scaleFactor)}px solid ${el.strokeColor}` : undefined,
                  borderLeft: el.lineDirection === 'vertical' ? `${Math.max(1, el.strokeWidth * scaleFactor)}px solid ${el.strokeColor}` : undefined,
                }}
              />
            ) : (
              <div
                className={el.type === 'oval' ? 'h-full w-full rounded-full' : 'h-full w-full'}
                style={{
                  backgroundColor: el.fillColor,
                  border: `${Math.max(1, el.strokeWidth * scaleFactor)}px solid ${el.strokeColor}`,
                  borderRadius: el.type === 'rect' ? el.radius * scaleFactor : undefined,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Reducer, Canvas Rendering, Drag Logic, ZPL Export, UI Panels
export default function LabelDesigner() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [activeTool, setActiveTool] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [zpl, setZpl] = useState('');
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAvailable, setPreviewAvailable] = useState(false);
  const [showLargePreview, setShowLargePreview] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [drawingBox, setDrawingBox] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const interactionRef = useRef(null);

  const scale = BASE_MM_TO_PX * zoom;
  const selectedElements = useMemo(
    () => state.elements.filter((el) => state.selectedIds.includes(el.id)),
    [state.elements, state.selectedIds],
  );
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;
  const sortedElements = useMemo(() => [...state.elements].sort((a, b) => a.zIndex - b.zIndex), [state.elements]);
  const designZpl = useMemo(() => generateZpl(state), [state]);

  const fetchTemplates = useCallback(async (search = '') => {
    setTemplatesLoading(true);
    try {
      const res = await api.get('/label-templates', {
        params: { limit: 50, search: search.trim() || undefined },
      });
      setTemplates(res.data?.data ?? []);
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error, 'Şablon listesi alınamadı.'));
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const fetchPreviewProduct = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await api.get('/products/variants', { params: { page: 1, limit: 1 } });
      const firstVariant = res.data?.data?.[0];
      const data = makePreviewData(firstVariant);
      setPreviewData(data);
      setPreviewAvailable(!!data);
    } catch {
      setPreviewData(null);
      setPreviewAvailable(false);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const pointToMm = useCallback(
    (clientX, clientY) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: clamp(snap((clientX - rect.left) / scale, snapEnabled), 0, state.labelWidth),
        y: clamp(snap((clientY - rect.top) / scale, snapEnabled), 0, state.labelHeight),
      };
    },
    [scale, snapEnabled, state.labelHeight, state.labelWidth],
  );

  useEffect(() => {
    fetchTemplates('');
    fetchPreviewProduct();
  }, [fetchTemplates, fetchPreviewProduct]);

  const addElementAt = useCallback(
    (type, point, overrides = {}) => {
      const zIndex = state.elements.reduce((max, el) => Math.max(max, el.zIndex), 0) + 1;
      dispatch({
        type: 'ADD_ELEMENT',
        payload: createElement(type, {
          x: clamp(point.x, 0, state.labelWidth - MIN_ELEMENT_MM),
          y: clamp(point.y, 0, state.labelHeight - MIN_ELEMENT_MM),
          zIndex,
          ...overrides,
        }),
      });
    },
    [state.elements, state.labelHeight, state.labelWidth],
  );

  const onCanvasDrop = (event) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/x-label-field');
    if (!payload) return;
    const field = JSON.parse(payload);
    const point = pointToMm(event.clientX, event.clientY);
    if (field.key === 'barcode') addElementAt('barcode', point, { fieldKey: field.key, barcodeType: 'QR', barcodeValue: '' });
    else if (field.key === 'barcode1D') addElementAt('barcode', point, { fieldKey: field.key, barcodeType: 'CODE128', barcodeValue: '' });
    else addElementAt('boundField', point, { fieldKey: field.key, content: field.label });
  };

  const startMove = (event, element) => {
    event.stopPropagation();
    if (element.locked) return;
    const ids = state.selectedIds.includes(element.id)
      ? state.selectedIds
      : event.shiftKey
        ? [...state.selectedIds, element.id]
        : [element.id];
    dispatch({ type: 'SET_SELECTION', payload: ids });
    dispatch({ type: 'PUSH_HISTORY' });
    interactionRef.current = {
      mode: 'move',
      start: pointToMm(event.clientX, event.clientY),
      ids,
      elements: state.elements.filter((el) => ids.includes(el.id)).map((el) => ({ ...el })),
    };
  };

  const startResize = (event, element, handle) => {
    event.stopPropagation();
    if (element.locked) return;
    dispatch({ type: 'SET_SELECTION', payload: [element.id] });
    dispatch({ type: 'PUSH_HISTORY' });
    interactionRef.current = { mode: 'resize', handle, start: pointToMm(event.clientX, event.clientY), element: { ...element } };
  };

  const startCanvasMouse = (event) => {
    if (event.target !== canvasRef.current) return;
    const point = pointToMm(event.clientX, event.clientY);
    if (activeTool === 'freeText') {
      addElementAt('freeText', point);
      setEditingId(null);
      setActiveTool(null);
      return;
    }
    if (activeTool) {
      setDrawingBox({ tool: activeTool, start: point, current: point });
      return;
    }
    dispatch({ type: 'SET_SELECTION', payload: [] });
    setSelectionBox({ start: point, current: point });
  };

  useEffect(() => {
    const onMove = (event) => {
      const interaction = interactionRef.current;
      const point = pointToMm(event.clientX, event.clientY);

      if (interaction?.mode === 'move') {
        const dx = point.x - interaction.start.x;
        const dy = point.y - interaction.start.y;
        const updates = interaction.elements.map((el) => ({
          id: el.id,
          changes: {
            x: clamp(snap(el.x + dx, snapEnabled), 0, state.labelWidth - el.width),
            y: clamp(snap(el.y + dy, snapEnabled), 0, state.labelHeight - el.height),
          },
        }));
        dispatch({ type: 'UPDATE_ELEMENTS', payload: updates, skipHistory: true });
        setDragInfo({ text: `X ${point.x.toFixed(1)} mm / Y ${point.y.toFixed(1)} mm`, x: event.clientX, y: event.clientY });
      }

      if (interaction?.mode === 'resize') {
        const el = interaction.element;
        let x = el.x;
        let y = el.y;
        let width = el.width;
        let height = el.height;
        const dx = point.x - interaction.start.x;
        const dy = point.y - interaction.start.y;

        if (interaction.handle.includes('e')) width = Math.max(MIN_ELEMENT_MM, el.width + dx);
        if (interaction.handle.includes('s')) height = Math.max(MIN_ELEMENT_MM, el.height + dy);
        if (interaction.handle.includes('w')) {
          width = Math.max(MIN_ELEMENT_MM, el.width - dx);
          x = el.x + (el.width - width);
        }
        if (interaction.handle.includes('n')) {
          height = Math.max(MIN_ELEMENT_MM, el.height - dy);
          y = el.y + (el.height - height);
        }
        if (event.shiftKey) {
          const ratio = el.width / Math.max(el.height, 0.1);
          if (width / Math.max(height, 0.1) > ratio) width = height * ratio;
          else height = width / ratio;
        }
        width = clamp(snap(width, snapEnabled), MIN_ELEMENT_MM, state.labelWidth - x);
        height = clamp(snap(height, snapEnabled), MIN_ELEMENT_MM, state.labelHeight - y);
        x = clamp(snap(x, snapEnabled), 0, state.labelWidth - width);
        y = clamp(snap(y, snapEnabled), 0, state.labelHeight - height);
        dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, changes: { x, y, width, height } }, skipHistory: true });
        setDragInfo({ text: `W ${width.toFixed(1)} mm / H ${height.toFixed(1)} mm`, x: event.clientX, y: event.clientY });
      }

      if (selectionBox) setSelectionBox((box) => ({ ...box, current: point }));
      if (drawingBox) setDrawingBox((box) => ({ ...box, current: point }));
    };

    const onUp = () => {
      interactionRef.current = null;
      setDragInfo(null);
      if (selectionBox) {
        const x1 = Math.min(selectionBox.start.x, selectionBox.current.x);
        const y1 = Math.min(selectionBox.start.y, selectionBox.current.y);
        const x2 = Math.max(selectionBox.start.x, selectionBox.current.x);
        const y2 = Math.max(selectionBox.start.y, selectionBox.current.y);
        const ids = state.elements
          .filter((el) => el.x < x2 && el.x + el.width > x1 && el.y < y2 && el.y + el.height > y1)
          .map((el) => el.id);
        dispatch({ type: 'SET_SELECTION', payload: ids });
        setSelectionBox(null);
      }
      if (drawingBox) {
        const x = Math.min(drawingBox.start.x, drawingBox.current.x);
        const y = Math.min(drawingBox.start.y, drawingBox.current.y);
        const width = Math.abs(drawingBox.current.x - drawingBox.start.x);
        const height = Math.abs(drawingBox.current.y - drawingBox.start.y);
        if (width >= MIN_ELEMENT_MM || height >= MIN_ELEMENT_MM) {
          addElementAt(drawingBox.tool, { x, y }, { width: Math.max(width, MIN_ELEMENT_MM), height: Math.max(height, MIN_ELEMENT_MM) });
        }
        setDrawingBox(null);
        setActiveTool(null);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [addElementAt, drawingBox, pointToMm, selectionBox, snapEnabled, state.elements, state.labelHeight, state.labelWidth]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const mod = event.ctrlKey || event.metaKey;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedIds.length) {
        dispatch({ type: 'DELETE_ELEMENTS', payload: state.selectedIds });
      }
      if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((mod && event.key.toLowerCase() === 'y') || (mod && event.shiftKey && event.key.toLowerCase() === 'z')) {
        event.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelected();
      }
      if (mod && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        dispatch({ type: 'SET_SELECTION', payload: state.elements.map((el) => el.id) });
      }
      if (event.key === 'Escape') {
        setActiveTool(null);
        dispatch({ type: 'SET_SELECTION', payload: [] });
      }
      if (mod && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        setShowGrid((value) => !value);
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && state.selectedIds.length) {
        event.preventDefault();
        const amount = event.shiftKey ? 5 : 0.5;
        const dx = event.key === 'ArrowRight' ? amount : event.key === 'ArrowLeft' ? -amount : 0;
        const dy = event.key === 'ArrowDown' ? amount : event.key === 'ArrowUp' ? -amount : 0;
        dispatch({
          type: 'UPDATE_ELEMENTS',
          payload: state.elements
            .filter((el) => state.selectedIds.includes(el.id) && !el.locked)
            .map((el) => ({
              id: el.id,
              changes: {
                x: clamp(el.x + dx, 0, state.labelWidth - el.width),
                y: clamp(el.y + dy, 0, state.labelHeight - el.height),
              },
            })),
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const updateSelected = (changes) => {
    if (!selectedElement) return;
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id: selectedElement.id, changes } });
  };

  const duplicateSelected = () => {
    if (!state.selectedIds.length) return;
    const maxZ = state.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
    const copies = state.elements
      .filter((el) => state.selectedIds.includes(el.id))
      .map((el, index) => ({ ...el, id: uid(), x: el.x + 2, y: el.y + 2, zIndex: maxZ + index + 1, locked: false }));
    copies.forEach((copy) => dispatch({ type: 'ADD_ELEMENT', payload: copy }));
    dispatch({ type: 'SET_SELECTION', payload: copies.map((el) => el.id) });
  };

  const changeLabelSize = (key, value) => {
    const next = clamp(Number(value) || MIN_LABEL_MM, MIN_LABEL_MM, MAX_LABEL_MM);
    const width = key === 'width' ? next : state.labelWidth;
    const height = key === 'height' ? next : state.labelHeight;
    if (state.elements.length && !window.confirm('Etiket ölçüsü değişirse canvas sıfırlanır. Devam edilsin mi?')) return;
    dispatch({ type: 'SET_LABEL_SIZE', payload: { width, height } });
  };

  const exportZpl = () => setZpl(designZpl);

  const templatePayload = () => ({
    name: state.labelName.trim() || 'Yeni Etiket',
    description: `${state.labelWidth}x${state.labelHeight} mm etiket şablonu`,
    widthMm: Number(state.labelWidth),
    heightMm: Number(state.labelHeight),
    design: snapshot(state),
    zpl: designZpl,
    isActive: true,
  });

  const saveTemplateToSystem = async () => {
    setSavingTemplate(true);
    setStatusMessage('');
    try {
      const payload = templatePayload();
      const res = currentTemplateId
        ? await api.patch(`/label-templates/${currentTemplateId}`, payload)
        : await api.post('/label-templates', payload);
      setCurrentTemplateId(res.data.id);
      setStatusMessage(currentTemplateId ? 'Şablon güncellendi.' : 'Şablon sisteme kaydedildi.');
      await fetchTemplates(templateSearch);
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error, 'Şablon kaydedilemedi.'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const openTemplate = async (id) => {
    setStatusMessage('');
    try {
      const res = await api.get(`/label-templates/${id}`);
      const row = res.data;
      dispatch({
        type: 'LOAD_DESIGN',
        payload: {
          ...(row.design || {}),
          labelName: row.design?.labelName || row.name,
          labelWidth: Number(row.widthMm),
          labelHeight: Number(row.heightMm),
        },
      });
      setCurrentTemplateId(row.id);
      setStatusMessage('Şablon düzenleme için açıldı.');
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error, 'Şablon açılamadı.'));
    }
  };

  const newTemplate = () => {
    if (state.elements.length && !window.confirm('Mevcut tasarım kapatılacak. Devam edilsin mi?')) return;
    setCurrentTemplateId(null);
    setStatusMessage('');
    dispatch({ type: 'RESET_DESIGN' });
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Bu şablon silinsin mi?')) return;
    try {
      await api.delete(`/label-templates/${id}`);
      if (currentTemplateId === id) {
        setCurrentTemplateId(null);
        dispatch({ type: 'RESET_DESIGN' });
      }
      setStatusMessage('Şablon silindi.');
      await fetchTemplates(templateSearch);
    } catch (error) {
      setStatusMessage(getApiErrorMessage(error, 'Şablon silinemedi.'));
    }
  };

  const saveDesign = () => {
    const content = JSON.stringify(snapshot(state), null, 2);
    downloadText(`${state.labelName || 'etiket-tasarimi'}.json`, content, 'application/json');
  };

  const loadDesign = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      dispatch({ type: 'LOAD_DESIGN', payload: JSON.parse(text) });
      setCurrentTemplateId(null);
      setStatusMessage('JSON tasarım yüklendi. Sisteme kaydetmek için "Sisteme Kaydet" butonunu kullanın.');
    } finally {
      event.target.value = '';
    }
  };

  const canvasStyle = {
    width: state.labelWidth * scale,
    height: state.labelHeight * scale,
    backgroundImage: showGrid
      ? `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)`
      : undefined,
    backgroundSize: showGrid ? `${scale}px ${scale}px, ${scale}px ${scale}px, ${scale * 5}px ${scale * 5}px, ${scale * 5}px ${scale * 5}px` : undefined,
  };

  const boxToStyle = (box) => {
    const x = Math.min(box.start.x, box.current.x);
    const y = Math.min(box.start.y, box.current.y);
    const width = Math.abs(box.current.x - box.start.x);
    const height = Math.abs(box.current.y - box.start.y);
    return { left: x * scale, top: y * scale, width: width * scale, height: height * scale };
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-[720px] overflow-hidden bg-[#1a1a2e] text-slate-100">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router; Google Fonts for canvas preview */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-[#0f172a]">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-white">Etiket Tasarım</h2>
          <p className="mt-1 text-xs text-slate-400">ZPL destekli termal etiket şablonları</p>
        </div>

        <Section title="Kayıtlı Şablonlar">
          <div className="flex gap-1">
            <input
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTemplates(templateSearch)}
              placeholder="Şablon ara..."
              className="h-8 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-white"
            />
            <button type="button" onClick={() => fetchTemplates(templateSearch)} className="rounded-md bg-slate-700 px-2 text-xs text-white hover:bg-slate-600">
              Ara
            </button>
          </div>
          <button type="button" onClick={newTemplate} className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700">
            <Plus className="h-4 w-4" />
            Yeni şablon
          </button>
          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {templatesLoading ? (
              <p className="rounded-md border border-slate-700 p-3 text-xs text-slate-400">Şablonlar yükleniyor...</p>
            ) : templates.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-400">Kayıtlı şablon yok.</p>
            ) : (
              templates.map((tpl) => (
                <div key={tpl.id} className={`rounded-md border p-2 ${currentTemplateId === tpl.id ? 'border-blue-500 bg-blue-950/40' : 'border-slate-700 bg-slate-800'}`}>
                  <button type="button" onClick={() => openTemplate(tpl.id)} className="block w-full text-left">
                    <span className="block truncate text-xs font-medium text-white">{tpl.name}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-slate-400">
                      {Number(tpl.widthMm)}x{Number(tpl.heightMm)} mm
                    </span>
                  </button>
                  <button type="button" onClick={() => deleteTemplate(tpl.id)} className="mt-1 text-[10px] text-red-300 hover:text-red-200">
                    Sil
                  </button>
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="Etiket Ölçüsü">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-slate-300">
              <span>Genişlik mm</span>
              <input
                type="number"
                min={MIN_LABEL_MM}
                max={MAX_LABEL_MM}
                step="0.5"
                value={state.labelWidth}
                onChange={(e) => changeLabelSize('width', e.target.value)}
                className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-white"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-300">
              <span>Yükseklik mm</span>
              <input
                type="number"
                min={MIN_LABEL_MM}
                max={MAX_LABEL_MM}
                step="0.5"
                value={state.labelHeight}
                onChange={(e) => changeLabelSize('height', e.target.value)}
                className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-white"
              />
            </label>
          </div>
        </Section>

        <Section title="Ürün Alanları">
          <div className="grid gap-2">
            {PRODUCT_FIELDS.map((field) => {
              const Icon = field.icon;
              return (
                <button
                  key={field.key}
                  type="button"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('application/x-label-field', JSON.stringify(field))}
                  className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-2 text-left text-xs text-slate-200 transition-colors hover:bg-slate-700"
                >
                  <Icon className="h-4 w-4 text-blue-300" />
                  <span>{field.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Çizim Araçları">
          <div className="grid grid-cols-2 gap-2">
            <ToolButton active={activeTool === 'freeText'} icon={Type} label="Serbest Metin" onClick={() => setActiveTool('freeText')} />
            <ToolButton active={activeTool === 'line'} icon={Minus} label="Çizgi" onClick={() => setActiveTool('line')} />
            <ToolButton active={activeTool === 'rect'} icon={Square} label="Dikdörtgen" onClick={() => setActiveTool('rect')} />
            <ToolButton active={activeTool === 'oval'} icon={Circle} label="Oval" onClick={() => setActiveTool('oval')} />
          </div>
        </Section>

        <Section title="Katmanlar">
          <div className="space-y-1">
            {sortedElements.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-400">Katman oluşturmak için alan sürükleyin veya çizim yapın.</p>
            ) : (
              [...sortedElements].reverse().map((el) => (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_SELECTION', payload: [el.id] })}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs ${
                    state.selectedIds.includes(el.id) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="truncate">{el.type === 'boundField' ? el.fieldKey : el.type}</span>
                  {el.locked ? <Lock className="h-3.5 w-3.5" /> : <span className="font-mono text-[10px] opacity-70">z{el.zIndex}</span>}
                </button>
              ))
            )}
          </div>
        </Section>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-700 bg-[#1e293b] px-4 text-white">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-300" />
            <span className="text-sm font-semibold">Etiket Tasarım</span>
          </div>
          <input
            value={state.labelName}
            onChange={(e) => dispatch({ type: 'SET_LABEL_NAME', payload: e.target.value })}
            className="h-8 w-52 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-white"
          />
          <div className="mx-2 h-6 w-px bg-slate-600" />
          <button type="button" className="rounded-md p-2 hover:bg-slate-700 disabled:opacity-40" disabled={!state.undoStack.length} onClick={() => dispatch({ type: 'UNDO' })}>
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-md p-2 hover:bg-slate-700 disabled:opacity-40" disabled={!state.redoStack.length} onClick={() => dispatch({ type: 'REDO' })}>
            <Redo2 className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-md p-2 hover:bg-slate-700 disabled:opacity-40" disabled={!state.selectedIds.length} onClick={() => dispatch({ type: 'DELETE_ELEMENTS', payload: state.selectedIds })}>
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-md p-2 hover:bg-slate-700 disabled:opacity-40" disabled={!state.selectedIds.length} onClick={duplicateSelected}>
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-md px-3 py-2 text-xs text-slate-400" title="Gruplama bu fazda kapsam dışı">
            Grupla
          </button>
          {currentTemplateId ? <span className="rounded bg-blue-950 px-2 py-1 text-[10px] text-blue-200">Düzenleniyor</span> : null}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="rounded-md p-2 hover:bg-slate-700" onClick={() => setZoom((z) => clamp(Number((z - 0.1).toFixed(2)), 0.25, 3))}>
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
            <button type="button" className="rounded-md p-2 hover:bg-slate-700" onClick={() => setZoom((z) => clamp(Number((z + 0.1).toFixed(2)), 0.25, 3))}>
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" className="rounded-md p-2 hover:bg-slate-700" onClick={() => setZoom(1)}>
              <Maximize2 className="h-4 w-4" />
            </button>
            <button type="button" className={`rounded-md p-2 hover:bg-slate-700 ${showGrid ? 'text-blue-300' : ''}`} onClick={() => setShowGrid((v) => !v)}>
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button type="button" className={`rounded-md px-2 py-2 text-xs hover:bg-slate-700 ${snapEnabled ? 'text-blue-300' : ''}`} onClick={() => setSnapEnabled((v) => !v)}>
              Yakala
            </button>
            <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500" onClick={exportZpl}>
              ZPL Önizle
            </button>
            <button type="button" className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50" disabled={savingTemplate} onClick={saveTemplateToSystem}>
              {savingTemplate ? 'Kaydediliyor...' : currentTemplateId ? 'Şablonu Güncelle' : 'Sisteme Kaydet'}
            </button>
            <button type="button" title="JSON indir" className="rounded-md p-2 hover:bg-slate-700" onClick={saveDesign}>
              <Save className="h-4 w-4" />
            </button>
            <button type="button" title="JSON yükle" className="rounded-md p-2 hover:bg-slate-700" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={loadDesign} />
          </div>
        </header>

        {statusMessage ? (
          <div className="border-b border-slate-700 bg-slate-900 px-4 py-2 text-xs text-slate-200">
            {statusMessage}
          </div>
        ) : null}

        <div className="relative flex-1 overflow-auto bg-[#1a1a2e] p-10">
          <div className="relative mx-auto w-max">
            <div className="absolute -top-6 left-0 flex h-5 text-[10px] text-slate-400" style={{ width: state.labelWidth * scale }}>
              {Array.from({ length: Math.floor(state.labelWidth / 10) + 1 }, (_, i) => (
                <span key={i} className="absolute font-mono" style={{ left: i * 10 * scale }}>
                  {i * 10}
                </span>
              ))}
            </div>
            <div className="absolute -left-8 top-0 text-[10px] text-slate-400" style={{ height: state.labelHeight * scale }}>
              {Array.from({ length: Math.floor(state.labelHeight / 10) + 1 }, (_, i) => (
                <span key={i} className="absolute font-mono" style={{ top: i * 10 * scale }}>
                  {i * 10}
                </span>
              ))}
            </div>
            <div
              ref={canvasRef}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onCanvasDrop}
              onMouseDown={startCanvasMouse}
              className="relative overflow-hidden bg-white shadow-2xl ring-1 ring-black/20"
              style={canvasStyle}
            >
              {sortedElements.map((el) => {
                const selected = state.selectedIds.includes(el.id);
                return (
                  <div
                    key={el.id}
                    onMouseDown={(event) => startMove(event, el)}
                    onDoubleClick={() => el.type === 'freeText' && setEditingId(el.id)}
                    className={`absolute select-none ${el.locked ? 'cursor-not-allowed' : 'cursor-move'} ${
                      selected ? 'outline outline-2 outline-blue-600' : 'outline outline-1 outline-transparent'
                    }`}
                    style={{
                      left: el.x * scale,
                      top: el.y * scale,
                      width: el.width * scale,
                      height: el.height * scale,
                      zIndex: el.zIndex,
                      transform: `rotate(${el.rotation}deg)`,
                      transformOrigin: 'center',
                    }}
                  >
                    {el.type === 'barcode' ? (
                      <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden border border-slate-300 bg-white text-black">
                        <BarcodePreview element={el} />
                        {el.showText ? <span className="absolute bottom-0 bg-white px-1 font-mono text-[8px] text-black">{el.barcodeValue || el.fieldKey || el.barcodeType}</span> : null}
                      </div>
                    ) : el.type === 'boundField' || el.type === 'freeText' ? (
                      editingId === el.id ? (
                        <textarea
                          autoFocus
                          value={el.content}
                          onChange={(event) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id: el.id, changes: { content: event.target.value } } })}
                          onBlur={() => setEditingId(null)}
                          className="h-full w-full resize-none border border-blue-500 bg-white p-1 text-black"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center overflow-hidden px-1"
                          style={{
                            color: el.textColor,
                            fontSize: `${el.fontSize}px`,
                            fontWeight: el.fontWeight,
                            justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
                          }}
                        >
                          {el.type === 'boundField' ? `{${el.fieldKey}}` : el.content}
                        </div>
                      )
                    ) : el.type === 'line' ? (
                      <div
                        className="h-full w-full"
                        style={{
                          borderTop: el.lineDirection !== 'vertical' ? `${Math.max(1, el.strokeWidth * scale)}px solid ${el.strokeColor}` : undefined,
                          borderLeft: el.lineDirection === 'vertical' ? `${Math.max(1, el.strokeWidth * scale)}px solid ${el.strokeColor}` : undefined,
                          transform: el.lineDirection === 'diagonal' ? 'rotate(18deg)' : undefined,
                        }}
                      />
                    ) : el.type === 'rect' ? (
                      <div
                        className="h-full w-full"
                        style={{
                          backgroundColor: el.fillColor,
                          border: `${Math.max(1, el.strokeWidth * scale)}px solid ${el.strokeColor}`,
                          borderRadius: el.radius * scale,
                        }}
                      />
                    ) : (
                      <div
                        className="h-full w-full rounded-full"
                        style={{
                          backgroundColor: el.fillColor,
                          border: `${Math.max(1, el.strokeWidth * scale)}px solid ${el.strokeColor}`,
                        }}
                      />
                    )}

                    {selected && !el.locked
                      ? ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((handle) => (
                          <span
                            key={handle}
                            onMouseDown={(event) => startResize(event, el, handle)}
                            className="absolute h-2.5 w-2.5 rounded-sm border border-blue-600 bg-white"
                            style={{
                              left: handle.includes('w') ? -5 : handle.includes('e') ? `calc(100% - 5px)` : `calc(50% - 5px)`,
                              top: handle.includes('n') ? -5 : handle.includes('s') ? `calc(100% - 5px)` : `calc(50% - 5px)`,
                              cursor: `${handle}-resize`,
                            }}
                          />
                        ))
                      : null}
                  </div>
                );
              })}

              {selectionBox ? <div className="absolute border border-blue-500 bg-blue-500/10" style={boxToStyle(selectionBox)} /> : null}
              {drawingBox ? <div className="absolute border border-dashed border-blue-500 bg-blue-500/10" style={boxToStyle(drawingBox)} /> : null}
            </div>
          </div>
        </div>

        {dragInfo ? (
          <div className="pointer-events-none fixed z-50 rounded bg-slate-900 px-2 py-1 font-mono text-[11px] text-white shadow" style={{ left: dragInfo.x + 12, top: dragInfo.y + 12 }}>
            {dragInfo.text}
          </div>
        ) : null}
      </main>

      <aside className="w-80 shrink-0 overflow-y-auto border-l border-slate-300 bg-[#f8fafc] text-slate-900">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold">Ön İzleme ve Özellikler</h2>
          <p className="mt-1 text-xs text-slate-500">{selectedElement ? `${selectedElement.type} seçildi` : selectedElements.length > 1 ? `${selectedElements.length} öğe seçildi` : 'Düzenlemek için bir öğe seçin.'}</p>
        </div>

        <Section title="Tasarım Ön İzleme">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              {previewAvailable ? 'İlk varyasyonlu ürün ile canlı ön izleme' : 'Ön izleme pasif'}
            </p>
            <button
              type="button"
              onClick={() => setShowLargePreview(true)}
              disabled={!previewAvailable}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Büyük Gör
            </button>
          </div>
          <div className={`rounded-lg border p-3 ${previewAvailable ? 'border-slate-200 bg-slate-100' : 'border-dashed border-slate-300 bg-slate-50 opacity-70'}`}>
            {previewLoading ? (
              <p className="rounded-md bg-white p-3 text-xs text-slate-500">Ön izleme ürünü yükleniyor...</p>
            ) : !previewAvailable ? (
              <div className="rounded-md bg-white p-3 text-xs text-slate-500">
                Veri tabanında kayıtlı varyasyonlu ürün bulunamadı. Ön izleme pasif.
              </div>
            ) : (
              <>
                <PreviewCanvas state={state} sortedElements={sortedElements} previewData={previewData} scaleFactor={1.8} />
                <p className="mt-2 text-center font-mono text-[10px] text-slate-500">
                  {state.labelWidth} x {state.labelHeight} mm
                </p>
                <p className="mt-1 truncate text-center text-[10px] text-slate-500">
                  Ön izleme ürünü: {previewData.productName} / {previewData.color} / {previewData.size}
                </p>
              </>
            )}
          </div>
        </Section>

        {selectedElement ? (
          <>
            <Section title="Konum ve Boyut">
              <div className="grid grid-cols-2 gap-2">
                <NumberInput label="X mm" value={selectedElement.x} min={0} max={state.labelWidth} onChange={(v) => updateSelected({ x: clamp(v, 0, state.labelWidth - selectedElement.width) })} />
                <NumberInput label="Y mm" value={selectedElement.y} min={0} max={state.labelHeight} onChange={(v) => updateSelected({ y: clamp(v, 0, state.labelHeight - selectedElement.height) })} />
                <NumberInput label="Genişlik mm" value={selectedElement.width} min={MIN_ELEMENT_MM} max={state.labelWidth} onChange={(v) => updateSelected({ width: clamp(v, MIN_ELEMENT_MM, state.labelWidth - selectedElement.x) })} />
                <NumberInput label="Yükseklik mm" value={selectedElement.height} min={MIN_ELEMENT_MM} max={state.labelHeight} onChange={(v) => updateSelected({ height: clamp(v, MIN_ELEMENT_MM, state.labelHeight - selectedElement.y) })} />
              </div>
              <div className="grid grid-cols-4 gap-1">
                {ROTATIONS.map((rotation) => (
                  <button
                    key={rotation}
                    type="button"
                    onClick={() => updateSelected({ rotation })}
                    className={`rounded-md border px-2 py-1.5 text-xs ${selectedElement.rotation === rotation ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
                  >
                    {rotation}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => updateSelected({ locked: !selectedElement.locked })} className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs">
                {selectedElement.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                {selectedElement.locked ? 'Kilidi Aç' : 'Kilitle'}
              </button>
            </Section>

            <Section title="Katman Sırası">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['up', 'Öne Al'],
                  ['down', 'Arkaya Al'],
                  ['front', 'En Öne'],
                  ['back', 'En Arkaya'],
                ].map(([direction, label]) => (
                  <button key={direction} type="button" onClick={() => dispatch({ type: 'REORDER_ELEMENT', payload: { id: selectedElement.id, direction } })} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs">
                    {label}
                  </button>
                ))}
              </div>
            </Section>

            {(selectedElement.type === 'boundField' || selectedElement.type === 'freeText') && (
              <Section title="Metin">
                <NumberInput label="Yazı boyutu pt" value={selectedElement.fontSize} min={6} max={72} step={1} onChange={(v) => updateSelected({ fontSize: clamp(v, 6, 72) })} />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => updateSelected({ fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })} className="rounded-md border border-slate-300 bg-white px-2 py-2 text-xs">
                    {selectedElement.fontWeight === 'bold' ? 'Kalın' : 'Normal'}
                  </button>
                  <input type="color" value={selectedElement.textColor} onChange={(e) => updateSelected({ textColor: e.target.value })} className="h-9 w-full rounded-md border border-slate-300 bg-white" />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['left', 'center', 'right'].map((align) => (
                    <button key={align} type="button" onClick={() => updateSelected({ align })} className={`rounded-md border px-2 py-1.5 text-xs ${selectedElement.align === align ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {{ left: 'Sol', center: 'Orta', right: 'Sağ' }[align]}
                    </button>
                  ))}
                </div>
                {selectedElement.type === 'freeText' ? (
                  <textarea value={selectedElement.content} onChange={(e) => updateSelected({ content: e.target.value })} className="h-24 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" />
                ) : null}
              </Section>
            )}

            {selectedElement.type === 'barcode' && (
              <Section title="Barkod / Karekod">
                <label className="space-y-1 text-xs text-slate-600">
                  <span>Barkod tipi</span>
                  <select value={selectedElement.barcodeType} onChange={(e) => updateSelected({ barcodeType: e.target.value })} className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs">
                    {BARCODE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-600">
                  <span>Sabit değer</span>
                  <input value={selectedElement.barcodeValue} onChange={(e) => updateSelected({ barcodeValue: e.target.value })} className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 font-mono text-xs" />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={selectedElement.showText} onChange={(e) => updateSelected({ showText: e.target.checked })} />
                  Altında metin göster
                </label>
                <NumberInput label="Modül genişliği mm" value={selectedElement.moduleWidth} min={0.1} max={2} step={0.1} onChange={(v) => updateSelected({ moduleWidth: v })} />
                {selectedElement.barcodeType === 'QR' ? (
                  <p className="rounded-md bg-blue-50 p-2 text-[11px] text-blue-800">
                    Karekod ZPL çıktısında `^BQN` komutu ile üretilir. Ekrandaki görüntü sadece görsel ön izlemedir.
                  </p>
                ) : null}
              </Section>
            )}

            {['line', 'rect', 'oval'].includes(selectedElement.type) && (
              <Section title="Şekil">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs text-slate-600">
                    <span>Çizgi rengi</span>
                    <input type="color" value={selectedElement.strokeColor} onChange={(e) => updateSelected({ strokeColor: e.target.value })} className="h-9 w-full rounded-md border border-slate-300 bg-white" />
                  </label>
                  <NumberInput label="Çizgi mm" value={selectedElement.strokeWidth} min={0.1} max={5} step={0.1} onChange={(v) => updateSelected({ strokeWidth: v })} />
                </div>
                {selectedElement.type !== 'line' ? (
                  <>
                    <label className="space-y-1 text-xs text-slate-600">
                      <span>Dolgu</span>
                      <input type="color" value={selectedElement.fillColor === 'transparent' ? '#ffffff' : selectedElement.fillColor} onChange={(e) => updateSelected({ fillColor: e.target.value })} className="h-9 w-full rounded-md border border-slate-300 bg-white" />
                    </label>
                    <button type="button" onClick={() => updateSelected({ fillColor: 'transparent' })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs">
                      Şeffaf
                    </button>
                  </>
                ) : (
                  <label className="space-y-1 text-xs text-slate-600">
                    <span>Yön</span>
                    <select value={selectedElement.lineDirection} onChange={(e) => updateSelected({ lineDirection: e.target.value })} className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs">
                      <option value="horizontal">Yatay</option>
                      <option value="vertical">Dikey</option>
                      <option value="diagonal">Çapraz</option>
                    </select>
                  </label>
                )}
                {selectedElement.type === 'rect' ? <NumberInput label="Köşe yarıçapı mm" value={selectedElement.radius} min={0} max={20} step={0.5} onChange={(v) => updateSelected({ radius: v })} /> : null}
              </Section>
            )}

            <Section title="İşlemler">
              <button type="button" onClick={() => dispatch({ type: 'DELETE_ELEMENTS', payload: [selectedElement.id] })} className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500">
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            </Section>
          </>
        ) : (
          <div className="p-4 text-sm text-slate-500">
            Sol panelden alanları sürükleyin veya <MousePointer2 className="mx-1 inline h-4 w-4" /> canvas üzerinde çizim yapın.
          </div>
        )}
      </aside>

      {showLargePreview && previewAvailable ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Büyük Tasarım Ön İzleme</h2>
                <p className="text-xs text-slate-500">
                  {previewData?.productName} / {previewData?.color} / {previewData?.size}
                </p>
              </div>
              <button type="button" onClick={() => setShowLargePreview(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-8">
              <PreviewCanvas state={state} sortedElements={sortedElements} previewData={previewData} scaleFactor={5} />
              <p className="mt-4 text-center font-mono text-xs text-slate-500">
                {state.labelWidth} x {state.labelHeight} mm
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {zpl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">ZPL Ön İzleme</h2>
                <p className="text-xs text-slate-500">Şablon alanları {'{fieldKey}'} formatında yer tutucu olarak çıkar.</p>
              </div>
              <button type="button" onClick={() => setZpl('')} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <textarea readOnly value={zpl} className="h-96 w-full rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-50" />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => navigator.clipboard.writeText(zpl)} className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                  <Copy className="h-4 w-4" />
                  Panoya Kopyala
                </button>
                <button type="button" onClick={() => downloadText(`${state.labelName || 'etiket'}.zpl`, zpl, 'text/plain')} className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500">
                  <Download className="h-4 w-4" />
                  .zpl İndir
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
