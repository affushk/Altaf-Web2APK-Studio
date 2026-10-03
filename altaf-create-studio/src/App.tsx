import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  Home, LayoutTemplate, Shapes, Type, Upload, Pencil, Image as ImageIcon,
  Palette, Layers3, MoreHorizontal, Plus, Search, Bell, Menu, Undo2, Redo2,
  Download, Save, ChevronLeft, ChevronUp, ChevronDown, Copy, Trash2, Square,
  Circle, ImagePlus, Sparkles, Folder, Clock3, Star, Settings, Grid2X2,
  FileText, Smartphone, Monitor, X, Check, Maximize2, SlidersHorizontal,
  Crop, Lock
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type Preset = { name: string; label: string; w: number; h: number; icon: 'square' | 'story' | 'portrait' | 'a4' };
type ToolPanel = 'design' | 'elements' | 'text' | 'uploads' | 'draw' | 'photos' | 'background' | 'layers' | 'more';
type View = 'home' | 'editor';

const presets: Preset[] = [
  { name: 'Instagram Post', label: '1080 × 1080', w: 1080, h: 1080, icon: 'square' },
  { name: 'Story', label: '1080 × 1920', w: 1080, h: 1920, icon: 'story' },
  { name: 'Portrait Post', label: '1080 × 1350', w: 1080, h: 1350, icon: 'portrait' },
  { name: 'A4 Document', label: '1240 × 1754', w: 1240, h: 1754, icon: 'a4' }
];

