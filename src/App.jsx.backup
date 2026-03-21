import { useState, useRef, useCallback } from "react";

const PRESETS = [
  {
    id: "Cinematic",
    swatch: "linear-gradient(135deg, #1a2240, #c85020)",
    desc: "Teal-orange grade · Anamorphic flare",
    color: "#f07840",
    cssFilter: "contrast(1.25) saturate(0.85) sepia(0.1) hue-rotate(-8deg) brightness(0.95)",
    overlayClass: "rgba(240,120,64,0.07)",
    fallbackDesc: "Applied teal-and-orange color grading with boosted contrast and warm shadow tones for a Hollywood cinematic feel.",
    fallbackAdj: ["Contrast +25%", "Saturation −15%", "Teal shadow tint", "Orange highlight grade", "Brightness −5%"],
  },
  {
    id: "Vintage",
    swatch: "linear-gradient(135deg, #6b4e2a, #c9a87c)",
    desc: "Film grain · Sepia vignette · Faded",
    color: "#d4a874",
    cssFilter: "sepia(0.4) contrast(0.9) brightness(0.9) saturate(0.75)",
    overlayClass: "radial-gradient(ellipse at center, transparent 40%, rgba(100,60,20,0.4) 100%)",
    fallbackDesc: "Applied sepia toning with reduced saturation, softened contrast, and a classic vignette for a nostalgic film aesthetic.",
    fallbackAdj: ["Sepia +40%", "Contrast −10%", "Brightness −10%", "Saturation −25%", "Edge vignette applied"],
  },
  {
    id: "Vivid",
    swatch: "linear-gradient(135deg, #00d4aa, #6040ff)",
    desc: "HDR boost · Enhanced saturation",
    color: "#40d4a0",
    cssFilter: "saturate(1.6) contrast(1.15) brightness(1.05)",
    overlayClass: "transparent",
    fallbackDesc: "Boosted color saturation and dynamic range with enhanced contrast for a vibrant, high-energy HDR appearance.",
    fallbackAdj: ["Saturation +60%", "Contrast +15%", "Brightness +5%", "HDR tone mapping", "Edge clarity boost"],
  },
  {
    id: "Ethereal",
    swatch: "linear-gradient(135deg, #e0c8ff, #ffd8f0)",
    desc: "Soft glow · Pastel bloom · Dreamy",
    color: "#c090f0",
    cssFilter: "brightness(1.2) contrast(0.85) saturate(0.7)",
    overlayClass: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 70%)",
    fallbackDesc: "Applied high-key lighting with softened clarity, reduced saturation, and a dreamy bloom effect for an ethereal quality.",
    fallbackAdj: ["Brightness +20%", "Contrast −15%", "Saturation −30%", "Soft bloom applied", "Pastel highlight lift"],
  },
  {
    id: "Noir",
    swatch: "linear-gradient(135deg, #000, #888)",
    desc: "High-contrast B&W · Deep shadows",
    color: "#b0b0b8",
    cssFilter: "grayscale(1) contrast(1.4) brightness(0.85)",
    overlayClass: "transparent",
    fallbackDesc: "Converted to high-contrast black and white with deep shadow retention and sharp texture emphasis for a dramatic noir style.",
    fallbackAdj: ["Grayscale 100%", "Contrast +40%", "Brightness −15%", "Shadow crush", "Texture sharpening"],
  },
];

const DOT_PULSE = `
@keyframes dotPulse {
  0%,60%,100%{transform:translateY(0);opacity:0.3}
  30%{transform:translateY(-4px);opacity:1}
}
@keyframes msgIn {
  from{opacity:0;transform:translateY(6px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes pulseGlow {
  0%,100%{opacity:1}
  50%{opacity:0.3}
}
`;

