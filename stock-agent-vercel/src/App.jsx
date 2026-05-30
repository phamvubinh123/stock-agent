import { useState, useRef, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000/api";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const AI_SYSTEM = `Bạn là AI Agent phân tích chứng khoán Việt Nam theo phong cách lướt sóng ngắn hạn (vài ngày - vài tuần), kết hợp cả kỹ thuật lẫn cơ bản.

Bạn phải chấm điểm theo BỘ TIÊU CHÍ MUA sau đây của người dùng:

=== NHÓM 1 — NỀN CƠ BẢN (lọc đầu vào) ===
[CB1] ROE ≥ 15%
[CB2] Tăng trưởng lợi nhuận dương ít nhất 2 quý gần nhất
[CB3] Nợ/Vốn chủ (D/E) ≤ 1.0x
[CB4] Thanh khoản: Vol TB 20 phiên ≥ 500,000 CP/ngày

=== NHÓM 2 — KỸ THUẬT (cần ≥ 3/5) ===
[KT1] Giá trên MA20 VÀ MA20 trên MA50
[KT2] RSI(14) trong vùng 40–65
[KT3] MACD cắt lên signal hoặc histogram dương
[KT4] Volume phiên breakout ≥ 150% TB 20 phiên
[KT5] Giá bật từ BB mid trở lên, chưa chạm BB upper

=== NHÓM 3 — DÒNG TIỀN & TÂM LÝ ===
[DT1] Khối ngoại mua ròng ≥ 3 phiên hoặc net buy tuần dương
[DT2] Cùng ngành đang được dòng tiền chú ý
[DT3] VN-Index không trong downtrend rõ ràng

=== NHÓM 4 — QUẢN LÝ RỦI RO (bắt buộc) ===
Stop loss: -7% đến -10% từ giá mua
Take profit: +15% đến +20%
Risk/Reward tối thiểu 1:2
Tỷ trọng tối đa 20-25% NAV/mã

Trả về JSON sau (CHỈ JSON, không markdown, không text thừa):
{
  "ticker": "VNM",
  "companyName": "Tên công ty",
  "sector": "Ngành",
  "recommendation": "MUA" | "GIỮ" | "BÁN",
  "confidenceScore": 75,
  "currentPrice": "73,500",
  "targetPrice": "82,000",
  "stopLoss": "68,000",
  "upside": "+11.6%",
  "summary": "Tóm tắt 2-3 câu lý do MUA/GIỮ/BÁN dựa trên checklist",
  "checklist": {
    "CB1_roe":        { "pass": true,  "value": "ROE 28%",         "note": "Đạt" },
    "CB2_profit":     { "pass": true,  "value": "Q1+12% Q4+8%",    "note": "2 quý dương" },
    "CB3_debt":       { "pass": true,  "value": "D/E 0.23x",       "note": "Nợ thấp" },
    "CB4_liquidity":  { "pass": true,  "value": "1.4M CP/ngày",    "note": "Thanh khoản tốt" },
    "KT1_trend":      { "pass": true,  "value": "Giá > MA20 > MA50","note": "Uptrend" },
    "KT2_rsi":        { "pass": true,  "value": "RSI 58",          "note": "Vùng an toàn" },
    "KT3_macd":       { "pass": false, "value": "MACD -0.2",       "note": "Chưa cắt lên" },
    "KT4_volume":     { "pass": true,  "value": "Vol 180% TB",     "note": "Breakout xác nhận" },
    "KT5_bb":         { "pass": true,  "value": "Giá trên BB mid", "note": "Tích cực" },
    "DT1_foreign":    { "pass": true,  "value": "Mua ròng 4 phiên","note": "Khối ngoại vào" },
    "DT2_sector":     { "pass": true,  "value": "Ngành FMCG tốt",  "note": "Dòng tiền vào ngành" },
    "DT3_vnindex":    { "pass": true,  "value": "VN-Index tăng",   "note": "Thị trường thuận" }
  },
  "checklistSummary": {
    "fundamentalPass": 4,
    "fundamentalTotal": 4,
    "technicalPass": 4,
    "technicalTotal": 5,
    "sentimentPass": 3,
    "sentimentTotal": 3
  },
  "riskManagement": {
    "entryPrice": "73,500",
    "stopLoss": "66,150",
    "takeProfit": "84,500",
    "riskReward": "1:2.3",
    "suggestedAllocation": "20%"
  },
  "technicalAnalysis": {
    "trend": "TĂNG",
    "rsi": "58 - Vùng an toàn",
    "macd": "Chưa cắt lên signal",
    "support": "70,000",
    "resistance": "78,000",
    "volume": "Breakout xác nhận",
    "signal": "Tích cực"
  },
  "fundamentalAnalysis": {
    "pe": "18.5x",
    "pb": "4.2x",
    "roe": "28%",
    "revenueGrowth": "+12% YoY",
    "profitGrowth": "+8% YoY",
    "debtRatio": "0.23x",
    "dividend": "2,000đ (2.4%)",
    "signal": "Tốt"
  },
  "sentimentAnalysis": {
    "newsScore": "Tích cực",
    "recentNews": ["tin 1", "tin 2"],
    "institutionalFlow": "Mua ròng 4 phiên liên tiếp",
    "signal": "Tích cực"
  },
  "risks": ["rủi ro 1", "rủi ro 2"],
  "catalysts": ["động lực 1", "động lực 2"]
}

Quy tắc recommendation:
- MUA: Tất cả CB pass + ≥3/5 KT pass + ≥2/3 DT pass
- BÁN: ≥2 CB fail HOẶC ≤1/5 KT pass
- GIỮ: Các trường hợp còn lại`;

const REC_COLORS = {
  "MUA": { main:"#00C48C", bg:"#00C48C15", border:"#00C48C40" },
  "GIỮ": { main:"#F5A623", bg:"#F5A62315", border:"#F5A62340" },
  "BÁN": { main:"#FF4B5C", bg:"#FF4B5C15", border:"#FF4B5C40" },
};
const POPULAR = ["VNM","FPT","VCB","HPG","VHM","TCB","MWG","VIC","ACB","BID"];

function ScoreRing({ score }) {
  const r = 28, c = 2 * Math.PI * r, offset = c - (score / 100) * c;
  const color = score >= 70 ? "#00C48C" : score >= 50 ? "#F5A623" : "#FF4B5C";
  return (
    <div style={{ position:"relative", width:80, height:80 }}>
      <svg width="80" height="80" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e2535" strokeWidth="6"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition:"stroke-dashoffset 1s ease", strokeLinecap:"round" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:20, fontWeight:800, color, fontFamily:"'DM Mono',monospace" }}>{score}</span>
        <span style={{ fontSize:9, color:"#5a6480", letterSpacing:1 }}>ĐIỂM</span>
      </div>
    </div>
  );
}

function AnalysisCard({ title, icon, data }) {
  const sigColor = { "Tích cực":"#00C48C","Tốt":"#00C48C","Trung tính":"#F5A623","Trung bình":"#F5A623","Tiêu cực":"#FF4B5C","Yếu":"#FF4B5C" }[data?.signal] || "#F5A623";
  return (
    <div style={{ background:"#111827", borderRadius:16, padding:20, border:"1px solid #1e2535" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>{icon}</span>
          <span style={{ fontWeight:700, fontSize:12, color:"#e2e8f0", letterSpacing:1, textTransform:"uppercase" }}>{title}</span>
        </div>
        {data?.signal && <span style={{ background:sigColor+"22", color:sigColor, padding:"3px 12px", borderRadius:20, fontSize:11, fontWeight:700 }}>{data.signal}</span>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {Object.entries(data || {}).filter(([k]) => k !== "signal" && k !== "recentNews").map(([k, v]) => (
          <div key={k} style={{ background:"#0d1117", borderRadius:10, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:"#5a6480", textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>{k}</div>
            <div style={{ fontSize:12, color:"#cbd5e1", fontWeight:600 }}>{String(v)}</div>
          </div>
        ))}
      </div>
      {data?.recentNews?.length > 0 && (
        <div style={{ marginTop:12 }}>
          {data.recentNews.map((n,i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
              <span style={{ color:"#00C48C", fontSize:10, marginTop:2, flexShrink:0 }}>◆</span>
              <span style={{ fontSize:12, color:"#94a3b8", lineHeight:1.5 }}>{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniChart({ history }) {
  if (!history?.length) return null;
  const prices = history.map(d => d.close).filter(Boolean);
  if (prices.length < 2) return null;
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const W = 300, H = 60;
  const pts = prices.slice(-60).map((p,i,arr) => {
    const x = (i/(arr.length-1))*W;
    const y = H - ((p-min)/range)*H;
    return `${x},${y}`;
  }).join(" ");
  const color = prices[prices.length-1] >= prices[0] ? "#00C48C" : "#FF4B5C";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:60 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StatusBadge({ status, message }) {
  const colors = { loading:"#F5A623", success:"#00C48C", error:"#FF4B5C", idle:"#5a6480" };
  const color = colors[status] || colors.idle;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      {status === "loading"
        ? <div style={{ width:7, height:7, borderRadius:"50%", border:`2px solid ${color}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }}/>
        : <div style={{ width:7, height:7, borderRadius:"50%", background:color, boxShadow:status==="success"?`0 0 8px ${color}`:undefined }}/>
      }
      <span style={{ fontSize:11, color, fontWeight:600 }}>{message}</span>
    </div>
  );
}

