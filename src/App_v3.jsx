import { useState, useRef, useCallback } from "react";

// ─── Preset Definitions ───────────────────────────────────────────────────────
const PRESETS = [
  {
    id: "Cinematic", emoji: "🎬", desc: "Teal-orange · High contrast", color: "#f07840",
    cssFilter: (a) => `contrast(${1 + a.contrast / 100}) saturate(${0.85 + a.saturation / 100}) sepia(${0.1 + a.teal / 200}) hue-rotate(${-8 + a.hue}deg) brightness(${0.95 + a.brightness / 100})`,
    overlay: "rgba(240,120,64,0.07)",
    fallbackDesc: "Applied teal-and-orange color grading with boosted contrast for a Hollywood cinematic feel.",
    fallbackAdj: ["Contrast +25%", "Saturation −15%", "Teal shadows", "Orange highlights", "Brightness −5%"],
    sliders: ["contrast", "saturation", "brightness", "teal", "hue"],
  },
  {
    id: "Vintage", emoji: "📷", desc: "Sepia · Film grain · Faded", color: "#d4a874",
    cssFilter: (a) => `sepia(${0.4 + a.teal / 200}) contrast(${0.9 + a.contrast / 100}) brightness(${0.9 + a.brightness / 100}) saturate(${0.75 + a.saturation / 100})`,
    overlay: "radial-gradient(ellipse at center, transparent 40%, rgba(100,60,20,0.4) 100%)",
    fallbackDesc: "Applied sepia toning with reduced saturation and vignette for a nostalgic film look.",
    fallbackAdj: ["Sepia +40%", "Contrast −10%", "Brightness −10%", "Saturation −25%", "Vignette applied"],
    sliders: ["contrast", "saturation", "brightness", "teal"],
  },
  {
    id: "Vivid", emoji: "⚡", desc: "HDR · Saturated · Sharp", color: "#40d4a0",
    cssFilter: (a) => `saturate(${1.6 + a.saturation / 100}) contrast(${1.15 + a.contrast / 100}) brightness(${1.05 + a.brightness / 100})`,
    overlay: "transparent",
    fallbackDesc: "Boosted saturation and dynamic range for a vibrant high-energy HDR look.",
    fallbackAdj: ["Saturation +60%", "Contrast +15%", "Brightness +5%", "HDR tone map", "Edge clarity"],
    sliders: ["contrast", "saturation", "brightness"],
  },
  {
    id: "Ethereal", emoji: "🌸", desc: "Soft glow · Pastel · Dreamy", color: "#c090f0",
    cssFilter: (a) => `brightness(${1.2 + a.brightness / 100}) contrast(${0.85 + a.contrast / 100}) saturate(${0.7 + a.saturation / 100})`,
    overlay: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%)",
    fallbackDesc: "High-key lighting with softened clarity and pastel tones for a dreamy ethereal feel.",
    fallbackAdj: ["Brightness +20%", "Contrast −15%", "Saturation −30%", "Bloom effect", "Pastel lift"],
    sliders: ["contrast", "saturation", "brightness"],
  },
  {
    id: "Noir", emoji: "🎭", desc: "B&W · Deep shadows · Dramatic", color: "#b0b0b8",
    cssFilter: (a) => `grayscale(1) contrast(${1.4 + a.contrast / 100}) brightness(${0.85 + a.brightness / 100})`,
    overlay: "transparent",
    fallbackDesc: "High-contrast black and white with crushed shadows for a dramatic noir style.",
    fallbackAdj: ["Grayscale 100%", "Contrast +40%", "Brightness −15%", "Shadow crush", "Texture sharp"],
    sliders: ["contrast", "brightness"],
  },
  {
    id: "Golden Hour", emoji: "🌅", desc: "Warm amber · Soft highlights", color: "#f0c040",
    cssFilter: (a) => `brightness(${1.1 + a.brightness / 100}) saturate(${1.3 + a.saturation / 100}) sepia(${0.25 + a.teal / 200}) hue-rotate(${10 + a.hue}deg) contrast(${1.05 + a.contrast / 100})`,
    overlay: "rgba(255,180,40,0.08)",
    fallbackDesc: "Warm amber tones with lifted highlights and golden hue shift for a magical golden hour glow.",
    fallbackAdj: ["Brightness +10%", "Saturation +30%", "Warm sepia +25%", "Hue shift +10°", "Soft contrast"],
    sliders: ["contrast", "saturation", "brightness", "teal", "hue"],
  },
  {
    id: "Cyberpunk", emoji: "🌆", desc: "Neon blues · Purple · High contrast", color: "#a040f0",
    cssFilter: (a) => `contrast(${1.35 + a.contrast / 100}) saturate(${1.4 + a.saturation / 100}) hue-rotate(${200 + a.hue}deg) brightness(${0.9 + a.brightness / 100})`,
    overlay: "rgba(100,40,200,0.08)",
    fallbackDesc: "Neon-soaked blues and purples with boosted contrast for a cyberpunk urban nightscape aesthetic.",
    fallbackAdj: ["Contrast +35%", "Saturation +40%", "Hue shift 200°", "Brightness −10%", "Neon overlay"],
    sliders: ["contrast", "saturation", "brightness", "hue"],
  },
  {
    id: "Matte", emoji: "🎨", desc: "Faded blacks · Flat · Editorial", color: "#90a0b0",
    cssFilter: (a) => `contrast(${0.85 + a.contrast / 100}) saturate(${0.8 + a.saturation / 100}) brightness(${1.08 + a.brightness / 100})`,
    overlay: "rgba(180,190,200,0.06)",
    fallbackDesc: "Lifted shadows with reduced contrast and muted tones for a modern matte editorial finish.",
    fallbackAdj: ["Contrast −15%", "Saturation −20%", "Brightness +8%", "Lifted blacks", "Flat tones"],
    sliders: ["contrast", "saturation", "brightness"],
  },
  {
    id: "Summer", emoji: "☀️", desc: "Bright · Warm · Saturated", color: "#f0d040",
    cssFilter: (a) => `brightness(${1.15 + a.brightness / 100}) saturate(${1.5 + a.saturation / 100}) contrast(${1.1 + a.contrast / 100}) hue-rotate(${5 + a.hue}deg)`,
    overlay: "rgba(255,220,50,0.05)",
    fallbackDesc: "Punchy brightness with warm saturation and lifted tones for a vibrant sun-drenched summer vibe.",
    fallbackAdj: ["Brightness +15%", "Saturation +50%", "Contrast +10%", "Warm hue shift", "Punchy tones"],
    sliders: ["contrast", "saturation", "brightness", "hue"],
  },
  {
    id: "Moody", emoji: "🌑", desc: "Dark · Desaturated · Dramatic", color: "#6070a0",
    cssFilter: (a) => `brightness(${0.8 + a.brightness / 100}) saturate(${0.6 + a.saturation / 100}) contrast(${1.2 + a.contrast / 100}) hue-rotate(${-15 + a.hue}deg)`,
    overlay: "rgba(30,40,80,0.12)",
    fallbackDesc: "Dark, desaturated tones with boosted contrast and cool shadow shift for a brooding moody atmosphere.",
    fallbackAdj: ["Brightness −20%", "Saturation −40%", "Contrast +20%", "Cool shadow shift", "Deep tones"],
    sliders: ["contrast", "saturation", "brightness", "hue"],
  },
];

