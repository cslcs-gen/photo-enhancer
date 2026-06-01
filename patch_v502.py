#!/usr/bin/env python3
import re, sys

with open('src/App.jsx', 'r') as f:
    code = f.read()

errors = []

# ── CHECK: starting point ────────────────────────────────────────────────────
if 'v5.01' not in code and 'v5.02' not in code:
    errors.append('Cannot find v5.01 or v5.02 - wrong file?')
    print('\n'.join(errors)); sys.exit(1)

# ── FIX 1: Remove any broken Fujifilm JSX ────────────────────────────────────
if 'FUJI{' in code:
    code = re.sub(r'FUJIFILM: \(\) => \(.*?\),', '', code, flags=re.DOTALL)
    print("✓ Removed broken Fujifilm block")
else:
    print("✓ No broken Fujifilm (already clean)")

# ── FIX 2: Remove Fujifilm from getBrand ─────────────────────────────────────
if 'm.includes("FUJI")' in code:
    code = code.replace('  if (m.includes("FUJI"))       return { name:"FUJIFILM",   display:"FUJIFILM",   color:"#CC0000", abbr:"F",  shape:"square" };\n', '')
    print("✓ Removed Fujifilm from getBrand")
else:
    print("✓ Fujifilm already removed from getBrand")

# ── FIX 3: Version to v5.02 ──────────────────────────────────────────────────
code = code.replace('"v5.01"', '"v5.02"')
code = code.replace("'v5.01'", "'v5.02'")
code = code.replace('>v5.01<', '>v5.02<')
print("✓ Version set to v5.02")

# ── FIX 4: Add minimalColor state if missing ─────────────────────────────────
if 'minimalColor' not in code:
    code = code.replace(
        '  const [showMeta, setShowMeta]           = useState(true);\n',
        '  const [showMeta, setShowMeta]           = useState(true);\n  const [minimalColor, setMinimalColor]   = useState("white");\n'
    )
    print("✓ Added minimalColor state")
else:
    print("✓ minimalColor already present")

# ── FIX 5: Add minimal dark/light sub-buttons if missing ─────────────────────
if 'Light strip' not in code and 'minimalColor' in code:
    code = code.replace(
        '                    {/* Toggles */}',
        '                    {/* Minimal sub-options */}\n                    {frameTheme === "minimal" && (\n                      <div style={{ display:"flex", gap:6, marginBottom:8 }}>\n                        {[["white","☀️ Light strip"],["black","🌑 Dark strip"]].map(([col,label]) => (\n                          <button key={col} onClick={() => setMinimalColor(col)}\n                            style={{ flex:1, padding:"6px 4px", borderRadius:7, border:`1px solid ${minimalColor===col?"rgba(192,240,96,0.5)":"rgba(255,255,255,0.05)"}`, background:minimalColor===col?"rgba(192,240,96,0.06)":"transparent", color:minimalColor===col?"#c8f060":"#444455", fontFamily:"monospace", fontSize:"0.5rem", cursor:"pointer" }}>\n                            {label}\n                          </button>\n                        ))}\n                      </div>\n                    )}\n                    {/* Toggles */}'
    )
    print("✓ Added minimal light/dark sub-options")
else:
    print("✓ Minimal sub-options already present or skipped")

# ── FIX 6: Add custom logo + manual edit states if missing ───────────────────
if 'customLogoSrc' not in code:
    code = code.replace(
        '  const presetFileRef                     = useRef(null);',
        '  const [customLogoSrc, setCustomLogoSrc] = useState(null);\n  const [manualModel, setManualModel]     = useState("");\n  const [manualMeta, setManualMeta]       = useState("");\n  const [showManualEdit, setShowManualEdit] = useState(false);\n  const presetFileRef                     = useRef(null);\n  const logoFileRef                       = useRef(null);'
    )
    print("✓ Added custom logo + manual edit states")
else:
    print("✓ Custom logo states already present")

# ── FIX 7: Brighter version number ───────────────────────────────────────────
code = code.replace(
    'color:"#2a3a1a", background:"rgba(192,240,96,0.06)", border:"1px solid rgba(192,240,96,0.1)"',
    'color:"#c8f060", background:"rgba(192,240,96,0.12)", border:"1px solid rgba(192,240,96,0.3)"'
)
print("✓ Version number brighter")

# ── SAVE ─────────────────────────────────────────────────────────────────────
with open('src/App.jsx', 'w') as f:
    f.write(code)

print("\n✅ All patches applied!")
print(f"   Version: v5.02: {'v5.02' in code}")
print(f"   FUJI{{: {'FUJI{' in code} (should be False)")
print(f"   minimalColor: {'minimalColor' in code}")
print(f"   customLogoSrc: {'customLogoSrc' in code}")
print(f"   File size: {len(code):,} chars")
