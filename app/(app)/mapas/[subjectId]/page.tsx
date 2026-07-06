"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Zap, BookOpen, X, ClipboardCheck } from "lucide-react";
import { PaywallModal } from "@/components/paywall-modal";
import type { MindMapData, MindMapNode } from "@/app/api/mind-map/[subjectId]/route";
import type { Feature, PlanId } from "@/lib/plans";

type PaywallState = { feature: Feature; message: string; planRequired: PlanId } | null;

// ─── Data helpers ─────────────────────────────────────────────────────────────

const ICONS: [RegExp, string][] = [
  [/filoso/i,"🏛️"],[/psicol/i,"🧠"],[/ética|etica|moral/i,"⚖️"],
  [/método|metodo/i,"🔬"],[/científ|cienti/i,"⚗️"],[/empiri/i,"👁️"],
  [/racion/i,"💡"],[/kant|síntesis|sintesis/i,"🤝"],[/conduct/i,"🎯"],
  [/cogni/i,"💭"],[/mente|concienc/i,"🧩"],[/exist/i,"🌍"],
  [/falsi/i,"🔍"],[/paradigm|revoluc/i,"🌀"],[/causal/i,"⛓️"],
  [/dual/i,"☯️"],[/material/i,"🔩"],[/identidad/i,"🪞"],
  [/bioétic|bioetica/i,"🏥"],[/utilitar/i,"⚖️"],[/observ/i,"🔭"],
  [/hipótes|hipotes/i,"❓"],[/experiment/i,"⚗️"],[/epistem/i,"📖"],
  [/cogito/i,"✨"],[/tabula/i,"📋"],[/conocimiento/i,"📚"],
  [/psicoanál|psicoanal/i,"🛋️"],[/funcional/i,"⚙️"],[/determin/i,"⛓️"],
];
const DESCS: [RegExp, string][] = [
  [/filoso/i,"Amor por la sabiduría y el conocimiento."],
  [/psicol/i,"Estudia los procesos mentales y la conducta."],
  [/epistem/i,"Estudia el conocimiento: su origen y validez."],
  [/empiri/i,"El conocimiento proviene de la experiencia."],
  [/racion/i,"El conocimiento proviene de la razón."],
  [/kant|síntesis/i,"Combina experiencia y razón puras."],
  [/falsi/i,"Una teoría es científica si puede refutarse."],
  [/paradigm/i,"Modelo que guía la ciencia en una época."],
  [/revoluc/i,"Cambio de paradigma científico (Kuhn)."],
  [/conduct/i,"Estudia la conducta observable y medible."],
  [/cogni/i,"Estudia los procesos mentales internos."],
  [/dual/i,"Mente y cuerpo son sustancias distintas."],
  [/material/i,"La realidad está hecha de materia."],
  [/funcional/i,"La mente según su función, no sustancia."],
  [/concienc/i,"Estado de experiencia subjetiva."],
  [/identidad/i,"¿Qué hace que seamos la misma persona?"],
  [/causal/i,"Todo efecto tiene una causa que lo produce."],
  [/cogito/i,'"Pienso, luego existo" (Descartes).'],
  [/tabula/i,"La mente nace como una hoja en blanco."],
  [/método|metodo/i,"Orden y lógica para alcanzar objetivos."],
  [/observ/i,"Percibir fenómenos con los sentidos."],
  [/hipótes|hipotes/i,"Propuesta tentativa para explicar algo."],
  [/experiment/i,"Pon a prueba teorías a través de la práctica."],
  [/exist/i,"El ser humano crea su propia esencia."],
  [/bioétic|bioetica/i,"Ética aplicada a las ciencias de la vida."],
  [/utilitar/i,"Lo bueno maximiza la felicidad colectiva."],
  [/psicoanál|psicoanal/i,"Inconsciente, deseos y represión (Freud)."],
  [/ética|etica/i,"Estudio de los principios morales."],
  [/conocimiento/i,"Capacidad de comprender la realidad."],
  [/determin/i,"Todo evento está causado por otro anterior."],
];
function getIcon(n: string) { for (const [r,i] of ICONS) if (r.test(n)) return i; return "📚"; }
function getDesc(n: string) { for (const [r,d] of DESCS) if (r.test(n)) return d; return "Concepto clave de la materia."; }