export default function StockAgent() {
  const [query, setQuery]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [apiStatus, setApiStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState("Sẵn sàng");
  const [result, setResult]       = useState(null);
  const [rawData, setRawData]     = useState(null);
  const [chartData, setChartData] = useState(null);
  const [error, setError]         = useState(null);
  const [history, setHistory]     = useState([]);
  const [activeTab, setActiveTab] = useState("analysis");
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);
  const setStatus = (s, m) => { setApiStatus(s); setStatusMsg(m); };

  const analyze = useCallback(async (ticker) => {
    const t = (ticker || query).trim().toUpperCase();
    if (!t || loading) return;
    setLoading(true); setResult(null); setError(null); setRawData(null); setChartData(null);
    setQuery(t);

    try {
      setStatus("loading", "Đang lấy dữ liệu thật...");
      let marketData = null;
      try {
        const [analyzeRes, histRes] = await Promise.all([
          fetch(`${API_BASE}/analyze/${t}`),
          fetch(`${API_BASE}/history/${t}?interval=d`),
        ]);
        if (analyzeRes.ok) { marketData = await analyzeRes.json(); setRawData(marketData); }
        if (histRes.ok) { const hd = await histRes.json(); setChartData(hd.data); }
      } catch { /* backend offline → fallback */ }

      setStatus("loading", "AI đang phân tích...");
      const userContent = marketData
        ? `Phân tích cổ phiếu ${t} dựa trên dữ liệu thật:\n${JSON.stringify(marketData, null, 2)}`
        : `Phân tích cổ phiếu ${t} (dùng kiến thức có sẵn, backend chưa kết nối)`;

      const res = await fetch("/api/analyze", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          system: AI_SYSTEM,
          messages: [{ role:"user", content: userContent }],
        }),
      });

      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }

      const data = await res.json();
      const raw = data.content?.map(i => i.type==="text" ? i.text : "").join("").trim();
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      if (s===-1 || e===-1) throw new Error("Không parse được JSON từ AI");

      const parsed = JSON.parse(raw.slice(s, e+1));
      if (!parsed.ticker || !parsed.recommendation) throw new Error("Dữ liệu AI không hợp lệ");

      // Normalise recommendation key to handle encoding edge cases
      const recKey = parsed.recommendation;
      if (!REC_COLORS[recKey]) parsed.recommendation = "GIỮ";

      setResult(parsed);
      setStatus("success", marketData ? "Data thật + AI ✓" : "AI only (backend offline)");
      setHistory(h => [
        { ticker:parsed.ticker, rec:parsed.recommendation, time:new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}) },
        ...h.filter(x => x.ticker !== parsed.ticker).slice(0,4),
      ]);
      setActiveTab("analysis");
    } catch(err) {
      setError(err.message || "Lỗi không xác định");
      setStatus("error", "Thất bại");
    }
    setLoading(false);
  }, [query, loading]);

  const rec = result ? (REC_COLORS[result.recommendation] || REC_COLORS["GIỮ"]) : null;

  return (
    <div style={{ minHeight:"100vh", background:"#080d14", color:"#e2e8f0", fontFamily:"'DM Sans',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      <div style={{ background:"#0d1117", borderBottom:"1px solid #1e2535", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#00C48C,#0096FF)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📈</div>
          <div>
            <div style={{ fontWeight:800, fontSize:16, letterSpacing:-0.5 }}>StockAgent <span style={{ color:"#00C48C" }}>AI</span></div>
            <div style={{ fontSize:10, color:"#5a6480", letterSpacing:0.5 }}>VNSTOCK · REAL DATA + AI</div>
          </div>
        </div>
        <StatusBadge status={apiStatus} message={statusMsg}/>
      </div>

      <div style={{ maxWidth:540, margin:"0 auto", padding:"20px 16px 0" }}>

        <div style={{ background:"#111827", borderRadius:16, padding:4, display:"flex", gap:8, border:"1px solid #1e2535", marginBottom:14 }}>
          <input ref={inputRef} value={query}
            onChange={e => setQuery(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==="Enter" && analyze()}
            placeholder="Nhập mã cổ phiếu... VD: VNM, FPT"
            style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#e2e8f0", fontSize:15, fontWeight:600, padding:"12px 16px", fontFamily:"'DM Mono',monospace", letterSpacing:1 }}
          />
          <button onClick={() => analyze()} disabled={loading}
            style={{ background:loading?"#1e2535":"linear-gradient(135deg,#00C48C,#0096FF)", border:"none", borderRadius:12, padding:"12px 18px", color:"#fff", fontWeight:700, cursor:loading?"default":"pointer", fontSize:13, minWidth:90 }}>
            {loading ? "..." : "PHÂN TÍCH"}
          </button>
        </div>

        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
          {POPULAR.map(t => (
            <button key={t} onClick={() => analyze(t)}
              style={{ background:"#111827", border:"1px solid #1e2535", borderRadius:8, padding:"4px 12px", color:"#94a3b8", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}
              onMouseEnter={e=>{e.target.style.borderColor="#00C48C";e.target.style.color="#00C48C"}}
              onMouseLeave={e=>{e.target.style.borderColor="#1e2535";e.target.style.color="#94a3b8"}}
            >{t}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", border:"3px solid #1e2535", borderTop:"3px solid #00C48C", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }}/>
            <div style={{ color:"#5a6480", fontSize:13 }}>{statusMsg}</div>
          </div>
        )}

        {error && !loading && (
          <div style={{ background:"#FF4B5C11", border:"1px solid #FF4B5C33", borderRadius:12, padding:"14px 16px", color:"#FF4B5C", fontSize:13, marginBottom:16 }}>
            ⚠ {error}
          </div>
        )}

        {result && rec && !loading && (
          <div>
            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              {["analysis","data","chart"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{ padding:"7px 16px", borderRadius:10, border:"1px solid", fontSize:12, fontWeight:600, cursor:"pointer",
                    borderColor:activeTab===tab?rec.main:"#1e2535",
                    background:activeTab===tab?rec.main+"20":"transparent",
                    color:activeTab===tab?rec.main:"#5a6480" }}>
                  {tab==="analysis"?"📊 Phân tích":tab==="data"?"📋 Data thô":"📈 Chart"}
                </button>
              ))}
            </div>

            {activeTab === "analysis" && (
              <>
                <div style={{ background:"#111827", borderRadius:20, padding:22, border:`1px solid ${rec.border}`, marginBottom:14, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, right:0, width:100, height:100, borderRadius:"0 20px 0 100%", background:rec.main+"10" }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:26, fontWeight:800, color:"#fff" }}>{result.ticker}</span>
                        <div style={{ background:rec.main, color:"#fff", padding:"4px 14px", borderRadius:20, fontWeight:800, fontSize:13 }}>{result.recommendation}</div>
                        {rawData && <div style={{ background:"#00C48C22", color:"#00C48C", padding:"2px 8px", borderRadius:8, fontSize:10, fontWeight:700 }}>DATA THẬT</div>}
                      </div>
                      <div style={{ color:"#64748b", fontSize:13, marginBottom:4 }}>{result.companyName}</div>
                      <span style={{ background:"#1e2535", color:"#94a3b8", padding:"2px 10px", borderRadius:20, fontSize:11 }}>{result.sector}</span>
                    </div>
                    <ScoreRing score={result.confidenceScore}/>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
                    {[
                      { label:"Giá hiện tại", value:result.currentPrice+"đ", color:"#e2e8f0" },
                      { label:"Mục tiêu",     value:result.targetPrice+"đ",  color:"#00C48C" },
                      { label:"Cắt lỗ",       value:result.stopLoss+"đ",     color:"#FF4B5C" },
                    ].map(p => (
                      <div key={p.label} style={{ background:"#0d1117", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
                        <div style={{ fontSize:10, color:"#5a6480", letterSpacing:0.8, marginBottom:4, textTransform:"uppercase" }}>{p.label}</div>
                        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700, color:p.color }}>{p.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:rec.main+"15", borderLeft:`3px solid ${rec.main}`, borderRadius:"0 10px 10px 0", padding:"10px 14px", fontSize:13, color:"#cbd5e1", lineHeight:1.6 }}>
                    {result.summary}
                  </div>
                  {result.upside && (
                    <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ color:"#5a6480", fontSize:12 }}>Tiềm năng:</span>
                      <span style={{ color:"#00C48C", fontWeight:800, fontFamily:"'DM Mono',monospace", fontSize:14 }}>{result.upside}</span>
                    </div>
                  )}
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:14 }}>
                  <AnalysisCard title="Kỹ thuật"          icon="📊" data={result.technicalAnalysis}/>
                  <AnalysisCard title="Cơ bản"            icon="🏦" data={result.fundamentalAnalysis}/>
                  <AnalysisCard title="Tâm lý thị trường" icon="📰" data={result.sentimentAnalysis}/>
                </div>

                {/* Checklist */}
                {result.checklist && (
                  <div style={{ background:"#111827", borderRadius:16, padding:20, border:"1px solid #1e2535", marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", letterSpacing:1, textTransform:"uppercase" }}>✅ Checklist tiêu chí</span>
                      {result.checklistSummary && (
                        <div style={{ display:"flex", gap:6 }}>
                          {[
                            { label:"CB", pass:result.checklistSummary.fundamentalPass, total:result.checklistSummary.fundamentalTotal },
                            { label:"KT", pass:result.checklistSummary.technicalPass,   total:result.checklistSummary.technicalTotal },
                            { label:"DT", pass:result.checklistSummary.sentimentPass,   total:result.checklistSummary.sentimentTotal },
                          ].map(g => {
                            const color = g.pass===g.total ? "#00C48C" : g.pass>=Math.ceil(g.total/2) ? "#F5A623" : "#FF4B5C";
                            return <span key={g.label} style={{ background:color+"22", color, padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{g.label} {g.pass}/{g.total}</span>;
                          })}
                        </div>
                      )}
                    </div>
                    {[
                      { label:"Cơ bản", color:"#7C6FCD", keys:["CB1_roe","CB2_profit","CB3_debt","CB4_liquidity"] },
                      { label:"Kỹ thuật", color:"#0096FF", keys:["KT1_trend","KT2_rsi","KT3_macd","KT4_volume","KT5_bb"] },
                      { label:"Dòng tiền", color:"#F5A623", keys:["DT1_foreign","DT2_sector","DT3_vnindex"] },
                    ].map(group => (
                      <div key={group.label} style={{ marginBottom:10 }}>
                        <div style={{ fontSize:10, color:group.color, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>{group.label}</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                          {group.keys.map(key => {
                            const item = result.checklist[key];
                            if (!item) return null;
                            return (
                              <div key={key} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px", background:"#0d1117", borderRadius:8 }}>
                                <span style={{ fontSize:13, flexShrink:0 }}>{item.pass ? "✅" : "❌"}</span>
                                <span style={{ fontSize:11, color:"#94a3b8", flex:1 }}>{item.note}</span>
                                <span style={{ fontFamily:"monospace", fontSize:10, color:item.pass?"#00C48C":"#FF4B5C", fontWeight:600 }}>{item.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Risk management */}
                {result.riskManagement && (
                  <div style={{ background:"#111827", borderRadius:16, padding:20, border:"1px solid #F5A62333", marginBottom:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#F5A623", letterSpacing:1, textTransform:"uppercase", marginBottom:14 }}>📐 Quản lý vị thế</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                      {[
                        { label:"Vào lệnh",           value:result.riskManagement.entryPrice+"đ",          color:"#e2e8f0" },
                        { label:"Cắt lỗ (-7~10%)",    value:result.riskManagement.stopLoss+"đ",            color:"#FF4B5C" },
                        { label:"Chốt lời (+15~20%)", value:result.riskManagement.takeProfit+"đ",          color:"#00C48C" },
                        { label:"Risk/Reward",         value:result.riskManagement.riskReward,              color:"#F5A623" },
                        { label:"Tỷ trọng đề xuất",   value:result.riskManagement.suggestedAllocation,    color:"#94a3b8" },
                      ].map(p => (
                        <div key={p.label} style={{ background:"#0d1117", borderRadius:10, padding:"10px 12px" }}>
                          <div style={{ fontSize:10, color:"#5a6480", marginBottom:4 }}>{p.label}</div>
                          <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:p.color }}>{p.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                  <div style={{ background:"#111827", borderRadius:16, padding:16, border:"1px solid #FF4B5C22" }}>
                    <div style={{ fontSize:11, color:"#FF4B5C", fontWeight:700, letterSpacing:1, marginBottom:10, textTransform:"uppercase" }}>⚠ Rủi ro</div>
                    {result.risks?.map((r,i) => <div key={i} style={{ display:"flex", gap:6, marginBottom:6, fontSize:11, color:"#94a3b8" }}><span style={{ color:"#FF4B5C", flexShrink:0 }}>•</span>{r}</div>)}
                  </div>
                  <div style={{ background:"#111827", borderRadius:16, padding:16, border:"1px solid #00C48C22" }}>
                    <div style={{ fontSize:11, color:"#00C48C", fontWeight:700, letterSpacing:1, marginBottom:10, textTransform:"uppercase" }}>🚀 Động lực</div>
                    {result.catalysts?.map((c,i) => <div key={i} style={{ display:"flex", gap:6, marginBottom:6, fontSize:11, color:"#94a3b8" }}><span style={{ color:"#00C48C", flexShrink:0 }}>•</span>{c}</div>)}
                  </div>
                </div>
              </>
            )}

            {activeTab === "data" && (
              <div style={{ background:"#111827", borderRadius:16, padding:20, border:"1px solid #1e2535" }}>
                {rawData ? (
                  <>
                    <div style={{ fontSize:11, color:"#00C48C", fontWeight:700, marginBottom:14 }}>✓ Data thật từ backend</div>
                    {rawData.technical?.latest && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:11, color:"#5a6480", marginBottom:8, textTransform:"uppercase", letterSpacing:0.8 }}>Chỉ báo kỹ thuật</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                          {[
                            ["RSI 14",   rawData.technical.latest.rsi?.toFixed(1)],
                            ["MACD",     rawData.technical.latest.macd?.toFixed(2)],
                            ["Signal",   rawData.technical.latest.macd_signal?.toFixed(2)],
                            ["MA20",     rawData.technical.latest.ma20?.toLocaleString("vi-VN")],
                            ["MA50",     rawData.technical.latest.ma50?.toLocaleString("vi-VN")],
                            ["BB Upper", rawData.technical.latest.bb_upper?.toLocaleString("vi-VN")],
                          ].filter(([,v])=>v).map(([label,value]) => (
                            <div key={label} style={{ background:"#0d1117", borderRadius:10, padding:"10px 12px" }}>
                              <div style={{ fontSize:10, color:"#5a6480", marginBottom:4 }}>{label}</div>
                              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#e2e8f0", fontWeight:600 }}>{value}</div>
                            </div>
                          ))}
                        </div>
                        {rawData.technical.signals?.map((s,i) => (
                          <div key={i} style={{ display:"flex", gap:8, marginTop:8, fontSize:12, color:"#94a3b8" }}><span style={{ color:"#F5A623" }}>→</span>{s}</div>
                        ))}
                      </div>
                    )}
                    {rawData.financials?.latest_ratio && Object.keys(rawData.financials.latest_ratio).length > 0 && (
                      <div>
                        <div style={{ fontSize:11, color:"#5a6480", marginBottom:8, textTransform:"uppercase", letterSpacing:0.8 }}>Chỉ số tài chính</div>
                        <pre style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"#64748b", background:"#0d1117", padding:12, borderRadius:10, maxHeight:200, overflow:"auto" }}>
                          {JSON.stringify(rawData.financials.latest_ratio, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign:"center", padding:"24px 0", color:"#5a6480", fontSize:13 }}>
                    Backend chưa kết nối<br/>
                    <code style={{ fontSize:11, background:"#0d1117", padding:"2px 8px", borderRadius:4, marginTop:8, display:"inline-block" }}>uvicorn main:app --reload --port 8000</code>
                  </div>
                )}
              </div>
            )}

            {activeTab === "chart" && (
              <div style={{ background:"#111827", borderRadius:16, padding:20, border:"1px solid #1e2535" }}>
                {chartData?.length > 0 ? (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                      <span style={{ fontSize:13, color:"#e2e8f0", fontWeight:600 }}>{result.ticker} — 90 phiên</span>
                      <span style={{ fontSize:11, color:"#5a6480" }}>{chartData.length} phiên</span>
                    </div>
                    <MiniChart history={chartData}/>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:16 }}>
                      {[
                        { label:"Giá cuối",  value:chartData[chartData.length-1]?.close?.toLocaleString("vi-VN") },
                        { label:"Cao nhất",  value:Math.max(...chartData.map(d=>d.high||0)).toLocaleString("vi-VN") },
                        { label:"Thấp nhất", value:Math.min(...chartData.filter(d=>d.low>0).map(d=>d.low)).toLocaleString("vi-VN") },
                        { label:"Vol TB",    value:(chartData.reduce((s,d)=>s+(d.volume||0),0)/chartData.length/1e6).toFixed(1)+"M" },
                      ].map(m => (
                        <div key={m.label} style={{ background:"#0d1117", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                          <div style={{ fontSize:10, color:"#5a6480", marginBottom:4 }}>{m.label}</div>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"#e2e8f0", fontWeight:600 }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:"center", padding:"24px 0", color:"#5a6480", fontSize:13 }}>
                    Cần backend để hiển thị chart data thật
                  </div>
                )}
              </div>
            )}

            <div style={{ background:"#0d1117", borderRadius:12, padding:10, textAlign:"center", marginTop:14 }}>
              <span style={{ fontSize:10, color:"#1e2535" }}>⚠ Chỉ mang tính tham khảo. Không phải khuyến nghị đầu tư chính thức.</span>
            </div>
          </div>
        )}

        {history.length > 0 && !loading && (
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:11, color:"#5a6480", letterSpacing:1, marginBottom:10, textTransform:"uppercase" }}>Vừa xem</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {history.map((h,i) => {
                const c = REC_COLORS[h.rec] || REC_COLORS["GIỮ"];
                return (
                  <button key={i} onClick={() => analyze(h.ticker)}
                    style={{ background:"#111827", border:`1px solid ${c.border}`, borderRadius:10, padding:"5px 14px", display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{h.ticker}</span>
                    <span style={{ color:c.main, fontSize:10, fontWeight:700 }}>{h.rec}</span>
                    <span style={{ color:"#5a6480", fontSize:10 }}>{h.time}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ textAlign:"center", padding:"48px 24px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
            <div style={{ fontWeight:700, fontSize:15, color:"#334155", marginBottom:8 }}>Nhập mã cổ phiếu để bắt đầu</div>
            <div style={{ fontSize:12, color:"#1e2535", lineHeight:1.6 }}>Kết nối data thật khi backend chạy · Fallback AI khi offline</div>
          </div>
        )}
      </div>
    </div>
  );
}
