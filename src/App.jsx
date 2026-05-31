import { useState, useRef, useCallback } from "react";

// ─── EXIF Reader ──────────────────────────────────────────────────────────────
function readEXIF(buffer) {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xFFD8) return null;
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) {
        const len = view.getUint16(offset + 2);
        const header = String.fromCharCode(...new Uint8Array(buffer, offset + 4, 4));
        if (header === "Exif") return parseIFD(buffer, offset + 10);
        offset += 2 + len;
      } else if ((marker & 0xFF00) === 0xFF00) {
        offset += 2 + view.getUint16(offset + 2);
      } else break;
    }
  } catch(e) {}
  return null;
}

function parseIFD(buffer, tiffStart) {
  try {
    const view = new DataView(buffer, tiffStart);
    const le = view.getUint16(0) === 0x4949;
    const ifd0 = view.getUint32(4, le);
    const tags = readTags(buffer, tiffStart, ifd0, le);
    const exifIFD = readUint32Tag(view, ifd0, 0x8769, le);
    if (exifIFD) Object.assign(tags, readTags(buffer, tiffStart, exifIFD, le));
    return tags;
  } catch(e) { return {}; }
}

function readUint32Tag(view, ifdOffset, targetTag, le) {
  try {
    const count = view.getUint16(ifdOffset, le);
    for (let i = 0; i < count; i++) {
      const off = ifdOffset + 2 + i * 12;
      if (view.getUint16(off, le) === targetTag) return view.getUint32(off + 8, le);
    }
  } catch(e) {}
  return null;
}

function readTags(buffer, tiffStart, ifdOffset, le) {
  const view = new DataView(buffer, tiffStart);
  const tags = {};
  const wanted = { 0x010F:"make", 0x0110:"model", 0x829A:"exposureTime", 0x829D:"fNumber", 0x8827:"iso", 0x920A:"focalLength", 0x9003:"dateTimeOriginal" };
  try {
    const count = view.getUint16(ifdOffset, le);
    for (let i = 0; i < count; i++) {
      const off = ifdOffset + 2 + i * 12;
      const tag = view.getUint16(off, le);
      const type = view.getUint16(off + 2, le);
      const num = view.getUint32(off + 4, le);
      const name = wanted[tag];
      if (!name) continue;
      if (type === 2) {
        const abs = num > 4 ? tiffStart + view.getUint32(off + 8, le) : tiffStart + off + 8;
        const dv = new DataView(buffer, abs, Math.min(num, 128));
        let s = "";
        for (let j = 0; j < num; j++) { const c = dv.getUint8(j); if (!c) break; s += String.fromCharCode(c); }
        tags[name] = s.trim();
      } else if (type === 3) { tags[name] = view.getUint16(off + 8, le); }
      else if (type === 4) { tags[name] = view.getUint32(off + 8, le); }
      else if (type === 5) {
        const rOff = tiffStart + view.getUint32(off + 8, le);
        const dv = new DataView(buffer, rOff);
        const n = dv.getUint32(0, le), d = dv.getUint32(4, le);
        tags[name] = d ? n / d : 0;
      }
    }
  } catch(e) {}
  return tags;
}

function fmtExposure(v) { if (!v) return null; return v >= 1 ? `${v}s` : `1/${Math.round(1/v)}s`; }
function fmtF(v)        { if (!v) return null; return `f/${v%1===0?v.toFixed(0):v.toFixed(1)}`; }
function fmtFL(v)       { if (!v) return null; return `${Math.round(v)}mm`; }

function getBrand(make) {
  if (!make) return null;
  const m = make.toUpperCase();
  if (m.includes("SONY"))       return { name:"SONY",       display:"SONY",       color:"#000000", abbr:"S",  shape:"square" };
  if (m.includes("CANON"))      return { name:"CANON",      display:"CANON",      color:"#CC0000", abbr:"C",  shape:"square" };
  if (m.includes("NIKON"))      return { name:"NIKON",      display:"NIKON",      color:"#1a1a1a", abbr:"N",  shape:"square" };
  if (m.includes("FUJI"))       return { name:"FUJIFILM",   display:"FUJIFILM",   color:"#CC0000", abbr:"F",  shape:"square" };
  if (m.includes("APPLE"))      return { name:"APPLE",      display:"iPhone",     color:"#555555", abbr:"",   shape:"square" };
  if (m.includes("SAMSUNG"))    return { name:"SAMSUNG",    display:"SAMSUNG",    color:"#1428A0", abbr:"S",  shape:"square" };
  if (m.includes("LEICA"))      return { name:"LEICA",      display:"LEICA",      color:"#CC0000", abbr:"L",  shape:"circle" };
  if (m.includes("PANASONIC"))  return { name:"PANASONIC",  display:"LUMIX",      color:"#003087", abbr:"P",  shape:"square" };
  if (m.includes("OLYMPUS"))    return { name:"OLYMPUS",    display:"OLYMPUS",    color:"#003087", abbr:"O",  shape:"square" };
  if (m.includes("DJI"))        return { name:"DJI",        display:"DJI",        color:"#000000", abbr:"D",  shape:"square" };
  if (m.includes("HASSELBLAD")) return { name:"HASSELBLAD", display:"HASSELBLAD", color:"#F5A623", abbr:"H",  shape:"square" };
  if (m.includes("RICOH"))      return { name:"RICOH",      display:"RICOH",      color:"#003087", abbr:"R",  shape:"square" };
  if (m.includes("GOPRO"))      return { name:"GOPRO",      display:"GoPro",      color:"#00ADEF", abbr:"G",  shape:"square" };
  return { name:make.toUpperCase(), display:make.toUpperCase(), color:"#222222", abbr:make[0], shape:"square" };
}