const PROJECT_KEY = 'altaf-create-studio-project-v1';

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

  const canvasEl = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const restoringRef = useRef(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1700);
  };

  const comingSoon = (name: string) => flash(name + ' UI ready • function next build');

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
    const maxH = Math.max(260, holder.clientHeight - 28);
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
    if (view !== 'editor' || !canvasEl.current) return;

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
    const resize = () => fitCanvas();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
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

  const startProject = (p?: Preset) => {
    if (p) {
      setSize({ w: p.w, h: p.h });
      setCustomW(String(p.w));
      setCustomH(String(p.h));
    }
    setCreateOpen(false);
    setView('editor');
  };

  const newBlankProject = () => {
    localStorage.removeItem(PROJECT_KEY);
    setLayers([]);
    setSelected(null);
    setBg('#ffffff');
    startProject(presets[0]);
  };

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
      const obj = c.getActiveObject() as any;
      if (obj && ['textbox', 'i-text', 'text'].includes(String(obj.type))) {
        obj.set({ text: value });
        obj.setCoords();
        c.requestRenderAll();
        snapshot();
      }
    } else {
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
      c.add(obj);
      c.bringToFront(obj);
      c.setActiveObject(obj);
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
    c.add(obj);
    c.setActiveObject(obj);
    c.renderAll();
  };

  const addCircle = () => {
    const c = fabricRef.current;
    if (!c) return;
    const obj = new fabric.Circle({
      left: size.w * .3, top: size.h * .25,
      radius: size.w * .16, fill
    });
    (obj as any).name = 'Circle';
    c.add(obj);
    c.setActiveObject(obj);
    c.renderAll();
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
        c.add(img);
        c.setActiveObject(img);
        c.renderAll();
      }, { crossOrigin: 'anonymous' });
    };
    reader.readAsDataURL(file);
  };

  const removeSelected = () => {
    const c = fabricRef.current;
    if (!c) return;
    c.getActiveObjects().forEach(o => c.remove(o));
    c.discardActiveObject();
    c.requestRenderAll();
  };

  const duplicateSelected = () => {
    const c = fabricRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.clone((clone: fabric.Object) => {
      clone.set({ left: (obj.left || 0) + 35, top: (obj.top || 0) + 35 });
      (clone as any).name = ((obj as any).name || obj.type || 'Layer') + ' copy';
      c.add(clone);
      c.setActiveObject(clone);
      c.requestRenderAll();
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
    c.setBackgroundColor(value, () => {
      c.renderAll();
      snapshot();
    });
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

  const undo = () => {
    if (historyIndexRef.current > 0) applyHistory(historyIndexRef.current - 1);
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) applyHistory(historyIndexRef.current + 1);
  };

  const moveLayer = (obj: fabric.Object, dir: 'up' | 'down') => {
    const c = fabricRef.current;
    if (!c) return;
    dir === 'up' ? c.bringForward(obj) : c.sendBackwards(obj);
    c.setActiveObject(obj);
    c.renderAll();
    snapshot();
  };

  const saveProject = () => {
    const c = fabricRef.current;
    if (!c) return;
    const data = {
      width: size.w,
      height: size.h,
      bg,
      canvas: c.toJSON(['name'])
    };
    localStorage.setItem(PROJECT_KEY, JSON.stringify(data));
    flash('Project saved');
  };

  const exportImage = async (format: 'png' | 'jpeg') => {
    const c = fabricRef.current;
    if (!c) return;
    c.discardActiveObject();
    c.renderAll();

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
      a.href = dataUrl;
      a.download = fileName;
      a.click();
    }
  };

  const applyCustom = () => {
    const w = Math.max(200, Math.min(5000, Number(customW) || 1080));
    const h = Math.max(200, Math.min(5000, Number(customH) || 1080));
    setSize({ w, h });
    setCustomOpen(false);
    setCreateOpen(false);
    setView('editor');
  };

  const selectLayer = (obj: fabric.Object) => {
    const c = fabricRef.current;
    if (!c) return;
    c.setActiveObject(obj);
    c.requestRenderAll();
    setSelected(obj);
  };

  const renderPanel = () => {
    if (activeTool === 'design') {
      return (
        <div className="panel-content">
          <div className="panel-heading">
            <div><b>Design</b><span>Templates & layouts</span></div>
            <button className="tiny-icon" onClick={() => comingSoon('Template search')}><Search /></button>
          </div>
          <div className="horizontal-cards">
            {['Minimal Post','Sale Poster','Business','Birthday','Fashion'].map((name, i) => (
              <button className={'mini-template t' + (i+1)} key={name} onClick={() => comingSoon(name + ' template')}>
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
          <div className="panel-heading"><div><b>Elements</b><span>Shapes, lines & graphics</span></div></div>
          <div className="element-grid">
            <button onClick={addRect}><Square /><span>Rectangle</span></button>
            <button onClick={addCircle}><Circle /><span>Circle</span></button>
            <button onClick={() => comingSoon('Line tool')}><span className="line-demo" /><span>Line</span></button>
            <button onClick={() => comingSoon('Icons library')}><Sparkles /><span>Icons</span></button>
          </div>
        </div>
      );
    }

    if (activeTool === 'text') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Text</b><span>Typography controls</span></div></div>
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
          <div className="panel-heading"><div><b>Uploads</b><span>Your images & files</span></div></div>
          <button className="upload-card" onClick={() => fileRef.current?.click()}>
            <ImagePlus /><div><b>Upload photo</b><span>JPG, PNG, WEBP</span></div><Plus />
          </button>
          <div className="upload-empty">Your uploaded items will appear here.</div>
        </div>
      );
    }

    if (activeTool === 'draw') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Draw</b><span>Freehand tools</span></div></div>
          <div className="draw-row">
            {['Pen','Marker','Highlighter','Eraser'].map((x, i) => (
              <button key={x} onClick={() => comingSoon(x)}><span className={'brush b' + i} /><small>{x}</small></button>
            ))}
          </div>
          <div className="disabled-strip"><SlidersHorizontal /> Brush size, smoothing & opacity UI ready</div>
        </div>
      );
    }

    if (activeTool === 'photos') {
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Photo tools</b><span>Edit selected image</span></div></div>
          <div className="photo-tools">
            <button onClick={() => comingSoon('Crop')}><Crop /><span>Crop</span></button>
            <button onClick={() => comingSoon('Adjust')}><SlidersHorizontal /><span>Adjust</span></button>
            <button onClick={() => comingSoon('Filters')}><Sparkles /><span>Filters</span></button>
            <button onClick={() => comingSoon('BG Remover')}><ImageIcon /><span>BG Remove</span></button>
          </div>
        </div>
      );
    }

    if (activeTool === 'background') {
      const colors = ['#ffffff','#111111','#7c5cff','#ff477e','#ffb703','#00b894','#3a86ff','#8338ec'];
      return (
        <div className="panel-content">
          <div className="panel-heading"><div><b>Background</b><span>Color & style</span></div></div>
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
                <div className="layer-thumb">{String(obj.type).slice(0,1).toUpperCase()}</div>
                <div className="layer-name">{(obj as any).name || obj.type || 'Layer'}</div>
                <div className="layer-actions">
                  <button onClick={e => { e.stopPropagation(); moveLayer(obj,'up'); }}><ChevronUp /></button>
                  <button onClick={e => { e.stopPropagation(); moveLayer(obj,'down'); }}><ChevronDown /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="panel-content">
        <div className="panel-heading"><div><b>More tools</b><span>Studio modules</span></div></div>
        <div className="more-grid">
          <button onClick={() => comingSoon('Magic Resize')}><Maximize2 /><span>Magic Resize</span></button>
          <button onClick={() => comingSoon('Brand Kit')}><Star /><span>Brand Kit</span></button>
          <button onClick={() => comingSoon('PDF tools')}><FileText /><span>PDF</span></button>
          <button onClick={() => comingSoon('Animation')}><Sparkles /><span>Animate</span></button>
          <button onClick={() => comingSoon('Project folders')}><Folder /><span>Folders</span></button>
          <button onClick={() => comingSoon('Settings')}><Settings /><span>Settings</span></button>
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
            <button><Bell /></button>
            <button><Menu /></button>
          </div>
        </header>

        <main className="home-main">
          <div className="welcome-row">
            <div><span>Creative workspace</span><h1>What will you create?</h1></div>
            <button className="profile-chip">AS</button>
          </div>

          <div className="home-search"><Search /><span>Search templates, projects & tools</span></div>

          <button className="hero-create" onClick={() => setCreateOpen(true)}>
            <div className="hero-icon"><Plus /></div>
            <div><b>Create a design</b><span>Start blank or choose a size</span></div>
            <ChevronLeft className="hero-arrow" />
          </button>

          <section className="section-block">
            <div className="section-title"><b>Quick start</b><button onClick={() => setCreateOpen(true)}>See all</button></div>
            <div className="quick-start-scroll">
              {presets.map((p, i) => (
                <button className={'quick-card q' + i} key={p.name} onClick={() => startProject(p)}>
                  <div className="quick-preview">{p.icon === 'story' ? <Smartphone /> : p.icon === 'a4' ? <FileText /> : <Grid2X2 />}</div>
                  <b>{p.name}</b><span>{p.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section-block">
            <div className="section-title"><b>Recent designs</b><button onClick={() => startProject()}>Open project</button></div>
            <button className="recent-project" onClick={() => startProject()}>
              <div className="recent-thumb"><div className="mock-shape" /></div>
              <div className="recent-info"><b>Untitled design</b><span>1080 × 1080 • Auto-saved</span></div>
              <MoreHorizontal />
            </button>
          </section>

          <section className="section-block">
            <div className="section-title"><b>Explore</b><button>More</button></div>
            <div className="explore-grid">
              <button onClick={() => comingSoon('Templates')}><LayoutTemplate /><span>Templates</span></button>
              <button onClick={() => comingSoon('Brand Kit')}><Star /><span>Brand Kit</span></button>
              <button onClick={() => comingSoon('Folders')}><Folder /><span>Folders</span></button>
              <button onClick={() => comingSoon('History')}><Clock3 /><span>History</span></button>
            </div>
          </section>
        </main>

        <nav className="home-bottom-nav">
          <button className="active"><Home /><span>Home</span></button>
          <button onClick={() => comingSoon('Templates')}><LayoutTemplate /><span>Templates</span></button>
          <button className="nav-create" onClick={() => setCreateOpen(true)}><Plus /></button>
          <button onClick={() => comingSoon('Projects')}><Folder /><span>Projects</span></button>
          <button onClick={() => comingSoon('Settings')}><Settings /><span>Settings</span></button>
        </nav>

        {createOpen && (
          <div className="modal-backdrop sheet-backdrop" onClick={() => setCreateOpen(false)}>
            <div className="create-sheet" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-title"><div><b>Create a design</b><span>Choose a format</span></div><button onClick={() => setCreateOpen(false)}><X /></button></div>
              <button className="blank-card" onClick={newBlankProject}><Plus /><div><b>Blank design</b><span>1080 × 1080</span></div></button>
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
        <button className="top-round" onClick={() => { saveProject(); setView('home'); }}><ChevronLeft /></button>
        <div className="project-title"><b>Untitled design</b><span>{size.w} × {size.h}</span></div>
        <div className="editor-actions">
          <button onClick={undo}><Undo2 /></button>
          <button onClick={redo}><Redo2 /></button>
          <button onClick={saveProject}><Save /></button>
          <button className="export-top" onClick={() => exportImage('png')}><Download /><span>Export</span></button>
        </div>
      </header>

      <main className="editor-workspace">
        <section className="canvas-holder">
          <div className="canvas-size-pill">{size.w} × {size.h}</div>
          <canvas ref={canvasEl} />
        </section>

        {selected && (
          <div className="context-bar">
            <label><Palette /><input type="color" value={fill} onChange={e => changeFill(e.target.value)} /></label>
            {['textbox','i-text','text'].includes(String(selected.type)) && <button onClick={openEditText}><Type /><span>Edit</span></button>}
            <button onClick={duplicateSelected}><Copy /><span>Copy</span></button>
            <button onClick={() => comingSoon('Lock object')}><Lock /><span>Lock</span></button>
            <button className="danger" onClick={removeSelected}><Trash2 /><span>Delete</span></button>
          </div>
        )}
      </main>

      <section className="editor-bottom">
        <div className="tool-strip">
          {toolTabs.map(({id,label,icon:Icon}) => (
            <button key={id} className={activeTool===id?'active':''} onClick={() => setActiveTool(id)}>
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
