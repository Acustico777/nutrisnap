-- NutriSnap schema v3 — additive migration only
-- Run this on top of schema.sql + schema-v2.sql

-- ─── A) profiles: new columns ────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal text default 'maintain' check (goal in ('cut','lean_bulk','maintain'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS days_per_week int;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_location text check (workout_location in ('gym','home'));

-- ─── B) exercises table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exercises (
  id text primary key,
  name_it text not null,
  muscle_group text not null check (muscle_group in ('chest','back','shoulders','biceps','triceps','forearms','abs','quadriceps','hamstrings','glutes','calves','traps','full_body')),
  secondary_muscles text[] default '{}',
  equipment text not null check (equipment in ('gym','bodyweight')),
  description_it text not null,
  gif_url text,
  default_sets int default 3,
  default_reps text default '8-12',
  default_rest_sec int default 60,
  created_at timestamptz default now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone authenticated reads exercises" ON public.exercises;
CREATE POLICY "anyone authenticated reads exercises" ON public.exercises FOR SELECT TO authenticated USING (true);

-- ─── C) workout_plans table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  goal text,
  days_per_week int,
  location text check (location in ('gym','home')),
  plan_data jsonb not null,
  created_at timestamptz default now()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own workout_plans" ON public.workout_plans;
CREATE POLICY "users read own workout_plans" ON public.workout_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users insert own workout_plans" ON public.workout_plans;
CREATE POLICY "users insert own workout_plans" ON public.workout_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete own workout_plans" ON public.workout_plans;
CREATE POLICY "users delete own workout_plans" ON public.workout_plans
  FOR DELETE USING (auth.uid() = user_id);

-- ─── D) Seed exercises ────────────────────────────────────────────────────────

-- CHEST (8)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('bench_press', 'Panca piana con bilanciere', 'chest', ARRAY['triceps','shoulders'], 'gym', 'L''esercizio fondamentale per il petto. Disteso sulla panca, abbassa il bilanciere al petto e spingi verso l''alto attivando i pettorali.', '/exercises/chest/bench_press.gif', 4, '6-10', 90),
('incline_db_press', 'Panca inclinata con manubri', 'chest', ARRAY['shoulders','triceps'], 'gym', 'Variante inclinata che enfatizza la parte alta del petto. Siediti su una panca a 30-45° e spingi i manubri verso l''alto.', '/exercises/chest/incline_db_press.gif', 4, '8-12', 90),
('dips_chest', 'Dip alle parallele (petto)', 'chest', ARRAY['triceps','shoulders'], 'bodyweight', 'Alle parallele, inclina il busto in avanti per aumentare l''attivazione del petto. Scendi fino a 90° di flessione del gomito.', '/exercises/chest/dips_chest.gif', 3, '8-12', 75),
('push_up', 'Piegamenti sulle braccia', 'chest', ARRAY['triceps','shoulders'], 'bodyweight', 'Posizione plank, abbassa il petto al pavimento e spingi fino a braccia tese. Ottimo esercizio a corpo libero per il petto.', '/exercises/chest/push_up.gif', 3, '12-20', 45),
('wide_push_up', 'Piegamenti con mani larghe', 'chest', ARRAY['triceps'], 'bodyweight', 'Come il push-up classico ma con le mani più distanti delle spalle, aumentando così il lavoro dei pettorali.', '/exercises/chest/wide_push_up.gif', 3, '12-20', 45),
('decline_push_up', 'Piegamenti in declinata', 'chest', ARRAY['triceps','shoulders'], 'bodyweight', 'Posiziona i piedi su una superficie rialzata per enfatizzare la parte bassa del petto durante il movimento.', '/exercises/chest/decline_push_up.gif', 3, '10-15', 45),
('cable_fly', 'Croci ai cavi', 'chest', ARRAY[]::text[], 'gym', 'Esercizio di isolamento per i pettorali. Mantieni i gomiti leggermente flessi e porta le maniglie al centro in un arco ampio.', '/exercises/chest/cable_fly.gif', 3, '12-15', 60),
('machine_chest_press', 'Distensioni al pectoral machine', 'chest', ARRAY['triceps','shoulders'], 'gym', 'Macchina guidata ideale per isolare i pettorali in sicurezza. Spingi le maniglie in avanti fino a braccia quasi tese.', '/exercises/chest/machine_chest_press.gif', 3, '10-15', 60)
ON CONFLICT (id) DO NOTHING;