const SLIDER_CONFIG = {
  contrast:   { label: "CONTRAST",    min: -30, max: 30 },
  saturation: { label: "SATURATION",  min: -40, max: 40 },
  brightness: { label: "BRIGHTNESS",  min: -20, max: 20 },
  teal:       { label: "TEAL / WARM", min: -20, max: 20 },
  hue:        { label: "HUE SHIFT",   min: -30, max: 30 },
};

const DEFAULT_ADJ = { contrast: 0, saturation: 0, brightness: 0, teal: 0, hue: 0 };

const ANIM = `
@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes dot { 0%,60%,100%{transform:translateY(0);opacity:0.3} 30%{transform:translateY(-4px);opacity:1} }
@keyframes glow { 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes slideIn { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
@keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
`;

// ─── Slider Component ─────────────────────────────────────────────────────────
const SliderRow = ({ label, value, min, max, onChange, color }) => (
  <div style={{ marginBottom: 13 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ fontSize: "0.68rem", color: "#888899", fontFamily: "monospace", letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontSize: "0.68rem", color: color || "#c8f060", fontFamily: "monospace", minWidth: 34, textAlign: "right" }}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
    <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
      <div style={{ position: "absolute", left: `${((value - min) / (max - min)) * 100}%`, top: "50%", transform: "translate(-50%,-50%)", width: 13, height: 13, borderRadius: "50%", background: color || "#c8f060", zIndex: 2 }} />
      <div style={{ position: "absolute", left: 0, width: `${((value - min) / (max - min)) * 100}%`, height: "100%", background: color || "#c8f060", borderRadius: 2, opacity: 0.4 }} />
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "100%", opacity: 0, cursor: "pointer", height: "44px", margin: 0, zIndex: 3 }} />
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function LuminaV3() {
  const [imageSrc, setImageSrc]       = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]       = useState(0);
  const [resultInfo, setResultInfo]   = useState(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [adj, setAdj]                 = useState(DEFAULT_ADJ);
  const [showAdj, setShowAdj]         = useState(false);
  const [savedPresets, setSavedPresets] = useState([]);
  const [toast, setToast]             = useState(null);
  const [activeTab, setActiveTab]     = useState("presets"); // "presets" | "saved"
  const fileRef = useRef(null);
  const ivRef   = useRef(null);

  const updateAdj = (key, val) => setAdj((prev) => ({ ...prev, [key]: val }));

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const currentFilter = useCallback(() => {
    if (!activePreset) return "";
    const preset = PRESETS.find((p) => p.id === activePreset);
    return preset ? preset.cssFilter(adj) : "";
  }, [activePreset, adj]);

  const currentOverlay = activePreset
    ? PRESETS.find((p) => p.id === activePreset)?.overlay
    : "transparent";

  const loadImage = useCallback((file) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setActivePreset(null); setResultInfo(null);
      setShowAdj(false); setAdj(DEFAULT_ADJ);
    };
    reader.readAsDataURL(file);
  }, []);

  const applyPreset = useCallback(async (presetId, customAdj = null) => {
    if (!imageBase64 || isProcessing) return;
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setIsProcessing(true);
    setShowAdj(false);
    const newAdj = customAdj || DEFAULT_ADJ;
    setAdj(newAdj);
    setProgress(0);
    ivRef.current = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 5, 88)), 150);

    // ⚠️ Replace with your Cloudflare Worker URL
    const WORKER_URL = "https://YOUR-CLOUDFLARE-WORKER-URL.workers.dev";

    const sys = `You are a professional photo enhancement expert. Respond ONLY with valid JSON no markdown:
{"description":"2-3 sentence enhancement description","adjustments":["adj1","adj2","adj3","adj4","adj5"]}`;

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600, system: sys,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: `Apply "${presetId}" preset.` },
          ]}],
        }),
      });
      const data = await res.json();
      const parsed = JSON.parse(data.content.map((i) => i.text || "").join("").replace(/```json|```/g, "").trim());
      clearInterval(ivRef.current); setProgress(100);
      setTimeout(() => setProgress(0), 500);
      setResultInfo({ preset, desc: parsed.description, adj: parsed.adjustments });
      setShowAdj(true);
    } catch {
      clearInterval(ivRef.current); setProgress(100);
      setTimeout(() => setProgress(0), 500);
      setResultInfo({ preset, desc: preset.fallbackDesc, adj: preset.fallbackAdj });
      setShowAdj(true);
    }
    setIsProcessing(false);
  }, [imageBase64, isProcessing]);

  // ── Export / Save Settings ──────────────────────────────────────────────────
  const saveCurrentSettings = () => {
    if (!activePreset) return;
    const preset = PRESETS.find((p) => p.id === activePreset);
    const name = `${activePreset} #${savedPresets.length + 1}`;
    const saved = {
      id: Date.now(),
      name,
      presetId: activePreset,
      emoji: preset.emoji,
      color: preset.color,
      adj: { ...adj },
      createdAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    };
    setSavedPresets((prev) => [saved, ...prev]);
    showToast(`✓ Saved as "${name}"`);
  };

  const deleteSavedPreset = (id) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
    showToast("Preset deleted");
  };

  const applySavedPreset = (saved) => {
    applyPreset(saved.presetId, saved.adj);
    setActiveTab("presets");
    showToast(`Applying "${saved.name}"`);
  };

  // ── Download ────────────────────────────────────────────────────────────────
  const downloadImage = () => {
    const canvas = document.createElement("canvas");
    const img = document.querySelector("img[alt='']");
    if (!img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.filter = img.style.filter || "none";
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.download = `lumina-${activePreset?.toLowerCase()}-${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
    showToast("📥 Photo saved to device");
  };

  const preset = activePreset ? PRESETS.find((p) => p.id === activePreset) : null;

  return (
    <>
      <style>{ANIM}</style>
      <div style={{ background: "#0a0a0c", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#e8e8f0", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", position: "relative" }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "#1a1a24", border: "1px solid rgba(192,240,96,0.25)", borderRadius: 100, padding: "8px 18px", fontSize: "0.75rem", color: "#c8f060", fontFamily: "monospace", letterSpacing: "0.1em", zIndex: 999, animation: "toastIn 0.3s ease", whiteSpace: "nowrap" }}>
            {toast}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.16em", color: "#c8f060", lineHeight: 1, textTransform: "uppercase" }}>Lumina</div>
            <div style={{ fontSize: "0.56rem", color: "#444455", letterSpacing: "0.2em", fontFamily: "monospace", marginTop: 2 }}>AI PHOTO ENHANCER</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#333344", background: "rgba(192,240,96,0.06)", border: "1px solid rgba(192,240,96,0.1)", borderRadius: 4, padding: "2px 6px" }}>v3.0</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(192,240,96,0.06)", border: "1px solid rgba(192,240,96,0.14)", borderRadius: 100, padding: "4px 9px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#c8f060", animation: "glow 2s infinite" }} />
              <span style={{ fontSize: "0.56rem", color: "#c8f060", fontFamily: "monospace", letterSpacing: "0.1em" }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── Image / Upload ── */}
        <div style={{ margin: "12px 14px 0", position: "relative" }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); loadImage(e.dataTransfer.files[0]); }}
            onClick={() => !imageSrc && fileRef.current?.click()}
            style={{ borderRadius: 14, overflow: "hidden", position: "relative", background: imageSrc ? "#000" : "#111116", border: `1px ${imageSrc ? "solid" : "dashed"} ${isDragging ? "#c8f060" : imageSrc ? "rgba(255,255,255,0.06)" : "rgba(192,240,96,0.18)"}`, minHeight: imageSrc ? 240 : 160, display: "flex", alignItems: "center", justifyContent: "center", cursor: imageSrc ? "default" : "pointer", transition: "all 0.3s" }}
          >
            {!imageSrc ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ width: 48, height: 48, border: "1px solid rgba(192,240,96,0.22)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="1.5" opacity="0.55">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div style={{ fontSize: "0.88rem", color: "#c8f060", fontWeight: 500, marginBottom: 4 }}>Tap to upload photo</div>
                <div style={{ fontSize: "0.68rem", color: "#333344" }}>JPG · PNG · WEBP</div>
              </div>
            ) : (
              <>
                <img src={imageSrc} alt="" style={{ width: "100%", minHeight: 240, objectFit: "cover", display: "block", filter: currentFilter(), transition: "filter 0.5s ease" }} />
                <div style={{ position: "absolute", inset: 0, background: currentOverlay, pointerEvents: "none", transition: "background 0.5s" }} />
                <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", top: 9, right: 9, background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 7, padding: "4px 10px", color: "#e8e8f0", fontSize: "0.62rem", fontFamily: "monospace", letterSpacing: "0.1em", cursor: "pointer" }}>CHANGE</button>
                {activePreset && !isProcessing && (
                  <div style={{ position: "absolute", top: 9, left: 9, background: "rgba(0,0,0,0.7)", border: `1px solid ${preset?.color}`, borderRadius: 7, padding: "3px 9px", fontSize: "0.6rem", fontFamily: "monospace", color: preset?.color, letterSpacing: "0.1em" }}>
                    {preset?.emoji} {activePreset.toUpperCase()}
                  </div>
                )}
              </>
            )}
            {progress > 0 && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#c8f060,#6070f0)", transition: "width 0.15s linear", borderRadius: 2 }} />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => loadImage(e.target.files[0])} />
        </div>

        {/* ── Processing ── */}
        {isProcessing && (
          <div style={{ margin: "10px 14px 0", background: "rgba(192,240,96,0.04)", border: "1px solid rgba(192,240,96,0.12)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 0.15, 0.3].map((d, i) => <span key={i} style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "#c8f060", animation: `dot 1.2s ${d}s infinite` }} />)}
            </div>
            <span style={{ fontSize: "0.74rem", color: "#777788" }}>Claude AI is analyzing your photo...</span>
          </div>
        )}

        {/* ── Result Card ── */}
        {resultInfo && !isProcessing && (
          <div style={{ margin: "10px 14px 0", background: "#111116", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px", animation: "fadeUp 0.35s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.95rem" }}>{resultInfo.preset.emoji}</span>
                <span style={{ fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.14em", color: resultInfo.preset.color, textTransform: "uppercase", fontWeight: 600 }}>{resultInfo.preset.id} Applied</span>
              </div>
            </div>
            <p style={{ fontSize: "0.76rem", color: "#777788", lineHeight: 1.7, margin: "0 0 8px" }}>{resultInfo.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {resultInfo.adj.map((a, i) => (
                <span key={i} style={{ fontFamily: "monospace", fontSize: "0.56rem", color: "#555566", background: "#1a1a22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 6px" }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Fine Tune Panel ── */}
        {showAdj && preset && (
          <div style={{ margin: "10px 14px 0", background: "#0e0e14", border: `1px solid ${preset.color}22`, borderRadius: 12, overflow: "hidden", animation: "fadeUp 0.4s ease" }}>
            <div style={{ padding: "10px 13px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={preset.color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                <span style={{ fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.16em", color: preset.color, textTransform: "uppercase" }}>Fine Tune</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setAdj(DEFAULT_ADJ)} style={{ fontFamily: "monospace", fontSize: "0.56rem", color: "#555566", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 7px", cursor: "pointer", letterSpacing: "0.08em" }}>RESET</button>
                <button onClick={saveCurrentSettings} style={{ fontFamily: "monospace", fontSize: "0.56rem", color: preset.color, background: `${preset.color}15`, border: `1px solid ${preset.color}40`, borderRadius: 5, padding: "2px 7px", cursor: "pointer", letterSpacing: "0.08em" }}>SAVE</button>
              </div>
            </div>
            <div style={{ padding: "12px 13px 4px" }}>
              {preset.sliders.map((key) => (
                <SliderRow
                  key={key}
                  label={SLIDER_CONFIG[key].label}
                  value={adj[key]}
                  min={SLIDER_CONFIG[key].min}
                  max={SLIDER_CONFIG[key].max}
                  onChange={(v) => updateAdj(key, v)}
                  color={preset.color}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Download + Reset ── */}
        {imageSrc && activePreset && !isProcessing && (
          <div style={{ margin: "10px 14px 0", display: "flex", gap: 7 }}>
            <button
              onClick={downloadImage}
              style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(192,240,96,0.3)", background: "rgba(192,240,96,0.06)", color: "#c8f060", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              DOWNLOAD
            </button>
            <button
              onClick={() => { setActivePreset(null); setResultInfo(null); setShowAdj(false); setAdj(DEFAULT_ADJ); }}
              style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "#555566", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.12em", cursor: "pointer" }}
            >
              RESET
            </button>
          </div>
        )}

        {/* ── Tabs: Presets / Saved ── */}
        <div style={{ margin: "16px 14px 0", display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["presets", "saved"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flex: 1, padding: "8px 0", fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", background: "transparent", border: "none", cursor: "pointer", color: activeTab === tab ? "#c8f060" : "#444455", borderBottom: `2px solid ${activeTab === tab ? "#c8f060" : "transparent"}`, transition: "all 0.2s" }}>
              {tab === "presets" ? `Styles (${PRESETS.length})` : `Saved (${savedPresets.length})`}
            </button>
          ))}
        </div>

        {/* ── Presets Tab ── */}
        {activeTab === "presets" && (
          <div style={{ margin: "12px 14px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {PRESETS.map((p) => (
              <button key={p.id}
                onClick={() => { if (!imageBase64) { fileRef.current?.click(); } else { applyPreset(p.id); } }}
                disabled={isProcessing}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px", borderRadius: 11, border: `1px solid ${activePreset === p.id ? p.color : "rgba(255,255,255,0.07)"}`, background: activePreset === p.id ? `${p.color}12` : "#111116", cursor: isProcessing ? "not-allowed" : "pointer", textAlign: "left", opacity: isProcessing && activePreset !== p.id ? 0.4 : 1, transition: "all 0.2s", WebkitTapHighlightColor: "transparent" }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize: "0.75rem", color: activePreset === p.id ? p.color : "#e8e8f0", fontWeight: 600, letterSpacing: "0.03em", lineHeight: 1, marginBottom: 2 }}>{p.id}</div>
                  <div style={{ fontSize: "0.58rem", color: "#444455", lineHeight: 1.3 }}>{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Saved Tab ── */}
        {activeTab === "saved" && (
          <div style={{ margin: "12px 14px 0" }}>
            {savedPresets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 20px", border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 12, color: "#333344" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>🎛️</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.15em", marginBottom: 6 }}>NO SAVED PRESETS</div>
                <div style={{ fontSize: "0.72rem", color: "#2a2a38", lineHeight: 1.6 }}>Apply a style, fine tune it,<br/>then tap SAVE to store it here.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {savedPresets.map((saved) => (
                  <div key={saved.id} style={{ background: "#111116", border: `1px solid ${saved.color}22`, borderRadius: 11, padding: "11px 13px", display: "flex", alignItems: "center", gap: 10, animation: "slideIn 0.3s ease" }}>
                    <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{saved.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.76rem", color: saved.color, fontWeight: 600, marginBottom: 2 }}>{saved.name}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {Object.entries(saved.adj).filter(([, v]) => v !== 0).map(([k, v]) => (
                          <span key={k} style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#444455", background: "#1a1a22", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 3, padding: "1px 5px" }}>
                            {SLIDER_CONFIG[k]?.label} {v > 0 ? `+${v}` : v}
                          </span>
                        ))}
                        {Object.values(saved.adj).every(v => v === 0) && (
                          <span style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#333344" }}>Default settings</span>
                        )}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#2a2a38", marginTop: 3 }}>{saved.createdAt}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <button onClick={() => applySavedPreset(saved)}
                        style={{ fontFamily: "monospace", fontSize: "0.55rem", color: saved.color, background: `${saved.color}12`, border: `1px solid ${saved.color}30`, borderRadius: 5, padding: "3px 8px", cursor: "pointer", letterSpacing: "0.08em" }}>
                        APPLY
                      </button>
                      <button onClick={() => deleteSavedPreset(saved.id)}
                        style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#444455", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "3px 8px", cursor: "pointer", letterSpacing: "0.08em" }}>
                        DEL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Privacy ── */}
        <div style={{ margin: "14px 14px 0", padding: "8px 12px", background: "rgba(192,240,96,0.02)", border: "1px solid rgba(192,240,96,0.07)", borderRadius: 10, display: "flex", gap: 6, alignItems: "flex-start" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2, opacity: 0.45 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span style={{ fontSize: "0.65rem", color: "#444455", lineHeight: 1.6 }}>
            Photos never stored. Cleared when you close the tab.
          </span>
        </div>

        {/* ── Footer ── */}
        <div style={{ margin: "14px 14px 0", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "0.72rem", fontWeight: 700, color: "#c8f060", letterSpacing: "0.12em", textTransform: "uppercase" }}>Lumina</span>
            <span style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#2a3a1a", background: "rgba(192,240,96,0.07)", border: "1px solid rgba(192,240,96,0.12)", borderRadius: 3, padding: "1px 5px" }}>v3.0</span>
            <span style={{ fontFamily: "monospace", fontSize: "0.52rem", color: "#2a2a38" }}>May 2026</span>
          </div>
          <span style={{ fontSize: "0.58rem", color: "#2a2a38", fontFamily: "monospace" }}>Powered by Claude AI</span>
        </div>

      </div>
    </>
  );
}
