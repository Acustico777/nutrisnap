export interface GlossaryTerm {
  label: string;
  short: string;
  full: string;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  bmr: {
    label: 'BMR',
    short: 'Metabolismo basale: calorie che bruci a riposo.',
    full: 'Il Basal Metabolic Rate (BMR), o metabolismo basale, è l\'energia che il tuo corpo consuma a riposo per le funzioni vitali (respirazione, circolazione, temperatura). Calcolato con la formula Mifflin-St Jeor.',
  },
  tdee: {
    label: 'TDEE',
    short: 'Calorie totali giornaliere (BMR + attività).',
    full: 'Total Daily Energy Expenditure: il fabbisogno calorico complessivo, ottenuto moltiplicando il BMR per un fattore basato sul livello di attività fisica (sedentario, leggero, moderato, attivo, molto attivo).',
  },
  cut: {
    label: 'Cut',
    short: 'Fase di dimagrimento controllato.',
    full: 'Periodo di deficit calorico (~20% sotto il TDEE) finalizzato a perdere grasso preservando massa muscolare. Si abbinano alta proteina e allenamento di forza.',
  },
  lean_bulk: {
    label: 'Lean bulk',
    short: 'Crescita muscolare con poco grasso.',
    full: 'Aumento di peso lento e controllato in surplus calorico moderato (~10-15% sopra il TDEE), per costruire muscolo limitando l\'accumulo di grasso.',
  },
  surplus: {
    label: 'Surplus calorico',
    short: 'Mangi più di quanto consumi.',
    full: 'Quando l\'apporto calorico è superiore al TDEE: il corpo accumula peso (idealmente muscolo se ti alleni di forza).',
  },
  deficit: {
    label: 'Deficit calorico',
    short: 'Mangi meno di quanto consumi.',
    full: 'Quando l\'apporto calorico è inferiore al TDEE: il corpo perde peso attingendo dalle riserve energetiche.',
  },
  macros: {
    label: 'Macronutrienti',
    short: 'Proteine, carboidrati e grassi.',
    full: 'I tre nutrienti che forniscono energia: proteine (4 kcal/g), carboidrati (4 kcal/g) e grassi (9 kcal/g). La loro proporzione cambia in base all\'obiettivo.',
  },
  protein: {
    label: 'Proteine',
    short: 'Mattoni dei muscoli (4 kcal/g).',
    full: 'Macronutriente fondamentale per la sintesi muscolare e la riparazione dei tessuti. Fonti: carne, pesce, uova, legumi, latticini. Raccomandato 1.6-2.2 g per kg di peso corporeo se ti alleni.',
  },
  carbs: {
    label: 'Carboidrati',
    short: 'Energia rapida (4 kcal/g).',
    full: 'La principale fonte di energia per cervello e muscoli. Si dividono in semplici (zuccheri) e complessi (cereali, tuberi). Cruciali per allenamenti intensi.',
  },
  fat: {
    label: 'Grassi',
    short: 'Energia densa, ormoni (9 kcal/g).',
    full: 'Indispensabili per la produzione ormonale e l\'assorbimento di vitamine. Preferire fonti insature (olio EVO, frutta secca, pesce) e non scendere sotto ~0.6 g/kg.',
  },
  bmi: {
    label: 'BMI',
    short: 'Indice di massa corporea (peso/altezza²).',
    full: 'Body Mass Index: peso in kg diviso per il quadrato dell\'altezza in metri. Range: <18.5 sottopeso, 18.5-24.9 normopeso, 25-29.9 sovrappeso, ≥30 obesità. Limite: non distingue muscolo da grasso.',
  },
  basal_metabolism: {
    label: 'Metabolismo basale',
    short: 'Calorie minime per vivere.',
    full: 'Sinonimo di BMR: l\'energia minima necessaria al corpo a riposo completo per mantenere le funzioni vitali.',
  },
  caloric_need: {
    label: 'Fabbisogno calorico',
    short: 'Calorie giornaliere totali necessarie.',
    full: 'Il numero di calorie di cui il tuo corpo ha bisogno ogni giorno, considerando metabolismo basale e livello di attività. Sinonimo di TDEE.',
  },
  lean_mass: {
    label: 'Massa magra',
    short: 'Tutto ciò che non è grasso.',
    full: 'Comprende muscoli, ossa, organi e acqua. È l\'obiettivo da preservare durante un cut e da aumentare durante un lean bulk.',
  },
  fat_mass: {
    label: 'Massa grassa',
    short: 'Quantità di grasso corporeo.',
    full: 'Il peso del tessuto adiposo nel corpo. Si misura con plicometria, bioimpedenza o DEXA. Range salutari: ~10-20% per uomini, 18-28% per donne.',
  },
};

export function getTerm(key: string): GlossaryTerm | null {
  return GLOSSARY[key] ?? null;
}