-- BACK (9)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('pull_up', 'Trazioni alla sbarra (presa prona)', 'back', ARRAY['biceps','forearms'], 'bodyweight', 'Appeso alla sbarra con presa prona, tira il corpo verso l''alto fino a portare il mento sopra la sbarra. Esercizio fondamentale per la schiena.', '/exercises/back/pull_up.gif', 4, '6-10', 90),
('chin_up', 'Trazioni con presa supina', 'back', ARRAY['biceps'], 'bodyweight', 'Come le trazioni classiche ma con presa supina (palmi verso di te). Aumenta il coinvolgimento dei bicipiti.', '/exercises/back/chin_up.gif', 4, '6-10', 90),
('lat_pulldown', 'Lat machine (pulldown)', 'back', ARRAY['biceps','forearms'], 'gym', 'Seduto al cavo alto, tira la barra fino al petto mantenendo il busto leggermente inclinato. Lavora prevalentemente il gran dorsale.', '/exercises/back/lat_pulldown.gif', 4, '8-12', 90),
('barbell_row', 'Rematore con bilanciere', 'back', ARRAY['biceps','traps'], 'gym', 'Busto inclinato a circa 45°, tira il bilanciere verso l''ombelico. Esercizio compound fondamentale per spessore e forza della schiena.', '/exercises/back/barbell_row.gif', 4, '6-10', 90),
('db_row', 'Rematore con manubrio', 'back', ARRAY['biceps'], 'gym', 'Appoggia un ginocchio sulla panca, tira il manubrio verso il fianco mantenendo la schiena piatta. Ottimo per lavoro unilaterale.', '/exercises/back/db_row.gif', 3, '10-12', 75),
('t_bar_row', 'Rematore al T-bar', 'back', ARRAY['biceps','traps'], 'gym', 'Con il petto sul supporto inclinato, tira la barra verso il petto. Esercizio eccellente per lo spessore della schiena.', '/exercises/back/t_bar_row.gif', 4, '8-12', 90),
('seated_cable_row', 'Rematore al cavo basso (seduto)', 'back', ARRAY['biceps'], 'gym', 'Seduto al cavo, tira il triangolo verso il basso addome mantenendo i gomiti vicini ai fianchi. Ottimo per i romboidi.', '/exercises/back/seated_cable_row.gif', 3, '10-15', 60),
('inverted_row', 'Rematore inverso a corpo libero', 'back', ARRAY['biceps'], 'bodyweight', 'Appeso sotto una sbarra bassa con il corpo inclinato, tira il petto verso la sbarra. Ottima alternativa bodyweight al rematore.', '/exercises/back/inverted_row.gif', 3, '10-15', 60),
('deadlift', 'Stacco da terra', 'back', ARRAY['glutes','hamstrings','traps','forearms'], 'gym', 'Il re degli esercizi compound. Da terra, mantieni la schiena dritta e spingi con i piedi sollevando il bilanciere fino ai fianchi.', '/exercises/back/deadlift.gif', 4, '5-8', 120)
ON CONFLICT (id) DO NOTHING;

