// Centralized demo data — no Supabase, no real APIs, no side effects.

export type DemoFormat = "16:9" | "9:16" | "1:1";
// All values are fictional and representative of a typical Mnemora premium user.

export const DEMO_PROFILE = {
  name: "Sofía Martínez",
  firstName: "Sofía",
  email: "sofia@demo.mnemora.me",
  career: "Medicina",
  semester: "4.º semestre",
  university: "Universidad Nacional",
  plan: "Premium" as const,
  streak: 12,
  xp: 2480,
  initials: "SM",
};

export const DEMO_SUBJECTS = [
  {
    id: "anat-2",
    name: "Anatomía II",
    emoji: "🫀",
    professor: "Dr. Ramírez",
    colorBg: "#1B3F2F",
    colorLight: "#E8F3EC",
    mastery: 72,
    coverage: 72,
    dueToday: 6,
    totalConcepts: 134,
    knownConcepts: 97,
    weakConcepts: 6,
    flashcards: 128,
    documents: 2,
    classes: 4,
    estimatedGrade: 8.4,
    approvalProb: "alta" as const,
    nextExam: { title: "Parcial 2 — Anatomía II", date: "Sáb 19 Jul", daysUntil: 8 },
    topics: ["Sistema cardiovascular", "Sistema respiratorio", "Sistema nervioso", "Aparato locomotor"],
  },
  {
    id: "fisio",
    name: "Fisiología",
    emoji: "⚗️",
    professor: "Dra. Guerrero",
    colorBg: "#2D5A3D",
    colorLight: "#F0FAF3",
    mastery: 58,
    coverage: 54,
    dueToday: 8,
    totalConcepts: 98,
    knownConcepts: 57,
    weakConcepts: 12,
    flashcards: 89,
    documents: 2,
    classes: 2,
    estimatedGrade: 7.1,
    approvalProb: "media" as const,
    nextExam: { title: "Parcial 1 — Fisiología", date: "Jue 24 Jul", daysUntil: 13 },
    topics: ["Fisiología celular", "Fisiología cardíaca", "Fisiología renal"],
  },
  {
    id: "bioquim",
    name: "Bioquímica",
    emoji: "🧬",
    professor: "Dr. Aguilar",
    colorBg: "#3B7A57",
    colorLight: "#F0FDF4",
    mastery: 63,
    coverage: 61,
    dueToday: 4,
    totalConcepts: 112,
    knownConcepts: 71,
    weakConcepts: 8,
    flashcards: 67,
    documents: 1,
    classes: 1,
    estimatedGrade: 7.8,
    approvalProb: "alta" as const,
    nextExam: { title: "Parcial 1 — Bioquímica", date: "Lun 28 Jul", daysUntil: 17 },
    topics: ["Proteínas y enzimas", "Metabolismo energético", "Ácidos nucleicos"],
  },
  {
    id: "farma",
    name: "Farmacología",
    emoji: "💊",
    professor: "Dra. López",
    colorBg: "#4A5568",
    colorLight: "#F7F8FA",
    mastery: 41,
    coverage: 38,
    dueToday: 3,
    totalConcepts: 87,
    knownConcepts: 36,
    weakConcepts: 14,
    flashcards: 34,
    documents: 1,
    classes: 1,
    estimatedGrade: 6.2,
    approvalProb: "baja" as const,
    nextExam: { title: "Parcial 1 — Farmacología", date: "Jue 31 Jul", daysUntil: 20 },
    topics: ["Farmacocinética", "Farmacodinámica", "Analgésicos y antiinflamatorios"],
  },
];

export const DEMO_STATS = {
  totalFlashcards: 318,
  processedClasses: 8,
  uploadedDocuments: 5,
  upcomingExams: 3,
  coveragePct: 72,
  weakConcepts: 6,
  estimatedGrade: 8.4,
  recommendedMinutes: 18,
  streakDays: 12,
  xp: 2480,
  weeklyImprovement: 14,
  conceptsLearned: 261,
  studyHoursWeek: 3.2,
  conceptsDominatedThisWeek: 18,
};