const MASTERY = {
  unknown:   { label: "Sin practicar", color: "#A1A1AA", bg: "#F4F4F5", dot: "#A1A1AA" },
  learning:  { label: "Aprendiendo",   color: "#B45309", bg: "#FEF3C7", dot: "#D97706" },
  practiced: { label: "En repaso",     color: "#6D28D9", bg: "#EDE9FE", dot: "#7C3AED" },
  mastered:  { label: "Dominado",      color: "#15803D", bg: "#DCFCE7", dot: "#16A34A" },
};

// ─── Category grouping ────────────────────────────────────────────────────────

type CategoryDef = { name: string; icon: string; color: string; match: RegExp };
const CAT_DEFS: CategoryDef[] = [
  { name: "Teoría del conocimiento", icon: "📖", color: "#7C3AED",
    match: /empiri|racion|kant|epistem|tabula|cogito|conocimiento|falsi|paradigm|revoluc|sistemát|validez/i },
  { name: "Método científico", icon: "🔬", color: "#2563EB",
    match: /método|metodo|observ|hipótes|hipotes|experiment|análisis|analisis|científ|cienti/i },
  { name: "Filosofía de la mente", icon: "🧩", color: "#059669",
    match: /mente|concienc|dual|material|funcional|identidad|cogni|psicol|problema mente/i },
  { name: "Ética y existencia", icon: "⚖️", color: "#D97706",
    match: /ética|etica|utilitar|bioétic|exist|libertad|determin|psicoanál|psicoanal|conduct/i },
];

interface CategoryGroup { def: CategoryDef; nodes: MindMapNode[] }

function groupNodes(nodes: MindMapNode[]): CategoryGroup[] {
  const groups: CategoryGroup[] = CAT_DEFS.map(def => ({ def, nodes: [] }));
  const leftover: MindMapNode[] = [];
  for (const n of nodes) {
    const g = groups.find(g => g.def.match.test(n.name));
    if (g) g.nodes.push(n); else leftover.push(n);
  }
  for (const n of leftover) {
    groups.sort((a, b) => a.nodes.length - b.nodes.length)[0].nodes.push(n);
  }
  return groups.filter(g => g.nodes.length > 0);
}

// ─── SVG Layout ───────────────────────────────────────────────────────────────

const VW = 1200, VH = 660;
const CX = 600, CY = 330;
const CAT_W = 155, CAT_H = 60;
const LEAF_W = 170, LEAF_H = 50;
const MAX_LEAF = 4;

function catPos(i: number, total: number, side: "left" | "right") {
  const xs = side === "left" ? 355 : 845;
  if (total === 1) return { x: xs, y: CY };
  if (total === 2) return { x: xs, y: i === 0 ? CY - 110 : CY + 110 };
  const step = Math.min(150, (VH - 100) / (total - 1));
  const startY = CY - ((total - 1) * step) / 2;
  return { x: xs, y: startY + i * step };
}