-- SHOULDERS (7)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('overhead_press', 'Lento avanti con bilanciere', 'shoulders', ARRAY['triceps','traps'], 'gym', 'In piedi o seduto, spingi il bilanciere sopra la testa fino a braccia tese. Esercizio compound fondamentale per le spalle.', '/exercises/shoulders/overhead_press.gif', 4, '6-10', 90),
('db_shoulder_press', 'Lento avanti con manubri', 'shoulders', ARRAY['triceps'], 'gym', 'Seduto con la schiena supportata, spingi i manubri verso l''alto. Maggiore libertà di movimento rispetto al bilanciere.', '/exercises/shoulders/db_shoulder_press.gif', 4, '8-12', 90),
('lateral_raise', 'Alzate laterali', 'shoulders', ARRAY[]::text[], 'gym', 'Con i manubri ai fianchi, alza le braccia lateralmente fino all''altezza delle spalle. Isola il deltoide medio.', '/exercises/shoulders/lateral_raise.gif', 3, '12-15', 60),
('front_raise', 'Alzate frontali', 'shoulders', ARRAY[]::text[], 'gym', 'Con i manubri davanti alle cosce, alza le braccia in avanti fino all''altezza delle spalle. Enfatizza il deltoide anteriore.', '/exercises/shoulders/front_raise.gif', 3, '12-15', 60),
('rear_delt_fly', 'Croci inverse (deltoide posteriore)', 'shoulders', ARRAY['traps'], 'gym', 'Busto inclinato, apri le braccia lateralmente. Isola il deltoide posteriore spesso trascurato nell''allenamento.', '/exercises/shoulders/rear_delt_fly.gif', 3, '12-15', 60),
('pike_push_up', 'Push-up a picco', 'shoulders', ARRAY['triceps'], 'bodyweight', 'In posizione a V rovesciata con i fianchi in alto, fletti i gomiti abbassando la testa verso il pavimento. Alternativa bodyweight al lento avanti.', '/exercises/shoulders/pike_push_up.gif', 3, '10-15', 60),
('arnold_press', 'Arnold press', 'shoulders', ARRAY['triceps'], 'gym', 'Inizia con i manubri davanti alle spalle e ruota i polsi durante la spinta verso l''alto. Nomina da Arnold Schwarzenegger, attiva tutti e tre i capi del deltoide.', '/exercises/shoulders/arnold_press.gif', 3, '10-12', 75)
ON CONFLICT (id) DO NOTHING;

-- BICEPS (5)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('barbell_curl', 'Curl con bilanciere', 'biceps', ARRAY['forearms'], 'gym', 'In piedi con il bilanciere, fletti i gomiti portando il peso verso le spalle. L''esercizio base per i bicipiti.', '/exercises/biceps/barbell_curl.gif', 3, '10-15', 60),
('db_curl', 'Curl alternato con manubri', 'biceps', ARRAY['forearms'], 'gym', 'In piedi con un manubrio per mano, curla le braccia alternativamente. Permette supinazione completa durante il movimento.', '/exercises/biceps/db_curl.gif', 3, '10-15', 60),
('hammer_curl', 'Curl martello', 'biceps', ARRAY['forearms'], 'gym', 'Come il curl con manubri ma con presa neutra (pollici verso l''alto). Lavora brachiale e brachioradiale oltre ai bicipiti.', '/exercises/biceps/hammer_curl.gif', 3, '10-15', 60),
('concentration_curl', 'Curl di concentrazione', 'biceps', ARRAY[]::text[], 'gym', 'Seduto, appoggia il gomito all''interno della coscia e curla il manubrio lentamente. Ottimo per isolare il picco del bicipite.', '/exercises/biceps/concentration_curl.gif', 3, '12-15', 60),
('bodyweight_chin_up_biceps', 'Trazioni supine per bicipiti', 'biceps', ARRAY['back'], 'bodyweight', 'Trazioni con presa supina ravvicinata per massimizzare l''attivazione dei bicipiti. Il miglior esercizio compound bodyweight per le braccia.', '/exercises/biceps/bodyweight_chin_up_biceps.gif', 3, '8-12', 75)
ON CONFLICT (id) DO NOTHING;