export const DEMO_FLASHCARDS = [
  {
    id: "fc1",
    front: "¿Cuál es la función del nodo sinoauricular?",
    back: "El nodo sinoauricular (NSA) es el marcapasos natural del corazón. Genera impulsos de 60-100 lpm que inician cada latido y los propaga por las aurículas hacia el NAV.",
    subject: "Anatomía II",
    mastery: "Aprendiendo",
    topic: "Sistema cardiovascular",
  },
  {
    id: "fc2",
    front: "¿Qué diferencia el nodo AV del nodo SA?",
    back: "El NAV retarda el impulso ~120ms para completar el llenado ventricular antes de la contracción. A diferencia del NSA, no inicia el latido — solo lo retransmite con retraso.",
    subject: "Anatomía II",
    mastery: "Por revisar",
    topic: "Sistema cardiovascular",
  },
  {
    id: "fc3",
    front: "Ley de Frank-Starling",
    back: "A mayor precarga (volumen diastólico final), mayor es el estiramiento de las fibras cardíacas y, por lo tanto, mayor la fuerza de contracción. GC = FC × VS.",
    subject: "Anatomía II",
    mastery: "Dominado",
    topic: "Sistema cardiovascular",
  },
];

export const DEMO_QUIZ = [
  {
    id: "q1",
    question: "¿Cuál estructura inicia el impulso eléctrico cardíaco?",
    options: [
      { id: "a", text: "Nodo auriculoventricular (NAV)" },
      { id: "b", text: "Haz de His" },
      { id: "c", text: "Nodo sinoauricular (NSA)" },
      { id: "d", text: "Fibras de Purkinje" },
    ],
    correctId: "c",
    explanation: "El NSA es el marcapasos fisiológico del corazón. Genera 60-100 impulsos por minuto.",
    userAnswer: "c",
  },
  {
    id: "q2",
    question: "La Ley de Frank-Starling establece que:",
    options: [
      { id: "a", text: "La frecuencia cardíaca aumenta con la temperatura corporal" },
      { id: "b", text: "Mayor precarga produce mayor fuerza contráctil" },
      { id: "c", text: "El NAV regula directamente la presión arterial" },
      { id: "d", text: "Las fibras de Purkinje inician la contracción" },
    ],
    correctId: "b",
    explanation: "Mayor estiramiento diastólico → mayor fuerza → mayor volumen sistólico.",
    userAnswer: "b",
  },
  {
    id: "q3",
    question: "¿Qué función cumple el nodo auriculoventricular?",
    options: [
      { id: "a", text: "Iniciar el ritmo cardíaco a 60-100 lpm" },
      { id: "b", text: "Conducir el impulso directamente a los ventrículos" },
      { id: "c", text: "Retardar el impulso ~120ms para el llenado ventricular" },
      { id: "d", text: "Originar el ritmo sinusal" },
    ],
    correctId: "c",
    explanation: "El NAV retarda el impulso para que las aurículas terminen de vaciarse antes de la contracción ventricular.",
    userAnswer: "a", // wrong — will show as incorrect
  },
];

export const DEMO_TUTOR = [
  {
    role: "assistant" as const,
    text: "Hola, Sofía 👋 Retomamos donde lo dejamos. La última vez revisamos el sistema de conducción cardíaca y notaste dificultad con el nodo sinoauricular. ¿Trabajamos eso ahora?",
  },
  {
    role: "user" as const,
    text: "Sí. Explícame por qué fallé la pregunta sobre el nodo sinoauricular.",
  },
  {
    role: "assistant" as const,
    text: "En tu quiz confundiste su función con la del nodo auriculoventricular. Son parecidos, pero tienen roles distintos:\n\n**NSA → inicia el latido** (marcapasos, 60-100 lpm)\n**NAV → retarda el impulso** (~120ms para que las aurículas se vacíen primero)\n\nUna forma de recordarlo: **SA = Start**, **AV = Avoids rushing**.\n\n¿Practicamos con flashcards del sistema de conducción?",
  },
];

