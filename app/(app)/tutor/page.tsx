"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Brain, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Subject = { id: string; name: string; professor?: string };

export default function TutorIndexPage() {
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
    <div style={{ maxWidth: 560, padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, background: "#E8F1EC", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Brain size={18} color="#1B3F2F" />
        </div>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#1A1612" }}>Tutor IA</h1>
      </div>
      <p style={{ fontSize: 14, color: "#6B6259", marginBottom: 24 }}>
        Elige una materia para chatear con tu tutor personalizado.
      </p>

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 64, background: "#EDE9E2", borderRadius: 12, animation: "pulse-skeleton 1.4s ease infinite" }} />)}
          <style>{`@keyframes pulse-skeleton{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      ) : subjects.length === 0 ? (
        <div className="mn-card" style={{ padding: 32, textAlign: "center" }}>
          <BookOpen size={28} color="#C4BAAE" style={{ marginBottom: 12 }} />
          <p className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#1A1612", marginBottom: 8 }}>Sin materias todavía</p>
          <p style={{ fontSize: 13, color: "#6B6259", marginBottom: 16 }}>Agrega una materia para activar el tutor.</p>
          <Link href="/onboarding" className="mn-btn-primary" style={{ fontSize: 13 }}>Agregar materia →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subjects.map(s => (
            <Link
              key={s.id}
              href={`/tutor/${s.id}`}
              className="mn-card"
              style={{ padding: "16px 20px", textDecoration: "none", display: "flex", alignItems: "center", gap: 14, transition: "background 120ms" }}
            >
              <div style={{ width: 36, height: 36, background: "#E8F1EC", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Brain size={16} color="#1B3F2F" />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "#1A1612", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</p>
                {s.professor && <p style={{ fontSize: 12, color: "#9E9389" }}>{s.professor}</p>}
              </div>
              <span style={{ fontSize: 12, color: "#1B3F2F", fontWeight: 700 }}>Abrir →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