-- TRICEPS (6)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('close_grip_bench', 'Panca piana presa stretta', 'triceps', ARRAY['chest','shoulders'], 'gym', 'Come la panca piana ma con la presa ravvicinata (spalle larghezza). Enfatizza i tricipiti rispetto ai pettorali.', '/exercises/triceps/close_grip_bench.gif', 4, '8-12', 90),
('dips_triceps', 'Dip alle parallele (tricipiti)', 'triceps', ARRAY['chest','shoulders'], 'bodyweight', 'Alle parallele con il busto eretto per massimizzare il lavoro dei tricipiti. Scendi lentamente e spingi fino a braccia tese.', '/exercises/triceps/dips_triceps.gif', 3, '10-15', 75),
('tricep_pushdown', 'Pushdown ai cavi (tricipiti)', 'triceps', ARRAY[]::text[], 'gym', 'Al cavo alto, spingi la barra verso il basso mantenendo i gomiti fissi ai fianchi. Ottimo esercizio di isolamento per i tricipiti.', '/exercises/triceps/tricep_pushdown.gif', 3, '12-15', 60),
('overhead_tricep_extension', 'Estensione tricipiti sopra la testa', 'triceps', ARRAY[]::text[], 'gym', 'Con un manubrio sopra la testa, abbassa lentamente dietro la nuca e riporta su. Allunga completamente il lungo capo del tricipite.', '/exercises/triceps/overhead_tricep_extension.gif', 3, '12-15', 60),
('diamond_push_up', 'Push-up diamante', 'triceps', ARRAY['chest'], 'bodyweight', 'Push-up con le mani unite a formare un diamante sotto il petto. Massimizza l''attivazione dei tricipiti nel movimento bodyweight.', '/exercises/triceps/diamond_push_up.gif', 3, '10-15', 45),
('skull_crushers', 'Skull crushers (French press)', 'triceps', ARRAY[]::text[], 'gym', 'Disteso sulla panca, abbassa il bilanciere curvo verso la fronte flettendo i gomiti. Eccellente per la massa del tricipite.', '/exercises/triceps/skull_crushers.gif', 3, '10-15', 60)
ON CONFLICT (id) DO NOTHING;

-- FOREARMS (3)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('wrist_curl', 'Curl del polso', 'forearms', ARRAY[]::text[], 'gym', 'Seduto con l''avambraccio appoggiato sulla coscia, fletti il polso sollevando il manubrio. Lavora i flessori dell''avambraccio.', '/exercises/forearms/wrist_curl.gif', 3, '15-20', 45),
('reverse_wrist_curl', 'Curl del polso inverso', 'forearms', ARRAY[]::text[], 'gym', 'Come il curl del polso ma con presa prona per allenare gli estensori del polso e il brachioradiale.', '/exercises/forearms/reverse_wrist_curl.gif', 3, '15-20', 45),
('farmer_carry', 'Cammino del contadino', 'forearms', ARRAY['traps','abs'], 'gym', 'Cammina con manubri pesanti ai lati per migliorare la presa e la resistenza degli avambracci. Esercizio funzionale eccellente.', '/exercises/forearms/farmer_carry.gif', 3, '20-30m', 60)
ON CONFLICT (id) DO NOTHING;