export const DEMO_CALENDAR = {
  days: [
    { day: "L", date: 14, active: true, events: [{ type: "review" as const, label: "6 repasos · Anatomía II" }] },
    { day: "M", date: 15, events: [{ type: "task" as const, label: "Lectura Cap. 8 — Fisiología" }] },
    { day: "X", date: 16, events: [{ type: "review" as const, label: "Quiz rápido — Anatomía" }] },
    { day: "J", date: 17, events: [{ type: "task" as const, label: "Entrega — Informe bioquímica" }] },
    { day: "V", date: 18, events: [{ type: "review" as const, label: "Repaso final" }] },
    { day: "S", date: 19, events: [{ type: "exam" as const, label: "Parcial — Anatomía II" }] },
    { day: "D", date: 20, events: [] },
  ],
  examPlan: [
    { day: "Hoy — lun 14", task: "Sistema de conducción cardíaca", mins: 25, done: false },
    { day: "Mañana — mar 15", task: "Sistema respiratorio", mins: 20, done: false },
    { day: "Miércoles 16", task: "Quiz acumulativo", mins: 15, done: false },
    { day: "Viernes 18", task: "Repaso final + conceptos débiles", mins: 30, done: false },
  ],
};

export const DEMO_ROADMAP = {
  dominated: [
    "Estructuras del corazón",
    "Ciclo cardíaco",
    "Presión arterial sistólica/diastólica",
    "Sístole y diástole",
    "Venas y arterias principales",
    "Pericardio y epicardio",
  ],
  inProgress: [
    "Sistema de conducción eléctrica",
    "Precarga y poscarga",
    "Vasos coronarios",
    "Circulación pulmonar y sistémica",
  ],
  toLearn: [
    "Nodo sinoauricular (NSA) ⚠️",
    "Regulación autonómica cardíaca",
    "Farmacología cardíaca básica",
    "Arritmias: clasificación y causas",
  ],
};

export const DEMO_DOCUMENT = {
  name: "Programa — Anatomía II — Semestre 4.pdf",
  size: "1.2 MB",
  pages: 14,
  stages: [
    "Subiendo documento…",
    "Leyendo el programa…",
    "Detectando fechas importantes…",
    "Identificando conceptos clave…",
    "Creando flashcards automáticas…",
    "Preparando el calendario…",
    "Actualizando el Learning Engine…",
  ],
  result: { exams: 2, concepts: 47, flashcards: 36, calendarEvents: 4 },
};

export const DEMO_CLASS_STUDIO = {
  title: "Sistema cardiovascular — Clase 4",
  subject: "Anatomía II",
  recordedDuration: "48 min",
  stages: [
    "Transcribiendo audio…",
    "Organizando apuntes por tema…",
    "Detectando conceptos clave…",
    "Generando flashcards…",
    "Creando quiz…",
    "Actualizando el calendario…",
    "Analizando tu perfil de aprendizaje…",
  ],
  result: { summary: 1, notes: 12, flashcards: 24, quizQuestions: 10, tasks: 3, examMentions: 1 },
  notes: [
    { type: "title" as const, text: "Sistema de Conducción Eléctrica" },
    { type: "concept" as const, text: "Nodo Sinoauricular (NSA): marcapasos natural, genera 60-100 lpm" },
    { type: "concept" as const, text: "Nodo Auriculoventricular (NAV): retarda impulso ~120ms" },
    { type: "formula" as const, text: "GC = FC × VS — Gasto Cardíaco = Frecuencia × Volumen Sistólico" },
    { type: "task" as const, text: "Tarea: leer capítulo 8 · entrega viernes 18" },
    { type: "exam" as const, text: "Parcial 2 mencionado: sábado 19 de julio" },
    { type: "concept" as const, text: "Ley de Frank-Starling: mayor precarga → mayor contracción" },
    { type: "concept" as const, text: "Fibras de Purkinje: conducción rápida a paredes ventriculares" },
  ],
};