function leafPos(j: number, total: number, catY: number, side: "left" | "right") {
  const xs = side === "left" ? 190 : 1010;
  if (total === 1) return { x: xs, y: catY };
  const step = Math.min(62, 170 / (total - 1));
  const startY = catY - ((total - 1) * step) / 2;
  return { x: xs, y: startY + j * step };
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  return `M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

// ─── Leaf card ────────────────────────────────────────────────────────────────

function LeafCard({ node, x, y, side, color, selected, recommended, onClick }: {
  node: MindMapNode; x: number; y: number; side: "left"|"right";
  color: string; selected: boolean; recommended: boolean; onClick: () => void;
}) {
  const cx = side === "left" ? x - LEAF_W : x;
  const cy = y - LEAF_H / 2;
  const m = MASTERY[node.masteryLevel as keyof typeof MASTERY] ?? MASTERY.unknown;
  const conf = Math.round(node.confidence * 100);
  const barW = Math.max(0, Math.round((LEAF_W - 44) * conf / 100));
  return (
    <g onClick={e => { e.stopPropagation(); onClick(); }} style={{ cursor: "pointer" }}>
      <rect x={cx+1} y={cy+3} width={LEAF_W} height={LEAF_H} rx={10} fill="rgba(0,0,0,0.04)" />
      <rect x={cx} y={cy} width={LEAF_W} height={LEAF_H} rx={10}
        fill={selected ? m.bg : "#fff"}
        stroke={selected ? color : (recommended ? "#D97706" : "#E4E4E7")}
        strokeWidth={selected ? 2 : (recommended ? 1.5 : 0.75)} />
      <clipPath id={`lc-${node.id}`}><rect x={cx} y={cy} width={LEAF_W} height={LEAF_H} rx={10} /></clipPath>
      <rect x={cx} y={cy} width={4} height={LEAF_H} fill={color} clipPath={`url(#lc-${node.id})`} />
      <text x={cx + 14} y={cy + 21} fontSize={14}>{getIcon(node.name)}</text>
      <text x={cx + 30} y={cy + 20} fontSize={10} fontWeight="700" fill="#18181B" fontFamily="inherit">
        {node.name.length > 22 ? node.name.slice(0,21)+"…" : node.name}
      </text>
      <rect x={cx + 30} y={cy + 28} width={LEAF_W - 44} height={3} rx={1.5} fill="#E4E4E7" />
      {barW > 0 && <rect x={cx + 30} y={cy + 28} width={barW} height={3} rx={1.5} fill={color} opacity={0.7} />}
      <text x={cx + LEAF_W - 6} y={cy + 33} fontSize={9} fontWeight="700" fill={m.color} textAnchor="end" fontFamily="inherit">{conf}%</text>
      <circle cx={cx + 31} cy={cy + 44} r={3} fill={m.dot} />
      <text x={cx + 38} y={cy + 47} fontSize={8} fill={m.color} fontFamily="inherit" fontWeight="600">{m.label}</text>
      {recommended && <text x={cx + LEAF_W - 14} y={cy + LEAF_H - 6} fontSize={11}>⭐</text>}
    </g>
  );
}

// ─── Category node ────────────────────────────────────────────────────────────

