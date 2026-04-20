# Пълна Архитектура на Kitchen CAD Модул (PRO100 Killer) - UPDATED WITH AI

Този окончателен план разширява модула до **100% готов за производство професионален CAD**, добавяйки:
- **ФАЗА 0**: Smart Room Setup с AI Layouts (начало за неопитни потребители)
- **ФАЗА 3**: Three.js PBR Реалистичен Rendering (точни и красиви визуали)
- **ФАЗА 5**: AI Chat Assistant (интуитивна помощ при редактиране)
- **ФАЗА 6**: Advanced AI Features (оптимизация, тренди, анализ)

## Цел
Заместване на PRO100 с пълноценна web-базирана CAD система, която:
1. ✅ Работи интуитивно за неопитни потребители (ФАЗА 0)
2. ✅ Показва геометрично точни реалистични рендери (ФАЗА 3)
3. ✅ Генерира технически безупречни чертежи, разкрой и CNC данни (ФАЗА 4-4.5)
4. ✅ Има AI асистент при редактиране (ФАЗА 5)
5. ✅ Има advanced AI функции за оптимизация (ФАЗА 6)

---

## 🏗️ Ключови Компоненти

### 1. Външни Архитектурни Елементи (Auto-Gen)
- **Цокъл (Plinth) и Регулируеми крачета:** Автоматично генериране на 10-15см цокъл под долните шкафове.
- **Стенен панел (Backsplash):** Автоматична генерация на гръб над плота с височина 60см.
- **Корниз (Cornice):** Опционален профил над горните шкафове.

### 2. Интериорни Конфигурации на Шкафове (Inner Configurator)
- `Cabinet3D` е сглобка от:
  - Врати с фалц/без фалц.
  - Регулируеми рафтове (въвеждане на брой и височина).
  - Чекмеджета (разделители).
  - Дъна, страници и гърбове с различни дебелини.

### 3. Разширен UI и Интеракции
- **Премиум Дизайн:** "Silver Glass & Almond Silk" стилистика. Framer Motion анимации, Lucide икони.
- **Интеграция с App Shell:** CAD модулът работи вътре в `AppShell`. Главното меню остава видимо. Нов бутон "Kitchen Designer".
- **Панел с инструменти (Toolbox):** Лявата лента се залепя до главното меню.
- **Десен панел (Properties):** Характеристики на маркирания обект (размери, материали).
- **Режими на гледане:** Превключване между 3D Перспектива и 2D изгледи.
- **Мулти-изглед в 2D:**
  - *2D План (Отгоре):* Чертане на стени и позициониране по пода.
  - *2D Фронтални изгледи (Elevations):* Изгледи от всяка стена — имплементират се в Фаза 4.5.
- **Клониране:** Ctrl+C, Ctrl+V, Ctrl+D за мултиплициране на шкафове.
- **Smart Guides & Infinite Grid:** Магнитни помощни линии при влачене.
- **Layer Manager:** Скриване/показване на стени, уреди, плотове, вратички.

### 4. Документация и CNC Експорт
- **2D Elevation Views:** Динамични 2D чертежи за всяка стена (за монтажници) — Фаза 4.5.
- **Three.js PBR Rendering:** Геометрично точни реалистични рендери за клиентска презентация.
- **Drilling & Machining Info:** CNC координати за пантите, дръжките, рафтоносачите и минификсовете.
- **Edge Banding Rules:** Маркиране на кантове (к1, к2 — 0.8мм или 2мм).

---

## 📅 Финален Roadmap по Фази

---

### ФАЗА 0: Smart Room Setup с AI Layouts (1-2 седмици)
🔴 **КРИТИЧНО** — Начало за неопитни потребители

> ⚡ **Архитектурна бележка:** Room Wizard се имплементира като **Next.js API Route**
> (`/api/kitchen/room-wizard`), а не като Python backend. Gemini API се извиква
> директно от там. Намалява latency, премахва излишен микросервиз, опростява deployment-а.

