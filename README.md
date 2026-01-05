# Päevaplaan - Self-Care Task Tracker

Minimalistlik veebirakendus igapäevaste hoolitsusülesannete jälgimiseks. Streak tracking, real-time sünkroniseerimine ja motiveerivad animatsioonid.

## Ülevaade

**Mis see on?** Self-care task tracker, mis aitab luua tervislikke harjumusi ja jälgida igapäevaseid ülesandeid.

**Tehnoloogiad:** Vanilla JS + Supabase + Vercel

**Projekti kontekst:** EKA "Veeb ja Kood" kursuse lõputöö

## Peamised funktsioonid

-  **Task management** - CRUD, 10 kategooriat, filtreerimine
-  **Streak tracking** - päevade arv järjest, milestone'id (3→7→14→30→60→100 päeva)
-  **Quick add** - 6 kiire nuppu levinud ülesannete jaoks
-  **Statistika** - päevane progress, progress bar
-  **UX** - dark mode, toast notifications, confetti, sound effects
-  **Export/Import** - JSON ja CSV formaadis
-  **Accessibility** - semantic HTML, ARIA, keyboard navigation, WCAG AA

## Tech Stack

**Frontend:**
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3 (Grid, Flexbox, Custom Properties)
- Web Audio API, Canvas API

**Backend:**
- Supabase (PostgreSQL, Realtime)

**Deploy:**
- GitHub + Vercel (auto-deploy)

**Design:**
- IBM Plex Mono + Fraunces fonts
- Minimalist calm aesthetic

## Setup

```bash
# 1. Clone
git clone https://github.com/martinorav-png/self-care-tracker.git

# 2. Supabase tabel
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'other',
    repeat_type TEXT DEFAULT 'daily',
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ
);
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

# 3. Lisa API key script.js faili
const SUPABASE_URL = 'sinu-url';
const SUPABASE_ANON_KEY = 'sinu-key';

# 4. Ava index.html brauseris
```

## Projekti nõuded

-  API integratsioon (Supabase REST API)
-  Andmete filtreerimine
-  GitHub + Vercel deployment
-  fetch() + async/await
-  Loogiline HTML struktuur
-  Hästi nimetatud funktsioonid
-  Accessibility
-  Visuaalne feedback
-  Selge kontseptsioon

## Märkmed

**Shared database:** Kõik kasutajad jagavad sama andmebaasi (demo otstarbel, real-time sync näitamiseks).

**Pole:** Kasutajate autentimist, RLS policies (päris äpis oleks).

## Autor

Martin Orav - EKA Digital Product Design tudeng