-- ABS (8)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('plank', 'Plank', 'abs', ARRAY['shoulders','glutes'], 'bodyweight', 'Posizione di plank su avambracci e punte dei piedi, mantieni il core attivo. Fondamentale per la stabilità e resistenza addominale.', '/exercises/abs/plank.gif', 3, '30-60 sec', 45),
('crunch', 'Crunch addominali', 'abs', ARRAY[]::text[], 'bodyweight', 'Disteso, mani dietro la testa, solleva le spalle staccandole da terra contraendo gli addominali. L''esercizio base per il retto addominale.', '/exercises/abs/crunch.gif', 3, '15-20', 45),
('bicycle_crunch', 'Crunch bicicletta', 'abs', ARRAY[]::text[], 'bodyweight', 'Come il crunch ma con rotazione del busto alternando gomito e ginocchio opposto. Attiva obliqui e retto addominale simultaneamente.', '/exercises/abs/bicycle_crunch.gif', 3, '16-24', 45),
('leg_raise', 'Sollevamento gambe', 'abs', ARRAY['hip_flexors'], 'bodyweight', 'Disteso con la schiena a terra, solleva le gambe tese fino a 90° e abbassa lentamente. Enfatizza la porzione bassa del retto addominale.', '/exercises/abs/leg_raise.gif', 3, '12-20', 45),
('hanging_leg_raise', 'Sollevamento gambe alla sbarra', 'abs', ARRAY['forearms','hip_flexors'], 'gym', 'Appeso alla sbarra, solleva le gambe (piegate o tese) verso il petto. Versione avanzata ad alta intensità per gli addominali bassi.', '/exercises/abs/hanging_leg_raise.gif', 3, '10-15', 60),
('mountain_climber', 'Mountain climber', 'abs', ARRAY['shoulders','chest'], 'bodyweight', 'Posizione di push-up, porta alternativamente le ginocchia verso il petto in modo rapido. Cardio e core training combinati.', '/exercises/abs/mountain_climber.gif', 3, '20-30', 45),
('russian_twist', 'Russian twist', 'abs', ARRAY[]::text[], 'bodyweight', 'Seduto con le gambe sollevate, ruota il busto da un lato all''altro. Con o senza peso, lavora intensamente gli obliqui.', '/exercises/abs/russian_twist.gif', 3, '16-24', 45),
('ab_wheel', 'Ab wheel (ruota addominali)', 'abs', ARRAY['shoulders','lats'], 'gym', 'Con la ruota a terra, estendi il corpo avanti mantenendo il core attivo, poi torna alla posizione iniziale. Esercizio avanzato per addominali e stabilità.', '/exercises/abs/ab_wheel.gif', 3, '8-15', 60)
ON CONFLICT (id) DO NOTHING;

-- QUADRICEPS (7)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('back_squat', 'Squat con bilanciere', 'quadriceps', ARRAY['glutes','hamstrings','abs'], 'gym', 'Il re degli esercizi per le gambe. Con il bilanciere sulle spalle, scendi fino a quando le cosce sono parallele al pavimento e torna su.', '/exercises/quadriceps/back_squat.gif', 4, '6-10', 120),
('front_squat', 'Front squat', 'quadriceps', ARRAY['glutes','abs','shoulders'], 'gym', 'Con il bilanciere sulla clavicola, scendi in squat mantenendo il busto eretto. Maggior enfasi sui quadricipiti rispetto allo squat classico.', '/exercises/quadriceps/front_squat.gif', 4, '6-10', 120),
('leg_press', 'Leg press', 'quadriceps', ARRAY['glutes','hamstrings'], 'gym', 'Sulla pressa, spingi la piattaforma con i piedi mantenendo la schiena appoggiata al sedile. Sicuro e efficace per quadricipiti e glutei.', '/exercises/quadriceps/leg_press.gif', 4, '10-15', 90),
('lunge_quads', 'Affondi', 'quadriceps', ARRAY['glutes','hamstrings'], 'bodyweight', 'Fai un passo lungo in avanti abbassando il ginocchio posteriore quasi a terra, poi torna alla posizione di partenza. Ottimo per equilibrio e unilaterale.', '/exercises/quadriceps/lunge_quads.gif', 3, '10-15', 60),
('bulgarian_split_squat', 'Bulgarian split squat', 'quadriceps', ARRAY['glutes','hamstrings'], 'bodyweight', 'Con il piede posteriore su una panca, scendi in squat monogamba. Esercizio avanzato eccellente per quadricipiti e glutei.', '/exercises/quadriceps/bulgarian_split_squat.gif', 3, '8-12', 75),
('goblet_squat', 'Goblet squat', 'quadriceps', ARRAY['glutes','abs'], 'gym', 'Tieni un manubrio o kettlebell al petto e scendi in squat con il busto eretto. Ottimo per imparare la tecnica dello squat.', '/exercises/quadriceps/goblet_squat.gif', 3, '12-15', 60),
('bodyweight_squat', 'Squat a corpo libero', 'quadriceps', ARRAY['glutes','hamstrings'], 'bodyweight', 'Squat senza peso, ottimo per riscaldamento e per principianti. Concentra sull''esecuzione tecnica perfetta.', '/exercises/quadriceps/bodyweight_squat.gif', 3, '15-20', 45)
ON CONFLICT (id) DO NOTHING;