**Компоненти:**
- [ ] Room Input Form (Дължина, Ширина, Позиция на врата, Позиция на прозорец)
- [ ] AI Layout Generator — генерира 3 оптимални лейаута:
  - Layout A: U-Shape (оптимален функционален триъгълник)
  - Layout B: L-Shape (повече място)
  - Layout C: Straight (просто и ефективно)
- [ ] Layout Selector UI — Избор на един лейаут → преминаване към Фаза 1
- [ ] Supabase Storage — Запазване на избрания лейаут

**AI Logic:**
```
Input:  room_length, room_width, door_position, window_position
Output: 3 layouts с:
  - Functional triangle check (4-6.5m perimeter)
  - Stove away from window (safety)
  - Sink near window (light + drainage)
  - Fridge near entry (convenience)
  - Counter space ≥ 1m each side of stove
```

**Файлове:**
```
frontend/web/app/api/kitchen/room-wizard/route.ts     # Next.js API Route (Gemini)
frontend/web/app/kitchen-designer/components/RoomWizard.tsx
frontend/web/app/kitchen-designer/store/room.store.ts
```

**Verification:**
- [ ] Вход 3.5m × 2.8m → 3 лейаута за < 2 сек
- [ ] Всеки лейаут показва кабинет позиции в 2D
- [ ] Избор на един → geometry JSON се предава на Фаза 1

---

### ФАЗА 1: Основи на Редактора — Wall Builder & State (2-3 седмици)

> ⚡ **Бележка за обхват:** Elevation views се имплементират в Фаза 4.5, не тук.
> В Фаза 1 се прави само 2D Plan view и базова 3D камера.

**Задачи:**
- [ ] Setup на R3F, Zustand, Zundo, Supabase CRUD
- [ ] TypeScript типове и Параметричен Двигател (Project → Wall → Cabinet → Part)
- [ ] Infinite Grid — чиста решетка при нов проект
- [ ] Wall Builder — чертане в 2D по ъгли/дължини, автоматично 3D издигане, врати и прозорци
- [ ] 2D Plan view (отгоре) + базова 3D перспектива
- [ ] Undo/Redo и Auto-Save с IndexedDB кеширане
- [ ] Зареждане от Фаза 0 лейаут (или чиста решетка за напреднали)

**Файлове:**
```
frontend/web/app/kitchen-designer/components/WallBuilder.tsx       # [MODIFIED]
frontend/web/app/kitchen-designer/store/kitchen.store.ts           # [EXISTING]
frontend/web/app/kitchen-designer/lib/geometry.ts                  # [EXISTING]
```

---

### ФАЗА 2: Шкафове, Snap & Клониране (2 седмици)

**Задачи:**
- [ ] Библиотека с шаблони (base, wall, tall, sink)
- [ ] Snap Engine — collision detection + залепяне до стена/съсед + grid alignment
- [ ] Properties Panel за редакция (Ш/В/Д)
- [ ] Dimension Overlays (коти над маркиран шкаф)
- [ ] Copy/Paste и Mirror (Ctrl+C/V/D)
- [ ] Врата отваряне (ляво/дясно/повдигащо)

**Файлове:**
```
frontend/web/app/kitchen-designer/components/CabinetLibrary.tsx    # [NEW]
frontend/web/app/kitchen-designer/components/SnapEngine.tsx        # [NEW]
frontend/web/app/kitchen-designer/components/PropertiesPanel.tsx   # [EXISTING]
```

---

### ФАЗА 3: Детайлировка, Материали и PBR Rendering (2 седмици)

> ⚠️ **Защо не Gemini за рендери:** Gemini генерира художествени изображения, но не
> може да гарантира геометрична точност. В производствен контекст монтажникът и
> клиентът трябва да виждат едно и също. Three.js PBR постига ~95% фотореализъм
> при 100% точност на размерите.

**Задачи:**
- [ ] Интеграция с `GET /v1/catalog`
- [ ] Three.js PBR Rendering:
  - Реални текстури (MDF, меламин, дърво, лак)
  - HDRI осветление за реалистични сенки и отражения
  - Размерите в рендера = размерите в чертежа (гарантирано)
