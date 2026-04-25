'use client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WorkoutPlan, MealPlan, Profile } from './types';
import { GOAL_LABELS } from './nutrition';

// ─── Weekly Report PDF ──────────────────────────────────────────────────────

interface WeekTotals {
  days_logged: number;
  meals_count: number;
  calories_avg: number;
  protein_avg: number;
  carbs_avg: number;
  fat_avg: number;
  water_avg_ml: number;
  workouts_count: number;
  workout_volume_total: number;
  weight_change_kg: number | null;
  weight_start: number | null;
  weight_end: number | null;
}

interface WeeklyReport {
  week_start: string;
  week_end: string;
  totals: WeekTotals;
  adherence: {
    calories_target: number;
    calories_avg: number;
    calories_pct: number;
    protein_target: number;
    protein_avg: number;
    protein_pct: number;
  };
  daily: { date: string; calories: number; protein_g: number; workouts: number }[];
  insights: string[];
}

export function generateWeeklyReportPDF(report: WeeklyReport, profile: Profile | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('NutriSnap — Report Settimanale', 15, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const startFmt = new Date(report.week_start + 'T00:00:00').toLocaleDateString('it-IT');
  const endFmt = new Date(report.week_end + 'T00:00:00').toLocaleDateString('it-IT');
  doc.text(`${startFmt} — ${endFmt}`, pageW - 15, 18, { align: 'right' });

  let y = 40;
  doc.setTextColor(20);

  // User info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Utente', 15, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${profile?.display_name ?? profile?.email ?? '—'}`, 15, y);
  y += 5;
  doc.text(`Obiettivo: ${profile?.goal ? (GOAL_LABELS[profile.goal] ?? profile.goal) : '—'}`, 15, y);
  y += 10;

  // Stats table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text('Riepilogo settimana', 15, y);
  y += 2;
  doc.setTextColor(20);

  autoTable(doc, {
    startY: y + 2,
    head: [['Metrica', 'Valore']],
    body: [
      ['Giorni loggati', `${report.totals.days_logged}/7`],
      ['Pasti totali', `${report.totals.meals_count}`],
      ['Calorie medie/giorno', `${report.totals.calories_avg} kcal (target: ${report.adherence.calories_target})`],
      ['Proteine medie/giorno', `${report.totals.protein_avg} g (target: ${report.adherence.protein_target})`],
      ['Carboidrati medi/giorno', `${report.totals.carbs_avg} g`],
      ['Grassi medi/giorno', `${report.totals.fat_avg} g`],
      ['Acqua media/giorno', report.totals.water_avg_ml > 0 ? `${Math.round(report.totals.water_avg_ml / 100) / 10} L` : '—'],
      ['Allenamenti', `${report.totals.workouts_count}`],
      ['Volume allenamento', `${report.totals.workout_volume_total} kg·rep`],
      ['Variazione peso', report.totals.weight_change_kg !== null ? `${report.totals.weight_change_kg > 0 ? '+' : ''}${report.totals.weight_change_kg} kg` : '—'],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    margin: { left: 15, right: 15 },
    theme: 'striped',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Daily breakdown
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text('Dettaglio giornaliero', 15, y);
  y += 2;
  doc.setTextColor(20);

  autoTable(doc, {
    startY: y + 2,
    head: [['Data', 'Calorie', 'Proteine', 'Allenamenti']],
    body: report.daily.map((d) => {
      const date = new Date(d.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' });
      return [date, d.calories > 0 ? `${d.calories} kcal` : '—', d.protein_g > 0 ? `${d.protein_g} g` : '—', d.workouts > 0 ? `${d.workouts}` : '—'];
    }),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    margin: { left: 15, right: 15 },
    theme: 'striped',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // Insights
  if (report.insights.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text('Insights', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20);
    report.insights.forEach((ins) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(`• ${ins}`, pageW - 30);
      lines.forEach((l: string) => { doc.text(l, 15, y); y += 4.5; });
    });
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`NutriSnap • ${i}/${pages}`, pageW - 15, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }

  doc.save(`report-settimanale-${report.week_start}.pdf`);
}

export function generateWorkoutPDF(plan: WorkoutPlan, profile: Profile | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NutriSnap — Scheda Allenamento', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(plan.created_at).toLocaleDateString('it-IT'), pageW - 15, 18, { align: 'right' });

  let y = 40;
  doc.setTextColor(20);

  // User block
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dati utente', 15, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = [
    `Nome: ${profile?.display_name ?? profile?.email ?? '—'}`,
    `Sesso: ${profile?.sex === 'male' ? 'Uomo' : profile?.sex === 'female' ? 'Donna' : '—'}`,
    `Peso: ${profile?.weight_kg ?? '—'} kg | Altezza: ${profile?.height_cm ?? '—'} cm`,
    `Obiettivo: ${plan.goal ? GOAL_LABELS[plan.goal] : '—'}`,
    `Giorni / settimana: ${plan.days_per_week ?? '—'} | Luogo: ${plan.location === 'gym' ? 'Palestra' : 'Casa'}`,
  ];
  lines.forEach((l) => { doc.text(l, 15, y); y += 5; });
  y += 4;

  // Each day as a section with autoTable
  plan.plan_data.days.forEach((day) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129);
    doc.text(day.day_label, 15, y);
    y += 2;
    doc.setTextColor(20);
    autoTable(doc, {
      startY: y + 2,
      head: [['Esercizio', 'Muscolo', 'Serie', 'Ripetizioni', 'Recupero']],
      body: day.exercises.map((e) => [
        e.exercise_name,
        e.muscle_group,
        String(e.sets),
        e.reps,
        `${e.rest_sec}s`,
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      margin: { left: 15, right: 15 },
      theme: 'striped',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `NutriSnap • ${i}/${pages}`,
      pageW - 15,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  doc.save(`scheda-allenamento-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateMealPlanPDF(plan: MealPlan, profile: Profile | null) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NutriSnap — Piano Pasti', 15, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(plan.created_at).toLocaleDateString('it-IT'), pageW - 15, 18, { align: 'right' });

  let y = 40;
  doc.setTextColor(20);

  // User block
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dati utente', 15, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = [
    `Nome: ${profile?.display_name ?? profile?.email ?? '—'}`,
    `Tipo piano: ${plan.plan_type === 'daily' ? 'Giornaliero' : 'Settimanale'}`,
    `Preferenza dieta: ${plan.diet_preference ?? '—'}`,
    `Calorie target: ${plan.target_calories ?? '—'} kcal`,
  ];
  lines.forEach((l) => { doc.text(l, 15, y); y += 5; });
  y += 4;

  // Each day
  for (const day of plan.plan_data.days) {
    if (y > 260) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129);
    doc.text(day.day_label, 15, y);
    y += 6;
    doc.setTextColor(20);

    for (const meal of day.meals) {
      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${meal.meal_type.toUpperCase()} — ${meal.name}`, 15, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80);
      const descLines = doc.splitTextToSize(meal.description, pageW - 30);
      descLines.forEach((l: string) => { doc.text(l, 15, y); y += 4; });
      doc.setTextColor(20);

      // Macros inline
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        `${meal.calories} kcal  |  P ${meal.protein_g}g  |  C ${meal.carbs_g}g  |  G ${meal.fat_g}g`,
        15, y
      );
      y += 5;

      // Ingredients
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Ingredienti: ' + meal.ingredients.join(', '), 15, y);
      y += 5;

      // Steps (if any)
      if (meal.steps && meal.steps.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        meal.steps.forEach((step, si) => {
          if (y > 270) { doc.addPage(); y = 20; }
          const stepLines = doc.splitTextToSize(`${si + 1}. ${step}`, pageW - 30);
          stepLines.forEach((l: string) => { doc.text(l, 18, y); y += 4; });
        });
        doc.setFont('helvetica', 'normal');
      }

      // Separator
      doc.setDrawColor(200);
      doc.line(15, y, pageW - 15, y);
      y += 4;
    }

    y += 4;
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `NutriSnap • ${i}/${pages}`,
      pageW - 15,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  doc.save(`piano-pasti-${new Date().toISOString().slice(0, 10)}.pdf`);
}
