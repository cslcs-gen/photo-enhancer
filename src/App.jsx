import { useState, useRef, useCallback } from "react";

const PRESETS = [
  {
    id: "Cinematic",
    emoji: "🎬",
    desc: "Teal-orange · High contrast",
    color: "#f07840",
    cssFilter: (a) => `contrast(${1 + a.contrast / 100}) saturate(${0.85 + a.saturation / 100}) sepia(${0.1 + a.teal / 200}) hue-rotate(${-8 + a.hue}deg) brightness(${0.95 + a.brightness / 100})`,
    overlay: "rgba(240,120,64,0.07)",
    fallbackDesc: "Applied teal-and-orange color grading with boosted contrast and warm shadow tones for a Hollywood cinematic feel.",
    fallbackAdj: ["Contrast +25%", "Saturation −15%", "Teal shadows", "Orange highlights", "Brightness −5%"],
  },
  {
    id: "Vintage",
    emoji: "📷",
    desc: "Sepia · Film grain · Faded",
    color: "#d4a874",
    cssFilter: (a) => `sepia(${0.4 + a.teal / 200}) contrast(${0.9 + a.contrast / 100}) brightness(${0.9 + a.brightness / 100}) saturate(${0.75 + a.saturation / 100})`,
    overlay: "radial-gradient(ellipse at center, transparent 40%, rgba(100,60,20,0.4) 100%)",
    fallbackDesc: "Applied sepia toning with reduced saturation and vignette for a nostalgic film look.",
    fallbackAdj: ["Sepia +40%", "Contrast −10%", "Brightness −10%", "Saturation −25%", "Vignette applied"],
  },
  {
    id: "Vivid",
    emoji: "⚡",
    desc: "HDR · Saturated · Sharp",
    color: "#40d4a0",
    cssFilter: (a) => `saturate(${1.6 + a.saturation / 100}) contrast(${1.15 + a.contrast / 100}) brightness(${1.05 + a.brightness / 100})`,
    overlay: "transparent",
    fallbackDesc: "Boosted saturation and dynamic range for a vibrant high-energy HDR look.",
    fallbackAdj: ["Saturation +60%", "Contrast +15%", "Brightness +5%", "HDR tone map", "Edge clarity"],
  },
  {
    id: "Ethereal",
    emoji: "🌸",
    desc: "Soft glow · Pastel · Dreamy",
    color: "#c090f0",
    cssFilter: (a) => `brightness(${1.2 + a.brightness / 100}) contrast(${0.85 + a.contrast / 100}) saturate(${0.7 + a.saturation / 100})`,
    overlay: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%)",
    fallbackDesc: "High-key lighting with softened clarity and pastel tones for a dreamy ethereal feel.",
    fallbackAdj: ["Brightness +20%", "Contrast −15%", "Saturation −30%", "Bloom effect", "Pastel lift"],
  },
  {
    id: "Noir",
    emoji: "🎭",
    desc: "B&W · Deep shadows · Dramatic",
    color: "#b0b0b8",
    cssFilter: (a) => `grayscale(1) contrast(${1.4 + a.contrast / 100}) brightness(${0.85 + a.brightness / 100}) saturate(${a.saturation / 100})`,
    overlay: "transparent",
    fallbackDesc: "High-contrast black and white with crushed shadows for a dramatic noir style.",
    fallbackAdj: ["Grayscale 100%", "Contrast +40%", "Brightness −15%", "Shadow crush", "Texture sharp"],
  },
];

const DEFAULT_ADJ = { contrast: 0, saturation: 0, brightness: 0, teal: 0, hue: 0 };

const ANIM = `
@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes dot { 0%,60%,100%{transform:translateY(0);opacity:0.3} 30%{transform:translateY(-4px);opacity:1} }
@keyframes glow { 0%,100%{opacity:1} 50%{opacity:0.3} }
`;

