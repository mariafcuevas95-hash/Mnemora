"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Plus, Brain, Layers, BarChart2, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Subject = { id: string; name: string; professor?: string };

export default function MateriasPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    createClient()
      .from("subjects")
      .select("id, name, professor")
      .order("created_at")
      .then(({ data }) => {
        setSubjects(data ?? []);
        setLoaded(true);
      });
  }, []);

  return (
    <div style={{ maxWidth: 680, padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#1A1612" }}>Materias</h1>
        <Link href="/onboarding?returning=true" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#1B3F2F", fontWeight: 700, textDecoration: "none", padding: "8px 14px", background: "#E8F1EC", borderRadius: 10 }}>
          <Plus size={14} /> Agregar materia
        </Link>
      </div>

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 96, background: "#EDE9E2", borderRadius: 14, animation: "pulse-skeleton 1.4s ease infinite" }} />)}
          <style>{`@keyframes pulse-skeleton{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : subjects.length === 0 ? (
        <div className="mn-card" style={{ padding: 36, textAlign: "center" }}>
          <BookOpen size={32} color="#C4BAAE" style={{ marginBottom: 12 }} />
          <p className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>Sin materias todavía</p>
          <p style={{ fontSize: 13, color: "#6B6259", marginBottom: 20 }}>Agrega tu primera materia para empezar.</p>
          <Link href="/onboarding" className="mn-btn-primary" style={{ fontSize: 13 }}>Agregar materia →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subjects.map(s => (
            <Link
              key={s.id}
              href={`/materias/${s.id}`}
              className="mn-card"
              style={{ padding: "16px 20px", textDecoration: "none", display: "flex", alignItems: "center", gap: 14 }}
            >
              <div style={{ width: 38, height: 38, background: "#E8F1EC", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={16} color="#1B3F2F" />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#1A1612", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
                {s.professor && <p style={{ fontSize: 12, color: "#9E9389" }}>{s.professor}</p>}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Link href={`/tutor/${s.id}`} onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#1B3F2F", fontWeight: 600, textDecoration: "none", padding: "5px 9px", background: "#E8F1EC", borderRadius: 7 }}>
                  <Brain size={11} /> Tutor
                </Link>
                <Link href={`/flashcards/${s.id}`} onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B6259", fontWeight: 600, textDecoration: "none", padding: "5px 9px", background: "#F7F4EF", borderRadius: 7 }}>
                  <Layers size={11} /> Flashcards
                </Link>
                <Link href={`/progreso?subject=${s.id}`} onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6B6259", fontWeight: 600, textDecoration: "none", padding: "5px 9px", background: "#F7F4EF", borderRadius: 7 }}>
                  <BarChart2 size={11} /> Progreso
                </Link>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