// Brand logo SVG paths (simplified iconic marks)
function BrandLogo({ brand, size = 44, isWhite }) {
  if (!brand) return null;
  const bg = isWhite ? "#ffffff" : "#1a1a22";
  const border = isWhite ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.1)";

  const logos = {
    LEICA: () => (
      <div style={{ width:size, height:size, borderRadius:"50%", background:"#E30613", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic", fontWeight:400, fontSize:Math.round(size*0.28), color:"#fff", letterSpacing:"-0.01em" }}>Leica</span>
      </div>
    ),
    CANON: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"Georgia,'Times New Roman',serif", fontStyle:"italic", fontWeight:700, fontSize:Math.round(size*0.32), color:"#CC0000", letterSpacing:"-0.02em" }}>Canon</span>
      </div>
    ),
    NIKON: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:"#FFD700", border:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"Arial Black,'DM Sans',sans-serif", fontStyle:"italic", fontWeight:900, fontSize:Math.round(size*0.28), color:"#000", letterSpacing:"-0.02em" }}>Nikon</span>
      </div>
    ),
    SONY: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.28), color:isWhite?"#000":"#fff", letterSpacing:"0.05em" }}>SONY</span>
      </div>
    ),
    FUJIFILM: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.19), color:"#CC0000", letterSpacing:"0.02em", textAlign:"center" }}>FUJIFILM</span></div>
    ),
    OLYMPUS: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.19), color:"#003087", letterSpacing:"0.04em" }}>OLYMPUS</span>
      </div>
    ),
    PANASONIC: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.18), color:"#003087", letterSpacing:"0.01em" }}>Panasonic</span>
      </div>
    ),
    APPLE: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <svg width={size*0.55} height={size*0.55} viewBox="0 0 814 1000">
          <path fill={isWhite?"#000":"#fff"} d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-43.4-150.3-109.1c-38.5-55.7-69.2-139.5-69.2-219.3 0-190.5 119.4-291 237.3-291 79.4 0 145.3 52.9 194.3 52.9 48 0 121.9-56.6 212.9-56.6zm-65.1-115.9c33.1-39.9 58.8-95.3 58.8-150.7 0-7.7-.6-15.4-1.9-22.5-55.7 2-120 37.5-158.8 79.9-33.7 39.3-65.1 94.1-65.1 150.7 0 8.3 1.3 16.5 1.9 19.1 3.8.6 10.3 1.3 16.8 1.3 49.8 0 110.8-33.1 148.3-77.8z"/>
        </svg>
      </div>
    ),
    SAMSUNG: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:"#1428A0", border:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.22), color:"#fff", letterSpacing:"0.01em" }}>SAMSUNG</span>
      </div>
    ),
    HASSELBLAD: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"Georgia,serif", fontWeight:400, fontSize:Math.round(size*0.16), color:isWhite?"#111":"#ddd", letterSpacing:"0.04em" }}>HASSELBLAD</span>
      </div>
    ),
    DJI: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:"#000", border:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.32), color:"#fff", letterSpacing:"0.04em" }}>DJI</span>
      </div>
    ),
    RICOH: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.28), color:"#CC0066", letterSpacing:"0.04em" }}>RICOH</span>
      </div>
    ),
    GOPRO: () => (
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:"#00ADEF", border:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:"'DM Sans',Arial,sans-serif", fontWeight:700, fontSize:Math.round(size*0.26), color:"#fff", letterSpacing:"0.01em" }}>GoPro</span>
      </div>
    ),
  };

  const LogoFn = logos[brand.name];
  if (LogoFn) return <LogoFn />;

  // Fallback
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.16), background:bg, border, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:700, fontSize:Math.round(size*0.28), color:isWhite?(brand.color||"#111"):"#fff", letterSpacing:"0.01em", textAlign:"center" }}>
        {brand.display.slice(0,4)}
      </span>
    </div>
  );
}

