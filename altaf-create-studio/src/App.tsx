import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { jsPDF } from 'jspdf';
import {
  Home, LayoutTemplate, Shapes, Type, Upload, Pencil, Image as ImageIcon,
  Palette, Layers3, MoreHorizontal, Plus, Search, Bell, Menu, Undo2, Redo2,
  Download, Save, ChevronLeft, ChevronUp, ChevronDown, Copy, Trash2, Square,
  Circle, ImagePlus, Sparkles, Folder, Clock3, Star, Settings, Grid2X2,
  FileText, Smartphone, Monitor, X, Check, Maximize2, SlidersHorizontal,
  Crop, Lock, RotateCw, FlipHorizontal, FlipVertical, Triangle, Minus,
  FileDown, Eraser, Paintbrush, FolderOpen, CheckCircle2
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type Preset = { name: string; label: string; w: number; h: number; icon: 'square' | 'story' | 'portrait' | 'a4' };
type ToolPanel = 'design' | 'elements' | 'text' | 'uploads' | 'draw' | 'photos' | 'background' | 'layers' | 'more';
type View = 'home' | 'editor';
type StoredProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  bg: string;
  canvas: any;
  updatedAt: number;
};

const presets: Preset[] = [
  { name: 'Instagram Post', label: '1080 × 1080', w: 1080, h: 1080, icon: 'square' },
  { name: 'Story', label: '1080 × 1920', w: 1080, h: 1920, icon: 'story' },
  { name: 'Portrait Post', label: '1080 × 1350', w: 1080, h: 1350, icon: 'portrait' },
  { name: 'A4 Document', label: '1240 × 1754', w: 1240, h: 1754, icon: 'a4' }
];

const templateNames = ['Minimal Post', 'Sale Poster', 'Business', 'Birthday', 'Fashion'];
const PROJECT_KEY = 'altaf-create-studio-project-v1';
const PROJECTS_KEY = 'altaf-create-studio-projects-v2';
const BRAND_KEY = 'altaf-create-studio-brand-v1';

const toolTabs: { id: ToolPanel; label: string; icon: any }[] = [
  { id: 'design', label: 'Design', icon: LayoutTemplate },
  { id: 'elements', label: 'Elements', icon: Shapes },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'draw', label: 'Draw', icon: Pencil },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
  { id: 'background', label: 'Background', icon: Palette },
  { id: 'layers', label: 'Layers', icon: Layers3 },
  { id: 'more', label: 'More', icon: MoreHorizontal }
];