- [ ] Appliances (Мивка, Фурна, Хладилник)
- [ ] Auto-Countertop, Auto-Plinth (Цокъл) и Backsplash (Гръб)
- [ ] Layer Manager (hide walls, hide doors)
- [ ] Client Presentation Mode:
  - Бутон "Покажи на клиент" → fullscreen интерфейс
  - Interactive 360° orbit камера
  - Clickable материални детайли
  - Експорт: PNG screenshots + interactive HTML viewer

**Файлове:**
```
frontend/web/app/kitchen-designer/components/ClientPresentation.tsx   # [NEW]
frontend/web/app/kitchen-designer/lib/pbr-materials.ts                # [NEW]
frontend/web/app/kitchen-designer/lib/rendering.ts                    # [NEW]
```

---

### ФАЗА 4: BOM и Списък за Разкрой (1 седмица)

**Задачи:**
- [ ] BOM Engine — JavaScript логика, разбиваща външните размери до вътрешни детайли
      (напр. Ш - 36мм = дъно)
- [ ] Edge Banding Rules — записване на кантираните страни (к1/к2, 0.8мм/2мм)
- [ ] Експорт CSV/XLSX за разкройна програма
- [ ] Връзка на BOM към Pricing Engine-а на STAIPO

**Файлове:**
```
backend/app/services/kitchen/bom_generator.py    # [EXISTING/MODIFIED]
backend/app/routes/kitchen_designer.py           # [MODIFIED] — BOM endpoint
```

---

### ФАЗА 4.5 (PRO): Производствени Чертежи и CNC (1 седмица)

**Задачи:**
- [ ] Интериорен Конфигуратор — детайлно дефиниране на рафтове и чекмеджета за всеки шкаф
- [ ] 2D Elevation Views — автоматични PDF фронтални изгледи на всяка стена с коти
      (задължително за монтажници)
- [ ] Machining Info — координати за пробиване: панти, дръжки, рафтоносачи, минификсове
- [ ] Tolerance compensation (отстояния между вратички и страници — 2мм/3мм)

**Файлове:**
```
backend/app/services/kitchen/pdf_exporter.py     # [EXISTING/MODIFIED]
backend/app/services/kitchen/cad_optimizer.py    # [EXISTING/MODIFIED]
backend/app/routes/kitchen_designer.py           # [MODIFIED] — CNC + PDF endpoints
```

---

### ФАЗА 5: AI Chat Assistant + Polish (1-2 седмици)

> ⚡ **Защо тук, не по-рано:** AI Chat е полезен само когато snap engine, BOM и
> материалите работят коректно. Иначе асистентът дава съвети върху непълни данни.

**AI Chat задачи:**
- [ ] Gemini-powered chat panel
- [ ] Smart suggestions:
  - "Мога ли да сложа чекмедже тук?" → "Да, шкафът е 80см — перфектно"
  - "Какъв материал?" → 3 варианта от STAIPO каталога
  - "Провери триъгълника ми" → анализ на функционалния триъгълник
- [ ] Problem detection: "⚠️ Плот < 1м до котлона"
- [ ] Предложения за материали с цени

**Polish задачи:**
- [ ] Advanced View Modes (Wireframe, Flat, Shaded)
- [ ] Measurement Tool (click 2 точки → разстояние)
- [ ] Performance Optimization (50+ шкафа плавно)
- [ ] Session Management (auto-save, version history)
- [ ] Mobile Responsive (touch gestures)

**Файлове:**
```
frontend/web/app/kitchen-designer/components/AIChatPanel.tsx    # [NEW]
frontend/web/app/api/kitchen/chat/route.ts                      # [NEW] Next.js API Route
```

---

### ФАЗА 6: Advanced AI Features (Future — Post-MVP)

**Smart AI Commands:**
- [ ] "Направи го по-евтино" → алтернативни материали (същия вид, по-ниска цена)
- [ ] "Добави повече място" → AI преконфигурира лейаута за максимални рафтове
- [ ] "Оптимизирай работния поток" → анализ на зони на активност
- [ ] "Какво е на мода?" → mood board (модерен, рустик, минималист)

**Inspiration Gallery:**
- [ ] Дизайни по стил, бюджет, размер на стаята
- [ ] "Използвай като шаблон" → clone + customize