function CatNode({ group, x, y, color }: { group: CategoryGroup; x: number; y: number; color: string }) {
  const cx = x - CAT_W / 2, cy = y - CAT_H / 2;
  const dominados = group.nodes.filter(n => n.masteryLevel === "mastered").length;
  const pct = group.nodes.length > 0 ? Math.round((dominados / group.nodes.length) * 100) : 0;
  return (
    <g>
      <rect x={cx+1} y={cy+3} width={CAT_W} height={CAT_H} rx={12} fill="rgba(0,0,0,0.05)" />
      <rect x={cx} y={cy} width={CAT_W} height={CAT_H} rx={12}
        fill="#fff" stroke={color} strokeWidth={1.5} />
      <clipPath id={`cc-${group.def.name}`}><rect x={cx} y={cy} width={CAT_W} height={CAT_H} rx={12} /></clipPath>
      <rect x={cx} y={cy} width={CAT_W} height={6} fill={`${color}18`} clipPath={`url(#cc-${group.def.name})`} />
      <text x={x} y={cy + 23} textAnchor="middle" fontSize={14}>{group.def.icon}</text>
      <text x={x} y={cy + 36} textAnchor="middle" fontSize={10} fontWeight="800" fill={color} fontFamily="inherit">
        {group.def.name.length > 22 ? group.def.name.slice(0, 21)+"…" : group.def.name}
      </text>
      <text x={x} y={cy + 51} textAnchor="middle" fontSize={9} fill="#A1A1AA" fontFamily="inherit">
        {group.nodes.length} conceptos · {pct}%
      </text>
    </g>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

function RightPanel({ node, subjectId, color, related, onClose }: {
  node: MindMapNode; subjectId: string; color: string; related: MindMapNode[]; onClose: () => void;
}) {
  const m = MASTERY[node.masteryLevel as keyof typeof MASTERY] ?? MASTERY.unknown;
  const conf = Math.round(node.confidence * 100);
  const nextReview = node.nextReview ? new Date(node.nextReview) : null;
  const isOverdue  = nextReview && nextReview < new Date();

  return (
    <div style={{ width: 260, flexShrink: 0, borderLeft: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", display: "flex", flexDirection: "column", overflowY: "auto", animation: "slideIn 0.2s ease" }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>

      <div style={{ padding: "18px 18px 0" }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>{getIcon(node.name)}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)", lineHeight: 1.3 }}>{node.name}</p>
            <span style={{ fontSize: 10, fontWeight: 600, color: m.color, background: m.bg, borderRadius: "var(--mn-r-sm)", padding: "2px 7px", display: "inline-block", marginTop: 4 }}>{m.label}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mn-ink-3)" }}><X size={14} /></button>
        </div>

        {/* Confidence */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--mn-ink-2)", fontWeight: 600 }}>Confianza</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)" }}>{conf}%</span>
          </div>
          <div style={{ height: 4, background: "var(--mn-raised)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${conf}%`, background: color, borderRadius: 2, transition: "width 400ms var(--mn-ease)" }} />
          </div>
        </div>

        {/* Next review */}
        <div style={{ paddingLeft: 12, borderLeft: `3px solid ${isOverdue ? "var(--mn-amber)" : "var(--mn-ink-4)"}`, marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "var(--mn-ink-3)", marginBottom: 2 }}>Próximo repaso</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? "var(--mn-amber)" : "var(--mn-ink-1)" }}>
            {nextReview ? nextReview.toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "No programado"}
          </p>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)", marginBottom: 6 }}>Descripción</p>
          <p style={{ fontSize: 13, color: "var(--mn-ink-2)", lineHeight: 1.6 }}>{getDesc(node.name)}</p>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)", marginBottom: 8 }}>Relacionado con</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {related.slice(0, 4).map(r => (
                <span key={r.id} style={{ fontSize: 10, background: "var(--mn-raised)", color: "var(--mn-ink-2)", borderRadius: "var(--mn-r-sm)", padding: "3px 8px", fontWeight: 500 }}>{r.name}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
        <Link href={`/flashcards/${subjectId}`}
          className="mn-btn-primary"
          style={{ justifyContent: "center", fontSize: 13, padding: "10px", textDecoration: "none" }}>
          <Zap size={13} /> Practicar flashcards
        </Link>
        <Link href={`/tutor/${subjectId}?concept=${encodeURIComponent(node.name)}`}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
          <MessageCircle size={13} /> Preguntar al tutor
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MapasPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [data,     setData]     = useState<MindMapData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<MindMapNode | null>(null);
  const [paywall,  setPaywall]  = useState<PaywallState>(null);
  const [ready,    setReady]    = useState(false);

  useEffect(() => {
    fetch(`/api/mind-map/${subjectId}`)
      .then(async r => {
        if (r.status === 403) {
          const body = await r.json().catch(() => ({}));
          setPaywall({ feature: body.feature ?? "mind_maps", message: body.message ?? "Actualiza tu plan.", planRequired: body.planRequired ?? "pro" });
          return null;
        }
        return r.json();
      })
      .then(d => { if (d) { setData(d); setTimeout(() => setReady(true), 80); } })
      .finally(() => setLoading(false));
  }, [subjectId]);

  const nodes       = data?.nodes ?? [];
  const masteredN   = nodes.filter(n => n.masteryLevel === "mastered").length;
  const learningN   = nodes.filter(n => n.masteryLevel === "learning" || n.masteryLevel === "practiced").length;
  const weakN       = nodes.filter(n => n.masteryLevel === "learning" && n.confidence < 0.4).length;
  const unknownN    = nodes.filter(n => n.masteryLevel === "unknown").length;
  const progress    = nodes.length > 0 ? Math.round((masteredN / nodes.length) * 100) : 0;
  const avgConf     = nodes.length > 0 ? nodes.reduce((s, n) => s + n.confidence, 0) / nodes.length : 0;
  const projectedGrade = (4 + avgConf * 6).toFixed(1);

  const nextReviewNode = nodes
    .filter(n => n.nextReview)
    .sort((a, b) => new Date(a.nextReview!).getTime() - new Date(b.nextReview!).getTime())[0];

  const recommended = nodes
    .filter(n => n.masteryLevel !== "mastered")
    .sort((a, b) => a.confidence - b.confidence)[0];

  const recommendedPath = nodes
    .filter(n => n.masteryLevel !== "mastered")
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 3);

  const groups = groupNodes(nodes);
  const leftGroups  = groups.slice(0, Math.ceil(groups.length / 2));
  const rightGroups = groups.slice(Math.ceil(groups.length / 2));

  const selectedCategory = selected ? groups.find(g => g.nodes.some(n => n.id === selected.id)) : null;
  const relatedNodes     = selectedCategory ? selectedCategory.nodes.filter(n => n.id !== selected?.id) : [];

  const groupColors: Record<string, string> = {};
  for (const g of groups) groupColors[g.def.name] = g.def.color;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--mn-canvas)" }}>
      <style>{`
        @keyframes cardIn   { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        @keyframes branchIn { from{stroke-dashoffset:800;opacity:0} to{stroke-dashoffset:0;opacity:1} }
      `}</style>
      {paywall && <PaywallModal feature={paywall.feature} message={paywall.message} planRequired={paywall.planRequired} onClose={() => setPaywall(null)} />}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", flexShrink: 0 }}>
        <Link href={`/materias/${subjectId}`} style={{ display: "flex", alignItems: "center", color: "var(--mn-ink-3)", textDecoration: "none" }}>
          <ChevronLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <h1 className="font-display" style={{ fontSize: 17, fontWeight: 700, color: "var(--mn-ink-1)" }}>
            {loading ? "Cargando..." : (data?.subjectName ?? "Mapa mental")}
          </h1>
          <p style={{ fontSize: 11, color: "var(--mn-ink-3)" }}>Mapa de aprendizaje</p>
        </div>
        <Link href={`/quiz/${subjectId}`} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: "var(--mn-r-lg)", border: "1px solid var(--mn-ink-4)", background: "var(--mn-surface)", color: "var(--mn-ink-2)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
          <ClipboardCheck size={13} /> Quiz
        </Link>
        <Link href={`/flashcards/${subjectId}`} className="mn-btn-primary" style={{ fontSize: 13, padding: "8px 16px", textDecoration: "none" }}>
          <Zap size={13} /> Practicar
        </Link>
      </div>

      {/* ── Stats bar ── */}
      {!loading && nodes.length > 0 && (
        <div style={{ display: "flex", gap: 0, padding: "0 20px", background: "var(--mn-surface)", borderBottom: "1px solid var(--mn-ink-4)", flexShrink: 0 }}>
          {/* Progress */}
          <div style={{ padding: "10px 20px 10px 0", borderRight: "1px solid var(--mn-ink-4)", flex: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600 }}>Progreso</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)" }}>{progress}%</span>
            </div>
            <div style={{ height: 3, background: "var(--mn-raised)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--mn-green)", borderRadius: 2, transition: "width 600ms var(--mn-ease)" }} />
            </div>
            <p style={{ fontSize: 10, color: "var(--mn-ink-3)", marginTop: 4 }}>{masteredN} de {nodes.length} dominados</p>
          </div>
          {/* Counts */}
          <div style={{ padding: "10px 20px", borderRight: "1px solid var(--mn-ink-4)", flex: 2, display: "flex", gap: 16, alignItems: "center" }}>
            {[
              { n: masteredN,  label: "Dominados" },
              { n: learningN,  label: "En progreso" },
              { n: weakN,      label: "Débiles" },
              { n: unknownN,   label: "Sin practicar" },
            ].map(({ n, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)" }}>{n}</p>
                <p style={{ fontSize: 9, color: "var(--mn-ink-3)" }}>{label}</p>
              </div>
            ))}
          </div>
          {/* Next review */}
          <div style={{ padding: "10px 20px", borderRight: "1px solid var(--mn-ink-4)", flex: 1.5 }}>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, marginBottom: 4 }}>Próximo repaso</p>
            {nextReviewNode ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--mn-ink-1)" }}>
                  {new Date(nextReviewNode.nextReview!).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </p>
                <p style={{ fontSize: 10, color: "var(--mn-ink-3)" }}>{nextReviewNode.name.slice(0, 18)}</p>
              </>
            ) : <p style={{ fontSize: 12, color: "var(--mn-ink-3)" }}>Sin programar</p>}
          </div>
          {/* Projected grade */}
          <div style={{ padding: "10px 0 10px 20px", flex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "var(--mn-ink-3)", fontWeight: 600, marginBottom: 4 }}>Nota proyectada</p>
            <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: "var(--mn-ink-1)" }}>{projectedGrade}</p>
            <p style={{ fontSize: 9, color: "var(--mn-ink-3)" }}>/10</p>
          </div>
        </div>
      )}

      {/* ── Main: map + panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Map area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }} onClick={() => setSelected(null)}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--mn-ink-3)" }}>
              <span style={{ fontSize: 28 }}>🧠</span>
              <p style={{ fontSize: 14 }}>Construyendo el mapa mental...</p>
            </div>
          )}
          {!loading && nodes.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 24 }}>
              <BookOpen size={28} color="var(--mn-ink-4)" style={{ marginBottom: 14 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--mn-ink-1)", marginBottom: 6 }}>Sin conceptos todavía</p>
              <p style={{ fontSize: 13, color: "var(--mn-ink-2)", marginBottom: 20, lineHeight: 1.6 }}>Sube un documento para generar el mapa mental.</p>
              <Link href={`/materias/${subjectId}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--mn-green)", fontWeight: 600, textDecoration: "none" }}>
                <ChevronLeft size={14} /> Ir a la materia
              </Link>
            </div>
          )}

          {!loading && nodes.length > 0 && (
            <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%" }}>
              <defs>
                {nodes.map(n => <clipPath key={`lc-${n.id}`} id={`lc-${n.id}`}><rect width={LEAF_W} height={LEAF_H} rx={10} /></clipPath>)}
                {groups.map(g => <clipPath key={`cc-${g.def.name}`} id={`cc-${g.def.name}`}><rect width={CAT_W} height={CAT_H} rx={12} /></clipPath>)}
              </defs>

              {/* Subtle grid */}
              <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#E4E4E7" strokeWidth="0.3" />
              </pattern>
              <rect width={VW} height={VH} fill="url(#grid)" opacity={0.5} />

              {/* Left groups */}
              {leftGroups.map((group, gi) => {
                const cp = catPos(gi, leftGroups.length, "left");
                const color = group.def.color;
                const isSelCat = selectedCategory?.def.name === group.def.name;
                return (
                  <g key={group.def.name}>
                    <path d={curve(CX - 90, CY, cp.x + CAT_W/2, cp.y)}
                      fill="none" stroke={color} strokeWidth={isSelCat ? 2.5 : 1.5}
                      strokeLinecap="round" opacity={isSelCat ? 0.8 : 0.3}
                      style={{ animation: ready ? `branchIn 0.5s ease ${gi * 0.1}s both` : "none" }} />
                    <g style={{ animation: ready ? `cardIn 0.4s ease ${0.1 + gi * 0.1}s both` : "none" }}>
                      <CatNode group={group} x={cp.x} y={cp.y} color={color} />
                    </g>
                    {group.nodes.slice(0, MAX_LEAF).map((node, ni) => {
                      const lp = leafPos(ni, Math.min(group.nodes.length, 5), cp.y, "left");
                      const isSel = selected?.id === node.id;
                      const isRec = recommended?.id === node.id;
                      return (
                        <g key={node.id}>
                          <path d={curve(cp.x - CAT_W/2, cp.y, lp.x, lp.y)}
                            fill="none" stroke={color} strokeWidth={isSel ? 2 : 1}
                            strokeLinecap="round" opacity={isSel ? 0.7 : 0.25}
                            style={{ animation: ready ? `branchIn 0.5s ease ${0.15 + gi * 0.08 + ni * 0.05}s both` : "none" }} />
                          <g style={{ animation: ready ? `cardIn 0.4s ease ${0.2 + gi * 0.08 + ni * 0.05}s both` : "none" }}>
                            <LeafCard node={node} x={lp.x} y={lp.y} side="left" color={color} selected={isSel} recommended={isRec} onClick={() => setSelected(isSel ? null : node)} />
                          </g>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Right groups */}
              {rightGroups.map((group, gi) => {
                const cp = catPos(gi, rightGroups.length, "right");
                const color = group.def.color;
                const isSelCat = selectedCategory?.def.name === group.def.name;
                return (
                  <g key={group.def.name}>
                    <path d={curve(CX + 90, CY, cp.x - CAT_W/2, cp.y)}
                      fill="none" stroke={color} strokeWidth={isSelCat ? 2.5 : 1.5}
                      strokeLinecap="round" opacity={isSelCat ? 0.8 : 0.3}
                      style={{ animation: ready ? `branchIn 0.5s ease ${gi * 0.1}s both` : "none" }} />
                    <g style={{ animation: ready ? `cardIn 0.4s ease ${0.1 + gi * 0.1}s both` : "none" }}>
                      <CatNode group={group} x={cp.x} y={cp.y} color={color} />
                    </g>
                    {group.nodes.slice(0, MAX_LEAF).map((node, ni) => {
                      const lp = leafPos(ni, Math.min(group.nodes.length, 5), cp.y, "right");
                      const isSel = selected?.id === node.id;
                      const isRec = recommended?.id === node.id;
                      return (
                        <g key={node.id}>
                          <path d={curve(cp.x + CAT_W/2, cp.y, lp.x, lp.y)}
                            fill="none" stroke={color} strokeWidth={isSel ? 2 : 1}
                            strokeLinecap="round" opacity={isSel ? 0.7 : 0.25}
                            style={{ animation: ready ? `branchIn 0.5s ease ${0.15 + gi * 0.08 + ni * 0.05}s both` : "none" }} />
                          <g style={{ animation: ready ? `cardIn 0.4s ease ${0.2 + gi * 0.08 + ni * 0.05}s both` : "none" }}>
                            <LeafCard node={node} x={lp.x} y={lp.y} side="right" color={color} selected={isSel} recommended={isRec} onClick={() => setSelected(isSel ? null : node)} />
                          </g>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Center node — marca */}
              <g>
                <ellipse cx={CX} cy={CY + 4} rx={86} ry={60} fill="rgba(27,63,47,0.12)" />
                <ellipse cx={CX} cy={CY} rx={86} ry={60} fill="#1B3F2F" />
                <ellipse cx={CX} cy={CY} rx={81} ry={55} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
                <text x={CX} y={CY - 18} textAnchor="middle" fontSize={22}>🧠</text>
                <text x={CX} y={CY} textAnchor="middle" fill="#FFFFFF" fontSize={13} fontWeight="700" fontFamily="inherit" letterSpacing="0.05em">
                  {(data?.subjectName ?? "").toUpperCase().slice(0, 10)}
                </text>
                <text x={CX} y={CY + 16} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10} fontFamily="inherit">{nodes.length} conceptos</text>
                <text x={CX} y={CY + 30} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={11} fontWeight="700" fontFamily="inherit">{progress}%</text>
              </g>
            </svg>
          )}
        </div>

        {/* Right panel */}
        {selected && (
          <RightPanel
            node={selected}
            subjectId={subjectId}
            color={groupColors[selectedCategory?.def.name ?? ""] ?? "var(--mn-green)"}
            related={relatedNodes}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {/* ── Bottom bar ── */}
      {!loading && nodes.length > 0 && (
        <div style={{ background: "var(--mn-surface)", borderTop: "1px solid var(--mn-ink-4)", padding: "8px 20px", display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
          {/* Legend */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)" }}>Dominio</span>
            {Object.entries(MASTERY).map(([key, m]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.dot }} />
                <span style={{ fontSize: 10, color: "var(--mn-ink-3)" }}>{m.label}</span>
              </div>
            ))}
          </div>

          {/* Recommended path */}
          {recommendedPath.length > 0 && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mn-ink-2)", whiteSpace: "nowrap" }}>Estudiar primero</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {recommendedPath.map((n, i) => (
                  <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, background: "var(--mn-raised)", color: "var(--mn-ink-2)", borderRadius: "var(--mn-r-sm)", padding: "3px 8px", fontWeight: i === 0 ? 700 : 500, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.name.length > 14 ? n.name.slice(0,13)+"…" : n.name}
                    </span>
                    {i < recommendedPath.length - 1 && <span style={{ color: "var(--mn-ink-4)", fontSize: 10 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary numbers */}
          <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{nodes.length - masteredN}</p>
              <p style={{ fontSize: 9, color: "var(--mn-ink-3)" }}>Por dominar</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--mn-ink-1)" }}>{groups.length}</p>
              <p style={{ fontSize: 9, color: "var(--mn-ink-3)" }}>Categorías</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
