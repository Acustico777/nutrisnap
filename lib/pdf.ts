'use client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WorkoutPlan, Profile } from './types';
import { GOAL_LABELS } from './nutrition';

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