**Design Analytics:**
- [ ] Functional triangle score (като процент)
- [ ] Storage efficiency rating
- [ ] Budget vs. aesthetic balance slider

**Файлове:**
```
frontend/web/app/kitchen-designer/components/AIOptimizer.tsx        # [NEW]
frontend/web/app/kitchen-designer/components/InspirationGallery.tsx # [NEW]
frontend/web/app/api/kitchen/optimizer/route.ts                     # [NEW]
```

---

## ⏱️ Timeline at a Glance

| Фаза   | Седмици  | Output                          | MVP?                    |
|--------|----------|---------------------------------|-------------------------|
| **0**  | 1-2      | Room Wizard + 3 layouts         | ❌                      |
| **1**  | 2-3      | Wall Builder + 2D Plan          | ❌                      |
| **2**  | 2        | Snap Engine + Cabinet Library   | ❌                      |
| **3**  | 2        | Materials + Three.js PBR        | ✅ **VISUAL MVP**       |
| **4**  | 1        | BOM + CSV export                | ✅ **TECHNICAL MVP**    |
| **4.5**| 1        | Elevations + PDF + CNC          | ✅ **PRODUCTION READY** |
| **5**  | 1-2      | AI Chat + Polish                | ✅ **FULL RELEASE**     |
| **6**  | TBD      | Advanced AI                     | 🔮 **FUTURE**           |
| **Общо** | **~12-14 седмици** | **Full AI-powered CAD** | ✅          |

---

## 🎯 MVP Definition (Ready for Production)

✅ **Фази 0–4.5 Complete:**
- Room input → 3 AI layouts
- Interactive editor (drag-drop, snap)
- Геометрично точен Three.js PBR рендер
- CSV export за разкройна програма
- PDF с размери за монтажници
- Save/load designs
- BOM с edge banding
- CNC drilling координати

❌ **Може да чака (Фаза 5+):**
- AI Chat
- Advanced AI commands
- Inspiration gallery
- Analytics dashboard

---

## 📁 Пълна Файлова Структура

### Frontend:
```
frontend/web/app/
├── api/kitchen/
│   ├── room-wizard/route.ts              # [NEW] Gemini layout generation
│   ├── chat/route.ts                     # [NEW - Фаза 5] AI chat
│   └── optimizer/route.ts               # [NEW - Фаза 6] Advanced AI
│
└── kitchen-designer/
    ├── page.tsx                          # [EXISTING] Main entry
    ├── components/
    │   ├── RoomWizard.tsx                # [NEW - Фаза 0]
    │   ├── WallBuilder.tsx               # [MODIFIED - Фаза 1]
    │   ├── CabinetLibrary.tsx            # [NEW - Фаза 2]
    │   ├── SnapEngine.tsx                # [NEW - Фаза 2]
    │   ├── DesignCanvas.tsx              # [EXISTING]
    │   ├── PropertiesPanel.tsx           # [EXISTING]
    │   ├── ClientPresentation.tsx        # [NEW - Фаза 3]
    │   ├── ExportMenu.tsx                # [MODIFIED - Фаза 4]
    │   ├── AIChatPanel.tsx               # [NEW - Фаза 5]
    │   ├── AIOptimizer.tsx               # [NEW - Фаза 6]
    │   └── InspirationGallery.tsx        # [NEW - Фаза 6]
    ├── store/
    │   ├── kitchen.store.ts              # [EXISTING]
    │   └── room.store.ts                 # [NEW - Фаза 0]
    └── lib/
        ├── geometry.ts                   # [EXISTING]
        ├── pbr-materials.ts              # [NEW - Фаза 3]
        ├── rendering.ts                  # [NEW - Фаза 3]
        └── gemini-integration.ts         # [NEW] Shared Gemini helpers
```

### Backend (само production-критични услуги):
```
backend/app/
├── services/kitchen/
│   ├── bom_generator.py                  # [EXISTING/MODIFIED - Фаза 4]
│   ├── pdf_exporter.py                   # [EXISTING/MODIFIED - Фаза 4.5]
│   └── cad_optimizer.py                  # [EXISTING/MODIFIED - Фаза 4.5]
└── routes/
    └── kitchen_designer.py               # [MODIFIED] BOM, PDF, CNC endpoints
```