// ─── Presets ──────────────────────────────────────────────────────────────────
const PRESETS = [
  { id:"Cinematic",   emoji:"🎬", desc:"Teal-orange · High contrast",       color:"#f07840", cssFilter:(a)=>`contrast(${1+a.contrast/100}) saturate(${0.85+a.saturation/100}) sepia(${0.1+a.teal/200}) hue-rotate(${-8+a.hue}deg) brightness(${0.95+a.brightness/100})`, overlay:"rgba(240,120,64,0.07)",  fallbackDesc:"Applied teal-and-orange color grading with boosted contrast for a Hollywood cinematic feel.", fallbackAdj:["Contrast +25%","Saturation −15%","Teal shadows","Orange highlights","Brightness −5%"], sliders:["contrast","saturation","brightness","teal","hue"] },
  { id:"Vintage",     emoji:"📷", desc:"Sepia · Film grain · Faded",         color:"#d4a874", cssFilter:(a)=>`sepia(${0.4+a.teal/200}) contrast(${0.9+a.contrast/100}) brightness(${0.9+a.brightness/100}) saturate(${0.75+a.saturation/100})`, overlay:"radial-gradient(ellipse at center,transparent 40%,rgba(100,60,20,0.4) 100%)", fallbackDesc:"Applied sepia toning with reduced saturation and vignette for a nostalgic film look.", fallbackAdj:["Sepia +40%","Contrast −10%","Brightness −10%","Saturation −25%","Vignette applied"], sliders:["contrast","saturation","brightness","teal"] },
  { id:"Vivid",       emoji:"⚡", desc:"HDR · Saturated · Sharp",             color:"#40d4a0", cssFilter:(a)=>`saturate(${1.6+a.saturation/100}) contrast(${1.15+a.contrast/100}) brightness(${1.05+a.brightness/100})`, overlay:"transparent", fallbackDesc:"Boosted saturation and dynamic range for a vibrant high-energy HDR look.", fallbackAdj:["Saturation +60%","Contrast +15%","Brightness +5%","HDR tone map","Edge clarity"], sliders:["contrast","saturation","brightness"] },
  { id:"Ethereal",    emoji:"🌸", desc:"Soft glow · Pastel · Dreamy",        color:"#c090f0", cssFilter:(a)=>`brightness(${1.2+a.brightness/100}) contrast(${0.85+a.contrast/100}) saturate(${0.7+a.saturation/100})`, overlay:"radial-gradient(ellipse at 50% 0%,rgba(255,255,255,0.12) 0%,transparent 70%)", fallbackDesc:"High-key lighting with softened clarity and pastel tones for a dreamy ethereal feel.", fallbackAdj:["Brightness +20%","Contrast −15%","Saturation −30%","Bloom effect","Pastel lift"], sliders:["contrast","saturation","brightness"] },
  { id:"Noir",        emoji:"🎭", desc:"B&W · Deep shadows · Dramatic",      color:"#b0b0b8", cssFilter:(a)=>`grayscale(1) contrast(${1.4+a.contrast/100}) brightness(${0.85+a.brightness/100})`, overlay:"transparent", fallbackDesc:"High-contrast black and white with crushed shadows for a dramatic noir style.", fallbackAdj:["Grayscale 100%","Contrast +40%","Brightness −15%","Shadow crush","Texture sharp"], sliders:["contrast","brightness"] },
  { id:"Golden Hour", emoji:"🌅", desc:"Warm amber · Soft highlights",       color:"#f0c040", cssFilter:(a)=>`brightness(${1.1+a.brightness/100}) saturate(${1.3+a.saturation/100}) sepia(${0.25+a.teal/200}) hue-rotate(${10+a.hue}deg) contrast(${1.05+a.contrast/100})`, overlay:"rgba(255,180,40,0.08)", fallbackDesc:"Warm amber tones with lifted highlights for a magical golden hour glow.", fallbackAdj:["Brightness +10%","Saturation +30%","Warm sepia +25%","Hue shift +10°","Soft contrast"], sliders:["contrast","saturation","brightness","teal","hue"] },
  { id:"Cyberpunk",   emoji:"🌆", desc:"Neon blues · Purple · High contrast",color:"#a040f0", cssFilter:(a)=>`contrast(${1.35+a.contrast/100}) saturate(${1.4+a.saturation/100}) hue-rotate(${200+a.hue}deg) brightness(${0.9+a.brightness/100})`, overlay:"rgba(100,40,200,0.08)", fallbackDesc:"Neon-soaked blues and purples with boosted contrast for a cyberpunk aesthetic.", fallbackAdj:["Contrast +35%","Saturation +40%","Hue shift 200°","Brightness −10%","Neon overlay"], sliders:["contrast","saturation","brightness","hue"] },
  { id:"Matte",       emoji:"🎨", desc:"Faded blacks · Flat · Editorial",    color:"#90a0b0", cssFilter:(a)=>`contrast(${0.85+a.contrast/100}) saturate(${0.8+a.saturation/100}) brightness(${1.08+a.brightness/100})`, overlay:"rgba(180,190,200,0.06)", fallbackDesc:"Lifted shadows with reduced contrast and muted tones for a matte editorial finish.", fallbackAdj:["Contrast −15%","Saturation −20%","Brightness +8%","Lifted blacks","Flat tones"], sliders:["contrast","saturation","brightness"] },
  { id:"Summer",      emoji:"☀️", desc:"Bright · Warm · Saturated",          color:"#f0d040", cssFilter:(a)=>`brightness(${1.15+a.brightness/100}) saturate(${1.5+a.saturation/100}) contrast(${1.1+a.contrast/100}) hue-rotate(${5+a.hue}deg)`, overlay:"rgba(255,220,50,0.05)", fallbackDesc:"Punchy brightness with warm saturation for a vibrant sun-drenched summer vibe.", fallbackAdj:["Brightness +15%","Saturation +50%","Contrast +10%","Warm hue shift","Punchy tones"], sliders:["contrast","saturation","brightness","hue"] },
  { id:"Moody",       emoji:"🌑", desc:"Dark · Desaturated · Dramatic",      color:"#6070a0", cssFilter:(a)=>`brightness(${0.8+a.brightness/100}) saturate(${0.6+a.saturation/100}) contrast(${1.2+a.contrast/100}) hue-rotate(${-15+a.hue}deg)`, overlay:"rgba(30,40,80,0.12)", fallbackDesc:"Dark desaturated tones with boosted contrast for a brooding moody atmosphere.", fallbackAdj:["Brightness −20%","Saturation −40%","Contrast +20%","Cool shadow shift","Deep tones"], sliders:["contrast","saturation","brightness","hue"] },
];

const SLIDER_CONFIG = {
  contrast:   { label:"CONTRAST",    min:-30, max:30  },
  saturation: { label:"SATURATION",  min:-40, max:40  },
  brightness: { label:"BRIGHTNESS",  min:-20, max:20  },
  teal:       { label:"TEAL / WARM", min:-20, max:20  },
  hue:        { label:"HUE SHIFT",   min:-30, max:30  },
};
const DEFAULT_ADJ = { contrast:0, saturation:0, brightness:0, teal:0, hue:0 };

const ANIM = `
html, body, #root { height: 100%; overflow: hidden; }
@keyframes fadeUp  { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
@keyframes dot     { 0%,60%,100%{transform:translateY(0);opacity:0.3} 30%{transform:translateY(-4px);opacity:1} }
@keyframes glow    { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
`;

const SliderRow = ({ label, value, min, max, onChange, color }) => (
  <div style={{ marginBottom:13 }}>
    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
      <span style={{ fontSize:"0.68rem", color:"#888899", fontFamily:"monospace", letterSpacing:"0.1em" }}>{label}</span>
      <span style={{ fontSize:"0.68rem", color:color||"#c8f060", fontFamily:"monospace", minWidth:34, textAlign:"right" }}>{value>0?`+${value}`:value}</span>
    </div>
    <div style={{ position:"relative", height:4, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
      <div style={{ position:"absolute", left:`${((value-min)/(max-min))*100}%`, top:"50%", transform:"translate(-50%,-50%)", width:13, height:13, borderRadius:"50%", background:color||"#c8f060", zIndex:2 }} />
      <div style={{ position:"absolute", left:0, width:`${((value-min)/(max-min))*100}%`, height:"100%", background:color||"#c8f060", borderRadius:2, opacity:0.4 }} />
      <input type="range" min={min} max={max} value={value} onChange={(e)=>onChange(Number(e.target.value))}
        style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:"100%", opacity:0, cursor:"pointer", height:"44px", margin:0, zIndex:3 }} />
    </div>
  </div>
);

