import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  Type, Square, Circle, ImagePlus, Trash2, Copy, Undo2, Redo2,
  Save, Download, Layers3, ChevronUp, ChevronDown, Palette,
  Maximize2, Plus, X, Check
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type Preset = { name: string; w: number; h: number };
const presets: Preset[] = [
  { name: 'Square', w: 1080, h: 1080 },
  { name: 'Story', w: 1080, h: 1920 },
  { name: 'Portrait', w: 1080, h: 1350 },
  { name: 'A4', w: 1240, h: 1754 }
];

const PROJECT_KEY = 'altaf-create-studio-project-v1';

export default function App() {
  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const restoringRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [selected, setSelected] = useState<fabric.Object | null>(null);
  const [fill, setFill] = useState('#7c5cff');
  const [bg, setBg] = useState('#ffffff');
  const [panel, setPanel] = useState<'add' | 'layers' | 'canvas' | null>('add');
  const [size, setSize] = useState({ w: 1080, h: 1080 });
  const [toast, setToast] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [customW, setCustomW] = useState('1080');
  const [customH, setCustomH] = useState('1080');
  const [textOpen, setTextOpen] = useState(false);
  const [textValue, setTextValue] = useState('');
  const [textMode, setTextMode] = useState<'add' | 'edit'>('add');

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1500);
  };

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
    const maxW = Math.max(220, holder.clientWidth - 24);
    const maxH = Math.max(260, window.innerHeight - 300);
    const scale = Math.min(maxW / size.w, maxH / size.h, 1);
    c.setDimensions(
      { width: Math.round(size.w * scale), height: Math.round(size.h * scale) },
      { cssOnly: true }
    );
    c.calcOffset();
  };

  const snapshot = () => {
    const c = fabricRef.current;
    if (!c || restoringRef.current) return;
    const json = JSON.stringify(c.toJSON(['name']));
    const current = historyRef.current[historyIndexRef.current];
    if (json === current) return;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > 40) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    refreshLayers();
  };

  useEffect(() => {
    if (!canvasEl.current) return;
    const c = new fabric.Canvas(canvasEl.current, {
      width: size.w,
      height: size.h,
      backgroundColor: bg,
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
    };
    const onClear = () => setSelected(null);

    c.on('selection:created', onSelect);
    c.on('selection:updated', onSelect);
    c.on('selection:cleared', onClear);
    c.on('object:added', snapshot);
    c.on('object:modified', snapshot);
    c.on('object:removed', snapshot);

    const saved = localStorage.getItem(PROJECT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height) {
          setSize({ w: parsed.width, h: parsed.height });
          c.setDimensions({ width: parsed.width, height: parsed.height });
        }
        if (parsed.bg) {
          setBg(parsed.bg);
          c.setBackgroundColor(parsed.bg, c.renderAll.bind(c));
        }
        if (parsed.canvas) {
          restoringRef.current = true;
          c.loadFromJSON(parsed.canvas, () => {
            restoringRef.current = false;
            c.renderAll();
            historyRef.current = [JSON.stringify(c.toJSON(['name']))];
            historyIndexRef.current = 0;
            refreshLayers();
            requestAnimationFrame(fitCanvas);
          });
        }
      } catch {}
    } else {
      historyRef.current = [JSON.stringify(c.toJSON(['name']))];
      historyIndexRef.current = 0;
    }

    requestAnimationFrame(fitCanvas);
    window.addEventListener('resize', fitCanvas);

    return () => {
      window.removeEventListener('resize', fitCanvas);
      c.dispose();
      fabricRef.current = null;
    };
  }, []);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.setDimensions({ width: size.w, height: size.h });
    window.setTimeout(fitCanvas, 20);
  }, [size]);

  const openAddText = () => {
    setTextMode('add');
    setTextValue('');
    setTextOpen(true);
    window.setTimeout(() => textInputRef.current?.focus(), 120);
  };

  const openEditText = () => {
    const obj = fabricRef.current?.getActiveObject() as fabric.Textbox | undefined;
    if (!obj || !['textbox', 'i-text', 'text'].includes(String(obj.type))) return;
    setTextMode('edit');
    setTextValue(String((obj as any).text || ''));
    setTextOpen(true);
    window.setTimeout(() => textInputRef.current?.focus(), 120);
  };

  const applyText = () => {
    const c = fabricRef.current;
    if (!c) return;
    const value = textValue.trim() || 'Text';
    if (textMode === 'edit') {
      const obj = c.getActiveObject() as fabric.Textbox | undefined;
      if (obj && ['textbox', 'i-text', 'text'].includes(String(obj.type))) {
        (obj as any).set({ text: value });
        obj.setCoords();
        c.requestRenderAll();
        snapshot();
      }
    } else {
      // Use Fabric.Text instead of Textbox for reliable Android WebView rendering.
      // Text editing itself is handled by our mobile text dialog.
      const obj = new fabric.Text(value, {
        left: size.w / 2,
        top: size.h / 2,
        originX: 'center',
        originY: 'center',
        fontSize: Math.max(64, size.w * .07),
        fill: '#111111',
        fontFamily: 'Arial',
        fontWeight: '700',
        objectCaching: false
      });
      (obj as any).name = 'Text';
      c.discardActiveObject();
      c.add(obj);
      c.bringToFront(obj);
      obj.setCoords();
      c.setActiveObject(obj);
      c.requestRenderAll();
      setFill('#111111');
      snapshot();

      // Keep the newly added text in view even after the keyboard closes.
      window.setTimeout(() => {
        fitCanvas();
        c.setActiveObject(obj);
        c.requestRenderAll();
      }, 180);
    }
    setTextOpen(false);
    flash(textMode === 'edit' ? 'Text updated' : 'Text added in center');
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
      left: size.w * .3, top: size.h * .25,
      radius: size.w * .16, fill
    });
    (obj as any).name = 'Circle';
    c.add(obj); c.setActiveObject(obj); c.renderAll();
  };

  const onImage = (file?: File) => {
    const c = fabricRef.current;
    if (!c || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(String(reader.result), img => {
        const maxW = size.w * .68;
        const maxH = size.h * .55;
        const scale = Math.min(maxW / (img.width || maxW), maxH / (img.height || maxH), 1);
        img.set({ left: size.w * .16, top: size.h * .18, scaleX: scale, scaleY: scale });
        (img as any).name = file.name || 'Image';
        c.add(img); c.setActiveObject(img); c.renderAll();
      }, { crossOrigin: 'anonymous' });
    };
    reader.readAsDataURL(file);
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
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.set('fill', value);
    c.requestRenderAll();
    snapshot();
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

  const saveProject = () => {
    const c = fabricRef.current;
    if (!c) return;
    const data = {
      width: size.w, height: size.h, bg,
      canvas: c.toJSON(['name'])
    };
    localStorage.setItem(PROJECT_KEY, JSON.stringify(data));
    flash('Project saved');
  };

  const exportImage = async (format: 'png' | 'jpeg') => {
    const c = fabricRef.current;
    if (!c) return;
    c.discardActiveObject(); c.renderAll();
    const dataUrl = c.toDataURL({ format, quality: .95, multiplier: 1 });
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const fileName = `Altaf-Create-Studio-${Date.now()}.${ext}`;

    if (Capacitor.isNativePlatform()) {
      const base64 = dataUrl.split(',')[1];
      const out = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache
      });
      await Share.share({ title: 'Export design', url: out.uri });
      flash('Export ready');
    } else {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = fileName; a.click();
    }
  };

  const applyPreset = (p: Preset) => {
    setSize({ w: p.w, h: p.h });
    setCustomW(String(p.w)); setCustomH(String(p.h));
    flash(`${p.name} canvas`);
  };

  const applyCustom = () => {
    const w = Math.max(200, Math.min(5000, Number(customW) || 1080));
    const h = Math.max(200, Math.min(5000, Number(customH) || 1080));
    setSize({ w, h });
    setCustomOpen(false);
  };

  const selectLayer = (obj: fabric.Object) => {
    const c = fabricRef.current;
    if (!c) return;
    c.setActiveObject(obj); c.requestRenderAll(); setSelected(obj);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div><b>Altaf Create</b><span>Studio</span></div>
        </div>
        <div className="top-actions">
          <button className="icon-btn" onClick={undo}><Undo2 /></button>
          <button className="icon-btn" onClick={redo}><Redo2 /></button>
          <button className="icon-btn" onClick={saveProject}><Save /></button>
          <button className="export-btn" onClick={() => exportImage('png')}><Download /> Export</button>
        </div>
      </header>

      <main className="workspace">
        <section className="canvas-holder">
          <div className="canvas-badge">{size.w} × {size.h}</div>
          <canvas ref={canvasEl} />
        </section>

        {selected && (
          <div className="quickbar">
            <label className="color-chip"><Palette /><input type="color" value={fill} onChange={e => changeFill(e.target.value)} /></label>
            {['textbox','i-text','text'].includes(String(selected.type)) && (
              <button onClick={openEditText}><Type /> Edit Text</button>
            )}
            <button onClick={duplicateSelected}><Copy /> Duplicate</button>
            <button className="danger" onClick={removeSelected}><Trash2 /> Delete</button>
          </div>
        )}
      </main>

      <section className="panel">
        <div className="panel-tabs">
          <button className={panel==='add'?'active':''} onClick={() => setPanel('add')}><Plus />Add</button>
          <button className={panel==='layers'?'active':''} onClick={() => setPanel('layers')}><Layers3 />Layers</button>
          <button className={panel==='canvas'?'active':''} onClick={() => setPanel('canvas')}><Maximize2 />Canvas</button>
        </div>

        {panel === 'add' && (
          <div className="tool-grid">
            <button onClick={openAddText}><Type /><span>Text</span></button>
            <button onClick={addRect}><Square /><span>Shape</span></button>
            <button onClick={addCircle}><Circle /><span>Circle</span></button>
            <button onClick={() => fileRef.current?.click()}><ImagePlus /><span>Photo</span></button>
            <input ref={fileRef} hidden type="file" accept="image/*" onChange={e => onImage(e.target.files?.[0])} />
          </div>
        )}

        {panel === 'layers' && (
          <div className="layers-list">
            {layers.length === 0 && <div className="empty">Add something to start designing.</div>}
            {layers.map((obj, i) => (
              <div className={'layer-row ' + (selected===obj?'selected':'')} key={i} onClick={() => selectLayer(obj)}>
                <div className="layer-name">{(obj as any).name || obj.type || 'Layer'}</div>
                <div className="layer-actions">
                  <button onClick={e => {e.stopPropagation(); moveLayer(obj,'up')}}><ChevronUp /></button>
                  <button onClick={e => {e.stopPropagation(); moveLayer(obj,'down')}}><ChevronDown /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === 'canvas' && (
          <div className="canvas-tools">
            <div className="preset-row">
              {presets.map(p => <button key={p.name} onClick={() => applyPreset(p)}>{p.name}<small>{p.w}×{p.h}</small></button>)}
              <button onClick={() => setCustomOpen(true)}>Custom<small>Any size</small></button>
            </div>
            <div className="background-row">
              <span>Background</span>
              <input type="color" value={bg} onChange={e => changeBg(e.target.value)} />
              <button onClick={() => exportImage('jpeg')}>Export JPG</button>
            </div>
          </div>
        )}
      </section>

      {textOpen && (
        <div className="modal-backdrop text-modal">
          <div className="modal">
            <div className="modal-title"><b>{textMode === 'edit' ? 'Edit text' : 'Add text'}</b><button onClick={() => setTextOpen(false)}><X /></button></div>
            <label>Your text
              <textarea
                ref={textInputRef}
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                placeholder="Type anything..."
                rows={4}
              />
            </label>
            <button className="primary" onClick={applyText}><Check /> {textMode === 'edit' ? 'Update text' : 'Add to design'}</button>
          </div>
        </div>
      )}

      {customOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title"><b>Custom canvas</b><button onClick={() => setCustomOpen(false)}><X /></button></div>
            <label>Width<input inputMode="numeric" value={customW} onChange={e => setCustomW(e.target.value)} /></label>
            <label>Height<input inputMode="numeric" value={customH} onChange={e => setCustomH(e.target.value)} /></label>
            <button className="primary" onClick={applyCustom}><Check /> Apply size</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