function safeProjects(): StoredProject[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function makeTextDataUrl(text: string, color: string, fontSize: number, weight = '700') {
  const scale = 2;
  const pad = Math.max(24, Math.round(fontSize * .35));
  const lines = text.split('\n');
  const measure = document.createElement('canvas');
  const mctx = measure.getContext('2d')!;
  mctx.font = weight + ' ' + fontSize + 'px Arial, sans-serif';
  const maxW = Math.max(...lines.map(l => mctx.measureText(l || ' ').width), fontSize);
  const lineH = fontSize * 1.25;
  const c = document.createElement('canvas');
  c.width = Math.ceil((maxW + pad * 2) * scale);
  c.height = Math.ceil((lineH * lines.length + pad * 2) * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = weight + ' ' + fontSize + 'px Arial, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  lines.forEach((line, i) => ctx.fillText(line || ' ', pad, pad + i * lineH));
  return c.toDataURL('image/png');
}

function hexToRgba(hex:string, alpha:number) {
  const h=hex.replace('#','');
  const full=h.length===3?h.split('').map(x=>x+x).join(''):h;
  const n=parseInt(full,16);
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeTool, setActiveTool] = useState<ToolPanel>('design');
  const [createOpen, setCreateOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [textMode, setTextMode] = useState<'add' | 'edit'>('add');
  const [textValue, setTextValue] = useState('');
  const [toast, setToast] = useState('');
  const [size, setSize] = useState({ w: 1080, h: 1080 });
  const [customW, setCustomW] = useState('1080');
  const [customH, setCustomH] = useState('1080');
  const [fill, setFill] = useState('#7c5cff');
  const [bg, setBg] = useState('#ffffff');
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [selected, setSelected] = useState<fabric.Object | null>(null);
  const [projectId, setProjectId] = useState(() => 'p_' + Date.now());
  const [projectName, setProjectName] = useState('Untitled design');
  const [projects, setProjects] = useState<StoredProject[]>(() => safeProjects());
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [brandColors, setBrandColors] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(BRAND_KEY) || '["#7c5cff","#111111","#ffffff"]'); }
    catch { return ['#7c5cff','#111111','#ffffff']; }
  });
  const [drawing, setDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(14);
  const [drawColor, setDrawColor] = useState('#111111');
  const [drawType, setDrawType] = useState<'pen'|'marker'|'highlighter'>('pen');

  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const restoringRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingProjectRef = useRef<StoredProject | 'blank' | null>(null);
  const pendingTemplateRef = useRef<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1700);
  };

  const refreshProjects = () => setProjects(safeProjects());

  const refreshLayers = () => {
    const c = fabricRef.current;
    if (!c) return;
    setLayers([...c.getObjects()].reverse());
  };

  const fitCanvas = () => {
    const c = fabricRef.current;
    if (!c) return;
    const holder = document.querySelector('.canvas-holder') as HTMLElement | null;
    if (!holder) return;
    const logicalW = Number(c.getWidth()) || size.w;
    const logicalH = Number(c.getHeight()) || size.h;
    const maxW = Math.max(240, holder.clientWidth - 28);
    const maxH = Math.max(240, holder.clientHeight - 28);
    const scale = Math.min(maxW / logicalW, maxH / logicalH, 1);
    c.setDimensions(
      { width: Math.round(logicalW * scale), height: Math.round(logicalH * scale) },
      { cssOnly: true }
    );
    c.calcOffset();
  };

  const snapshot = () => {
    const c = fabricRef.current;
    if (!c || restoringRef.current) return;
    const json = JSON.stringify(c.toJSON(['name','appType','textValue','textColor','textFontSize']));
    const current = historyRef.current[historyIndexRef.current];
    if (json === current) return;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    refreshLayers();
  };

  const addRasterText = (
    c: fabric.Canvas,
    text: string,
    color = '#111111',
    fontSize = Math.max(64, size.w * .07),
    x = size.w / 2,
    y = size.h / 2,
    weight = '700'
  ) => new Promise<fabric.Image>((resolve) => {
    const url = makeTextDataUrl(text, color, fontSize, weight);
    fabric.Image.fromURL(url, img => {
      img.set({
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        objectCaching: false
      });
      (img as any).name = 'Text';
      (img as any).appType = 'text';
      (img as any).textValue = text;
      (img as any).textColor = color;
      (img as any).textFontSize = fontSize;
      c.add(img);
      c.bringToFront(img);
      img.setCoords();
      resolve(img);
    });
  });

  const applyTemplate = async (name: string) => {
    const c = fabricRef.current;
    if (!c) return;
    restoringRef.current = true;
    c.clear();

    const addR = (opts: fabric.IRectOptions, layerName: string) => {
      const r = new fabric.Rect(opts);
      (r as any).name = layerName;
      c.add(r);
      return r;
    };

    if (name === 'Minimal Post') {
      setBg('#f7f4ff'); c.setBackgroundColor('#f7f4ff', () => {});
      addR({left:size.w*.08,top:size.h*.08,width:size.w*.84,height:size.h*.84,rx:60,ry:60,fill:'#ffffff'}, 'Card');
      addR({left:size.w*.12,top:size.h*.13,width:size.w*.18,height:size.w*.05,rx:20,ry:20,fill:'#7c5cff'}, 'Accent');
      await addRasterText(c,'CREATE\nBEAUTIFULLY','#18171d',Math.max(62,size.w*.075),size.w*.5,size.h*.46,'700');
      await addRasterText(c,'Altaf Create Studio','#7c5cff',Math.max(32,size.w*.035),size.w*.5,size.h*.68,'700');
    } else if (name === 'Sale Poster') {
      setBg('#111218'); c.setBackgroundColor('#111218', () => {});
      addR({left:0,top:size.h*.62,width:size.w,height:size.h*.38,fill:'#ff4d7d'}, 'Bottom block');
      addR({left:size.w*.08,top:size.h*.11,width:size.w*.3,height:size.w*.3,rx:999,ry:999,fill:'#7c5cff'}, 'Circle accent');
      await addRasterText(c,'BIG SALE','#ffffff',Math.max(82,size.w*.10),size.w*.5,size.h*.40,'700');
      await addRasterText(c,'UP TO 50% OFF','#ffffff',Math.max(38,size.w*.045),size.w*.5,size.h*.73,'700');
    } else if (name === 'Business') {
      setBg('#edf3ff'); c.setBackgroundColor('#edf3ff', () => {});
      addR({left:size.w*.08,top:size.h*.12,width:size.w*.84,height:size.h*.76,rx:48,ry:48,fill:'#15213b'}, 'Business card');
      addR({left:size.w*.12,top:size.h*.17,width:size.w*.2,height:size.w*.045,rx:18,ry:18,fill:'#62a8ff'}, 'Accent');
      await addRasterText(c,'YOUR BUSINESS','#ffffff',Math.max(66,size.w*.075),size.w*.5,size.h*.43,'700');
      await addRasterText(c,'Clean • Modern • Professional','#9fc7ff',Math.max(30,size.w*.032),size.w*.5,size.h*.62,'700');
    } else if (name === 'Birthday') {
      setBg('#fff5dc'); c.setBackgroundColor('#fff5dc', () => {});
      addR({left:size.w*.06,top:size.h*.08,width:size.w*.88,height:size.h*.84,rx:70,ry:70,fill:'#ff83b8'}, 'Party card');
      addR({left:size.w*.16,top:size.h*.18,width:size.w*.13,height:size.w*.13,rx:999,ry:999,fill:'#ffe66d'}, 'Dot 1');
      addR({left:size.w*.72,top:size.h*.24,width:size.w*.10,height:size.w*.10,rx:999,ry:999,fill:'#7c5cff'}, 'Dot 2');
      await addRasterText(c,'HAPPY\nBIRTHDAY!','#ffffff',Math.max(72,size.w*.085),size.w*.5,size.h*.49,'700');
      await addRasterText(c,'Celebrate your special day','#fff7fb',Math.max(30,size.w*.032),size.w*.5,size.h*.70,'700');
    } else {
      setBg('#f4efe8'); c.setBackgroundColor('#f4efe8', () => {});
      addR({left:size.w*.08,top:size.h*.09,width:size.w*.84,height:size.h*.82,fill:'#161616'}, 'Fashion frame');
      addR({left:size.w*.13,top:size.h*.16,width:size.w*.74,height:size.h*.45,fill:'#d7c0a7'}, 'Photo area');
      await addRasterText(c,'NEW COLLECTION','#ffffff',Math.max(58,size.w*.066),size.w*.5,size.h*.72,'700');
      await addRasterText(c,'FASHION / 2026','#d7c0a7',Math.max(28,size.w*.03),size.w*.5,size.h*.81,'700');
    }

    restoringRef.current = false;
    c.discardActiveObject();
    c.renderAll();
    historyRef.current = [JSON.stringify(c.toJSON(['name','appType','textValue','textColor','textFontSize']))];
    historyIndexRef.current = 0;
    refreshLayers();
    flash(name + ' applied');
  };

  useEffect(() => {
    if (view !== 'editor' || !canvasEl.current) return;

    const pending = pendingProjectRef.current;
    const initialSize = pending && pending !== 'blank'
      ? { w: pending.width, h: pending.height }
      : size;

    const c = new fabric.Canvas(canvasEl.current, {
      width: initialSize.w,
      height: initialSize.h,
      backgroundColor: pending && pending !== 'blank' ? pending.bg : bg,
      preserveObjectStacking: true,
      selectionColor: 'rgba(124,92,255,.12)',
      selectionBorderColor: '#7c5cff',
      selectionLineWidth: 2
    });

    fabricRef.current = c;

    const onSelect = () => {
      const obj = c.getActiveObject() || null;
      setSelected(obj);
      if (obj && typeof obj.fill === 'string') setFill(obj.fill);
      if (obj && (obj as any).appType === 'text') setFill((obj as any).textColor || '#111111');
    };
    const onClear = () => setSelected(null);

    c.on('selection:created', onSelect);
    c.on('selection:updated', onSelect);
    c.on('selection:cleared', onClear);
    c.on('object:added', snapshot);
    c.on('object:modified', snapshot);
    c.on('object:removed', snapshot);
    c.on('path:created', snapshot);

    const loadData = (data: any, width: number, height: number, background: string) => {
      setSize({w:width,h:height});
      setBg(background);
      c.setDimensions({width,height});
      c.setBackgroundColor(background, () => {});
      restoringRef.current = true;
      c.loadFromJSON(data, () => {
        restoringRef.current = false;
        c.renderAll();
        historyRef.current = [JSON.stringify(c.toJSON(['name','appType','textValue','textColor','textFontSize']))];
        historyIndexRef.current = 0;
        refreshLayers();
        requestAnimationFrame(fitCanvas);
      });
    };

    if (pending && pending !== 'blank') {
      setProjectId(pending.id);
      setProjectName(pending.name);
      loadData(pending.canvas, pending.width, pending.height, pending.bg);
    } else if (pending !== 'blank') {
      const legacy = localStorage.getItem(PROJECT_KEY);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (parsed.canvas) loadData(parsed.canvas, parsed.width || 1080, parsed.height || 1080, parsed.bg || '#ffffff');
        } catch {}
      }
    } else {
      historyRef.current = [JSON.stringify(c.toJSON(['name','appType','textValue','textColor','textFontSize']))];
      historyIndexRef.current = 0;
    }

    pendingProjectRef.current = null;

    requestAnimationFrame(fitCanvas);
    window.addEventListener('resize', fitCanvas);

    if (pendingTemplateRef.current) {
      const t = pendingTemplateRef.current;
      pendingTemplateRef.current = null;
      window.setTimeout(() => applyTemplate(t), 120);
    }

    return () => {
      window.removeEventListener('resize', fitCanvas);
      c.dispose();
      fabricRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.setDimensions({ width: size.w, height: size.h });
    window.setTimeout(fitCanvas, 40);
  }, [size]);

  const startProject = (p?: Preset, project?: StoredProject) => {
    if (project) {
      pendingProjectRef.current = project;
      setSize({w:project.width,h:project.height});
      setBg(project.bg);
      setProjectId(project.id);
      setProjectName(project.name);
    } else {
      pendingProjectRef.current = 'blank';
      const chosen = p || presets[0];
      setSize({ w: chosen.w, h: chosen.h });
      setCustomW(String(chosen.w));
      setCustomH(String(chosen.h));
      setBg('#ffffff');
      setProjectId('p_' + Date.now());
      setProjectName('Untitled design');
    }
    setCreateOpen(false);
    setProjectsOpen(false);
    setView('editor');
  };

  const openLatest = () => {
    const latest = safeProjects().sort((a,b) => b.updatedAt-a.updatedAt)[0];
    latest ? startProject(undefined, latest) : startProject(presets[0]);
  };

  const startTemplate = (name: string) => {
    pendingTemplateRef.current = name;
    pendingProjectRef.current = 'blank';
    setProjectId('p_' + Date.now());
    setProjectName(name);
    setBg('#ffffff');
    setSize({w:1080,h:1080});
    setView('editor');
    setActiveTool('design');
  };

  const openAddText = () => {
    setTextMode('add');
    setTextValue('');
    setTextOpen(true);
    window.setTimeout(() => textInputRef.current?.focus(), 120);
  };

  const openEditText = () => {
    const obj = fabricRef.current?.getActiveObject() as any;
    if (!obj || obj.appType !== 'text') return;
    setTextMode('edit');
    setTextValue(String(obj.textValue || ''));
    setTextOpen(true);
    window.setTimeout(() => textInputRef.current?.focus(), 120);
  };

  const applyText = async () => {
    const c = fabricRef.current;
    if (!c) return;
    const value = textValue.trim() || 'Text';

    if (textMode === 'edit') {
      const obj = c.getActiveObject() as any;
      if (obj?.appType === 'text') {
        const displayW = obj.getScaledWidth();
        const displayH = obj.getScaledHeight();
        const color = obj.textColor || fill || '#111111';
        const fontSize = obj.textFontSize || Math.max(64,size.w*.07);
        const url = makeTextDataUrl(value, color, fontSize);
        obj.setSrc(url, () => {
          obj.textValue = value;
          obj.scaleX = displayW / Math.max(1, obj.width || 1);
          obj.scaleY = displayH / Math.max(1, obj.height || 1);
          obj.setCoords();
          c.requestRenderAll();
          snapshot();
        });
      }
    } else {
      const img = await addRasterText(c, value, '#111111');
      c.setActiveObject(img);
      c.requestRenderAll();
      snapshot();
    }

    setTextOpen(false);
    flash(textMode === 'edit' ? 'Text updated' : 'Text added');
  };

  const addRect = () => {
    const c = fabricRef.current;
    if (!c) return;
    const obj = new fabric.Rect({
      left: size.w * .24, top: size.h * .24,
      width: size.w * .42, height: size.h * .24,
      rx: 36, ry: 36, fill
    });
    (obj as any).name = 'Rectangle';
    c.add(obj); c.setActiveObject(obj); c.renderAll();
  };

  const addCircle = () => {
    const c = fabricRef.current;
    if (!c) return;
    const obj = new fabric.Circle({
      left: size.w * .34, top: size.h * .27,
      radius: size.w * .15, fill
    });
    (obj as any).name = 'Circle';
    c.add(obj); c.setActiveObject(obj); c.renderAll();
  };

  const addTriangle = () => {
    const c = fabricRef.current;
    if (!c) return;
    const obj = new fabric.Triangle({
      left:size.w*.33, top:size.h*.28,
      width:size.w*.34, height:size.w*.30, fill
    });
    (obj as any).name = 'Triangle';
    c.add(obj); c.setActiveObject(obj); c.renderAll();
  };

  const addLine = () => {
    const c = fabricRef.current;
    if (!c) return;
    const obj = new fabric.Line([size.w*.2,size.h*.5,size.w*.8,size.h*.5], {
      stroke: fill, strokeWidth: Math.max(8,size.w*.012)
    });
    (obj as any).name = 'Line';
    c.add(obj); c.setActiveObject(obj); c.renderAll();
  };

  const onImage = (file?: File) => {
    const c = fabricRef.current;
    if (!c || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(String(reader.result), img => {
        const maxW = size.w * .7;
        const maxH = size.h * .58;
        const scale = Math.min(maxW / (img.width || maxW), maxH / (img.height || maxH), 1);
        img.set({ left: size.w * .15, top: size.h * .18, scaleX: scale, scaleY: scale });
        (img as any).name = file.name || 'Image';
        (img as any).appType = 'photo';
        c.add(img); c.setActiveObject(img); c.renderAll();
        snapshot();
        setActiveTool('photos');
        flash('Photo added');
      }, { crossOrigin: 'anonymous' });
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeSelected = () => {
    const c = fabricRef.current;
    if (!c) return;
    c.getActiveObjects().forEach(o => c.remove(o));
    c.discardActiveObject(); c.requestRenderAll();
  };

  const duplicateSelected = () => {
    const c = fabricRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.clone((clone: fabric.Object) => {
      clone.set({ left: (obj.left || 0) + 35, top: (obj.top || 0) + 35 });
      (clone as any).name = ((obj as any).name || obj.type || 'Layer') + ' copy';
      c.add(clone); c.setActiveObject(clone); c.requestRenderAll();
    });
  };

  const changeFill = (value: string) => {
    setFill(value);
    const c = fabricRef.current;
    const obj = c?.getActiveObject() as any;
    if (!c || !obj) return;
    if (obj.appType === 'text') {
      const displayW = obj.getScaledWidth();
      const displayH = obj.getScaledHeight();
      const url = makeTextDataUrl(obj.textValue || 'Text', value, obj.textFontSize || 72);
      obj.setSrc(url, () => {
        obj.textColor = value;
        obj.scaleX = displayW / Math.max(1,obj.width || 1);
        obj.scaleY = displayH / Math.max(1,obj.height || 1);
        obj.setCoords(); c.requestRenderAll(); snapshot();
      });
    } else if (obj.type === 'line') {
      obj.set('stroke', value); c.requestRenderAll(); snapshot();
    } else {
      obj.set('fill', value); c.requestRenderAll(); snapshot();
    }
  };

  const changeBg = (value: string) => {
    setBg(value);
    const c = fabricRef.current;
    if (!c) return;
    c.setBackgroundColor(value, () => { c.renderAll(); snapshot(); });
  };

  const applyHistory = (index: number) => {
    const c = fabricRef.current;
    const raw = historyRef.current[index];
    if (!c || !raw) return;
    restoringRef.current = true;
    c.loadFromJSON(raw, () => {
      c.renderAll();
      restoringRef.current = false;
      historyIndexRef.current = index;
      refreshLayers();
      setSelected(null);
    });
  };

  const undo = () => { if (historyIndexRef.current > 0) applyHistory(historyIndexRef.current - 1); };
  const redo = () => { if (historyIndexRef.current < historyRef.current.length - 1) applyHistory(historyIndexRef.current + 1); };

  const moveLayer = (obj: fabric.Object, dir: 'up' | 'down') => {
    const c = fabricRef.current;
    if (!c) return;
    dir === 'up' ? c.bringForward(obj) : c.sendBackwards(obj);
    c.setActiveObject(obj); c.renderAll(); snapshot();
  };

  const saveProject = (silent = false) => {
    const c = fabricRef.current;
    if (!c) return;
    const data: StoredProject = {
      id: projectId,
      name: projectName,
      width: size.w,
      height: size.h,
      bg,
      canvas: c.toJSON(['name','appType','textValue','textColor','textFontSize']),
      updatedAt: Date.now()
    };
    localStorage.setItem(PROJECT_KEY, JSON.stringify(data));
    const list = safeProjects().filter(p => p.id !== projectId);
    list.unshift(data);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list.slice(0,12)));
    refreshProjects();
    if (!silent) flash('Project saved');
  };

  const deleteProject = (id: string) => {
    const list = safeProjects().filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    refreshProjects();
    flash('Project deleted');
  };

  const exportImage = async (format: 'png' | 'jpeg') => {
    const c = fabricRef.current;
    if (!c) return;
    c.discardActiveObject(); c.renderAll();
    const dataUrl = c.toDataURL({ format, quality: .96, multiplier: 1 });
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const fileName = 'Altaf-Create-Studio-' + Date.now() + '.' + ext;

    if (Capacitor.isNativePlatform()) {
      const base64 = dataUrl.split(',')[1];
      const out = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
      await Share.share({ title: 'Export design', url: out.uri });
    } else {
      const a = document.createElement('a'); a.href = dataUrl; a.download = fileName; a.click();
    }
    flash(ext.toUpperCase() + ' ready');
  };

  const exportPdf = async () => {
    const c = fabricRef.current;
    if (!c) return;
    c.discardActiveObject(); c.renderAll();
    const png = c.toDataURL({format:'png',quality:1,multiplier:1});
    const orientation = size.w > size.h ? 'landscape' : 'portrait';
    const doc = new jsPDF({orientation, unit:'px', format:[size.w,size.h], hotfixes:['px_scaling']});
    doc.addImage(png,'PNG',0,0,size.w,size.h);
    const fileName = 'Altaf-Create-Studio-' + Date.now() + '.pdf';
    if (Capacitor.isNativePlatform()) {
      const uri = doc.output('datauristring');
      const base64 = uri.split(',')[1];
      const out = await Filesystem.writeFile({path:fileName,data:base64,directory:Directory.Cache});
      await Share.share({title:'Export PDF',url:out.uri});
    } else {
      doc.save(fileName);
    }
    flash('PDF ready');
  };

  const applyCustom = () => {
    const w = Math.max(200, Math.min(5000, Number(customW) || 1080));
    const h = Math.max(200, Math.min(5000, Number(customH) || 1080));
    setSize({ w, h });
    const c = fabricRef.current;
    if (c) {
      c.setDimensions({width:w,height:h});
      window.setTimeout(fitCanvas,50);
      snapshot();
      setCustomOpen(false);
      flash('Canvas resized');
    } else {
      pendingProjectRef.current = 'blank';
      setCustomOpen(false); setCreateOpen(false); setView('editor');
    }
  };

  const selectLayer = (obj: fabric.Object) => {
    const c = fabricRef.current;
    if (!c) return;
    c.setActiveObject(obj); c.requestRenderAll(); setSelected(obj);
  };

  const getPhoto = () => {
    const obj = fabricRef.current?.getActiveObject() as any;
    return obj && obj.type === 'image' && obj.appType !== 'text' ? obj as fabric.Image : null;
  };

  const rotatePhoto = () => {
    const img = getPhoto(); const c = fabricRef.current;
    if (!img || !c) return flash('Select a photo first');
    img.rotate(((img.angle || 0) + 90) % 360); img.setCoords(); c.requestRenderAll(); snapshot();
  };

  const flipPhotoX = () => {
    const img = getPhoto(); const c = fabricRef.current;
    if (!img || !c) return flash('Select a photo first');
    img.set('flipX', !img.flipX); c.requestRenderAll(); snapshot();
  };

  const flipPhotoY = () => {
    const img = getPhoto(); const c = fabricRef.current;
    if (!img || !c) return flash('Select a photo first');
    img.set('flipY', !img.flipY); c.requestRenderAll(); snapshot();
  };

  const cropSquare = () => {
    const img = getPhoto(); const c = fabricRef.current;
    if (!img || !c) return flash('Select a photo first');
    const w = img.width || 0, h = img.height || 0, m = Math.min(w,h);
    img.set({cropX:(w-m)/2,cropY:(h-m)/2,width:m,height:m});
    img.setCoords(); c.requestRenderAll(); snapshot(); flash('Square crop applied');
  };

  const photoFilter = (type: 'brightness'|'contrast'|'saturation'|'grayscale'|'blur'|'clear') => {
    const img = getPhoto(); const c = fabricRef.current;
    if (!img || !c) return flash('Select a photo first');
    if (type === 'clear') img.filters = [];
    else {
      const F:any = fabric.Image.filters;
      const filter =
        type === 'brightness' ? new F.Brightness({brightness:.16}) :
        type === 'contrast' ? new F.Contrast({contrast:.18}) :
        type === 'saturation' ? new F.Saturation({saturation:.28}) :
        type === 'grayscale' ? new F.Grayscale() :
        new F.Blur({blur:.12});
      img.filters = [...(img.filters || []).filter(Boolean), filter];
    }
    img.applyFilters(); c.requestRenderAll(); snapshot(); flash(type === 'clear' ? 'Filters cleared' : type + ' applied');
  };

  const removeSimpleBackground = async () => {
    const img = getPhoto(); const c = fabricRef.current;
    if (!img || !c) return flash('Select a photo first');
    flash('Removing background…');
    await new Promise(r => setTimeout(r,40));
    const el:any = img.getElement();
    const ow = el.naturalWidth || el.videoWidth || el.width;
    const oh = el.naturalHeight || el.videoHeight || el.height;
    if (!ow || !oh) return flash('Image not ready');
    const scale = Math.min(1, 1000 / Math.max(ow,oh));
    const w = Math.max(1,Math.round(ow*scale)), h = Math.max(1,Math.round(oh*scale));
    const oc = document.createElement('canvas'); oc.width=w; oc.height=h;
    const ctx = oc.getContext('2d',{willReadFrequently:true})!;
    ctx.drawImage(el,0,0,w,h);
    const image = ctx.getImageData(0,0,w,h);
    const d = image.data;
    const corners = [[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
    let rr=0,gg=0,bb=0;
    corners.forEach(([x,y])=>{const i=(y*w+x)*4;rr+=d[i];gg+=d[i+1];bb+=d[i+2];});
    rr/=4;gg/=4;bb/=4;
    const tol = 78;
    const seen = new Uint8Array(w*h);
    const q = new Int32Array(w*h);
    let head=0,tail=0;
    const similar=(idx:number)=>{
      const i=idx*4, dr=d[i]-rr,dg=d[i+1]-gg,db=d[i+2]-bb;
      return Math.sqrt(dr*dr+dg*dg+db*db) < tol;
    };
    const push=(idx:number)=>{ if(idx>=0&&idx<w*h&&!seen[idx]&&similar(idx)){seen[idx]=1;q[tail++]=idx;} };
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
    for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
    while(head<tail){
      const idx=q[head++]; d[idx*4+3]=0;
      const x=idx%w,y=(idx/w)|0;
      if(x>0)push(idx-1); if(x<w-1)push(idx+1); if(y>0)push(idx-w); if(y<h-1)push(idx+w);
    }
    ctx.putImageData(image,0,0);
    const url=oc.toDataURL('image/png');
    const displayW=img.getScaledWidth(), displayH=img.getScaledHeight();
    img.setSrc(url,()=>{
      img.scaleX=displayW/Math.max(1,img.width||1);
      img.scaleY=displayH/Math.max(1,img.height||1);
      img.setCoords(); c.requestRenderAll(); snapshot(); flash('Background removed');
    });
  };

  const setDrawMode = (type: 'pen'|'marker'|'highlighter') => {
    const c = fabricRef.current;
    if (!c) return;
    setDrawType(type); setDrawing(true);
    c.discardActiveObject(); c.isDrawingMode = true;
    const brush = new fabric.PencilBrush(c);
    brush.width = type === 'pen' ? brushSize : type === 'marker' ? brushSize*1.6 : brushSize*2.3;
    brush.color = type === 'highlighter'
      ? hexToRgba(drawColor,.28)
      : type === 'marker' ? hexToRgba(drawColor,.70) : drawColor;
    c.freeDrawingBrush = brush;
    c.requestRenderAll();
  };

  const stopDraw = () => {
    const c = fabricRef.current;
    if (!c) return;
    c.isDrawingMode = false; setDrawing(false); refreshLayers(); flash('Drawing finished');
  };

  const clearSelectedStroke = () => {
    const c = fabricRef.current; const obj = c?.getActiveObject();
    if (!c || !obj || obj.type !== 'path') return flash('Select a drawn stroke');
    c.remove(obj); c.requestRenderAll(); flash('Stroke erased');
  };

  const updateBrush = (nextSize?:number,nextColor?:string) => {
    const c=fabricRef.current;
    const s=nextSize ?? brushSize, col=nextColor ?? drawColor;
    setBrushSize(s); setDrawColor(col);
    if(c?.isDrawingMode) {
      const brush=new fabric.PencilBrush(c);
      brush.width=drawType==='pen'?s:drawType==='marker'?s*1.6:s*2.3;
      brush.color=drawType==='highlighter'?hexToRgba(col,.28):drawType==='marker'?hexToRgba(col,.70):col;
      c.freeDrawingBrush=brush;
    }
  };

  const addBrandColor = (color:string) => {
    const next = [color, ...brandColors.filter(c=>c!==color)].slice(0,10);
    setBrandColors(next); localStorage.setItem(BRAND_KEY,JSON.stringify(next)); flash('Brand color saved');
  };

  const clearCanvas = () => {
    const c=fabricRef.current;
    if(!c)return;
    c.clear(); c.setBackgroundColor(bg,()=>c.renderAll()); setSelected(null); refreshLayers(); snapshot(); flash('Canvas cleared');
  };

  const filteredPresets = presets.filter(p => !query || p.name.toLowerCase().includes(query.toLowerCase()));
  const latest = projects.slice().sort((a,b)=>b.updatedAt-a.updatedAt)[0];

  const renderPanel = () => {
    if (activeTool === 'design') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Design</b><span>Ready-to-edit templates</span></div></div>
          <div className="horizontal-cards">
            {templateNames.map((name, i) => (
              <button className={'mini-template t' + (i+1)} key={name} onClick={() => applyTemplate(name)}>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeTool === 'elements') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Elements</b><span>Tap to add</span></div></div>
          <div className="element-grid">
            <button onClick={addRect}><Square /><span>Rectangle</span></button>
            <button onClick={addCircle}><Circle /><span>Circle</span></button>
            <button onClick={addTriangle}><Triangle /><span>Triangle</span></button>
            <button onClick={addLine}><Minus /><span>Line</span></button>
          </div>
        </div>
      );
    }

    if (activeTool === 'text') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Text</b><span>Mobile-safe text layer</span></div></div>
          <div className="text-presets">
            <button onClick={openAddText} className="add-text-main"><Plus /> Add a text box</button>
            <button onClick={openAddText} className="text-style heading-demo">Add a heading</button>
            <button onClick={openAddText} className="text-style subheading-demo">Add a subheading</button>
            <button onClick={openAddText} className="text-style body-demo">Add body text</button>
          </div>
        </div>
      );
    }

    if (activeTool === 'uploads') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Uploads</b><span>JPG, PNG, WEBP</span></div></div>
          <button className="upload-card" onClick={() => fileRef.current?.click()}>
            <ImagePlus /><div><b>Upload photo</b><span>From your phone</span></div><Plus />
          </button>
        </div>
      );
    }

    if (activeTool === 'draw') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Draw</b><span>{drawing ? 'Drawing mode ON' : 'Choose a brush'}</span></div></div>
          <div className="draw-row">
            <button className={drawing&&drawType==='pen'?'selected-tool':''} onClick={() => setDrawMode('pen')}><Paintbrush /><small>Pen</small></button>
            <button className={drawing&&drawType==='marker'?'selected-tool':''} onClick={() => setDrawMode('marker')}><Pencil /><small>Marker</small></button>
            <button className={drawing&&drawType==='highlighter'?'selected-tool':''} onClick={() => setDrawMode('highlighter')}><Sparkles /><small>Highlight</small></button>
            <button onClick={clearSelectedStroke}><Eraser /><small>Erase stroke</small></button>
          </div>
          <div className="draw-controls">
            <label>Size <input type="range" min="2" max="60" value={brushSize} onChange={e=>updateBrush(Number(e.target.value),undefined)} /></label>
            <label className="draw-color">Color <input type="color" value={drawColor} onChange={e=>updateBrush(undefined,e.target.value)} /></label>
            {drawing && <button onClick={stopDraw}><Check /> Done</button>}
          </div>
        </div>
      );
    }

    if (activeTool === 'photos') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Photo tools</b><span>Select a photo, then edit</span></div></div>
          <div className="photo-tools photo-tools-scroll">
            <button onClick={cropSquare}><Crop /><span>Square crop</span></button>
            <button onClick={rotatePhoto}><RotateCw /><span>Rotate</span></button>
            <button onClick={flipPhotoX}><FlipHorizontal /><span>Flip H</span></button>
            <button onClick={flipPhotoY}><FlipVertical /><span>Flip V</span></button>
            <button onClick={() => photoFilter('brightness')}><SlidersHorizontal /><span>Bright</span></button>
            <button onClick={() => photoFilter('contrast')}><SlidersHorizontal /><span>Contrast</span></button>
            <button onClick={() => photoFilter('saturation')}><Palette /><span>Saturate</span></button>
            <button onClick={() => photoFilter('grayscale')}><ImageIcon /><span>B&W</span></button>
            <button onClick={() => photoFilter('blur')}><Sparkles /><span>Blur</span></button>
            <button onClick={() => photoFilter('clear')}><Trash2 /><span>Clear FX</span></button>
            <button onClick={removeSimpleBackground}><ImageIcon /><span>BG Remove</span></button>
          </div>
        </div>
      );
    }

    if (activeTool === 'background') {
      const colors = ['#ffffff','#111111','#7c5cff','#ff477e','#ffb703','#00b894','#3a86ff','#8338ec'];
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Background</b><span>Canvas color</span></div></div>
          <div className="color-grid">
            {colors.map(c => <button key={c} style={{background:c}} className={bg===c?'chosen':''} onClick={() => changeBg(c)} />)}
            <label className="custom-color"><Plus /><input type="color" value={bg} onChange={e => changeBg(e.target.value)} /></label>
          </div>
        </div>
      );
    }

    if (activeTool === 'layers') {
      return (
        <div className="panel-content layer-panel">
          <div className="panel-heading"><div><b>Layers</b><span>{layers.length} objects</span></div></div>
          <div className="layers-list">
            {layers.length === 0 && <div className="empty">No layers yet.</div>}
            {layers.map((obj, i) => (
              <div className={'layer-row ' + (selected===obj?'selected':'')} key={i} onClick={() => selectLayer(obj)}>
                <div className="layer-thumb">{(obj as any).appType==='text'?'T':String(obj.type).slice(0,1).toUpperCase()}</div>
                <div className="layer-name">{(obj as any).name || obj.type || 'Layer'}</div>
                <div className="layer-actions">
                  <button onClick={e => {e.stopPropagation(); moveLayer(obj,'up')}}><ChevronUp /></button>
                  <button onClick={e => {e.stopPropagation(); moveLayer(obj,'down')}}><ChevronDown /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="panel-content">
        <div className="panel-heading"><div><b>More tools</b><span>All buttons here work</span></div></div>
        <div className="more-grid">
          <button onClick={() => setCustomOpen(true)}><Maximize2 /><span>Resize</span></button>
          <button onClick={() => exportImage('png')}><Download /><span>PNG</span></button>
          <button onClick={() => exportImage('jpeg')}><ImageIcon /><span>JPG</span></button>
          <button onClick={exportPdf}><FileDown /><span>PDF</span></button>
          <button onClick={() => addBrandColor(fill)}><Star /><span>Save color</span></button>
          <button onClick={clearCanvas}><Trash2 /><span>Clear canvas</span></button>
        </div>
        <div className="brand-row">
          <span>Brand colors</span>
          <div>{brandColors.map(c=><button key={c} style={{background:c}} onClick={()=>changeFill(c)} />)}</div>
        </div>
      </div>
    );
  };

  if (view === 'home') {
    return (
      <div className="home-shell">
        <header className="home-header">
          <div className="brand big-brand">
            <div className="brand-mark">A</div>
            <div><b>Altaf Create</b><span>Studio</span></div>
          </div>
          <div className="home-head-actions">
            <button onClick={() => flash('No notifications')}><Bell /></button>
            <button onClick={() => setMenuOpen(true)}><Menu /></button>
          </div>
        </header>

        <main className="home-main">
          <div className="welcome-row">
            <div><span>Creative workspace</span><h1>What will you create?</h1></div>
            <button className="profile-chip" onClick={() => setMenuOpen(true)}>AS</button>
          </div>

          <label className="home-search"><Search /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search sizes…" /></label>

          <button className="hero-create" onClick={() => setCreateOpen(true)}>
            <div className="hero-icon"><Plus /></div>
            <div><b>Create a design</b><span>Start blank or choose a size</span></div>
            <ChevronLeft className="hero-arrow" />
          </button>

          <section className="section-block">
            <div className="section-title"><b>Quick start</b><button onClick={() => setCreateOpen(true)}>See all</button></div>
            <div className="quick-start-scroll">
              {filteredPresets.map((p, i) => (
                <button className={'quick-card q' + i} key={p.name} onClick={() => startProject(p)}>
                  <div className="quick-preview">{p.icon === 'story' ? <Smartphone /> : p.icon === 'a4' ? <FileText /> : <Grid2X2 />}</div>
                  <b>{p.name}</b><span>{p.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-title"><b>Recent designs</b><button onClick={() => setProjectsOpen(true)}>All projects</button></div>
            {latest ? (
              <button className="recent-project" onClick={() => startProject(undefined, latest)}>
                <div className="recent-thumb"><div className="mock-shape" /></div>
                <div className="recent-info"><b>{latest.name}</b><span>{latest.width} × {latest.height} • Saved locally</span></div>
                <MoreHorizontal />
              </button>
            ) : (
              <button className="recent-project" onClick={() => startProject(presets[0])}>
                <div className="recent-thumb"><Plus /></div>
                <div className="recent-info"><b>Create your first design</b><span>Start with a blank canvas</span></div>
              </button>
            )}
          </section>

          <section className="section-block">
            <div className="section-title"><b>Templates</b><button onClick={() => startTemplate('Minimal Post')}>Open</button></div>
            <div className="horizontal-cards">
              {templateNames.map((name,i)=><button className={'mini-template t'+(i+1)} key={name} onClick={()=>startTemplate(name)}><span>{name}</span></button>)}
            </div>
          </section>
        </main>

        <nav className="home-bottom-nav">
          <button className="active"><Home /><span>Home</span></button>
          <button onClick={() => startTemplate('Minimal Post')}><LayoutTemplate /><span>Templates</span></button>
          <button className="nav-create" onClick={() => setCreateOpen(true)}><Plus /></button>
          <button onClick={() => setProjectsOpen(true)}><Folder /><span>Projects</span></button>
          <button onClick={() => setMenuOpen(true)}><Settings /><span>Settings</span></button>
        </nav>

        {createOpen && (
          <div className="modal-backdrop sheet-backdrop" onClick={() => setCreateOpen(false)}>
            <div className="create-sheet" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-title"><div><b>Create a design</b><span>Choose a format</span></div><button onClick={() => setCreateOpen(false)}><X /></button></div>
              <button className="blank-card" onClick={() => startProject(presets[0])}><Plus /><div><b>Blank design</b><span>1080 × 1080</span></div></button>
              <div className="preset-list">
                {presets.map(p => (
                  <button key={p.name} onClick={() => startProject(p)}>
                    <div className="preset-icon">{p.icon === 'story' ? <Smartphone /> : p.icon === 'a4' ? <FileText /> : <Monitor />}</div>
                    <div><b>{p.name}</b><span>{p.label}</span></div>
                    <ChevronLeft />
                  </button>
                ))}
              </div>
              <button className="custom-size-btn" onClick={() => { setCreateOpen(false); setCustomOpen(true); }}><Maximize2 /> Custom size</button>
            </div>
          </div>
        )}

        {projectsOpen && (
          <div className="modal-backdrop sheet-backdrop" onClick={() => setProjectsOpen(false)}>
            <div className="create-sheet" onClick={e=>e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-title"><div><b>My projects</b><span>Saved on this phone</span></div><button onClick={()=>setProjectsOpen(false)}><X /></button></div>
              <div className="project-list">
                {projects.length===0 && <div className="empty">No saved projects yet.</div>}
                {projects.map(p=>(
                  <div className="project-list-row" key={p.id}>
                    <button className="project-open" onClick={()=>startProject(undefined,p)}><FolderOpen /><div><b>{p.name}</b><span>{p.width} × {p.height}</span></div></button>
                    <button className="project-delete" onClick={()=>deleteProject(p.id)}><Trash2 /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="modal-backdrop sheet-backdrop" onClick={()=>setMenuOpen(false)}>
            <div className="create-sheet compact-sheet" onClick={e=>e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-title"><div><b>Studio settings</b><span>Offline-first editor</span></div><button onClick={()=>setMenuOpen(false)}><X /></button></div>
              <button className="settings-action" onClick={()=>{setMenuOpen(false);startProject(presets[0]);}}><Plus /> New blank design</button>
              <button className="settings-action" onClick={()=>{setMenuOpen(false);openLatest();}}><Clock3 /> Open latest design</button>
              <button className="settings-action" onClick={()=>{setMenuOpen(false);setProjectsOpen(true);}}><Folder /> Manage projects</button>
              <div className="about-card"><CheckCircle2 /><div><b>Free & offline core tools</b><span>No subscription for editor basics.</span></div></div>
            </div>
          </div>
        )}

        {customOpen && (
          <div className="modal-backdrop">
            <div className="modal">
              <div className="modal-title"><b>Custom canvas</b><button onClick={() => setCustomOpen(false)}><X /></button></div>
              <div className="size-fields">
                <label>Width<input inputMode="numeric" value={customW} onChange={e => setCustomW(e.target.value)} /></label>
                <label>Height<input inputMode="numeric" value={customH} onChange={e => setCustomH(e.target.value)} /></label>
              </div>
              <button className="primary" onClick={applyCustom}><Check /> Create design</button>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <button className="top-round" onClick={() => { saveProject(true); setView('home'); }}><ChevronLeft /></button>
        <button className="project-title rename-project" onClick={() => {
          const n = window.prompt('Project name', projectName);
          if(n?.trim()) setProjectName(n.trim());
        }}><b>{projectName}</b><span>{size.w} × {size.h}</span></button>
        <div className="editor-actions">
          <button onClick={undo}><Undo2 /></button>
          <button onClick={redo}><Redo2 /></button>
          <button onClick={() => saveProject()}><Save /></button>
          <button className="export-top" onClick={() => exportImage('png')}><Download /><span>Export</span></button>
        </div>
      </header>

      <main className="editor-workspace">
        <section className="canvas-holder">
          <div className="canvas-size-pill">{size.w} × {size.h}</div>
          <canvas ref={canvasEl} />
        </section>

        {selected && !drawing && (
          <div className="context-bar">
            <label><Palette /><input type="color" value={fill} onChange={e => changeFill(e.target.value)} /></label>
            {(selected as any).appType==='text' && <button onClick={openEditText}><Type /><span>Edit</span></button>}
            <button onClick={duplicateSelected}><Copy /><span>Copy</span></button>
            <button onClick={() => {
              const obj=fabricRef.current?.getActiveObject(); if(!obj)return;
              obj.set({selectable:false,evented:false}); fabricRef.current?.discardActiveObject(); fabricRef.current?.requestRenderAll(); setSelected(null); flash('Object locked');
            }}><Lock /><span>Lock</span></button>
            <button className="danger" onClick={removeSelected}><Trash2 /><span>Delete</span></button>
          </div>
        )}
      </main>

      <section className="editor-bottom">
        <div className="tool-strip">
          {toolTabs.map(({id,label,icon:Icon}) => (
            <button key={id} className={activeTool===id?'active':''} onClick={() => { if(drawing) stopDraw(); setActiveTool(id); }}>
              <Icon /><span>{label}</span>
            </button>
          ))}
        </div>
        <div className="tool-panel">{renderPanel()}</div>
      </section>

      <input ref={fileRef} hidden type="file" accept="image/*" onChange={e => onImage(e.target.files?.[0])} />

      {textOpen && (
        <div className="modal-backdrop text-modal">
          <div className="modal">
            <div className="modal-title"><b>{textMode === 'edit' ? 'Edit text' : 'Add text'}</b><button onClick={() => setTextOpen(false)}><X /></button></div>
            <label>Your text
              <textarea ref={textInputRef} value={textValue} onChange={e => setTextValue(e.target.value)} placeholder="Type anything..." rows={4} />
            </label>
            <button className="primary" onClick={applyText}><Check /> {textMode === 'edit' ? 'Update text' : 'Add to design'}</button>
          </div>
        </div>
      )}

      {customOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title"><b>Resize canvas</b><button onClick={()=>setCustomOpen(false)}><X /></button></div>
            <div className="size-fields">
              <label>Width<input inputMode="numeric" value={customW} onChange={e=>setCustomW(e.target.value)} /></label>
              <label>Height<input inputMode="numeric" value={customH} onChange={e=>setCustomH(e.target.value)} /></label>
            </div>
            <div className="resize-presets">{presets.map(p=><button key={p.name} onClick={()=>{setCustomW(String(p.w));setCustomH(String(p.h));}}>{p.name}</button>)}</div>
            <button className="primary" onClick={applyCustom}><Check /> Apply size</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