export default function LuminaApp() {
  const [imageBase64, setImageBase64] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [cssFilter, setCssFilter] = useState("");
  const [overlayStyle, setOverlayStyle] = useState("transparent");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState([
    { type: "system", text: 'Upload a photo and select a preset, or type "Apply Cinematic" to enhance your image with AI.' },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [resultInfo, setResultInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const fileRef = useRef(null);
  const chatRef = useRef(null);

  const addMsg = useCallback((type, text) => {
    setMessages(prev => [...prev, { type, text, id: Date.now() }]);
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 50);
  }, []);

  const loadImage = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setCssFilter(""); setOverlayStyle("transparent");
      setActivePreset(null); setResultInfo(null);
      addMsg("system", `Photo loaded: <b>${file.name}</b>. Select a preset to enhance.`);
    };
    reader.readAsDataURL(file);
  }, [addMsg]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    loadImage(e.dataTransfer.files[0]);
  }, [loadImage]);

  const startProgress = () => {
    setShowProgress(true); setProgress(0);
    let p = 0;
    const iv = setInterval(() => { p = Math.min(p + Math.random() * 4, 85); setProgress(p); }, 120);
    return iv;
  };

  const stopProgress = (iv) => {
    clearInterval(iv); setProgress(100);
    setTimeout(() => { setShowProgress(false); setProgress(0); }, 500);
  };

  const applyPreset = useCallback(async (presetId) => {
    if (!imageBase64 || isProcessing) return;
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId); setIsProcessing(true);
    setMessages(prev => [...prev, { type: "thinking", id: "thinking" }]);
    const iv = startProgress();

    const systemPrompt = `You are a professional AI photo enhancement expert. Analyze the image and style keyword, respond ONLY with valid JSON (no markdown):
{"description":"2-3 sentence description","adjustments":["adj1","adj2","adj3","adj4","adj5"],"cssFilter":"valid CSS filter string"}
CSS hints: Cinematic="contrast(1.25) saturate(0.85) sepia(0.1) hue-rotate(-8deg) brightness(0.95)", Vintage="sepia(0.4) contrast(0.9) brightness(0.9) saturate(0.75)", Vivid="saturate(1.6) contrast(1.15) brightness(1.05)", Ethereal="brightness(1.2) contrast(0.85) saturate(0.7)", Noir="grayscale(1) contrast(1.4) brightness(0.85)"`;

    try {
      const res = await fetch("https://lumina-proxy.cslcs-gen.workers.dev", {
      method: "POST",
      headers: {
                "Content-Type": "application/json",
              },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: `Apply the "${presetId}" preset to this photo.` }
          ]}]
        })
      });
      const data = await res.json();
      const raw = data.content.map(i => i.text || "").join("").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      stopProgress(iv);
      setMessages(prev => prev.filter(m => m.id !== "thinking"));
      setCssFilter(parsed.cssFilter || preset.cssFilter);
      setOverlayStyle(preset.overlayClass);
      setResultInfo({ preset, desc: parsed.description, adj: parsed.adjustments });
      addMsg("ai", parsed.description);
    } catch {
      stopProgress(iv);
      setMessages(prev => prev.filter(m => m.id !== "thinking"));
      setCssFilter(preset.cssFilter); setOverlayStyle(preset.overlayClass);
      setResultInfo({ preset, desc: preset.fallbackDesc, adj: preset.fallbackAdj });
      addMsg("ai", preset.fallbackDesc);
    }
    setIsProcessing(false);
  }, [imageBase64, isProcessing, addMsg]);

  const sendMessage = () => {
    const t = chatInput.trim(); if (!t) return;
    const found = PRESETS.find(p => t.toLowerCase().includes(p.id.toLowerCase()));
    if (found) {
      setChatInput("");
      if (!imageBase64) { addMsg("system", "Please upload a photo first."); return; }
      applyPreset(found.id);
    } else if (t.toLowerCase().includes("reset")) {
      setChatInput(""); setCssFilter(""); setOverlayStyle("transparent");
      setActivePreset(null); setResultInfo(null);
      addMsg("ai", "Image reset to original.");
    } else {
      setChatInput("");
      addMsg("system", !imageBase64
        ? `Upload an image first, then try: "Apply Cinematic", "Apply Vintage", "Apply Vivid", "Apply Ethereal", or "Apply Noir".`
        : `Try: "Apply Cinematic", "Apply Vintage", "Apply Vivid", "Apply Ethereal", "Apply Noir", or "Reset".`);
    }
  };

  return (
    <>
      <style>{DOT_PULSE}</style>
      <div style={{ background:"#0a0a0c", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif", color:"#e8e8f0", position:"relative" }}>
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, backgroundImage:"linear-gradient(rgba(192,240,96,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(192,240,96,0.015) 1px,transparent 1px)", backgroundSize:"60px 60px" }} />
        <div style={{ position:"relative", zIndex:1, maxWidth:1060, margin:"0 auto", padding:"0 20px" }}>
          <header style={{ padding:"26px 0 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"2rem", letterSpacing:"0.15em", color:"#c8f060", lineHeight:1 }}>LUMINA</span>
              <span style={{ fontFamily:"monospace", fontSize:"0.6rem", color:"#666678", letterSpacing:"0.2em", textTransform:"uppercase" }}>AI Photo Enhancer</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#c8f060", boxShadow:"0 0 6px #c8f060", animation:"pulseGlow 2s infinite" }} />
              <div style={{ fontFamily:"monospace", fontSize:"0.63rem", color:"#666678", letterSpacing:"0.1em", border:"1px solid rgba(255,255,255,0.07)", padding:"5px 11px", borderRadius:100 }}>claude-sonnet-4</div>
            </div>
          </header>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 310px", gap:16, padding:"20px 0", minHeight:"calc(100vh - 100px)" }}>
            {/* Canvas */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <span style={{ fontFamily:"monospace", fontSize:"0.58rem", letterSpacing:"0.2em", color:"#666678", textTransform:"uppercase" }}>Canvas</span>
              <div
                onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
                onDragLeave={()=>setIsDragging(false)}
                onDrop={handleDrop}
                onClick={()=>!imageSrc&&fileRef.current?.click()}
                style={{ flex:1, minHeight:400, borderRadius:12, position:"relative", overflow:"hidden",
                  border:`1px ${imageSrc?"solid":"dashed"} ${isDragging?"#c8f060":imageSrc?"rgba(255,255,255,0.07)":"rgba(192,240,96,0.2)"}`,
                  background:isDragging?"rgba(192,240,96,0.04)":"#111116",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:imageSrc?"default":"pointer", transition:"all 0.3s" }}
              >
                {!imageSrc ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, pointerEvents:"none" }}>
                    <div style={{ width:58, height:58, border:"1px solid rgba(192,240,96,0.3)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c8f060" strokeWidth="1.5" opacity="0.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                    <div style={{ fontSize:"0.88rem", color:"#666678", textAlign:"center", lineHeight:1.7 }}>
                      <span style={{ color:"#c8f060", fontWeight:500 }}>Drop your photo here</span><br/>or click to browse
                    </div>
                    <div style={{ fontFamily:"monospace", fontSize:"0.57rem", color:"#666678", opacity:0.5, letterSpacing:"0.15em" }}>JPG · PNG · WEBP · HEIC</div>
                  </div>
                ) : (
                  <>
                    <img src={imageSrc} alt="Uploaded" style={{ width:"100%", height:"100%", objectFit:"contain", position:"absolute", inset:0, padding:12, filter:cssFilter, transition:"filter 0.6s ease" }} />
                    <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:overlayStyle, transition:"background 0.6s" }} />
                  </>
                )}
                {showProgress && (
                  <div style={{ position:"absolute", bottom:0, left:0, height:2, background:"linear-gradient(90deg,#c8f060,#6070f0)", width:`${progress}%`, transition:"width 0.1s linear", borderRadius:1 }} />
                )}
              </div>

              {resultInfo && (
                <div style={{ background:"#111116", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"13px 16px", animation:"msgIn 0.3s ease" }}>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontFamily:"monospace", fontSize:"0.63rem", letterSpacing:"0.12em", textTransform:"uppercase", padding:"3px 10px", borderRadius:100, marginBottom:8, border:`1px solid ${resultInfo.preset.color}`, color:resultInfo.preset.color }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background:resultInfo.preset.color, display:"inline-block" }} />
                    {resultInfo.preset.id.toUpperCase()}
                  </div>
                  <div style={{ fontSize:"0.82rem", color:"#888899", lineHeight:1.7, marginBottom:9 }}>{resultInfo.desc}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                    {resultInfo.adj.map((a,i)=>(
                      <span key={i} style={{ fontFamily:"monospace", fontSize:"0.58rem", color:"#666678", background:"#1a1a22", border:"1px solid rgba(255,255,255,0.07)", borderRadius:4, padding:"2px 7px" }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
              {/* Presets */}
              <div style={{ background:"#111116", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>
                <div style={{ padding:"12px 15px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#c8f060" }} />
                  <span style={{ fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.2em", textTransform:"uppercase", color:"#666678" }}>Style Presets</span>
                </div>
                <div style={{ padding:"11px", display:"flex", flexDirection:"column", gap:6 }}>
                  {PRESETS.map(preset=>(
                    <button key={preset.id}
                      onClick={()=>{ if(!imageBase64){fileRef.current?.click();return;} applyPreset(preset.id); }}
                      style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:8,
                        border:`1px solid ${activePreset===preset.id?preset.color:"rgba(255,255,255,0.07)"}`,
                        background:activePreset===preset.id?"rgba(255,255,255,0.04)":"transparent",
                        cursor:"pointer", textAlign:"left", width:"100%", transition:"all 0.2s", color:preset.color }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=preset.color;e.currentTarget.style.transform="translateX(2px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=activePreset===preset.id?preset.color:"rgba(255,255,255,0.07)";e.currentTarget.style.transform="none";}}
                    >
                      <div style={{ width:28, height:28, borderRadius:6, background:preset.swatch, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"0.95rem", letterSpacing:"0.08em", lineHeight:1, marginBottom:1 }}>{preset.id}</div>
                        <div style={{ fontSize:"0.65rem", color:"#666678", lineHeight:1.4 }}>{preset.desc}</div>
                      </div>
                      <span style={{ opacity:0.3 }}>›</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div style={{ background:"#111116", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden", flex:1, display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"12px 15px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:"#c8f060" }} />
                  <span style={{ fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.2em", textTransform:"uppercase", color:"#666678" }}>AI Assistant</span>
                </div>
                <div ref={chatRef} style={{ padding:"11px", display:"flex", flexDirection:"column", gap:7, overflowY:"auto", flex:1, maxHeight:210 }}>
                  {messages.map((msg,i)=>(
                    <div key={msg.id||i} style={{ fontSize:"0.78rem", lineHeight:1.6, padding:"8px 10px", borderRadius:8, animation:"msgIn 0.3s ease",
                      background:msg.type==="ai"?"rgba(192,240,96,0.06)":msg.type==="thinking"?"transparent":"#1a1a22",
                      border:msg.type==="ai"?"1px solid rgba(192,240,96,0.15)":msg.type==="thinking"?"none":"1px solid rgba(255,255,255,0.07)",
                      color:msg.type==="ai"?"#e8e8f0":"#888899" }}>
                      {msg.type==="thinking"?(
                        <div style={{ display:"flex", alignItems:"center", gap:8, color:"#666678" }}>
                          <span style={{ display:"flex", gap:3 }}>
                            {[0,0.2,0.4].map((d,j)=>(
                              <span key={j} style={{ display:"inline-block", width:4, height:4, borderRadius:"50%", background:"#c8f060", animation:`dotPulse 1.2s ${d}s infinite` }} />
                            ))}
                          </span>
                          Processing with AI...
                        </div>
                      ):(
                        <>
                          {msg.type==="ai"&&<div style={{ fontFamily:"monospace", fontSize:"0.56rem", letterSpacing:"0.15em", color:"#c8f060", marginBottom:3, textTransform:"uppercase" }}>✦ LUMINA AI</div>}
                          <span dangerouslySetInnerHTML={{ __html:msg.text }} />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ padding:"9px 11px", borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", gap:6 }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()}
                    placeholder={`"Apply Vivid"`}
                    style={{ flex:1, background:"#1a1a22", border:"1px solid rgba(255,255,255,0.07)", borderRadius:7, padding:"6px 10px", color:"#e8e8f0", fontFamily:"'DM Sans',sans-serif", fontSize:"0.76rem", outline:"none" }} />
                  <button onClick={sendMessage} disabled={isProcessing}
                    style={{ background:"#c8f060", color:"#0a0a0c", border:"none", borderRadius:7, padding:"6px 13px", fontFamily:"monospace", fontSize:"0.62rem", letterSpacing:"0.1em", cursor:isProcessing?"not-allowed":"pointer", opacity:isProcessing?0.4:1, fontWeight:600 }}>
                    SEND
                  </button>
                </div>
                <div style={{ padding:"0 11px 11px" }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>loadImage(e.target.files[0])} />
                  <button onClick={()=>fileRef.current?.click()}
                    style={{ width:"100%", padding:8, borderRadius:8, border:"1px dashed rgba(192,240,96,0.2)", background:"transparent", color:"#666678", fontFamily:"'DM Sans',sans-serif", fontSize:"0.74rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all 0.2s" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(192,240,96,0.5)";e.currentTarget.style.color="#c8f060";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(192,240,96,0.2)";e.currentTarget.style.color="#666678";}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {imageSrc?"Replace Photo":"Upload Photo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}