-- HAMSTRINGS (5)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('romanian_deadlift', 'Stacco rumeno', 'hamstrings', ARRAY['glutes','lower_back'], 'gym', 'Con il bilanciere, scendi mantenendo le gambe quasi tese sentendo lo stiramento nei bicipiti femorali. Ottimo per flessori e glutei.', '/exercises/hamstrings/romanian_deadlift.gif', 4, '8-12', 90),
('leg_curl', 'Leg curl (prona)', 'hamstrings', ARRAY[]::text[], 'gym', 'Sdraiato sulla macchina apposita, porta i talloni verso i glutei contro resistenza. L''esercizio di isolamento per excelência per i bicipiti femorali.', '/exercises/hamstrings/leg_curl.gif', 3, '12-15', 60),
('good_morning', 'Good morning', 'hamstrings', ARRAY['glutes','lower_back'], 'gym', 'Con il bilanciere sulle spalle, inclina il busto in avanti mantenendo la schiena dritta, poi torna. Ottimo per catena posteriore.', '/exercises/hamstrings/good_morning.gif', 3, '10-12', 75),
('glute_bridge_hamstrings', 'Hip thrust per femorali', 'hamstrings', ARRAY['glutes'], 'bodyweight', 'Disteso con le spalle su una panca, spingi i fianchi verso l''alto contraendo glutei e femorali. Esercizio versatile per la catena posteriore.', '/exercises/hamstrings/glute_bridge_hamstrings.gif', 3, '12-15', 60),
('single_leg_rdl', 'Stacco rumeno monogamba', 'hamstrings', ARRAY['glutes','abs'], 'bodyweight', 'Stacco rumeno eseguito su una gamba sola per lavorare su equilibrio e forza unilaterale dei bicipiti femorali.', '/exercises/hamstrings/single_leg_rdl.gif', 3, '10-12', 75)
ON CONFLICT (id) DO NOTHING;

-- GLUTES (5)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('hip_thrust', 'Hip thrust con bilanciere', 'glutes', ARRAY['hamstrings'], 'gym', 'Con le spalle su una panca e il bilanciere sui fianchi, spingi i fianchi verso l''alto contraendo i glutei. L''esercizio più efficace per i glutei.', '/exercises/glutes/hip_thrust.gif', 4, '10-15', 90),
('glute_bridge', 'Ponte glutei', 'glutes', ARRAY['hamstrings'], 'bodyweight', 'Disteso a terra, spingi i fianchi verso il soffitto contraendo i glutei. Versione bodyweight dell''hip thrust, ottima per principianti.', '/exercises/glutes/glute_bridge.gif', 3, '15-20', 45),
('kickback', 'Kickback ai cavi', 'glutes', ARRAY[]::text[], 'gym', 'Con la caviglia al cavo basso, porta la gamba indietro contraendo il gluteo. Ottimo esercizio di isolamento per la parte superiore del gluteo.', '/exercises/glutes/kickback.gif', 3, '15-20', 60),
('lunge_glutes', 'Affondi per glutei', 'glutes', ARRAY['quadriceps','hamstrings'], 'bodyweight', 'Affondi con enfasi sul gluteo della gamba posteriore. Fai un passo più lungo per aumentare l''attivazione del gluteo.', '/exercises/glutes/lunge_glutes.gif', 3, '12-15', 60),
('bulgarian_split_squat_glutes', 'Bulgarian split squat per glutei', 'glutes', ARRAY['quadriceps','hamstrings'], 'bodyweight', 'Con il piede posteriore elevato, fai uno squat profondo per massimizzare lo stiramento e l''attivazione del gluteo della gamba anteriore.', '/exercises/glutes/bulgarian_split_squat_glutes.gif', 3, '10-12', 75)
ON CONFLICT (id) DO NOTHING;