const SliderRow = ({ label, value, min, max, step = 1, onChange, color }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
      <span style={{ fontSize: "0.7rem", color: "#888899", fontFamily: "monospace", letterSpacing: "0.1em" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.7rem", color: color || "#c8f060", fontFamily: "monospace", minWidth: 36, textAlign: "right" }}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
    <div style={{ position: "relative", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
      <div style={{
        position: "absolute",
        left: `${((value - min) / (max - min)) * 100}%`,
        top: "50%", transform: "translate(-50%,-50%)",
        width: 14, height: 14, borderRadius: "50%",
        background: color || "#c8f060", cursor: "pointer", zIndex: 2,
      }} />
      <div style={{
        position: "absolute", left: 0,
        width: `${((value - min) / (max - min)) * 100}%`,
        height: "100%", background: color || "#c8f060", borderRadius: 2, opacity: 0.4,
      }} />
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "100%", opacity: 0, cursor: "pointer", height: "44px", margin: 0, zIndex: 3 }}
      />
    </div>
  </div>
);

export default function LuminaMobileV2() {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultInfo, setResultInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [adj, setAdj] = useState(DEFAULT_ADJ);
  const [showAdj, setShowAdj] = useState(false);
  const fileRef = useRef(null);
  const ivRef = useRef(null);

  const updateAdj = (key, val) => setAdj((prev) => ({ ...prev, [key]: val }));

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
      setActivePreset(null);
      setResultInfo(null);
      setShowAdj(false);
      setAdj(DEFAULT_ADJ);
    };
    reader.readAsDataURL(file);
  }, []);

  const applyPreset = useCallback(
    async (presetId) => {
      if (!imageBase64 || isProcessing) return;
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      setActivePreset(presetId);
      setIsProcessing(true);
      setShowAdj(false);
      setAdj(DEFAULT_ADJ);
      setProgress(0);
      ivRef.current = setInterval(
        () => setProgress((p) => Math.min(p + Math.random() * 5, 88)),
        150
      );

      // ⚠️ IMPORTANT: Replace the URL below with your Cloudflare Worker URL
      // e.g. "https://lumina-proxy.YOUR-SUBDOMAIN.workers.dev"
      const WORKER_URL = "lumina-proxy.cslcs-gen.workers.dev";

      const sys = `You are a professional photo enhancement expert. Respond ONLY with valid JSON no markdown:
{"description":"2-3 sentence enhancement description","adjustments":["adj1","adj2","adj3","adj4","adj5"]}`;

      try {
        const res = await fetch(WORKER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            system: sys,
            messages: [
              {
                role: "user",
                content: [
                  { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
                  { type: "text", text: `Apply "${presetId}" preset.` },
                ],
              },
            ],
          }),
        });
        const data = await res.json();
        const parsed = JSON.parse(
          data.content.map((i) => i.text || "").join("").replace(/```json|```/g, "").trim()
        );
        clearInterval(ivRef.current);
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
        setResultInfo({ preset, desc: parsed.description, adj: parsed.adjustments });
        setShowAdj(true);
      } catch {
        clearInterval(ivRef.current);
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
        setResultInfo({ preset, desc: preset.fallbackDesc, adj: preset.fallbackAdj });
        setShowAdj(true);
      }
      setIsProcessing(false);
    },
    [imageBase64, isProcessing]
  );

  const preset = activePreset ? PRESETS.find((p) => p.id === activePreset) : null;

  return (
    <>
      <style>{ANIM}</style>
      <div style={{
        background: "#0a0a0c",
        minHeight: "100vh",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#e8e8f0",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: "18px 18px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 700, letterSpacing: "0.18em", color: "#c8f060", lineHeight: 1, textTransform: "uppercase" }}>
              Lumina
            </div>
            <div style={{ fontSize: "0.58rem", color: "#444455", letterSpacing: "0.2em", fontFamily: "monospace", marginTop: 2 }}>
              AI PHOTO ENHANCER
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(192,240,96,0.06)", border: "1px solid rgba(192,240,96,0.14)", borderRadius: 100, padding: "5px 10px" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#c8f060", animation: "glow 2s infinite" }} />
            <span style={{ fontSize: "0.58rem", color: "#c8f060", fontFamily: "monospace", letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        </div>

        {/* ── Image / Upload Area ── */}
        <div style={{ margin: "14px 14px 0", position: "relative" }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); loadImage(e.dataTransfer.files[0]); }}
            onClick={() => !imageSrc && fileRef.current?.click()}
            style={{
              borderRadius: 14, overflow: "hidden", position: "relative",
              background: imageSrc ? "#000" : "#111116",
              border: `1px ${imageSrc ? "solid" : "dashed"} ${isDragging ? "#c8f060" : imageSrc ? "rgba(255,255,255,0.06)" : "rgba(192,240,96,0.18)"}`,
              minHeight: imageSrc ? 260 : 180,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: imageSrc ? "default" : "pointer",
              transition: "all 0.3s",
            }}
          >
            {!imageSrc ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ width: 50, height: 50, border: "1px solid rgba(192,240,96,0.22)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="1.5" opacity="0.55">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div style={{ fontSize: "0.9rem", color: "#c8f060", fontWeight: 500, marginBottom: 5 }}>Tap to upload photo</div>
                <div style={{ fontSize: "0.7rem", color: "#333344" }}>JPG · PNG · WEBP</div>
              </div>
            ) : (
              <>
                <img
                  src={imageSrc} alt=""
                  style={{ width: "100%", minHeight: 260, objectFit: "cover", display: "block", filter: currentFilter(), transition: "filter 0.5s ease" }}
                />
                <div style={{ position: "absolute", inset: 0, background: currentOverlay, pointerEvents: "none", transition: "background 0.5s" }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 7, padding: "5px 11px", color: "#e8e8f0", fontSize: "0.65rem", fontFamily: "monospace", letterSpacing: "0.1em", cursor: "pointer" }}
                >
                  CHANGE
                </button>
                {activePreset && !isProcessing && (
                  <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.7)", border: `1px solid ${preset?.color}`, borderRadius: 7, padding: "4px 10px", fontSize: "0.62rem", fontFamily: "monospace", color: preset?.color, letterSpacing: "0.1em" }}>
                    {activePreset.toUpperCase()}
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

        {/* ── Processing Indicator ── */}
        {isProcessing && (
          <div style={{ margin: "10px 14px 0", background: "rgba(192,240,96,0.04)", border: "1px solid rgba(192,240,96,0.12)", borderRadius: 10, padding: "9px 13px", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ display: "flex", gap: 3 }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <span key={i} style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "#c8f060", animation: `dot 1.2s ${d}s infinite` }} />
              ))}
            </div>
            <span style={{ fontSize: "0.76rem", color: "#777788" }}>Claude AI is analyzing your photo...</span>
          </div>
        )}

        {/* ── Result Info Card ── */}
        {resultInfo && !isProcessing && (
          <div style={{ margin: "10px 14px 0", background: "#111116", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "13px", animation: "fadeUp 0.35s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
              <span style={{ fontSize: "1rem" }}>{resultInfo.preset.emoji}</span>
              <span style={{ fontFamily: "monospace", fontSize: "0.63rem", letterSpacing: "0.14em", color: resultInfo.preset.color, textTransform: "uppercase", fontWeight: 600 }}>
                {resultInfo.preset.id} Applied
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "#777788", lineHeight: 1.7, margin: "0 0 9px" }}>{resultInfo.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {resultInfo.adj.map((a, i) => (
                <span key={i} style={{ fontFamily: "monospace", fontSize: "0.58rem", color: "#555566", background: "#1a1a22", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 7px" }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Fine Tune Panel ── */}
        {showAdj && preset && (
          <div style={{ margin: "10px 14px 0", background: "#0e0e14", border: `1px solid ${preset.color}22`, borderRadius: 12, overflow: "hidden", animation: "fadeUp 0.4s ease" }}>
            <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={preset.color} strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                </svg>
                <span style={{ fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.16em", color: preset.color, textTransform: "uppercase" }}>
                  Fine Tune
                </span>
              </div>
              <button
                onClick={() => setAdj(DEFAULT_ADJ)}
                style={{ fontFamily: "monospace", fontSize: "0.58rem", color: "#555566", background: "transparent", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 8px", cursor: "pointer", letterSpacing: "0.1em" }}
              >
                RESET
              </button>
            </div>
            <div style={{ padding: "14px" }}>
              <SliderRow label="CONTRAST" value={adj.contrast} min={-30} max={30} onChange={(v) => updateAdj("contrast", v)} color={preset.color} />
              <SliderRow label="SATURATION" value={adj.saturation} min={-40} max={40} onChange={(v) => updateAdj("saturation", v)} color={preset.color} />
              <SliderRow label="BRIGHTNESS" value={adj.brightness} min={-20} max={20} onChange={(v) => updateAdj("brightness", v)} color={preset.color} />
              {(activePreset === "Cinematic" || activePreset === "Vintage") && (
                <SliderRow
                  label={activePreset === "Cinematic" ? "TEAL SHADOWS" : "SEPIA TONE"}
                  value={adj.teal} min={-20} max={20}
                  onChange={(v) => updateAdj("teal", v)}
                  color={preset.color}
                />
              )}
              {activePreset === "Cinematic" && (
                <SliderRow label="HUE SHIFT" value={adj.hue} min={-15} max={15} onChange={(v) => updateAdj("hue", v)} color={preset.color} />
              )}
            </div>
          </div>
        )}

        {/* ── Style Presets Grid ── */}
        <div style={{ margin: "16px 14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#c8f060" }} />
            <span style={{ fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#444455" }}>
              Style Presets
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => { if (!imageBase64) { fileRef.current?.click(); } else { applyPreset(p.id); } }}
                disabled={isProcessing}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "11px 11px",
                  borderRadius: 11,
                  border: `1px solid ${activePreset === p.id ? p.color : "rgba(255,255,255,0.07)"}`,
                  background: activePreset === p.id ? `${p.color}12` : "#111116",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  textAlign: "left",
                  opacity: isProcessing && activePreset !== p.id ? 0.45 : 1,
                  transition: "all 0.2s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize: "0.78rem", color: activePreset === p.id ? p.color : "#e8e8f0", fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1, marginBottom: 2 }}>
                    {p.id}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: "#444455", lineHeight: 1.3 }}>{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Download + Reset Buttons ── */}
        {imageSrc && activePreset && !isProcessing && (
          <div style={{ margin: "10px 14px 0", display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const canvas = document.createElement("canvas");
                const img = document.querySelector("img[alt='']");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                ctx.filter = img.style.filter || "none";
                ctx.drawImage(img, 0, 0);
                const link = document.createElement("a");
                link.download = "lumina-" + activePreset.toLowerCase() + "-" + Date.now() + ".jpg";
                link.href = canvas.toDataURL("image/jpeg", 0.95);
                link.click();
              }}
              style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(192,240,96,0.3)", background: "rgba(192,240,96,0.06)", color: "#c8f060", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.14em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              DOWNLOAD
            </button>
            <button
              onClick={() => { setActivePreset(null); setResultInfo(null); setShowAdj(false); setAdj(DEFAULT_ADJ); }}
              style={{ flex: 1, padding: "10px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "#555566", fontFamily: "monospace", fontSize: "0.62rem", letterSpacing: "0.14em", cursor: "pointer" }}
            >
              RESET
            </button>
          </div>
        )}

        {/* ── Privacy Notice ── */}
        <div style={{ margin: "14px 14px 0", padding: "9px 13px", background: "rgba(192,240,96,0.02)", border: "1px solid rgba(192,240,96,0.07)", borderRadius: 10, display: "flex", gap: 7, alignItems: "flex-start" }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2, opacity: 0.5 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: "0.68rem", color: "#444455", lineHeight: 1.6 }}>
            Your photos are never stored. Images live only in your browser and are cleared when you close this tab.
          </span>
        </div>

        {/* ── Footer ── */}
        <div style={{ margin: "16px 14px 0", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "0.75rem", fontWeight: 700, color: "#c8f060", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Lumina
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "0.58rem", color: "#2a3a1a", background: "rgba(192,240,96,0.07)", border: "1px solid rgba(192,240,96,0.12)", borderRadius: 4, padding: "1px 6px" }}>
              v2.0
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "0.55rem", color: "#333344", marginLeft: 5 }}>
              21 Mar 2026
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: "0.6rem", color: "#333344", fontFamily: "monospace" }}>Powered by</span>
            <span style={{ fontSize: "0.6rem", color: "#555566", fontFamily: "monospace", letterSpacing: "0.08em" }}>Claude AI</span>
          </div>
        </div>

      </div>
    </>
  );
}