// ─── EXIF Frame Preview — matches reference image exactly ─────────────────────
const FramePreview = ({ imageSrc, cssFilter, overlay, frameTheme, exif }) => {
  const brand    = exif ? getBrand(exif.make) : null;
  const rawModel = exif?.model || "";
  const make     = exif?.make  || "";
  const model    = rawModel.replace(make,"").trim() || rawModel;
  const isWhite  = frameTheme === "white";
  const bg       = isWhite ? "#FFFFFF" : "#0f0f0f";
  const textMain = isWhite ? "#222222" : "#dddddd";
  const textSub  = "#999999";

  const metaParts = [
    exif?.focalLength  ? fmtFL(exif.focalLength)       : null,
    exif?.fNumber      ? fmtF(exif.fNumber)             : null,
    exif?.exposureTime ? fmtExposure(exif.exposureTime) : null,
    exif?.iso          ? `ISO${exif.iso}`               : null,
  ].filter(Boolean);

  return (
    <div style={{ background:bg, borderRadius:10, overflow:"hidden", boxShadow:isWhite?"0 4px 24px rgba(0,0,0,0.1)":"0 4px 24px rgba(0,0,0,0.6)" }}>
      {/* Photo */}
      <div style={{ padding:"10px 10px 0" }}>
        <div style={{ position:"relative", overflow:"hidden", borderRadius:3 }}>
          <img src={imageSrc} alt="frame-preview" style={{ width:"100%", display:"block", filter:cssFilter, transition:"filter 0.5s ease" }} />
          <div style={{ position:"absolute", inset:0, background:overlay, pointerEvents:"none" }} />
        </div>
      </div>
      {/* Info bar: Logo | Camera Model bold / metadata left-aligned */}
      <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:12, background:bg }}>
        <BrandLogo brand={brand} size={44} isWhite={isWhite} />
        <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
          <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:"0.62rem", fontWeight:700, color:textMain, letterSpacing:"0.01em", lineHeight:1.3 }}>
            {model || brand?.display || "Unknown"}
          </div>
          <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:"0.62rem", fontWeight:400, color:textSub, letterSpacing:"0.02em", lineHeight:1.3 }}>
            {metaParts.join("  ") || "—"}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function LuminaV4() {
  const [imageSrc, setImageSrc]           = useState(null);
  const [imageBase64, setImageBase64]     = useState(null);
  const [activePreset, setActivePreset]   = useState(null);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [progress, setProgress]           = useState(0);
  const [resultInfo, setResultInfo]       = useState(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [adj, setAdj]                     = useState(DEFAULT_ADJ);
  const [showAdj, setShowAdj]             = useState(false);
  const [savedPresets, setSavedPresets]   = useState([]);
  const [toast, setToast]                 = useState(null);
  const [exif, setExif]                   = useState(null);
  const [frameTheme, setFrameTheme]       = useState("white");
  const [activeFeature, setActiveFeature] = useState("enhance");
  const fileRef = useRef(null);
  const ivRef   = useRef(null);

  const updateAdj = (key, val) => setAdj(prev => ({ ...prev, [key]: val }));
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const currentFilter = useCallback(() => {
    if (!activePreset) return "";
    const p = PRESETS.find(p => p.id === activePreset);
    return p ? p.cssFilter(adj) : "";
  }, [activePreset, adj]);

  const currentOverlay = activePreset
    ? PRESETS.find(p => p.id === activePreset)?.overlay
    : "transparent";

  const loadImage = useCallback((file) => {
    if (!file?.type.startsWith("image/")) return;
    const bufReader = new FileReader();
    bufReader.onload = (e) => setExif(readEXIF(e.target.result));
    bufReader.readAsArrayBuffer(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setActivePreset(null); setResultInfo(null); setShowAdj(false); setAdj(DEFAULT_ADJ);
    };
    reader.readAsDataURL(file);
  }, []);

  const applyPreset = useCallback(async (presetId, customAdj = null) => {
    if (!imageBase64 || isProcessing) return;
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId); setIsProcessing(true);
    setShowAdj(false); setAdj(customAdj || DEFAULT_ADJ); setProgress(0);
    ivRef.current = setInterval(() => setProgress(p => Math.min(p + Math.random() * 5, 88)), 150);
    const WORKER_URL = "https://lumina-proxy.cslcs-gen.workers.dev";
    const sys = `You are a professional photo enhancement expert. Respond ONLY with valid JSON no markdown:
{"description":"2-3 sentence enhancement description","adjustments":["adj1","adj2","adj3","adj4","adj5"]}`;
    try {
      const res = await fetch(WORKER_URL, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:600, system:sys,
          messages:[{ role:"user", content:[
            { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:imageBase64 } },
            { type:"text", text:`Apply "${presetId}" preset.` }
          ]}]
        })
      });
      const data = await res.json();
      const parsed = JSON.parse(data.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim());
      clearInterval(ivRef.current); setProgress(100); setTimeout(()=>setProgress(0),500);
      setResultInfo({ preset, desc:parsed.description, adj:parsed.adjustments }); setShowAdj(true);
    } catch {
      clearInterval(ivRef.current); setProgress(100); setTimeout(()=>setProgress(0),500);
      setResultInfo({ preset, desc:preset.fallbackDesc, adj:preset.fallbackAdj }); setShowAdj(true);
    }
    setIsProcessing(false);
  }, [imageBase64, isProcessing]);

  const downloadPhoto = () => {
    const img = document.querySelector("img[alt='main-photo']");
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.filter = img.style.filter || "none";
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = `lumina-${activePreset?.toLowerCase()||"photo"}-${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95); link.click();
    showToast("📥 Photo saved!");
  };

  const downloadFramed = () => {
    const img = document.querySelector("img[alt='main-photo']");
    if (!img) { showToast("Upload a photo first"); return; }
    const brand    = exif ? getBrand(exif.make) : null;
    const rawModel = exif?.model || "";
    const model    = rawModel.replace(exif?.make||"","").trim() || rawModel;
    const isWhite  = frameTheme === "white";
    const bg       = isWhite ? "#FFFFFF" : "#0f0f0f";
    const textMain = isWhite ? "#222222" : "#dddddd";
    const textSub  = "#999999";
    const W        = img.naturalWidth;
    const H        = img.naturalHeight;
    const pad      = Math.round(W * 0.055);
    const logoSize = Math.round(W * 0.065);
    const infoH    = Math.round(logoSize * 1.8);
    const canvas   = document.createElement("canvas");
    canvas.width   = W + pad * 2;
    canvas.height  = H + pad * 2 + infoH;
    const ctx = canvas.getContext("2d");
    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Photo
    ctx.save(); ctx.filter = img.style.filter || "none";
    ctx.drawImage(img, pad, pad, W, H);
    ctx.restore();
    // Separator line
    ctx.strokeStyle = isWhite ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, H+pad*2); ctx.lineTo(W+pad, H+pad*2); ctx.stroke();
    // Info area — matches reference layout
    const logoX   = pad;
    const logoY   = H + pad*2 + (infoH - logoSize) / 2;
    const textX   = pad + logoSize + Math.round(W * 0.025);
    const row1Y   = H + pad*2 + infoH * 0.40;
    const row2Y   = H + pad*2 + infoH * 0.68;
    const mainSz  = Math.max(18, Math.round(W * 0.024));
    const subSz   = Math.max(13, Math.round(W * 0.016));
    const focalSz = Math.max(28, Math.round(W * 0.05));

    // Draw brand logo (circle for Leica, rounded rect for others)
    if (brand) {
      if (brand.name === "LEICA") {
        ctx.beginPath();
        ctx.arc(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, Math.PI*2);
        ctx.fillStyle = "#E30613"; ctx.fill();
        ctx.font = `italic ${Math.round(logoSize*0.3)}px Georgia, serif`;
        ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center";
        ctx.fillText("Leica", logoX + logoSize/2, logoY + logoSize/2 + Math.round(logoSize*0.11));
      } else {
        ctx.fillStyle = isWhite ? (brand.color || "#111") : "rgba(255,255,255,0.08)";
        roundRect(ctx, logoX, logoY, logoSize, logoSize, Math.round(logoSize*0.18));
        ctx.fill();
        const logoText = brand.display.length > 8 ? (brand.abbr || brand.display[0]) : brand.display;
        const logoFontSz = logoText.length > 5 ? Math.round(logoSize*0.22) : Math.round(logoSize*0.3);
        ctx.font = `bold ${logoFontSz}px sans-serif`;
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
        ctx.fillText(logoText, logoX + logoSize/2, logoY + logoSize/2 + logoFontSz*0.35);
      }
    }

    // Row 1: "Brand Model" bold serif
    const modelLine = model || brand?.display || "Unknown Camera";
    ctx.textAlign = "left";
    ctx.font = `bold ${mainSz}px Georgia, serif`;
    ctx.fillStyle = textMain;
    ctx.fillText(modelLine, textX, row1Y);

    // Row 2: metadata sans-serif (exclude focal length)
    const allMeta = [
      exif?.fNumber      ? fmtF(exif.fNumber)             : null,
      exif?.exposureTime ? fmtExposure(exif.exposureTime) : null,
      exif?.iso          ? `ISO${exif.iso}`               : null,
    ].filter(Boolean);
    if (allMeta.length > 0) {
      ctx.font = `${subSz}px -apple-system, Helvetica, sans-serif`;
      ctx.fillStyle = textSub;
      ctx.fillText(allMeta.join("   "), textX, row2Y);
    }

    // Focal length — large far right
    const fl = exif?.focalLength ? fmtFL(exif.focalLength) : null;
    if (fl) {
      ctx.font = `bold ${focalSz}px Georgia, serif`;
      ctx.fillStyle = textMain;
      ctx.textAlign = "right";
      ctx.fillText(fl, pad + W, row1Y + (row2Y - row1Y) * 0.3);
    }
    const link = document.createElement("a");
    link.download = `lumina-framed-${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.97); link.click();
    showToast("🖼️ Framed photo saved!");
  };

  // Helper: rounded rect for canvas
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x, y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }

  const saveSettings = () => {
    if (!activePreset) return;
    const p = PRESETS.find(p => p.id === activePreset);
    const name = `${activePreset} #${savedPresets.length + 1}`;
    setSavedPresets(prev => [{ id:Date.now(), name, presetId:activePreset, emoji:p.emoji, color:p.color, adj:{...adj}, createdAt:new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short"}) }, ...prev]);
    showToast(`✓ Saved as "${name}"`);
  };

  const preset     = activePreset ? PRESETS.find(p => p.id === activePreset) : null;
  const exifBrand  = exif ? getBrand(exif.make) : null;
  const rawExifModel = (exif?.model||"").replace(exif?.make||"","").trim() || exif?.model || "";
  const exifModel = rawExifModel;

  return (
    <>
      <style>{ANIM}</style>
      {/* Outer: locked to screen so preset bar stays visible */}
      <div style={{ background:"#0a0a0c", height:"100%", fontFamily:"'DM Sans',system-ui,sans-serif", color:"#e8e8f0", maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column", overflow:"hidden", position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", width:"100%", zIndex:0 }}>

        {/* Toast */}
        {toast && (
          <div style={{ position:"fixed", bottom:120, left:"50%", transform:"translateX(-50%)", background:"#1a1a24", border:"1px solid rgba(192,240,96,0.25)", borderRadius:100, padding:"8px 18px", fontSize:"0.72rem", color:"#c8f060", fontFamily:"monospace", letterSpacing:"0.1em", zIndex:999, animation:"toastIn 0.3s ease", whiteSpace:"nowrap" }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ padding:"14px 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem", fontWeight:700, letterSpacing:"0.16em", color:"#c8f060", lineHeight:1, textTransform:"uppercase" }}>Lumina</div>
            <div style={{ fontSize:"0.54rem", color:"#444455", letterSpacing:"0.2em", fontFamily:"monospace", marginTop:2 }}>AI PHOTO ENHANCER</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ fontFamily:"monospace", fontSize:"0.53rem", color:"#2a3a1a", background:"rgba(192,240,96,0.06)", border:"1px solid rgba(192,240,96,0.1)", borderRadius:4, padding:"2px 6px" }}>v4.02</div>
            <div style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(192,240,96,0.06)", border:"1px solid rgba(192,240,96,0.14)", borderRadius:100, padding:"4px 9px" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#c8f060", animation:"glow 2s infinite" }} />
              <span style={{ fontSize:"0.54rem", color:"#c8f060", fontFamily:"monospace", letterSpacing:"0.1em" }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* FIX 1: Feature tabs immediately below header — always visible */}
        <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
          {[["enhance","✨ Enhance"],["frame","🖼️ EXIF Frame"]].map(([id,label]) => (
            <button key={id} onClick={() => setActiveFeature(id)}
              style={{ flex:1, padding:"10px 0", fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.1em", background:"transparent", border:"none", cursor:"pointer", color:activeFeature===id?"#c8f060":"#444455", borderBottom:`2px solid ${activeFeature===id?"#c8f060":"transparent"}`, transition:"all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable content area */}
        <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", paddingBottom:8, WebkitOverflowScrolling:"touch", minHeight:0 }}>

          {/* Image Upload */}
          <div style={{ margin:"12px 14px 0" }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); loadImage(e.dataTransfer.files[0]); }}
              onClick={() => !imageSrc && fileRef.current?.click()}
              style={{ borderRadius:14, overflow:"hidden", position:"relative", background:imageSrc?"#000":"#111116", border:`1px ${imageSrc?"solid":"dashed"} ${isDragging?"#c8f060":imageSrc?"rgba(255,255,255,0.06)":"rgba(192,240,96,0.18)"}`, minHeight:imageSrc?240:160, display:"flex", alignItems:"center", justifyContent:"center", cursor:imageSrc?"default":"pointer", transition:"all 0.3s" }}
            >
              {!imageSrc ? (
                <div style={{ textAlign:"center", padding:20 }}>
                  <div style={{ width:50, height:50, border:"1px solid rgba(192,240,96,0.22)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="1.5" opacity="0.55">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div style={{ fontSize:"0.88rem", color:"#c8f060", fontWeight:500, marginBottom:4 }}>Tap to upload photo</div>
                  <div style={{ fontSize:"0.68rem", color:"#333344" }}>JPG · PNG · WEBP</div>
                </div>
              ) : (
                <>
                  <img alt="main-photo" src={imageSrc} style={{ width:"100%", minHeight:240, objectFit:"cover", display:"block", filter:currentFilter(), transition:"filter 0.5s ease" }} />
                  <div style={{ position:"absolute", inset:0, background:currentOverlay, pointerEvents:"none", transition:"background 0.5s" }} />
                  <button onClick={() => fileRef.current?.click()} style={{ position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.65)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:7, padding:"5px 10px", color:"#e8e8f0", fontSize:"0.6rem", fontFamily:"monospace", letterSpacing:"0.1em", cursor:"pointer" }}>CHANGE</button>
                  {activePreset && !isProcessing && (
                    <div style={{ position:"absolute", top:10, left:10, background:"rgba(0,0,0,0.7)", border:`1px solid ${preset?.color}`, borderRadius:7, padding:"4px 9px", fontSize:"0.58rem", fontFamily:"monospace", color:preset?.color, letterSpacing:"0.1em" }}>
                      {preset?.emoji} {activePreset.toUpperCase()}
                    </div>
                  )}
                </>
              )}
              {progress > 0 && (
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"rgba(255,255,255,0.05)" }}>
                  <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#c8f060,#6070f0)", transition:"width 0.15s linear", borderRadius:2 }} />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={(e) => loadImage(e.target.files[0])} />
          </div>

          {/* Processing */}
          {isProcessing && (
            <div style={{ margin:"10px 14px 0", background:"rgba(192,240,96,0.04)", border:"1px solid rgba(192,240,96,0.12)", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ display:"flex", gap:3 }}>
                {[0,0.15,0.3].map((d,i) => <span key={i} style={{ display:"inline-block", width:4, height:4, borderRadius:"50%", background:"#c8f060", animation:`dot 1.2s ${d}s infinite` }} />)}
              </div>
              <span style={{ fontSize:"0.72rem", color:"#777788" }}>Claude AI is analyzing your photo...</span>
            </div>
          )}

          {/* ══ ENHANCE TAB ══════════════════════════════════════════════════ */}
          {activeFeature === "enhance" && (
            <>
              {resultInfo && !isProcessing && (
                <div style={{ margin:"10px 14px 0", background:"#111116", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px", animation:"fadeUp 0.35s ease" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <span style={{ fontSize:"0.9rem" }}>{resultInfo.preset.emoji}</span>
                    <span style={{ fontFamily:"monospace", fontSize:"0.58rem", letterSpacing:"0.14em", color:resultInfo.preset.color, textTransform:"uppercase", fontWeight:600 }}>{resultInfo.preset.id} Applied</span>
                  </div>
                  <p style={{ fontSize:"0.74rem", color:"#777788", lineHeight:1.7, margin:"0 0 7px" }}>{resultInfo.desc}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {resultInfo.adj.map((a,i) => <span key={i} style={{ fontFamily:"monospace", fontSize:"0.54rem", color:"#555566", background:"#1a1a22", border:"1px solid rgba(255,255,255,0.06)", borderRadius:4, padding:"2px 6px" }}>{a}</span>)}
                  </div>
                </div>
              )}

              {showAdj && preset && (
                <div style={{ margin:"10px 14px 0", background:"#0e0e14", border:`1px solid ${preset.color}22`, borderRadius:12, overflow:"hidden", animation:"fadeUp 0.4s ease" }}>
                  <div style={{ padding:"10px 13px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={preset.color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                      <span style={{ fontFamily:"monospace", fontSize:"0.58rem", letterSpacing:"0.16em", color:preset.color, textTransform:"uppercase" }}>Fine Tune</span>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => setAdj(DEFAULT_ADJ)} style={{ fontFamily:"monospace", fontSize:"0.54rem", color:"#555566", background:"transparent", border:"1px solid rgba(255,255,255,0.07)", borderRadius:5, padding:"2px 7px", cursor:"pointer" }}>RESET</button>
                      <button onClick={saveSettings} style={{ fontFamily:"monospace", fontSize:"0.54rem", color:preset.color, background:`${preset.color}15`, border:`1px solid ${preset.color}40`, borderRadius:5, padding:"2px 7px", cursor:"pointer" }}>SAVE</button>
                    </div>
                  </div>
                  <div style={{ padding:"12px 13px 4px" }}>
                    {preset.sliders.map(key => (
                      <SliderRow key={key} label={SLIDER_CONFIG[key].label} value={adj[key]} min={SLIDER_CONFIG[key].min} max={SLIDER_CONFIG[key].max} onChange={v => updateAdj(key, v)} color={preset.color} />
                    ))}
                  </div>
                </div>
              )}

              {imageSrc && activePreset && !isProcessing && (
                <div style={{ margin:"10px 14px 0", display:"flex", gap:7 }}>
                  <button onClick={downloadPhoto} style={{ flex:1, padding:"10px", borderRadius:9, border:"1px solid rgba(192,240,96,0.3)", background:"rgba(192,240,96,0.06)", color:"#c8f060", fontFamily:"monospace", fontSize:"0.58rem", letterSpacing:"0.12em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    DOWNLOAD
                  </button>
                  <button onClick={() => { setActivePreset(null); setResultInfo(null); setShowAdj(false); setAdj(DEFAULT_ADJ); }} style={{ flex:1, padding:"10px", borderRadius:9, border:"1px solid rgba(255,255,255,0.07)", background:"transparent", color:"#555566", fontFamily:"monospace", fontSize:"0.58rem", letterSpacing:"0.12em", cursor:"pointer" }}>
                    RESET
                  </button>
                </div>
              )}

              {savedPresets.length > 0 && (
                <div style={{ margin:"14px 14px 0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <div style={{ width:4, height:4, borderRadius:"50%", background:"#c8f060" }} />
                    <span style={{ fontFamily:"monospace", fontSize:"0.56rem", letterSpacing:"0.2em", textTransform:"uppercase", color:"#444455" }}>Saved Presets ({savedPresets.length})</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {savedPresets.map(saved => (
                      <div key={saved.id} style={{ background:"#111116", border:`1px solid ${saved.color}22`, borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:9 }}>
                        <span style={{ fontSize:"1rem" }}>{saved.emoji}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"0.72rem", color:saved.color, fontWeight:600, marginBottom:2 }}>{saved.name}</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                            {Object.entries(saved.adj).filter(([,v])=>v!==0).map(([k,v]) => (
                              <span key={k} style={{ fontFamily:"monospace", fontSize:"0.52rem", color:"#444455", background:"#1a1a22", border:"1px solid rgba(255,255,255,0.05)", borderRadius:3, padding:"1px 5px" }}>{SLIDER_CONFIG[k]?.label} {v>0?`+${v}`:v}</span>
                            ))}
                            {Object.values(saved.adj).every(v=>v===0) && <span style={{ fontFamily:"monospace", fontSize:"0.52rem", color:"#333344" }}>Default</span>}
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:5 }}>
                          <button onClick={() => { applyPreset(saved.presetId, saved.adj); showToast(`Applying "${saved.name}"`); }} style={{ fontFamily:"monospace", fontSize:"0.52rem", color:saved.color, background:`${saved.color}12`, border:`1px solid ${saved.color}30`, borderRadius:5, padding:"3px 7px", cursor:"pointer" }}>APPLY</button>
                          <button onClick={() => { setSavedPresets(prev=>prev.filter(p=>p.id!==saved.id)); showToast("Deleted"); }} style={{ fontFamily:"monospace", fontSize:"0.52rem", color:"#444455", background:"transparent", border:"1px solid rgba(255,255,255,0.07)", borderRadius:5, padding:"3px 7px", cursor:"pointer" }}>DEL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ══ EXIF FRAME TAB ═══════════════════════════════════════════════ */}
          {activeFeature === "frame" && (
            <div style={{ margin:"12px 14px 0", animation:"fadeUp 0.3s ease" }}>
              {!imageSrc ? (
                <div style={{ textAlign:"center", padding:"32px 20px", border:"1px dashed rgba(255,255,255,0.07)", borderRadius:12, color:"#444455" }}>
                  <div style={{ fontSize:"2rem", marginBottom:10 }}>🖼️</div>
                  <div style={{ fontFamily:"monospace", fontSize:"0.62rem", letterSpacing:"0.15em", marginBottom:6 }}>UPLOAD A PHOTO FIRST</div>
                  <div style={{ fontSize:"0.7rem", color:"#333344", lineHeight:1.6 }}>Upload a photo above to extract<br/>EXIF data and add a frame.</div>
                </div>
              ) : (
                <>
                  {/* EXIF Metadata Card */}
                  <div style={{ background:"#111116", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <span style={{ fontFamily:"monospace", fontSize:"0.58rem", letterSpacing:"0.16em", color:"#c8f060", textTransform:"uppercase" }}>Detected EXIF</span>
                      {exifBrand && <span style={{ fontFamily:"monospace", fontSize:"0.54rem", color:exifBrand.color, background:`${exifBrand.color}18`, border:`1px solid ${exifBrand.color}40`, borderRadius:4, padding:"1px 7px" }}>{exifBrand.display}</span>}
                    </div>
                    {exif && (exif.make || exif.model) ? (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                        {[
                          { label:"Camera",       value:`${exifModel} ${exifBrand?.display||""}`.trim()||"—" },
                          { label:"Focal Length", value:exif.focalLength?fmtFL(exif.focalLength):"—" },
                          { label:"Aperture",     value:exif.fNumber?fmtF(exif.fNumber):"—" },
                          { label:"Shutter",      value:exif.exposureTime?fmtExposure(exif.exposureTime):"—" },
                          { label:"ISO",          value:exif.iso?`ISO ${exif.iso}`:"—" },
                          { label:"Date",         value:exif.dateTimeOriginal?exif.dateTimeOriginal.slice(0,10).replace(/:/g,"-"):"—" },
                        ].map(({label,value}) => (
                          <div key={label} style={{ background:"#1a1a22", borderRadius:7, padding:"7px 9px" }}>
                            <div style={{ fontFamily:"monospace", fontSize:"0.52rem", color:"#444455", letterSpacing:"0.12em", marginBottom:2 }}>{label.toUpperCase()}</div>
                            <div style={{ fontSize:"0.74rem", color:"#e8e8f0", fontWeight:500 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign:"center", padding:"10px 0", color:"#444455" }}>
                        <div style={{ fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.12em", marginBottom:3 }}>NO EXIF DATA FOUND</div>
                        <div style={{ fontSize:"0.68rem", color:"#333344", lineHeight:1.6 }}>Try an original JPG direct from your camera.</div>
                      </div>
                    )}
                  </div>

                  {/* Frame Theme */}
                  <div style={{ background:"#111116", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      <span style={{ fontFamily:"monospace", fontSize:"0.58rem", letterSpacing:"0.16em", color:"#c8f060", textTransform:"uppercase" }}>Frame Theme</span>
                    </div>
                    <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                      {[["white","☀️ White"],["black","🌑 Black"]].map(([theme,label]) => (
                        <button key={theme} onClick={() => setFrameTheme(theme)}
                          style={{ flex:1, padding:"9px", borderRadius:8, border:`1px solid ${frameTheme===theme?"#c8f060":"rgba(255,255,255,0.07)"}`, background:frameTheme===theme?"rgba(192,240,96,0.08)":"transparent", color:frameTheme===theme?"#c8f060":"#555566", fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.1em", cursor:"pointer", transition:"all 0.2s" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {/* FIX 3: Live preview with brand logo */}
                    <div style={{ fontSize:"0.58rem", fontFamily:"monospace", color:"#444455", letterSpacing:"0.14em", marginBottom:8 }}>PREVIEW</div>
                    <FramePreview imageSrc={imageSrc} cssFilter={currentFilter()} overlay={currentOverlay} frameTheme={frameTheme} exif={exif} />
                  </div>

                  {/* Download */}
                  <button onClick={downloadFramed}
                    style={{ width:"100%", padding:"13px", borderRadius:10, border:"1px solid rgba(192,240,96,0.3)", background:"rgba(192,240,96,0.06)", color:"#c8f060", fontFamily:"monospace", fontSize:"0.63rem", letterSpacing:"0.14em", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    DOWNLOAD FRAMED PHOTO
                  </button>
                </>
              )}
            </div>
          )}

          {/* Privacy */}
          <div style={{ margin:"14px 14px 0", padding:"8px 12px", background:"rgba(192,240,96,0.02)", border:"1px solid rgba(192,240,96,0.07)", borderRadius:10, display:"flex", gap:6, alignItems:"flex-start" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="2" style={{ flexShrink:0, marginTop:2, opacity:0.4 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize:"0.63rem", color:"#444455", lineHeight:1.6 }}>Photos never stored. Cleared when you close the tab.</span>
          </div>

          {/* Footer */}
          <div style={{ margin:"12px 14px 0", paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between", paddingBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontFamily:"Georgia,serif", fontSize:"0.7rem", fontWeight:700, color:"#c8f060", letterSpacing:"0.12em", textTransform:"uppercase" }}>Lumina</span>
              <span style={{ fontFamily:"monospace", fontSize:"0.52rem", color:"#2a3a1a", background:"rgba(192,240,96,0.07)", border:"1px solid rgba(192,240,96,0.12)", borderRadius:3, padding:"1px 5px" }}>v4.02</span>
              <span style={{ fontFamily:"monospace", fontSize:"0.48rem", color:"#2a2a38" }}>May 2026</span>
            </div>
            <span style={{ fontSize:"0.54rem", color:"#2a2a38", fontFamily:"monospace" }}>Powered by Claude AI</span>
          </div>

        </div>{/* end scrollable */}

        {/* FIX 1: Sticky preset bar INSIDE the flex column, always at bottom */}
        {activeFeature === "enhance" && (
          <div style={{ background:"rgba(10,10,12,0.97)", borderTop:"1px solid rgba(255,255,255,0.08)", backdropFilter:"blur(16px)", flexShrink:0, position:"sticky", bottom:0, zIndex:50 }}>
            <div style={{ padding:"7px 14px 3px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"monospace", fontSize:"0.52rem", letterSpacing:"0.18em", color:"#333344", textTransform:"uppercase" }}>
                {activePreset ? "TAP TO SWITCH STYLE" : "STYLE PRESETS — SWIPE →"}
              </span>
              {activePreset && <span style={{ fontFamily:"monospace", fontSize:"0.52rem", color:preset?.color }}>{preset?.emoji} {activePreset}</span>}
            </div>
            <div style={{ display:"flex", gap:7, padding:"3px 14px 10px", overflowX:"auto", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
              {PRESETS.map(p => (
                <div key={p.id}
                  onClick={() => { if (!imageBase64) { fileRef.current?.click(); } else { applyPreset(p.id); } }}
                  style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
                  <div style={{ width:42, height:42, borderRadius:11, border:`1.5px solid ${activePreset===p.id?p.color:"rgba(255,255,255,0.08)"}`, background:activePreset===p.id?`${p.color}18`:"#111116", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", transition:"all 0.2s", boxShadow:activePreset===p.id?`0 0 10px ${p.color}40`:"none" }}>
                    {p.emoji}
                  </div>
                  <span style={{ fontFamily:"monospace", fontSize:"0.5rem", color:activePreset===p.id?p.color:"#444455", letterSpacing:"0.04em", textAlign:"center", maxWidth:42, lineHeight:1.2 }}>
                    {p.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