> ⚡ **Архитектурна бележка:** Всички AI извиквания (Gemini layouts, chat, optimizer)
> минават през **Next.js API Routes**. Python backend-ът остава отговорен само за
> BOM изчисления, PDF генерация и CNC данни.

### Database:
```sql
CREATE TABLE kitchen_design_wizard (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id),
  room_dimensions     JSONB,
  generated_layouts   JSONB,
  selected_layout_id  VARCHAR,
  created_at          TIMESTAMP DEFAULT now()
);
```

---

## 🚀 Implementation Priority

**Priority 1 — Critical Path:**
1. ФАЗА 0 — Room Wizard (Next.js API Route)
2. ФАЗА 1 — Wall Builder (2D Plan only)
3. ФАЗА 2 — Snap Engine + Cabinet Library
4. ФАЗА 3 — Three.js PBR Rendering
5. ФАЗА 4 — BOM + CSV Export

**Priority 2 — Enhancement:**
- ФАЗА 4.5 — Elevations + CNC + PDF
- ФАЗА 5 — AI Chat + Polish

**Priority 3 — Future:**
- ФАЗА 6 — Advanced AI

---

## 💡 Key Success Factors

1. **Room Wizard Must Be Simple** — максимум 1 минута → 3 лейаута
2. **Three.js Rendering Must Be Accurate** — размерите в рендера = размерите в чертежа
3. **BOM Must Be Accurate** — производствените екипи разчитат на него
4. **CNC Export Must Be Correct** — без tolerance грешки
5. **AI Chat Must Be Helpful** — не натрапчив, само след Фаза 4.5

---

## 🗓️ Седмичен план

| Седмица | Фаза   | Задачи                                                       |
|---------|--------|--------------------------------------------------------------|
| 1-2     | 0      | `room.store.ts`, `RoomWizard.tsx`, API Route, Gemini тест   |
| 3-5     | 1      | Infinite Grid, Wall Builder, 2D Plan, IndexedDB auto-save   |
| 6-7     | 2      | Cabinet Library, Snap Engine, Copy/Paste/Mirror             |
| 8-9     | 3      | PBR материали, HDRI, Client Presentation, Auto-Plinth       |
| 10      | 4      | BOM Engine, Edge Banding, CSV/XLSX, STAIPO pricing          |
| 11      | 4.5    | 2D Elevations, PDF export, CNC drilling coordinates         |
| 12-13   | 5      | AI Chat, Measurement Tool, Performance, Mobile              |
| 14+     | 6      | Advanced AI (post-MVP)                                      |

---

**Очакван резултат:** Production-ready AI-powered Kitchen CAD за ~12-14 седмици, готов за лансиране.

---

## 🛠️ Технически план за изпълнение на рефакторирането (Фаза 0)

Въз основа на новия ви архитектурен план, ето точните технически стъпки, които ще изпълним сега, за да поправим направеното до тук:

1. **Инсталация на `@google/generative-ai`**
   - Изпълнение на `npm install @google/generative-ai` в директория `frontend/web`.
2. **Създаване на Next.js API Route за Room Wizard**
   - Създаване на `frontend/web/app/api/kitchen/room-wizard/route.ts`.
   - Прехвърляне на Gemini prompt-а и логиката за валидация от стария Python файл в новия TypeScript route.
3. **Обновяване на Frontend състоянието**
   - В `frontend/web/app/kitchen-designer/store/room.store.ts` промяна на fetch заявката от `/api/kitchen-wizard/generate-layouts` към новия локален Next.js рутер `/api/kitchen/room-wizard`.
4. **Почистване на ненужния Python код**
   - Изтриване на `backend/app/services/kitchen/room_wizard.py`.
   - Изтриване на `backend/app/routes/kitchen_wizard.py`.
   - Премахване на регистрацията на рутера от главното FastAPI приложение.

## User Review Required

Моля, прегледайте тези стъпки. Ако сте съгласни с плана за преминаване към Next.js API Routes за Фаза 0, моля одобрете, за да започна да пиша кода!