-- CALVES (4)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('standing_calf_raise', 'Calf raise in piedi', 'calves', ARRAY[]::text[], 'gym', 'In piedi sulla punta dei piedi, abbassa i talloni e torna su in punta. Usa il macchinario apposito o un gradino per maggior escursione.', '/exercises/calves/standing_calf_raise.gif', 3, '15-20', 45),
('seated_calf_raise', 'Calf raise seduto', 'calves', ARRAY[]::text[], 'gym', 'Seduto sulla macchina con i pesi sulle ginocchia, solleva i talloni contraendo i polpacci. Isola il soleo rispetto alla versione in piedi.', '/exercises/calves/seated_calf_raise.gif', 3, '15-20', 45),
('single_leg_calf_raise', 'Calf raise monogamba', 'calves', ARRAY[]::text[], 'bodyweight', 'Su un gradino, esegui calf raise su una gamba sola per aumentare il carico. Ottimo esercizio bodyweight per lo sviluppo dei polpacci.', '/exercises/calves/single_leg_calf_raise.gif', 3, '15-20', 45),
('jump_rope', 'Salto con la corda', 'calves', ARRAY['abs','shoulders'], 'bodyweight', 'Il salto con la corda allena intensamente i polpacci e migliora coordinazione e resistenza cardiovascolare.', '/exercises/calves/jump_rope.gif', 3, '60 sec', 60)
ON CONFLICT (id) DO NOTHING;

-- TRAPS (3)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('shrug', 'Scrollate di spalle (shrug)', 'traps', ARRAY[]::text[], 'gym', 'Con il bilanciere o i manubri ai fianchi, solleva le spalle verso le orecchie e tieni un secondo in cima. Esercizio fondamentale per i trapezi.', '/exercises/traps/shrug.gif', 3, '12-15', 60),
('upright_row', 'Rematore al mento', 'traps', ARRAY['shoulders'], 'gym', 'Con presa stretta, tira il bilanciere verso il mento mantenendo i gomiti alti. Lavora trapezi e deltoidi laterali.', '/exercises/traps/upright_row.gif', 3, '10-15', 60),
('face_pull', 'Face pull ai cavi', 'traps', ARRAY['shoulders'], 'gym', 'Al cavo alto con corda, tira verso il viso aprendo i gomiti lateralmente. Eccellente per trapezi medi e deltoide posteriore.', '/exercises/traps/face_pull.gif', 3, '15-20', 60)
ON CONFLICT (id) DO NOTHING;

-- FULL BODY (4)
INSERT INTO public.exercises (id, name_it, muscle_group, secondary_muscles, equipment, description_it, gif_url, default_sets, default_reps, default_rest_sec) VALUES
('burpee', 'Burpee', 'full_body', ARRAY['chest','shoulders','abs','quadriceps'], 'bodyweight', 'Da in piedi, abbassati in posizione di push-up, esegui un push-up, salta i piedi verso le mani e salta in alto. Esercizio ad alta intensità per tutto il corpo.', '/exercises/full_body/burpee.gif', 3, '10-15', 60),
('kettlebell_swing', 'Swing con kettlebell', 'full_body', ARRAY['glutes','hamstrings','shoulders'], 'gym', 'Con il kettlebell tra le gambe, spingi i fianchi in avanti proiettando il peso davanti. Combina potenza della catena posteriore e cardio.', '/exercises/full_body/kettlebell_swing.gif', 3, '15-20', 60),
('clean_and_press', 'Clean and press', 'full_body', ARRAY['shoulders','back','quadriceps'], 'gym', 'Dal pavimento, porta il bilanciere alle spalle (clean) e poi premi sopra la testa (press). Esercizio olimpico che lavora tutto il corpo.', '/exercises/full_body/clean_and_press.gif', 4, '5-8', 120),
('thruster', 'Thruster (front squat + press)', 'full_body', ARRAY['quadriceps','shoulders','triceps'], 'gym', 'Combina un front squat e un overhead press in un unico movimento fluido. Esercizio estremamente intenso per forza e condizionamento.', '/exercises/full_body/thruster.gif', 3, '8-12', 90)
ON CONFLICT (id) DO NOTHING;
