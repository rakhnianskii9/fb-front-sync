# Facebook Ads Analytics — Полная архитектура Dashboard Builder

> Статус: ФИНАЛЬНЫЙ ПЛАН (18.12.2025)  
> Scopes: ✅ attribution_read одобрен

---

# ЧАСТЬ 1: Глобальная фильтрация (Query Builder)

## Проблема

1. **CPR (Cost per Result)** — FB возвращает `cost_per_result` по optimization goal кампании ("native CPR"), но нам также нужен "computed CPR" по "логическим группам" конверсий (messages + leads + forms = все типы контактов). При этом computed CPR должен быть явно помечен как приближение (может не совпадать с FB-native в зависимости от выбранного result / attribution window / delivery).

2. **Нет возможности сегментировать данные** — карточки и графики показывают агрегат по всем кампаниям/адсетам без возможности отфильтровать по атрибутам (objective, placement, budget type и т.д.).

3. **Будущая интеграция CRM** — ROI будет считаться на основе данных из CRM (revenue, qualified leads), и нужна возможность фильтровать FB-данные в том же контексте.

---

## Решение: Глобальный Query Builder

### Полная архитектура системы

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    🏠 HEADER                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │  📅 Date Range: [Dec 1 - Dec 18, 2025]  [▾ Last 30 days]                            │   │
│  │                                                                                      │   │
│  │  🔍 Query Builder:                                                                   │   │
│  │  ┌──────────────────────────────────────────────────────────────────────────────┐   │   │
│  │  │ [Objective ▾] [= ▾] [CONVERSIONS    ▾] [+AND] [×]                             │   │   │
│  │  │ [Placement ▾] [∋ ▾] [Instagram, FB  ▾] [+AND] [×]                             │   │   │
│  │  │ [Budget Type▾] [= ▾] [CBO           ▾]        [×]                             │   │   │
│  │  └──────────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                     [+ Add Condition] [Clear All]   │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐│
│  │ 🏷️ Active Filters: [Objective = CONVERSIONS ×] [Placement ∋ IG ×] [Budget = CBO ×]   ││
│  └────────────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                                   ┌─────────────────┐
                                   │ Filtered Dataset│
                                   │   (все виджеты  │
                                   │   используют    │
                                   │   один dataset) │
                                   └────────┬────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              ▼                             ▼                             ▼
    ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
    │  📊 Главный     │          │  📈 Второстеп.  │          │  📋 Таблица     │
    │     виджет      │          │     виджеты     │          │     (rows)      │
    │  (Full Funnel/  │          │  (Area, Mixed,  │          │                 │
    │   Sunburst/     │          │   Pie, Gauge)   │          │  + локальные:   │
    │   Comparison)   │          │                 │          │  • Search       │
    └─────────────────┘          └─────────────────┘          │  • Sort         │
              │                                               │  • Stats > 0    │
              └───────────────────┬───────────────────────────┘
                                  │
                           ┌──────▼──────┐
                           │ 📊 KPI Cards │
                           │ (плитка)     │
                           └─────────────┘
```

### Почему глобальный Query Builder?

| Критерий | Вариант A (глобальный) | Вариант B (раздельный) |
|----------|------------------------|------------------------|
| **Консистентность** | ✅ Все виджеты = один срез | ❌ Карточки ≠ таблица |
| **UX** | ✅ Понятно что видишь | ⚠️ "Почему цифры разные?" |
| **Индустриальный стандарт** | ✅ FB Ads Manager, Looker, Metabase | — |
| **Риск "потерянных данных"** | ⚠️ Решается баннером Active Filters | ❌ Меньше риск забыть |

**Выбор:** Вариант A + явный индикатор активных фильтров.

---

## Header Controls — 3 Dropdown'а

В header панели (над таблицей) находятся 3 отдельных dropdown'а:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐                              │
│  │ 📁 Parent      │  │ 📊 Attribution  │  │ 📈 Breakdown     │   📅 Date Range              │
│  │ [Campaign ▾]   │  │ [7d_click ▾]    │  │ [None ▾]         │   [Dec 1-18, 2025]           │
│  └────────────────┘  └─────────────────┘  └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1️⃣ Parent Dropdown (существует)

**Назначение:** Показать плашку родителя в таблице, чтобы понимать к чему относится строка

```
┌─────────────────┐
│ Parent          │
├─────────────────┤
│ Account         │
│ ✓ Campaign      │  ← показывать название кампании над каждым креативом
│ Ad Set          │
│ Ad              │
│ Don't show      │
└─────────────────┘
```

**Пример:** На табе Creatives каждый креатив будет иметь плашку с названием кампании, к которой он относится.

### 2️⃣ Attribution Dropdown (существует)

**Назначение:** Выбор окна атрибуции для метрик конверсий

```
┌─────────────────────┐
│ Attribution Window  │
├─────────────────────┤
│ ✓ 7d_click, 1d_view │  ← default
│ 1d_click            │
│ 7d_click            │
│ 28d_click           │
│ 1d_view             │
│ 7d_view             │
└─────────────────────┘
```

### 3️⃣ Breakdown Dropdown (НОВЫЙ) — двухуровневый

**Назначение:** Группировка/сегментация данных по атрибутам с выбором уровня

```
┌─────────────────┐
│ Breakdown       │
├─────────────────┤
│ None            │
│ Campaign      ▶ │──┬──────────────────────┐
│ Ad Set        ▶ │  │ by Objective         │
│ Ad            ▶ │  │ by Budget Type       │
│ Creative      ▶ │  │ by Bid Strategy      │
└─────────────────┘  │ by Buying Type       │
                     │ by Special Ad Cat.   │
                     └──────────────────────┘

                  ┌──────────────────────┐
   Ad Set ▶ ──────│ by Optimization Goal │
                  │ by Destination Type  │
                  │ by Placements        │
                  │ by Promoted Object   │
                  └──────────────────────┘

                  ┌──────────────────────┐
   Ad ▶ ──────────│ (наследует от AdSet) │
                  │ by Optimization Goal │
                  │ by Placements        │
                  │ ...                  │
                  └──────────────────────┘

                  ┌──────────────────────┐
   Creative ▶ ────│ (наследует все 9)    │
                  │ by Objective         │
                  │ by Placement         │
                  │ ...                  │
                  └──────────────────────┘
```

### Какие атрибуты доступны на каком уровне

| Уровень | Свои атрибуты | Наследует от |
|---------|---------------|--------------|
| **Campaign** | Objective, Budget Type, Bid Strategy, Buying Type, Special Ad Cat. | — |
| **Ad Set** | Optimization Goal, Destination Type, Placements, Promoted Object | Campaign (5) |
| **Ad** | — | Campaign (5) + AdSet (4) = 9 |
| **Creative** | — | Campaign (5) + AdSet (4) = 9 |

### Логика работы

1. **Выбираешь уровень** (Campaign / Ad Set / Ad / Creative)
2. **Выбираешь атрибут** из доступных на этом уровне
3. **Таблица группируется** по выбранному атрибуту с subtotals

**Пример:** На табе **Creatives** выбрал `Creative ▶ by Placement`:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Creatives grouped by Placement                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ▼ instagram_feed (15 creatives)                      Spend: $3,200     │
│   ├─ Summer_Video_1.mp4                              $800              │
│   ├─ Product_Carousel                                $650              │
│   └─ ... (12 more)                                                     │
│                                                                         │
│ ▼ instagram_stories (8 creatives)                    Spend: $1,800     │
│   ├─ Story_Promo_1                                   $450              │
│   └─ ... (7 more)                                                      │
│                                                                         │
│ ▼ facebook_feed (12 creatives)                       Spend: $2,500     │
│   └─ ...                                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Взаимодействие трёх dropdown'ов

| Parent | Attribution | Breakdown | Результат |
|--------|-------------|-----------|-----------|
| Campaign | 7d_click | None | Обычная таблица кампаний |
| Campaign | 7d_click | by Objective | Кампании сгруппированы по Objective |
| Don't show | 7d_click | by Placement | Строки сгруппированы по Placement |
| Ad Set | 1d_click | by Budget Type | AdSets с плашкой и группировкой по CBO/ABO |

---

## Сквозные метаданные (9 атрибутов)

Эти атрибуты доступны на **всех уровнях** (Campaign → AdSet → Ad → Creative) через наследование:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN LEVEL                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. Objective          │ campaign.objective                         │   │
│  │  2. Budget Type        │ CBO (campaign budget) / ABO (adset budget) │   │
│  │  3. Bid Strategy       │ campaign.bid_strategy                      │   │
│  │  4. Buying Type        │ campaign.buying_type (AUCTION/RESERVED)    │   │
│  │  5. Special Ad Category│ campaign.special_ad_categories             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     ↓ наследуется                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         ADSET LEVEL                                  │   │
│  │  6. Optimization Goal  │ adset.optimization_goal                    │   │
│  │  7. Destination Type   │ adset.destination_type                     │   │
│  │  8. Placements         │ adset.targeting.publisher_platforms        │   │
│  │  9. Promoted Object    │ adset.promoted_object (pixel, page, form)  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     ↓ наследуется                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AD / CREATIVE LEVEL — получает все 9 атрибутов от родителей        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Query Builder — типы условий

| Тип | Операторы | Пример | ECharts связь |
|-----|-----------|--------|---------------|
| **Text** | contains, equals, starts with | `Name contains "BF"` | Filter для всех графиков |
| **Enum** | =, in, not in | `Objective = CONVERSIONS` | Цвет/группировка в Bar |
| **Multi-select** | contains any, contains all | `Placements ∋ [instagram]` | Сегменты в Sunburst |
| **Number** | =, >, <, between | `Daily Budget > 100` | Размер в Treemap |
| **ID** | equals | `Campaign ID = 123456` | Drill-down target |

### Комбинирование (AND/OR)

```
(Objective = CONVERSIONS OR Objective = LEAD_GENERATION)
AND Placement contains Instagram
AND Daily Budget > 50
```

---

## Расширенная фильтрация: UTM + CRM

> **Цель:** Фильтровать данные не только по FB-атрибутам, но и по UTM-меткам и CRM-метрикам

### Полная архитектура Query Builder

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔍 Query Builder:                                                          │
│                                                                              │
│  📱 FB Attributes (9):                                                      │
│  [Objective ▾] [= ▾] [CONVERSIONS ▾]                              [×]      │
│  [Placement ▾] [∋ ▾] [instagram_feed ▾]                           [×]      │
│                                                                              │
│  🔗 UTM Parameters (5):                                                     │
│  [utm_source ▾] [= ▾] [facebook ▾]                                [×]      │
│  [utm_campaign ▾] [contains ▾] [summer_2025 ▾]                    [×]      │
│  [utm_content ▾] [= ▾] [video_v1 ▾]                               [×]      │
│                                                                              │
│  💼 CRM Metrics (5):                                                        │
│  [Has Leads ▾] [= ▾] [Yes ▾]                                      [×]      │
│  [ROMI ▾] [> ▾] [100% ▾]                                          [×]      │
│  [Won Deals ▾] [>= ▾] [1 ▾]                                       [×]      │
│                                                                              │
│                                        [+ Add Condition] [Clear All]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Полная таблица фильтров (19 атрибутов)

| Группа | Атрибут | Тип | Операторы | Источник |
|--------|---------|-----|-----------|----------|
| **FB (9)** | Objective | Enum | =, in, not in | Campaign |
| | Budget Type | Enum | = | Campaign |
| | Bid Strategy | Enum | = | Campaign |
| | Buying Type | Enum | = | Campaign |
| | Special Ad Category | Enum | =, in | Campaign |
| | Optimization Goal | Enum | = | AdSet |
| | Destination Type | Enum | = | AdSet |
| | Placements | Multi | ∋, ∌ | AdSet |
| | Promoted Object | Enum | = | AdSet |
| **UTM (5)** | utm_source | Text | =, contains, starts with | KommoLead |
| | utm_medium | Text | =, contains, starts with | KommoLead |
| | utm_campaign | Text | =, contains, starts with | KommoLead |
| | utm_content | Text | =, contains, starts with | KommoLead |
| | utm_term | Text | =, contains, starts with | KommoLead |
| **CRM (5)** | Has Leads | Boolean | = | Aggregated |
| | Leads Count | Number | =, >, <, >=, <=, between | Aggregated |
| | Won Deals | Number | =, >, <, >=, <=, between | Aggregated |
| | Revenue | Number | =, >, <, >=, <=, between | Aggregated |
| | ROMI | Number | =, >, <, >=, <=, between | Calculated |

### Применение фильтров на рабочих столах

| Рабочий стол | Пример фильтра | Результат |
|--------------|----------------|-----------|
| **1. Overview** | `utm_source = facebook AND Placement ∋ instagram` | Воронка FB→IG, лиды с этими UTM |
| **2. Attribution** | `ROMI > 100%` | Только пути с положительным ROMI |
| **3. Compare** | `utm_campaign contains "black_friday" AND Won Deals >= 1` | Только креативы BF с продажами |

### Пример комбинированного фильтра

```
(Objective = CONVERSIONS OR Objective = LEAD_GENERATION)
AND Placement ∋ [instagram_feed, instagram_stories]
AND utm_source = "facebook"
AND ROMI > 50%
```

**Результат:** Только Instagram-креативы конверсионных кампаний с Facebook UTM и положительным ROMI.

### Логика JOIN при фильтрации

```
FB Data (Insights)                    CRM Data (KommoLead)
┌─────────────────┐                   ┌─────────────────┐
│ campaign_id     │                   │ fb_campaign_id  │
│ adset_id        │◄─── JOIN ON ────►│ fb_adset_id     │
│ ad_id           │                   │ fb_ad_id        │
│ spend, clicks...│                   │ utm_*, price... │
└─────────────────┘                   └─────────────────┘
         │                                     │
         └──────────── FILTERED ───────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Unified Dataset     │
              │   (FB + CRM metrics)  │
              └───────────────────────┘
```

### Data Model для фильтров

```typescript
interface QueryFilter {
  group: 'fb' | 'utm' | 'crm'
  field: string
  operator: FilterOperator
  value: string | string[] | number | boolean
}

type FilterOperator = 
  | '=' | '!=' 
  | 'in' | 'not_in'
  | 'contains' | 'not_contains' | 'starts_with'
  | '>' | '<' | '>=' | '<=' | 'between'
  | 'contains_any' | 'contains_all'  // для multi-select

interface QueryBuilderState {
  filters: QueryFilter[]
  combineMode: 'AND' | 'OR'
  
  // Группы можно комбинировать по-разному
  groupCombine?: {
    fb_utm: 'AND' | 'OR'
    utm_crm: 'AND' | 'OR'
  }
}
```

---

## Локальные фильтры таблицы (НЕ глобальные)

| Фильтр | Область | Влияет на графики? |
|--------|---------|-------------------|
| **"Статистика > 0"** | Только таблица | ❌ Нет |
| **Search по названию** | Только таблица | ❌ Нет |
| **Sort по колонке** | Только таблица | ❌ Нет |

---

# ЧАСТЬ 1.5: Meta Backend — Data Layer (согласованный план)

> Цель: обеспечить быстрые фильтры/группировки (Query Builder + Breakdown) и полный “аудит” изменений (для AI/observations) без JOIN’ов.

## Must-have (чтобы план считался закрытым)

1) **Change Logs как отдельный поток**: `ad_account/activities` → отдельная таблица/пайплайн, инкрементальный sync + overlap, dedup, hot/cold.
2) **Явные SCD2 Snapshots**: дневные снапшоты метаданных со `valid_until` (baseline “точка 0”, далее версии по изменениям).
3) **Metadata inheritance как слой**: материализация выбранных полей Campaign→AdSet→Ad→Creative как “атрибутный слой” для Query Builder (без JOIN’ов).
4) **JSONB + индексы**: `jsonb` + GIN (в т.ч. placements path) — это техдолг, но критично для скорости фильтров.

## Scope (ключи данных)

- Основная гранулярность хранения: `workspace + ad_account`.
- На уровне insights храним parent chain: `campaign_id`, `adset_id`, `ad_id`, `creative_id` (если есть), чтобы избегать JOIN’ов в аналитике.

## JSONB + индексация (Campaign / AdSet / Ad / Creative)

- Переводим/фиксируем типы на `jsonb` и добавляем GIN индексы под фильтры:
  - Campaign: `special_ad_categories`, `raw_data`.
  - AdSet: `targeting`, `promoted_object`, `raw_data`.
  - Ad: `tracking_specs`, `conversion_specs`, `raw_data`.
  - Creative: `object_story_spec`, `asset_feed_spec`, `raw_data`.
- Отдельный упор на placements: индексируем путь из `adset.targeting` для быстрых условий `Placements ∋ ...`.

## Metadata Inheritance (материализация)

Материализуем 9 атрибутов на всех уровнях (Campaign → AdSet → Ad → Creative):

- От Campaign:
  - `objective`
  - `buying_type`
  - `bid_strategy`
  - `special_ad_categories`
  - `budget_type` (computed):
    - `CBO`, если у Campaign задан `daily_budget` или `lifetime_budget` (не null/не пусто/не 0)
    - `ABO`, если у Campaign бюджеты пустые, но у AdSet задан `daily_budget` или `lifetime_budget`
    - `UNKNOWN`, если бюджеты не заданы ни на Campaign, ни на AdSet (или данные неполные)
- От AdSet:
  - `optimization_goal`
  - `destination_type`
  - `billing_event`
  - `publisher_platforms` (из targeting)
  - `promoted_object`

## Hash + Diff (изменения как “сигнал”)

- Hash: `SHA256` только по **ключевым полям**, исключая шум:
  - исключаем `updated_time` и любые “плавающие” поля (например, `delivery_estimates`).
- Diff: храним `JSON diff (old → new)` как первичный артефакт для AI Observations.

## Activity Logs (ad_account/activities)

- Храним **полную историю** бессрочно (Meta историю не гарантирует).
- “Hot storage” = последние 90 дней (быстрые запросы), “cold storage” = всё остальное.
  - На старте: одна таблица + правильные индексы; логическое разделение hot/cold на уровне запросов.
- Синхронизация: каждые 30 минут.
  - Стратегия: `B + incremental` (overlap до 7 дней + инкрементальный cursor).
  - Дедуп ключ: `event_time + object_id + event_type → hash`.
- Важные типы событий (Pareto): create/delete, update_budget, update_status, update_targeting, update_creative, pause/resume.

## Daily Snapshots (метаданные, SCD Type 2)

- Снапшотим: **только активные + изменённые за день**.
- Частота: 1 раз в день (ночь аккаунта).
- Поля: только метаданные + статусы (НЕ insights).
- Retention: 365 дней, старше — агрегировать/схлопывать.
- Модель: `SCD Type 2` с `valid_until`.
  - “Точка 0”: первичная загрузка (initial full sync) создаёт baseline-версию.
  - Далее: при изменении закрываем предыдущую запись `valid_until` и создаём новую версию.

## Learning Stage + Issues (история + алерты)

Learning Stage:
- Храним минимум: `entered_learning_at`, `exited_learning_at`, `status (LEARNING/SUCCESS/FAIL)`.
- Храним `last_sig_edit_ts` как ключ причинности.
- Алерты минимум:
  - `stuck_in_learning > 7 дней`
  - `frequent_relearning (≥2 за 14 дней)`

Issues:
- Классификация простая:
  - `category: budget / targeting / creative / policy`
  - `severity: warning / error`
- Алерты: только `error`.
- История: `appeared_at`, `resolved_at`, `duration`.

## Attribution Context (минимум на старте)

- Сейчас: только default окно атрибуции `7d_click, 1d_view`.
- `attribution_spec` (из AdSet) храним отдельно и привязываем reference_id к insights (контекст запроса).
- Важно: в v1 "Attribution" = агрегаты из Insights (окна/модель/контекст запроса), НЕ "пути" (event-level sequences). Полноценные multi-touch пути не обещаем на базе Facebook API; если понадобятся — это отдельный v2 (CRM/click-id/UTM + собственные события).
- Пересчёт CPR/ROAS при смене окна: НЕ делаем на этом этапе; храним raw values default-окна.

---

# ЧАСТЬ 2: Dashboard Builder — Рабочие столы

## Концепция

Dashboard Builder позволяет создавать кастомные рабочие столы. Каждый рабочий стол имеет:

1. **Главный виджет** — центральная визуализация (Full Funnel, Attribution Compare (aggregates), Comparison Bar)
2. **Detail Panel** — всплывает справа при клике на элемент
3. **Второстепенные виджеты** — 2-4 дополнительных графика
4. **KPI плитка** — 6-8 карточек с ключевыми метриками

### Общая структура рабочего стола

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  📍 TABS: [🎯 Overview] [🌳 Attribution] [📊 Compare]                    [+ New Dashboard]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌──────────────────────────────────────────────────────┬──────────────────────────────┐   │
│  │                                                      │                              │   │
│  │              🎯 ГЛАВНЫЙ ВИДЖЕТ                       │  📋 DETAIL PANEL             │   │
│  │                                                      │     (при клике)              │   │
│  │     Интерактивный граф, воронка или сравнение       │                              │   │
│  │                                                      │  ┌──────────────────────┐   │   │
│  │     ┌────────────────────────────────────────┐      │  │ Campaign: "BF 2024"  │   │   │
│  │     │                                        │      │  │ Status: ACTIVE       │   │   │
│  │     │    При клике на элемент ──────────────────────▶  │──────────────────────│   │   │
│  │     │         детали появляются справа       │      │  │ 📊 МЕТАДАННЫЕ        │   │   │
│  │     │                                        │      │  │ Objective: CONVERSIONS│   │   │
│  │     │                                        │      │  │ Budget: CBO $500/day │   │   │
│  │     └────────────────────────────────────────┘      │  │ Bid: LOWEST_COST     │   │   │
│  │                                                      │  │──────────────────────│   │   │
│  │                                                      │  │ 📈 МЕТРИКИ           │   │   │
│  │                                                      │  │ Spend: $2,341        │   │   │
│  │                                                      │  │ Results: 156         │   │   │
│  │                                                      │  │ CPR: $15.01          │   │   │
│  └──────────────────────────────────────────────────────┴──────────────────────────────┘   │
│                                                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐       │
│  │ 📈 WIDGET 1             │ │ 📈 WIDGET 2             │ │ 📈 WIDGET 3             │       │
│  │ Area: Spend over time   │ │ Mixed: Results + CPR    │ │ Pie: By Objective       │       │
│  │ ~~~~~~~~~~~∼∼∼∼∼∼       │ │ ▓▓▓▓ ~~~~              │ │    ████                 │       │
│  └─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘       │
│                                                                                            § │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐          │
│  │  CPM  │ │  CTR  │ │  CPC  │ │  CPR  │ │ Spend │ │ ROAS  │ │ Leads │ │  ROMI  │          │
│  │$12.50 │ │ 2.8%  │ │ $0.82 │ │$15.01 │ │$6,629 │ │ 3.2x  │ │  542  │ │ 2.1x  │          │
│  │  ↑5%  │ │  ↓2%  │ │  ↑3%  │ │  ↓8%  │ │ ↑12%  │ │  ↑9%  │ │ ↑15%  │ │ ↑18%  │          │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 3 РАБОЧИХ СТОЛА (PRESETS)

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 1️⃣ OVERVIEW — Full Funnel + Plan/Fact
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Назначение:** Полная картина бизнеса от показа до продажи  
**Ключевая идея:** Единая воронка FB Ads → CRM с визуальным разделителем и Plan/Fact

### ECharts компоненты

| Компонент | Ссылка на пример |
|-----------|------------------|
| **Funnel (основа)** | [Funnel Chart](https://echarts.apache.org/examples/en/editor.html?c=funnel) |
| **Funnel Compare** | [Funnel Compare](https://echarts.apache.org/examples/en/editor.html?c=funnel-align) |
| **Gauge (план/факт)** | [⭐ Grade Gauge](https://echarts.apache.org/examples/en/editor.html?c=gauge-grade) |
| **Multi-title Gauge** | [Multi Title Gauge](https://echarts.apache.org/examples/en/editor.html?c=gauge-multi-title) |

### Главный виджет: Full Funnel + Plan/Fact Gauge

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FULL FUNNEL + ПЛАН/ФАКТ                                                     │
│                                                                              │
│  📱 FACEBOOK ADS                        Target   Actual   %    Progress     │
│  ┌────────────────────────────────────┐                                      │
│  │     Impressions      1.8M          │  2.0M    1.8M    90%  ████████░░    │
│  └────────────────────────────────────┘                                      │
│  ┌──────────────────────────────────┐                                        │
│  │       Clicks          15K        │   20K     15K     75%  ███████░░░     │
│  └──────────────────────────────────┘                                        │
│  ┌────────────────────────────────┐                                          │
│  │     Results           1.2K     │    1.5K    1.2K    83%  ████████░░      │
│  └────────────────────────────────┘                                          │
│                                                                              │
│  ══════════════════════ ⚡ Match Rate: 89% ══════════════════════            │
│                                                                              │
│  💼 CRM (Kommo)                                                              │
│      ┌────────────────────────────┐                                          │
│      │    CRM Leads       1.1K    │    1.0K    1.1K   110%  ██████████+     │
│      └────────────────────────────┘                                          │
│        ┌──────────────────────┐                                              │
│        │  Qualified    414    │      500     414     83%  ████████░░        │
│        └──────────────────────┘                                              │
│          ┌──────────────────┐                                                │
│          │   Won     107    │        100     107    107%  █████████+        │
│          │  $21,557         │     $20,000  $21,557                           │
│          └──────────────────┘                                                │
│                                                                              │
│  💰 ROMI: 225.2%              📊 Spend: $6,629.09                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Targets (Plan) — ручной ввод

Пользователь заполняет targets вручную в настройках воронки:

```typescript
interface FunnelTargets {
  impressions?: number;
  clicks?: number;
  results?: number;
  crmLeads?: number;
  qualified?: number;
  won?: number;
  revenue?: number;
}
```

**UI для ввода targets:**
- Кнопка "⚙️ Set Targets" на виджете воронки
- Modal с полями для каждого этапа
- Сохраняется в report.funnelTargets

#### Detail Panel при клике

При клике на любой этап воронки показываем:

| Секция | Содержимое |
|--------|------------|
| **Breakdown by Campaign** | Топ-5 кампаний по этому этапу |
| **Breakdown by Placement** | Instagram / Facebook / Audience Network |
| **Breakdown by Day** | Мини-график за период |
| **Anomalies** | Резкие изменения vs предыдущий период |

#### Второстепенные виджеты

| # | Виджет | Тип | Метрики |
|---|--------|-----|---------|
| 1 | Revenue vs Spend | Area | `spend`, `crm_revenue` over time |
| 2 | ROMI Gauge | Gauge | Текущий ROMI vs target |
| 3 | Conversion Rate Trend | Mixed | `conv_rate` line + `results` bars |

#### Плитка KPI (10 карточек)

| # | Метрика | Группа | Формула/Источник |
|---|---------|--------|------------------|
| 1 | Impressions | Traffic | FB API |
| 2 | CTR | Traffic | clicks / impressions |
| 3 | CPM | Traffic | spend / impressions × 1000 |
| 4 | Results | Conversions | FB API (optimization goal) |
| 5 | CPR | Conversions | spend / results |
| 6 | CRM Leads | CRM | Kommo API |
| 7 | Qualified | CRM | Kommo (статус "квалифицирован") |
| 8 | Sales (Won) | CRM | Kommo (статус "закрыто/выиграно") |
| 9 | Revenue | CRM | Kommo (сумма сделок) |
| 10 | ROMI | CRM | (revenue - spend) / spend × 100% |

### 📐 ПОЛНЫЙ МАКЕТ WORKSPACE 1: OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  📍 TABS: [🎯 Overview ←ACTIVE] [🌳 Attribution] [📊 Compare]            [+ New Dashboard]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────┬───────────────────────────┐   │
│  │                                                         │                           │   │
│  │  🎯 FULL FUNNEL + ПЛАН/ФАКТ                            │  📋 DETAIL PANEL          │   │
│  │                                                         │     (при клике на этап)   │   │
│  │  📱 FACEBOOK ADS              Target  Actual  %  Prog   │                           │   │
│  │  ┌────────────────────────┐                             │  ┌─────────────────────┐  │   │
│  │  │  Impressions   1.8M    │   2.0M   1.8M  90% ████░░  │  │ 📊 Impressions      │  │   │
│  │  └────────────────────────┘                             │  │                     │  │   │
│  │  ┌──────────────────────┐                               │  │ By Campaign:        │  │   │
│  │  │    Clicks     15K    │    20K    15K  75% ███░░░    │  │ • Summer Sale: 45%  │  │   │
│  │  └──────────────────────┘                               │  │ • Retargeting: 30%  │  │   │
│  │  ┌────────────────────┐                                 │  │ • Lookalike: 25%    │  │   │
│  │  │   Results   1.2K   │     1.5K  1.2K  83% ████░░     │  │                     │  │   │
│  │  └────────────────────┘                                 │  │ By Placement:       │  │   │
│  │                                                         │  │ • Instagram: 55%    │  │   │
│  │  ═══════════ ⚡ Match Rate: 89% ═══════════            │  │ • Facebook: 40%     │  │   │
│  │                                                         │  │ • AN: 5%            │  │   │
│  │  💼 CRM (Kommo)                                        │  │                     │  │   │
│  │    ┌──────────────────┐                                 │  │ Daily Trend:        │  │   │
│  │    │  CRM Leads  1.1K │    1.0K  1.1K 110% █████+      │  │ ~~~∧~~~∨~~~         │  │   │
│  │    └──────────────────┘                                 │  │                     │  │   │
│  │      ┌──────────────┐                                   │  │ ⚠️ Anomaly:         │  │   │
│  │      │ Qualified 414│     500   414  83% ████░░        │  │ -15% vs last week   │  │   │
│  │      └──────────────┘                                   │  └─────────────────────┘  │   │
│  │        ┌──────────┐                                     │                           │   │
│  │        │ Won  107 │       100   107 107% █████+        │                           │   │
│  │        │ $21,557  │    $20,000  $21,557                │                           │   │
│  │        └──────────┘                                     │                           │   │
│  │                                                         │                           │   │
│  │  💰 ROMI: 225.2%           📊 Spend: $6,629.09         │                           │   │
│  │                                                         │                           │   │
│  │  [⚙️ Set Targets]                                      │                           │   │
│  └─────────────────────────────────────────────────────────┴───────────────────────────┘   │
│                                                                                             │
│  ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│  │ 📈 Revenue vs Spend       │ │ 📊 ROMI Gauge             │ │ 📈 Conversion Rate        │ │
│  │                           │ │                           │ │                           │ │
│  │    Revenue ───            │ │      ╭───────╮            │ │  ▓▓▓ Results             │ │
│  │         ∕∖  ∕∖            │ │     ╱  225%  ╲           │ │  ─── Conv Rate           │ │
│  │    ────∕──∨──∖────        │ │    │    ◉    │           │ │                           │ │
│  │       ∕        ∖ Spend    │ │     ╲ Target ╱           │ │  ▓▓▓ ▓▓ ▓▓▓▓ ▓▓▓         │ │
│  │  ────∕──────────∖────     │ │      ╰200%──╯            │ │  ──────────────           │ │
│  │                           │ │                           │ │  D1  D2  D3  D4  D5      │ │
│  └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘ │
│                                                                                             │
│  ┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐┌────────┐
│  │Impress.││  CTR   ││  CPM   ││Results ││  CPR   ││ Leads  ││Qualif. ││ Sales  ││Revenue ││ ROMI   │
│  │  1.8M  ││ 2.8%   ││$12.50  ││ 1.2K   ││$15.01  ││ 1.1K   ││  414   ││  107   ││$21,557 ││225.2%  │
│  │  ↑12%  ││  ↓2%   ││  ↑5%   ││  ↑8%   ││  ↓8%   ││ ↑15%   ││ ↑10%   ││ ↑18%   ││ ↑22%   ││ ↑25%   │
│  └────────┘└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘└────────┘
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2️⃣ ATTRIBUTION — Aggregates (v1) / Paths (future)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**v1 назначение:** сравнение агрегированных метрик (Results/Spend/ROAS/CPR) между attribution windows / (если доступно) attribution model в рамках одного и того же среза Query Builder.  
**v1 ключевая идея:** Attribution здесь — это контекст агрегации Insights, а не реконструкция пользовательских последовательностей касаний.

**future (v2):** multi-touch пути ("touch sequences") возможны только если у нас есть собственные user-level события (CRM/click-id/UTM + timestamp) и правила дедупликации/матчинга. `attribution_read` может быть нужен для расширенных полей, но сам по себе не гарантирует доступ к "путям".

### ECharts компоненты

| Компонент | Ссылка на пример | Применение |
|-----------|------------------|------------|
| **Bar / Line** | [Line](https://echarts.apache.org/examples/en/editor.html?c=line-simple) | v1: сравнение окон/моделей по одной метрике |
| **Table** (альт.) | — | v1: компактное сравнение windows → (Results/Spend/ROAS/CPR) |
| **Treemap** | [Treemap](https://echarts.apache.org/examples/en/editor.html?c=treemap-drill-down) | future (v2): доля/объём по pattern |
| **Tree / Sankey** | [Sankey](https://echarts.apache.org/examples/en/editor.html?c=sankey-energy) | future (v2): визуализация sequences |

### Главный виджет: v1 (Aggregates Compare)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ATTRIBUTION — Window/Model Compare (Aggregates)                             │
│                                                                              │
│  [Attribution Window: ▾ 7d_click,1d_view]  [Metric: ▾ Results/CPR/ROAS]      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Bar/Line/Table: сравнение выбранных окон/моделей по метрике             ││
│  │  Note: CPR = native (если есть) + computed (approx)                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Главный виджет: future (v2) Treemap ↔ Tree Toggle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FUTURE: ATTRIBUTION PATHS — Пути клиентов до конверсии                     │
│                                                                              │
│  [🗂️ Treemap] [🌳 Tree]                       [Group by: ▾ Campaign]        │
│                                                                              │
│  ════════════════════════════ TREEMAP VIEW ═══════════════════════════════  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ┌─────────────────────────────────┬───────────────────┬───────────────┐ ││
│  │ │                                 │                   │               │ ││
│  │ │    Instagram → Facebook →       │  Facebook only    │  Instagram    │ ││
│  │ │         Conversion              │    (direct)       │     only      │ ││
│  │ │                                 │                   │               │ ││
│  │ │         234 conv                │    156 conv       │   89 conv     │ ││
│  │ │         $18.50 CPR              │    $22.30 CPR     │   $15.20 CPR  │ ││
│  │ │         38%                     │    25%            │   14%         │ ││
│  │ │                                 │                   │               │ ││
│  │ ├─────────────────────────────────┼───────────────────┼───────────────┤ ││
│  │ │    Search → Instagram →         │  Instagram →      │  3+ touches   │ ││
│  │ │         Conversion              │     Search        │               │ ││
│  │ │                                 │                   │               │ ││
│  │ │         67 conv                 │    45 conv        │   28 conv     │ ││
│  │ │         $31.20 CPR              │    $28.90 CPR     │   $42.10 CPR  │ ││
│  │ └─────────────────────────────────┴───────────────────┴───────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Legend: Площадь = кол-во конверсий  |  Цвет = CPR (зелёный=низкий)         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ════════════════════════════ TREE VIEW ══════════════════════════════════  │
│                                                                              │
│                              [🎯 Conversion]                                 │
│                                    │                                         │
│                    ┌───────────────┼───────────────┐                        │
│                    │               │               │                        │
│               [Instagram]    [Facebook]      [Search]                       │
│               (45% путей)    (35% путей)    (20% путей)                     │
│                    │               │               │                        │
│             ┌──────┼──────┐   ┌────┼────┐    ┌────┼────┐                    │
│             │      │      │   │    │    │    │    │    │                    │
│          [FB]   [Conv]  [FB] [Conv][IG] [FB][Conv][IG]                      │
│          156    89      67   156   45   32   28   12                        │
│                                                                              │
│  🔍 Click node to see path details                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Attribution Data Model (future v2, CRM-derived)

```typescript
// Важно: это НЕ модель данных из Facebook API.
// Если делаем multi-touch пути, то это будет наша модель на основе user-level событий (CRM/click-id/UTM) + правил матчинга.
interface AttributionPathV2 {
  pathId: string;
  touchpoints: Array<{
    timestamp: string;
    source: 'facebook' | 'instagram' | 'audience_network' | 'messenger';
    campaignId: string;
    campaignName: string;
    adsetId: string;
    adId: string;
    interactionType: 'impression' | 'click' | 'view_content' | 'add_to_cart';
  }>;
  conversion: {
    type: string;  // purchase, lead, etc.
    value?: number;
    timestamp: string;
  };
  attributionModel: 'last_touch' | 'first_touch' | 'linear' | 'time_decay' | 'position_based';
}

// Агрегация для визуализации
interface PathAggregation {
  pathPattern: string;       // "Instagram → Facebook → Conv"
  conversions: number;
  revenue: number;
  avgTouches: number;
  avgDaysToConvert: number;
  percentOfTotal: number;
}
```

### Интерактивность

| Действие | Treemap | Tree |
|----------|---------|------|
| **Hover** | Tooltip: path, conversions, CPR | Tooltip: node stats |
| **Click** | Detail Panel с примерами путей | Expand/collapse branch |
| **Double-click** | Drill-down в под-пути | Focus on subtree |

### Detail Panel при клике

```
┌─────────────────────────────────────┐
│ 📋 PATH: Instagram → Facebook →     │
│         Conversion                  │
│ ─────────────────────────────────── │
│                                     │
│ 📊 СТАТИСТИКА ПУТИ                  │
│ Conversions: 234                    │
│ Revenue: $12,450                    │
│ % of Total: 38%                     │
│ Avg CPR: $18.50                     │
│ Avg Days to Convert: 3.2            │
│ Avg Touches: 2.4                    │
│                                     │
│ 📍 TOUCHPOINT BREAKDOWN             │
│ 1st Touch: Instagram (100%)         │
│   └─ Story Ads: 67%                 │
│   └─ Feed Ads: 33%                  │
│                                     │
│ 2nd Touch: Facebook (100%)          │
│   └─ Feed: 78%                      │
│   └─ Reels: 22%                     │
│                                     │
│ 📈 CAMPAIGNS В ПУТИ                 │
│ • "Summer Sale" - 45%               │
│ • "Retargeting" - 32%               │
│ • "Lookalike" - 23%                 │
│                                     │
│ 💡 INSIGHT                          │
│ Cross-platform paths convert        │
│ 23% better than single-platform     │
│                                     │
│ [📊 Export Paths] [🔍 Filter by]    │
└─────────────────────────────────────┘
```

### Второстепенные виджеты

| # | Виджет | Тип | Описание |
|---|--------|-----|----------|
| 1 | Attribution Model Comparison | Grouped Bar | Last-touch vs First-touch vs Linear |
| 2 | Time to Convert | Histogram | Распределение дней до конверсии |
| 3 | Touch Frequency | Pie | 1 touch / 2 touches / 3+ touches |

### Плитка KPI

| # | Метрика | Описание |
|---|---------|----------|
| 1 | Total Conversions | Всего конверсий с атрибуцией |
| 2 | Avg Touches | Среднее кол-во касаний до конверсии |
| 3 | Avg Days to Convert | Среднее время до конверсии |
| 4 | Cross-platform % | % путей с несколькими платформами |
| 5 | Best Path CPR | Лучший CPR среди путей |
| 6 | Single-touch % | % конверсий с 1 касанием |

### 📐 ПОЛНЫЙ МАКЕТ WORKSPACE 2: ATTRIBUTION

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  📍 TABS: [🎯 Overview] [🌳 Attribution ←ACTIVE] [📊 Compare]            [+ New Dashboard]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────┬───────────────────────────┐   │
│  │                                                         │                           │   │
│  │  🌳 FUTURE: ATTRIBUTION PATHS                            │  📋 DETAIL PANEL          │   │
│  │                                                         │     (при клике на путь)   │   │
│  │  [🗂️ Treemap ←ACTIVE] [🌳 Tree]  [Group by: ▾ Campaign]│                           │   │
│  │                                                         │  ┌─────────────────────┐  │   │
│  │  ┌─────────────────────────────────────────────────────┐│  │ 📊 Instagram → FB   │  │   │
│  │  │ ┌────────────────────────┬──────────────┬─────────┐ ││  │    → Conversion     │  │   │
│  │  │ │                        │              │         │ ││  │                     │  │   │
│  │  │ │   Instagram → FB →     │   FB only    │  IG     │ ││  │ Conversions: 234    │  │   │
│  │  │ │      Conversion        │   (direct)   │  only   │ ││  │ Revenue: $12,450    │  │   │
│  │  │ │                        │              │         │ ││  │ % of Total: 38%     │  │   │
│  │  │ │      234 conv          │   156 conv   │ 89 conv │ ││  │ Avg CPR: $18.50     │  │   │
│  │  │ │      $18.50 CPR        │   $22.30     │ $15.20  │ ││  │ Avg Days: 3.2       │  │   │
│  │  │ │      38%               │   25%        │  14%    │ ││  │                     │  │   │
│  │  │ │                        │              │         │ ││  │ ─────────────────── │  │   │
│  │  │ ├────────────────────────┼──────────────┼─────────┤ ││  │ Touchpoint Breakdown│  │   │
│  │  │ │   Search → IG →        │  IG → Search │  3+     │ ││  │                     │  │   │
│  │  │ │      Conversion        │              │ touches │ ││  │ 1st: Instagram      │  │   │
│  │  │ │                        │              │         │ ││  │  └─ Story: 67%      │  │   │
│  │  │ │      67 conv           │   45 conv    │ 28 conv │ ││  │  └─ Feed: 33%       │  │   │
│  │  │ │      $31.20 CPR        │   $28.90     │ $42.10  │ ││  │                     │  │   │
│  │  │ └────────────────────────┴──────────────┴─────────┘ ││  │ 2nd: Facebook       │  │   │
│  │  └─────────────────────────────────────────────────────┘│  │  └─ Feed: 78%       │  │   │
│  │                                                         │  │  └─ Reels: 22%      │  │   │
│  │  Legend: Площадь=конверсии | Цвет=CPR (зелёный=низкий) │  │                     │  │   │
│  │                                                         │  │ 💡 Cross-platform   │  │   │
│  │  Attribution Model: [Last-touch ▾]                      │  │ +23% vs single      │  │   │
│  │                                                         │  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┴───────────────────────────┘   │
│                                                                                             │
│  ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│  │ 📊 Model Comparison       │ │ 📈 Time to Convert        │ │ 🥧 Touch Frequency        │ │
│  │                           │ │                           │ │                           │ │
│  │  Last    ████████  $18.5  │ │                           │ │      ╭─────────╮          │ │
│  │  First   ██████    $22.1  │ │   ▓▓▓▓                    │ │     ╱  1-touch ╲         │ │
│  │  Linear  ███████   $20.3  │ │   ▓▓▓▓▓▓▓▓                │ │    │   45%     │         │ │
│  │  Decay   ███████   $19.8  │ │   ▓▓▓▓▓▓                  │ │     ╲  2-touch ╱         │ │
│  │                           │ │   ▓▓▓                     │ │      │  35%   │          │ │
│  │  CPR by Attribution Model │ │   1d  3d  7d  14d  30d    │ │      ╰─ 3+ 20%╯          │ │
│  └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘ │
│                                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │  Total  │ │  Avg    │ │  Avg    │ │ Cross-  │ │  Best   │ │ Single- │                   │
│  │  Conv   │ │ Touches │ │  Days   │ │platform │ │Path CPR │ │ touch % │                   │
│  │   619   │ │   2.1   │ │   4.3   │ │   55%   │ │ $15.20  │ │   45%   │                   │
│  │  ↑15%   │ │  ↑0.3   │ │  ↓0.8d  │ │  ↑8pp   │ │  ↓12%   │ │  ↓5pp   │                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3️⃣ COMPARE — Grouped/Stacked Bar (сравнение N×M)
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Назначение:** Сравнение N сущностей по M метрикам  
**Ключевая идея:** Какая кампания/адсет/креатив лучше по выбранным метрикам

### ECharts компоненты

| Компонент | Ссылка на пример | Применение |
|-----------|------------------|------------|
| **Bar (grouped + stacked + normalized)** | [⭐ Bar Stack Normalization](https://echarts.apache.org/examples/en/editor.html?c=bar-stack-normalization-and-variation) | **ГЛАВНЫЙ** — все 3 режима в одном |
| **Bar (stacked)** | [Stacked Bar](https://echarts.apache.org/examples/en/editor.html?c=bar-stack) | Альтернатива для stacked |
| **Bar (horizontal)** | [Bar Y Category](https://echarts.apache.org/examples/en/editor.html?c=bar-y-category) | Горизонтальный ranking |

### Главный виджет: Grouped/Stacked Bar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMPARISON — Сравнение кампаний по метрикам                                 │
│                                                                              │
│  X-axis: Campaigns (или AdSets, Ads, Creatives)                             │
│  Y-axis: Multiple metrics                                                    │
│                                                                              │
│  [Select entities: ▾ Campaigns / AdSets / Ads / Creatives]                  │
│  [Select metrics: ☑ Spend ☑ Results ☑ Revenue ☐ CTR ☐ CPC ...]             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  GROUPED VIEW (bars рядом для каждой entity):                          │ │
│  │                                                                        │ │
│  │  ┌─────┬─────┬─────┬─────┬─────┐                                       │ │
│  │  │ ▓▓▓ │ ▓▓  │ ▓▓▓▓│ ▓   │ ▓▓▓ │  ← Spend                              │ │
│  │  │ ░░  │ ░░░ │ ░   │ ░░░░│ ░░  │  ← Results                            │ │
│  │  │ ▒▒▒▒│ ▒   │ ▒▒  │ ▒▒▒ │ ▒▒▒▒│  ← Revenue                            │ │
│  │  └─────┴─────┴─────┴─────┴─────┘                                       │ │
│  │   Camp1  Camp2 Camp3 Camp4 Camp5                                       │ │
│  │                                                                        │ │
│  │  Legend: ▓ Spend  ░ Results  ▒ Revenue                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [📊 Grouped] [📊 Stacked] [📊 Normalized %]                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Два режима Workspace 3

#### Режим 1: Multi-compare (основной)
Сравнение **N выбранных сущностей** по **M метрикам**:
```
X-axis: Camp1, Camp2, Camp3, Camp4, Camp5
Y-axis: Spend, Results, Revenue (несколько bars рядом)
```

#### Режим 2: Single + Breakdown по атрибуту
Одна сущность (или агрегат), но **breakdown по одному из 9 атрибутов**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Entity: ▾ Campaign "Summer Sale"]  [Breakdown by: ▾ Placement]            │
│                                                                              │
│  X-axis: Instagram Feed, Instagram Stories, Facebook Feed, Audience Network │
│  Y-axis: Spend, Results, CPR, ROAS                                          │
│                                                                              │
│  ┌─────┬─────┬─────┬─────┐                                                  │
│  │ ▓▓▓ │ ▓▓  │ ▓▓▓▓│ ▓   │  ← Spend                                        │
│  │ ░░░ │ ░░░░│ ░░  │ ░   │  ← Results                                       │
│  │ ▒▒  │ ▒▒▒ │ ▒   │ ▒▒▒▒│  ← CPR                                          │
│  └─────┴─────┴─────┴─────┘                                                  │
│   IG Feed  IG Story  FB Feed   AN                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Breakdown можно делать по любому из 9 атрибутов:**
- by Placement
- by Objective  
- by Optimization Goal
- by Budget Type (CBO/ABO)
- by Bid Strategy
- by Destination Type
- by Special Ad Category
- by Buying Type
- by Promoted Object

#### Итого режимы Workspace 3:

| Режим | X-axis | Y-axis | Пример |
|-------|--------|--------|--------|
| **Multi-compare** | N entities | M metrics | 5 кампаний × (Spend, Results, Revenue) |
| **Single + Breakdown** | Значения атрибута | M metrics | 1 кампания × Placement × (Spend, Results, CPR) |
| **Aggregate + Breakdown** | Значения атрибута | M metrics | Все кампании × Objective × (Spend, Results) |

---

#### Режимы отображения (Bar modes)

| Режим | Описание | Когда использовать |
|-------|----------|-------------------|
| **Grouped** | Метрики рядом для каждой entity | Сравнение абсолютных значений |
| **Stacked** | Метрики друг на друге | Общий объём + структура |
| **Normalized %** | Каждая entity = 100% | Сравнение пропорций |

#### Селектор сущностей

```typescript
interface ComparisonConfig {
  entityType: 'campaigns' | 'adsets' | 'ads' | 'creatives';
  selectedEntities: string[];  // IDs выбранных сущностей
  metrics: string[];           // Выбранные метрики
  displayMode: 'grouped' | 'stacked' | 'normalized';
  
  // Режим breakdown
  breakdownMode: 'multi-compare' | 'single-breakdown' | 'aggregate-breakdown';
  breakdownAttribute?: string;  // Один из 9 атрибутов
  
  sortBy: string;              // По какой метрике сортировать
  sortOrder: 'asc' | 'desc';
}
```

**UI для выбора:**
- Multi-select из списка сущностей (из таблицы)
- Checkbox list для метрик (неограниченно)
- Toggle для режима отображения
- Dropdown для breakdown attribute (в режиме Single/Aggregate)

#### Detail Panel при клике

При клике на бар показываем:
- Все метрики выбранной entity
- Сравнение с средним по выборке
- Тренд за период (мини-sparkline)

#### Второстепенные виджеты (слайдер)

| # | Виджет | Тип | Применение |
|---|--------|-----|------------|
| 1 | Funnel | Funnel | Конверсия этапов, video retention |
| 2 | Mixed | Bar+Line | Объём (bars) + эффективность (line), например Results + CPR |
| 3 | Area | Area | Тренд во времени, накопление (Spend over time) |
| 4 | Stacked Bar | Bar | Сравнение структуры (уже в главном виджете) |
| 5 | Pie | Pie/Donut | Распределение % от целого (Spend by Objective) |
| 6 | Scatter | XY Scatter | **Correlation**: CPR vs Spend, CTR vs CPM, ROAS vs Spend |

### Scatter (Bubble) — для чего нужен

**Показывает:** Корреляцию между двумя метриками + третье измерение через размер пузырька

```
┌─────────────────────────────────────────────────────┐
│  CPR vs Spend — где эффективность?                  │
│  (размер пузырька = количество Results)             │
│                                                     │
│  CPR │                                              │
│  $50 ┤           ○Camp4 (дорогой, неэффективный,   │
│      │                   мало results)              │
│  $30 ┤     ●Camp2                                   │
│      │                                              │
│  $15 ┤  ●Camp1        ◉Camp3                        │
│      │        ⬤Camp5 (много spend, низкий CPR,     │
│   $5 ┤              много results) ← SWEET SPOT    │
│      └──────────────────────────────────────────    │
│        $100   $500   $1000  $2000   $3000  Spend   │
│                                                     │
│  Legend: ○ small  ● medium  ◉ large  ⬤ huge       │
└─────────────────────────────────────────────────────┘
```

**3 измерения:**
- X-axis: Spend (бюджет)
- Y-axis: CPR (эффективность)
- Size: Results (объём)

**Примеры использования:**
- `CPR` vs `Spend` — кто эффективен при большом бюджете
- `CTR` vs `CPM` — качество аудитории
- `ROAS` vs `Spend` — масштабируемость
- `Results` vs `Impressions` — конверсия трафика

#### Плитка KPI

| # | Метрика | Описание |
|---|---------|----------|
| 1 | Entities Count | Кол-во в сравнении |
| 2 | Total Spend | Сумма по выборке |
| 3 | Avg CPR | Средний по выборке |
| 4 | Best Performer | Название лучшего |
| 5 | Spread | Max - Min (разброс) |
| 6 | Std Dev | Стандартное отклонение |

### 📐 ПОЛНЫЙ МАКЕТ WORKSPACE 3: COMPARE

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  📍 TABS: [🎯 Overview] [🌳 Attribution] [📊 Compare ←ACTIVE]            [+ New Dashboard]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  Mode: [Multi-compare ←ACTIVE] [Single + Breakdown]        [Grouped ▾] [Sort: Spend ▾]     │
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────┬───────────────────────────┐   │
│  │                                                         │                           │   │
│  │  📊 COMPARE N×M — 5 Campaigns × 3 Metrics              │  📋 DETAIL PANEL          │   │
│  │                                                         │     (при клике на bar)    │   │
│  │  [Select: ☑Camp1 ☑Camp2 ☑Camp3 ☑Camp4 ☑Camp5]         │                           │   │
│  │  [Metrics: ☑Spend ☑Results ☑Revenue]                   │  ┌─────────────────────┐  │   │
│  │                                                         │  │ 📊 Campaign 3       │  │   │
│  │  ┌─────────────────────────────────────────────────────┐│  │ "Summer Sale"       │  │   │
│  │  │                                                     ││  │                     │  │   │
│  │  │   GROUPED BAR                                       ││  │ Spend: $2,145       │  │   │
│  │  │                                                     ││  │ Results: 287        │  │   │
│  │  │     ▓▓▓▓     ▓▓    ▓▓▓▓▓▓   ▓▓▓    ▓▓▓▓▓  Spend    ││  │ Revenue: $12,340    │  │   │
│  │  │     ░░░░░  ░░░░░░  ░░░░░    ░░     ░░░░   Results  ││  │ CPR: $7.48          │  │   │
│  │  │     ▒▒▒▒▒▒ ▒▒▒▒    ▒▒▒▒▒▒▒  ▒▒▒    ▒▒▒▒▒  Revenue  ││  │ ROAS: 5.75          │  │   │
│  │  │   ──────────────────────────────────────────        ││  │                     │  │   │
│  │  │    Camp1   Camp2   Camp3   Camp4   Camp5           ││  │ vs Average:         │  │   │
│  │  │                                                     ││  │ Spend: +15%         │  │   │
│  │  │   Legend: ▓ Spend  ░ Results  ▒ Revenue            ││  │ Results: +42%       │  │   │
│  │  │                                                     ││  │ Revenue: +38%       │  │   │
│  │  └─────────────────────────────────────────────────────┘│  │                     │  │   │
│  │                                                         │  │ Trend (7d):         │  │   │
│  │  [📊 Grouped] [📊 Stacked] [📊 Normalized %]           │  │ ~~~∧~~~∨~∧∧~~       │  │   │
│  │                                                         │  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┴───────────────────────────┘   │
│                                                                                             │
│  ◀ SLIDER: Second Widgets ────────────────────────────────────────────────────────────── ▶ │
│  ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│  │ 📊 FUNNEL (conv stages)   │ │ 📈 MIXED (volume + eff)   │ │ 🟢 SCATTER (correlation)  │ │
│  │                           │ │                           │ │                           │ │
│  │  ┌─────────────────┐      │ │     ▓▓▓ Results           │ │  CPR│     ○              │ │
│  │  │   Impressions   │      │ │     ─── CPR               │ │     │  ●     ○           │ │
│  │  └─────────────────┘      │ │                           │ │     │●   ◉              │ │
│  │  ┌─────────────┐          │ │  ▓▓▓▓▓▓▓▓▓▓  ────────     │ │     │   ⬤               │ │
│  │  │   Clicks    │          │ │  ▓▓▓▓▓▓▓▓               │ │     └────────────Spend   │ │
│  │  └─────────────┘          │ │  ▓▓▓▓▓▓                  │ │  Size = Results          │ │
│  │  ┌─────────┐              │ │  C1  C2  C3  C4  C5       │ │  X=Spend Y=CPR           │ │
│  │  │ Results │              │ │                           │ │                           │ │
│  └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘ │
│                                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │ Count   │ │ Total   │ │  Avg    │ │  Best   │ │ Spread  │ │Std Dev  │                   │
│  │  (N)    │ │ Spend   │ │  CPR    │ │Performer│ │(Max-Min)│ │         │                   │
│  │    5    │ │ $8,245  │ │ $11.32  │ │ Camp3   │ │ $15.20  │ │  $4.55  │                   │
│  │         │ │  ↑12%   │ │  ↓8%    │ │ ⭐      │ │         │ │         │                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Режим Single + Breakdown (альтернативный макет)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Mode: [Multi-compare] [Single + Breakdown ←ACTIVE]        [Grouped ▾] [Sort: Spend ▾]     │
│                                                                                             │
│  Entity: [▾ Campaign "Summer Sale"]    Breakdown by: [▾ Placement]                          │
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                     │   │
│  │  📊 "Summer Sale" — BREAKDOWN BY PLACEMENT                                         │   │
│  │                                                                                     │   │
│  │  Metrics: [☑Spend ☑Results ☑CPR ☑ROAS]                                            │   │
│  │                                                                                     │   │
│  │       ▓▓▓▓▓▓▓▓    ▓▓▓▓▓       ▓▓▓▓▓▓      ▓▓         ← Spend                       │   │
│  │       ░░░░░░░░░░  ░░░░░░      ░░░░         ░          ← Results                     │   │
│  │       ▒▒▒         ▒▒▒▒▒       ▒▒▒▒         ▒▒▒▒▒      ← CPR (lower=better)         │   │
│  │       ████████    █████       ██████       ██         ← ROAS                        │   │
│  │      ─────────────────────────────────────────────                                  │   │
│  │       IG Feed     IG Story    FB Feed     Audience                                  │   │
│  │                                           Network                                   │   │
│  │                                                                                     │   │
│  │  💡 Insight: Instagram Feed has highest ROAS (4.2) with acceptable CPR ($8.50)     │   │
│  │                                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🎬 VIDEO RETENTION FUNNEL — Сравнение видео по глубине просмотра
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Назначение:** Сравнить несколько видео креативов по retention (глубине просмотра)  
**Ключевой вопрос:** "Какое видео лучше удерживает внимание?"

### ECharts компоненты

| Компонент | Ссылка на пример | Применение |
|-----------|------------------|------------|
| **Funnel (compare)** | [Funnel Align](https://echarts.apache.org/examples/en/editor.html?c=funnel-align) | Несколько воронок рядом |
| **Funnel (basic)** | [Funnel](https://echarts.apache.org/examples/en/editor.html?c=funnel) | Одна воронка retention |
| **Bar (grouped)** | [Bar Stack Normalization](https://echarts.apache.org/examples/en/editor.html?c=bar-stack-normalization-and-variation) | Альтернатива — bars по % просмотра |

### Данные из Facebook API

```typescript
// Video metrics из FB Marketing API
interface VideoRetentionMetrics {
  videoId: string;
  videoName: string;
  thumbnail: string;
  
  // Воронка retention
  video_play_actions: number;          // Начали смотреть
  video_p25_watched_actions: number;   // Досмотрели 25%
  video_p50_watched_actions: number;   // Досмотрели 50%
  video_p75_watched_actions: number;   // Досмотрели 75%
  video_p95_watched_actions: number;   // Досмотрели 95%
  video_p100_watched_actions: number;  // Досмотрели 100%
  
  // Дополнительно
  video_avg_time_watched_actions: number;  // Avg время просмотра
  video_thruplay_watched_actions: number;  // ThruPlay (15+ сек или до конца)
}
```

### Визуализация: Воронка Retention

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VIDEO RETENTION COMPARISON — Глубина просмотра видео                        │
│                                                                              │
│  [Select videos: ☑ Video 1 ☑ Video 2 ☑ Video 3 ☐ Video 4 ...]              │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │   VIDEO 1            VIDEO 2            VIDEO 3                       │  │
│  │   "Summer Ad"        "Winter Ad"        "Spring Ad"                   │  │
│  │                                                                       │  │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │  │
│  │  │ Started 100% │   │ Started 100% │   │ Started 100% │  ← Play      │  │
│  │  └──────────────┘   └──────────────┘   └──────────────┘              │  │
│  │  ┌────────────┐     ┌──────────┐       ┌────────────┐                │  │
│  │  │   25%: 78% │     │ 25%: 65% │       │   25%: 82% │    ← 25%      │  │
│  │  └────────────┘     └──────────┘       └────────────┘                │  │
│  │  ┌──────────┐       ┌────────┐         ┌──────────┐                  │  │
│  │  │ 50%: 54% │       │50%: 42%│         │ 50%: 61% │      ← 50%      │  │
│  │  └──────────┘       └────────┘         └──────────┘                  │  │
│  │  ┌────────┐         ┌──────┐           ┌────────┐                    │  │
│  │  │75%: 32%│         │75%:25│           │75%: 45%│        ← 75%      │  │
│  │  └────────┘         └──────┘           └────────┘                    │  │
│  │  ┌──────┐           ┌────┐             ┌──────┐                      │  │
│  │  │ 100% │           │100%│             │ 100% │          ← 100%     │  │
│  │  │ 18%  │           │ 12%│             │ 28%  │  ← WINNER!          │  │
│  │  └──────┘           └────┘             └──────┘                      │  │
│  │                                                                       │  │
│  │  Avg Watch: 12.4s      8.2s              18.1s                       │  │
│  │  ThruPlay:  45%        32%               58%                         │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  🏆 Best Retention: "Spring Ad" — 28% досмотрели до конца                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Альтернатива: Grouped Bar (% на каждом этапе)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  X-axis: Retention stages (25%, 50%, 75%, 95%, 100%)                        │
│  Y-axis: % viewers retained                                                  │
│  Series: Each video                                                          │
│                                                                              │
│  100% ┤ ▓▓▓ ░░░ ▒▒▒                                                         │
│       │ ▓▓▓ ░░░ ▒▒▒                                                         │
│   75% ┤ ▓▓▓ ░░  ▒▒▒                                                         │
│       │ ▓▓  ░░  ▒▒▒                                                         │
│   50% ┤ ▓▓  ░   ▒▒                                                          │
│       │ ▓   ░   ▒▒                                                          │
│   25% ┤ ▓   ░   ▒                                                           │
│       │                                                                      │
│     0 ┼──────────────────────────────────                                   │
│        25%   50%   75%   95%   100%                                         │
│                                                                              │
│  Legend: ▓ Video 1  ░ Video 2  ▒ Video 3                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### KPI для Video Retention

| # | Метрика | Описание |
|---|---------|----------|
| 1 | Best 100% Rate | Видео с максимальным % досмотра |
| 2 | Avg Completion | Средний % досмотра по всем видео |
| 3 | Drop-off Point | Где теряем больше всего (25→50 vs 50→75) |
| 4 | ThruPlay Leader | Лучшее по ThruPlay rate |

---

## Типы виджетов (полный список с ECharts ссылками)

> **Легенда:** 
> - ✅ = уже реализовано, оставляем (Recharts)
> - 🔄 = есть простая версия, нужно обновить на ECharts
> - 🔜 = нужно реализовать с нуля (ECharts)

### Главные виджеты (1 на рабочий стол)

| Тип | ID | ECharts | Данные | Статус |
|-----|-----|---------|--------|--------|
| Full Funnel | `funnel-full` | [Funnel](https://echarts.apache.org/examples/en/editor.html?c=funnel) + [Gauge](https://echarts.apache.org/examples/en/editor.html?c=gauge-grade) | Воронка FB→CRM + plan/fact | 🔄 Есть div-версия → ECharts |
| Attribution Compare (Aggregates) | `attribution-compare` | [Line](https://echarts.apache.org/examples/en/editor.html?c=line-simple) + [Bar](https://echarts.apache.org/examples/en/editor.html?c=bar-simple) | v1: сравнение attribution windows/models (aggregates) | 🔜 ECharts |
| Attribution Treemap (future) | `attribution-treemap` | [Treemap](https://echarts.apache.org/examples/en/editor.html?c=treemap-drill-down) | future (v2): patterns/sequences (не из Facebook API напрямую) | 🔜 ECharts |
| Attribution Tree (future) | `attribution-tree` | [Radial Tree](https://echarts.apache.org/examples/en/editor.html?c=tree-radial) | future (v2): sequences/ветвление (не из Facebook API напрямую) | 🔜 ECharts |
| Comparison Bar | `comparison` | [⭐ Bar Stack Normalization](https://echarts.apache.org/examples/en/editor.html?c=bar-stack-normalization-and-variation) | N entities × M metrics | ✅ BarChart (Recharts) |
| Video Retention | `video-retention` | [Funnel Align](https://echarts.apache.org/examples/en/editor.html?c=funnel-align) | Сравнение видео по глубине просмотра | 🔜 ECharts (новый) |
| Sankey (future) | `sankey` | [Sankey](https://echarts.apache.org/examples/en/editor.html?c=sankey-energy) | future (v2): flow между touchpoints/sequences | 🔜 ECharts |

### Второстепенные виджеты (2-4 на рабочий стол)

| Тип | ID | ECharts | Описание | Статус |
|-----|-----|---------|----------|--------|
| Line Chart | `line` | [Line](https://echarts.apache.org/examples/en/editor.html?c=line-simple) | Time series | ✅ Recharts |
| Area Chart | `area` | [Stacked Area](https://echarts.apache.org/examples/en/editor.html?c=area-stack) | Time series с заливкой | ✅ Recharts |
| Bar Chart | `bar` | [Bar](https://echarts.apache.org/examples/en/editor.html?c=bar-simple) | Категории | ✅ Recharts |
| Mixed Chart | `mixed` | [Mix Line Bar](https://echarts.apache.org/examples/en/editor.html?c=mix-line-bar) | Bars + Lines combo | ✅ Recharts |
| Pie / Donut | `pie` | [Pie Doughnut](https://echarts.apache.org/examples/en/editor.html?c=pie-doughnut) | Распределение по категории | ✅ Recharts |
| Scatter / Bubble | `scatter` | [⭐ Bubble Gradient](https://echarts.apache.org/examples/en/editor.html?c=bubble-gradient) | Correlation (X, Y, Size) | 🔄 Есть простой → ECharts Bubble |
| Radar | `radar` | [Radar](https://echarts.apache.org/examples/en/editor.html?c=radar) | Multi-dimensional | ✅ Recharts |
| Funnel | `funnel` | [⭐ Funnel](https://echarts.apache.org/examples/en/editor.html?c=funnel) | Этапы воронки | 🔄 Есть div-версия → ECharts |
| Gauge | `gauge` | [⭐ Gauge Grade](https://echarts.apache.org/examples/en/editor.html?c=gauge-grade) | Single KPI vs target | 🔜 ECharts |
| Horizontal Bar | `bar-horizontal` | [Bar Y Category](https://echarts.apache.org/examples/en/editor.html?c=bar-y-category) | Ranking / Top-N | ✅ (через Bar rotate) |
| Heatmap | `heatmap` | [Heatmap Cartesian](https://echarts.apache.org/examples/en/editor.html?c=heatmap-cartesian) | Day × Hour matrix | 🔜 ECharts |
| Histogram | `histogram` | [Bar Simple](https://echarts.apache.org/examples/en/editor.html?c=bar-simple) | Распределение значений | ✅ (через Bar) |

### Сводка по реализации

| Статус | Кол-во | Детали |
|--------|--------|--------|
| ✅ **Оставляем Recharts** | 7 | Line, Area, Bar, Mixed, Pie, Radar, Horizontal Bar |
| 🔄 **Обновить на ECharts** | 3 | Funnel, Funnel Align, Scatter → Bubble |
| 🔜 **Новые на ECharts** | 5 | Gauge, Treemap, Tree, Sankey, Heatmap |

**Итого: 8 задач** (3 обновить + 5 новых)

### Почему ECharts для новых?

| Виджет | Причина |
|--------|---------|
| **Funnel** | Красивее, анимации, кликабельные сегменты |
| **Bubble** | Градиентная заливка, 3D эффект размера |
| **Gauge** | Градиентная шкала, секции, анимация стрелки |
| **Treemap** | Drill-down, анимации, кастомный layout |
| **Tree** | Radial/vertical режимы, collapse/expand |
| **Sankey** | Flow диаграмма с подсветкой путей |
| **Heatmap** | Цветовые шкалы, tooltip, zoom |

### Recharts vs ECharts — что оставляем

```
┌─────────────────────────────────────────────────────────────────────┐
│  RECHARTS (оставляем)              │  ECHARTS (добавляем)          │
├────────────────────────────────────┼────────────────────────────────┤
│  ✅ Line — time series             │  🔄 Funnel — этапы воронки    │
│  ✅ Area — stacked area            │  🔄 Bubble — 3D scatter       │
│  ✅ Bar — categories               │  🔜 Gauge — KPI vs target     │
│  ✅ Mixed — combo chart            │  🔜 Treemap — drill-down      │
│  ✅ Pie — distribution             │  🔜 Tree — radial/vertical    │
│  ✅ Radar — multi-axis             │  🔜 Sankey — flow             │
│                                    │  🔜 Heatmap — matrix          │
└────────────────────────────────────┴────────────────────────────────┘
```

### Плитка (KPI Cards)

| Размер | Cols | Содержимое |
|--------|------|------------|
| **xs** | 1 | Число + label |
| **sm** | 2 | Число + label + trend % |
| **md** | 3 | Число + label + trend + sparkline |

---

## Detail Panel — структура данных

При клике на любой элемент любого виджета открывается Detail Panel справа:

```typescript
interface DetailPanelData {
  // Идентификация
  entity: {
    type: 'campaign' | 'adset' | 'ad' | 'creative' | 'funnel_step' | 'attribution_path';
    id: string;
    name: string;
    status: string;
  };
  
  // Все 9 сквозных метаданных
  metadata: {
    objective?: string;
    budgetType?: 'CBO' | 'ABO';
    bidStrategy?: string;
    buyingType?: string;
    specialAdCategory?: string[];
    optimizationGoal?: string;
    destinationType?: string;
    placements?: string[];
    promotedObject?: {
      pixelId?: string;
      customEventType?: string;
      pageId?: string;
      leadGenFormId?: string;
    };
  };
  
  // Все FB метрики для этой entity
  fbMetrics: Record<string, number>;
  
  // CRM метрики (если есть)
  crmMetrics?: {
    leads: number;
    matchRate: number;
    qualified: number;
    deals: number;
    won: number;
    revenue: number;
    roi: number;
  };
  
  // Тренд за период
  trend: {
    dates: string[];
    values: Record<string, number[]>;
  };
}
```

---

## Настройки рабочего стола

### Layout Grid

```
┌────────────────────────────────────────────────────────────────┐
│  12-column grid                                                │
│                                                                │
│  Main Widget:     8 cols (с Detail Panel) или 12 cols (без)   │
│  Detail Panel:    4 cols (появляется при клике)               │
│  Secondary:       4 cols each (3 в ряд) или 6 cols (2 в ряд)  │
│  KPI Cards:       2 cols each (6 в ряд) или 3 cols (4 в ряд)  │
└────────────────────────────────────────────────────────────────┘
```

### Сохранение конфигурации

```typescript
interface DashboardConfig {
  id: string;
  name: string;
  
  // Главный виджет
  mainWidget: {
    type: 'funnel-full' | 'sunburst' | 'treemap' | 'comparison' | 'sankey';
    config: Record<string, any>;  // Специфичные настройки
  };
  
  // Targets для воронки (ручной ввод)
  funnelTargets?: FunnelTargets;
  
  // Второстепенные виджеты
  secondaryWidgets: Array<{
    type: string;
    config: Record<string, any>;
    position: { col: number; row: number; width: number; height: number };
  }>;
  
  // KPI плитка
  kpiCards: Array<{
    metricId: string;
    size: 'xs' | 'sm' | 'md';
  }>;
}
```

---

## Preset рабочие столы (ФИНАЛЬНАЯ ВЕРСИЯ)

| # | Preset | Main Widget | ECharts | Secondary | KPI |
|---|--------|-------------|---------|-----------|-----|
| 1 | **Overview** | Full Funnel + Plan/Fact | funnel + gauge | Area, Gauge, Mixed | 8 cards |
| 2 | **Attribution** | Treemap ↔ Tree (toggle) | treemap + tree | Grouped Bar, Histogram, Pie | 6 cards |
| 3 | **Compare** | Grouped/Stacked Bar | bar (grouped) | Table, Scatter, Histogram | 6 cards |

### Краткое описание каждого Preset

| Preset | Цель | Ключевой вопрос |
|--------|------|-----------------|
| **Overview** | Общая картина бизнеса | "Как воронка FB Ads → CRM выполняет план?" |
| **Attribution** | Пути клиента | "Какие комбинации touchpoints лучше конвертят?" |
| **Compare** | Сравнение сущностей | "Какая кампания/адсет лучше по метрикам?" |

Пользователь может:
- Использовать preset as-is
- Модифицировать preset
- Создать полностью кастомный стол

---

## План реализации Dashboard Builder

### Фаза 1: Инфраструктура

1. **DashboardConfig schema** — структура данных для сохранения
2. **DashboardProvider** — контекст для текущего рабочего стола
3. **Widget Registry** — реестр всех типов виджетов

### Фаза 2: Главные виджеты

1. **Full Funnel** — воронка с plan/fact и разделителем FB/CRM
2. **Attribution Treemap/Tree** — визуализация путей атрибуции с toggle
3. **Comparison** — Grouped/Stacked Bar

### Фаза 3: Detail Panel

1. **DetailPanel component** — правая панель
2. **Metadata display** — все 9 атрибутов
3. **Metrics display** — все FB + CRM метрики
4. **Attribution details** — breakdown путей при клике

### Фаза 4: Drag & Drop

1. **Grid layout** — react-grid-layout или аналог
2. **Widget resize** — изменение размера
3. **Widget move** — перемещение

### Фаза 5: Preset & Custom

1. **3 preset столов** — дефолтные конфигурации
2. **Save/Load** — сохранение кастомных столов
3. **Export** — экспорт в JSON/PDF

---

## Validation Checklist — Dashboard Builder

### Workspace 1: Overview (Full Funnel)
- [ ] Воронка отображает все этапы от Impressions до Won
- [ ] Визуальный разделитель FB / CRM (Match Rate)
- [ ] Targets вводятся вручную и сохраняются
- [ ] Plan/Fact показывает % выполнения с прогресс-баром
- [ ] Detail Panel: breakdown по campaign при клике на этап

### Workspace 2: Attribution (Treemap ↔ Tree)
- [ ] Treemap показывает пути по площади (конверсии)
- [ ] Tree показывает ветвление путей от touchpoint
- [ ] Toggle переключает между Treemap и Tree
- [ ] Цвет = CPR (зелёный = низкий)
- [ ] Detail Panel: touchpoint breakdown, campaigns в пути

### Workspace 3: Compare (Grouped Bar)
- [ ] Выбор N entities (campaigns/adsets/ads)
- [ ] Выбор M metrics (checkboxes)
- [ ] 3 режима: Grouped / Stacked / Normalized %
- [ ] Сортировка по выбранной метрике
- [ ] Detail Panel: все метрики + сравнение с avg
- [ ] **ROMI by Creative** — новый режим сквозной аналитики (см. ниже)

### Общее
- [ ] Global Query Builder влияет на все виджеты
- [ ] Локальные фильтры таблицы НЕ влияют на виджеты
- [ ] KPI плитка с группировкой по смыслу
- [ ] Preset столы работают из коробки
- [ ] Кастомные столы сохраняются в report

---

## ECharts Quick Reference

> **Легенда:** ✅ Recharts (оставляем) | 🔄 Обновить → ECharts | 🔜 Новый ECharts

### Все используемые типы графиков

| Тип | Ссылка | Где используется | Статус |
|-----|--------|------------------|--------|
| Funnel | [echarts/funnel](https://echarts.apache.org/examples/en/editor.html?c=funnel) | Overview — Full Funnel | 🔄 → ECharts |
| Funnel Align | [echarts/funnel-align](https://echarts.apache.org/examples/en/editor.html?c=funnel-align) | Video Retention — сравнение воронок | 🔄 → ECharts |
| Gauge | [⭐ echarts/gauge-grade](https://echarts.apache.org/examples/en/editor.html?c=gauge-grade) | Overview — Plan/Fact (с градиентом) | 🔜 ECharts |
| Treemap | [echarts/treemap-drill-down](https://echarts.apache.org/examples/en/editor.html?c=treemap-drill-down) | Attribution — paths by area | 🔜 ECharts |
| Tree (radial) | [echarts/tree-radial](https://echarts.apache.org/examples/en/editor.html?c=tree-radial) | Attribution — path branches | 🔜 ECharts |
| Tree (vertical) | [echarts/tree-vertical](https://echarts.apache.org/examples/en/editor.html?c=tree-vertical) | Attribution — sequential paths | 🔜 ECharts |
| **⭐ Bar Stack Normalization** | [echarts/bar-stack-normalization](https://echarts.apache.org/examples/en/editor.html?c=bar-stack-normalization-and-variation) | **Compare — Grouped/Stacked/Normalized** | ✅ Recharts |
| Area (stacked) | [echarts/area-stack](https://echarts.apache.org/examples/en/editor.html?c=area-stack) | Secondary — time series | ✅ Recharts |
| Mixed (bar+line) | [echarts/mix-line-bar](https://echarts.apache.org/examples/en/editor.html?c=mix-line-bar) | Secondary — combo charts | ✅ Recharts |
| Pie (donut) | [echarts/pie-doughnut](https://echarts.apache.org/examples/en/editor.html?c=pie-doughnut) | Secondary — distribution | ✅ Recharts |
| Scatter (Bubble) | [echarts/bubble-gradient](https://echarts.apache.org/examples/en/editor.html?c=bubble-gradient) | Secondary — correlation (3D) | 🔄 → ECharts |
| Heatmap | [echarts/heatmap-cartesian](https://echarts.apache.org/examples/en/editor.html?c=heatmap-cartesian) | Secondary — day×hour matrix | 🔜 ECharts |
| Sankey | [echarts/sankey-energy](https://echarts.apache.org/examples/en/editor.html?c=sankey-energy) | Alternative — flow diagram | 🔜 ECharts |

### ECharts Documentation
- [Main Examples](https://echarts.apache.org/examples/en/index.html)
- [API Reference](https://echarts.apache.org/en/api.html)
- [Option Reference](https://echarts.apache.org/en/option.html)

---

## ИТОГОВАЯ СХЕМА: Связь фильтров с рабочими столами

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        GLOBAL QUERY BUILDER                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Date Range: [Last 30 days ▾]                                            │  │
│  │  Objective: [CONVERSIONS, LEAD_GENERATION]  Placement: [Instagram]       │  │
│  │  Budget Type: [CBO]                         Daily Budget: [> $100]       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼ фильтрует                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                           FILTERED DATA                                   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│          │                           │                           │              │
│          ▼                           ▼                           ▼              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐        │
│  │  🎯 OVERVIEW     │     │  🌳 ATTRIBUTION  │     │  📊 COMPARE      │        │
│  │                  │     │                  │     │                  │        │
│  │  Full Funnel     │     │  Treemap ↔ Tree  │     │  Grouped Bar     │        │
│  │  + Plan/Fact     │     │  (paths toggle)  │     │  N×M comparison  │        │
│  │                  │     │                  │     │                  │        │
│  │  ┌────────────┐  │     │  ┌────────────┐  │     │  ┌────────────┐  │        │
│  │  │ Detail     │  │     │  │ Detail     │  │     │  │ Detail     │  │        │
│  │  │ Panel      │  │     │  │ Panel      │  │     │  │ Panel      │  │        │
│  │  └────────────┘  │     │  └────────────┘  │     │  └────────────┘  │        │
│  │                  │     │                  │     │                  │        │
│  │  Secondary:      │     │  Secondary:      │     │  Secondary:      │        │
│  │  Area, Gauge,    │     │  Grouped Bar,    │     │  Funnel, Mixed,  │        │
│  │  Mixed           │     │  Histogram, Pie  │     │  Scatter (slider)│        │
│  │                  │     │                  │     │                  │        │
│  │  KPI: 10 cards   │     │  KPI: 6 cards    │     │  KPI: 6 cards    │        │
│  │  (full funnel)   │     │                  │     │                  │        │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘        │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           TABLE (отдельно)                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Локальные фильтры (НЕ влияют на виджеты выше):                          │  │
│  │  [✓] Show only with stats > 0    [Search: ____]    [Sort by: CPR ▾]      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

**Документ создан:** 2025  
**Версия:** 2.1 (с ECharts ссылками, статусами реализации, 3 workspaces)

**Сводка по виджетам:**
- ✅ Оставляем Recharts: 6 (Line, Area, Bar, Mixed, Pie, Radar)
- 🔄 Обновить → ECharts: 3 (Funnel, Funnel Align, Scatter → Bubble)
- 🔜 Новые ECharts: 5 (Gauge, Treemap, Tree, Sankey, Heatmap)

---

# ЧАСТЬ 4: Сквозная аналитика — ROMI by Creative

> **Цель:** Понять какой конкретно креатив привёл к продаже и посчитать реальный ROMI

## Источник данных

```
FB Creative ──┬──→ fb_ad_id      ──┐
              │                     ├──→ KommoLead ──→ Deal Won ──→ Revenue
UTM Params ───┴──→ utm_content   ──┘

ROMI = (revenue - spend) / spend × 100%
```

**Связь через `KommoLead` (уже есть в бэкенде):**
- `fb_ad_id` — прямая связь с рекламой
- `fb_campaign_id`, `fb_adset_id` — связь с родителями
- `utm_source`, `utm_campaign`, `utm_content` — UTM параметры
- `price`, `is_won` — данные о сделке

---

## Workspace 1: Overview — Top-3 ROMI Widget

На Overview показываем **мини-виджет** с топ-3 креативами по ROMI:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏆 TOP 3 CREATIVES BY ROMI                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  🥇 Summer_V1      ROMI: 300%  │  $800 → $3.2k   │  6 sales          │  │
│  │  🥈 Story_UGC      ROMI: 300%  │  $450 → $1.8k   │  4 sales          │  │
│  │  🥉 Carousel_2     ROMI: 223%  │  $650 → $2.1k   │  5 sales          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                              [See all in Compare →]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Альтернатива — Gauge с лучшим креативом:**
```
┌───────────────────────────────┐
│ 🎯 Top Creative ROMI          │
│      ╭───────────╮            │
│     ╱   300%    ╲           │
│    │  Summer_V1  │           │
│     ╲           ╱            │
│      ╰──200%───╯             │
│  Spend: $800 → Revenue: $3.2k │
└───────────────────────────────┘
```

---

## Workspace 3: Compare — режим "ROMI by Creative"

Добавляем **4-й режим** в Compare:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Mode: [Multi-compare] [Single + Breakdown] [Aggregate + Breakdown] [🆕 ROMI by Creative]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
```

### 📐 ПОЛНЫЙ МАКЕТ: ROMI by Creative

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  📍 TABS: [🎯 Overview] [🌳 Attribution] [📊 Compare ←ACTIVE]            [+ New Dashboard]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  Mode: [Multi-compare] [Single + Breakdown] [ROMI by Creative ←ACTIVE]   [Sort: ROMI ▾]    │
│  Breakdown: [▾ None / by Placement / by Objective / by Budget Type / ...]                  │
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────┬───────────────────────────┐   │
│  │                                                         │                           │   │
│  │  📊 TOP CREATIVES BY ROMI                              │  📋 DETAIL PANEL          │   │
│  │     (FB Spend → CRM Revenue)                           │                           │   │
│  │                                                         │  ┌─────────────────────┐  │   │
│  │  ┌────────────┬────────┬───────┬─────────┬──────┬─────┐│  │ 🖼️ Summer_V1.mp4    │  │   │
│  │  │ Creative   │ Spend  │ Leads │Qualified│ Won  │ ROMI││  │                     │  │   │
│  │  ├────────────┼────────┼───────┼─────────┼──────┼─────┤│  │ Campaign:           │  │   │
│  │  │🥇Summer_V1 │ $800   │  45   │   18    │ 6    │300% ││  │ "Summer Sale 2025"  │  │   │
│  │  │🥈Story_UGC │ $450   │  28   │   12    │ 4    │300% ││  │                     │  │   │
│  │  │🥉Carousel_2│ $650   │  38   │   15    │ 5    │223% ││  │ FB Metrics:         │  │   │
│  │  │  Video_2   │ $550   │  22   │   7     │ 3    │164% ││  │ Impressions: 45K    │  │   │
│  │  │  Banner_3  │ $320   │  15   │   5     │ 2    │156% ││  │ Clicks: 2.1K        │  │   │
│  │  │  Reel_Demo │ $1200  │  52   │   8     │ 2    │ 25% ││  │ CTR: 4.7%           │  │   │
│  │  └────────────┴────────┴───────┴─────────┴──────┴─────┘│  │ CPL: $17.78         │  │   │
│  │                                                         │  │                     │  │   │
│  │  📈 ROMI Bar Chart                                     │  │ CRM Funnel:         │  │   │
│  │  ┌─────────────────────────────────────────────────────┐│  │ Leads: 45           │  │   │
│  │  │ Summer_V1   ████████████████████████████ 300%       ││  │ Qualified: 18 (40%) │  │   │
│  │  │ Story_UGC   ████████████████████████████ 300%       ││  │ Won: 6 (33%)        │  │   │
│  │  │ Carousel_2  ██████████████████████ 223%             ││  │ Revenue: $3,200     │  │   │
│  │  │ Video_2     █████████████ 164%                      ││  │                     │  │   │
│  │  │ Banner_3    ████████████ 156%                       ││  │ ROMI: 300% 🟢      │  │   │
│  │  │ Reel_Demo   ██ 25%                                  ││  │ vs Avg: +175%       │  │   │
│  │  └─────────────────────────────────────────────────────┘│  └─────────────────────┘  │   │
│  │                                                         │                           │   │
│  │  🔗 Attribution: fb_ad_id → KommoLead → Deal           │                           │   │
│  └─────────────────────────────────────────────────────────┴───────────────────────────┘   │
│                                                                                             │
│  ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│  │ 📊 Spend vs Revenue       │ │ 🥧 Revenue by Creative    │ │ 📈 ROMI Trend            │ │
│  │ (Scatter: X=Spend Y=Rev)  │ │ (Pie/Donut)               │ │ (Line over time)          │ │
│  │    Rev│     ●             │ │     ╭─────────╮           │ │  300%─────●───────●      │ │
│  │       │  ●    ⬤          │ │    ╱ Summer  ╲          │ │  200%───●──────────●      │ │
│  │       │●                  │ │   │   42%    │          │ │  100%─────────────────    │ │
│  │       └────────Spend      │ │    ╲ Others ╱           │ │       W1  W2  W3  W4      │ │
│  │   Size = ROMI             │ │     ╰───────╯            │ │                           │ │
│  └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘ │
│                                                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│  │Creatives│ │ Total   │ │ Total   │ │  Avg    │ │  Best   │ │Unmatched│                   │
│  │ Count   │ │ Spend   │ │ Revenue │ │  ROMI   │ │Performer│ │ Leads   │                   │
│  │   12    │ │ $4,970  │ │$11,200  │ │  125%   │ │Summer_V1│ │   8%    │                   │
│  │         │ │         │ │         │ │  ↑32%   │ │  300%   │ │  ↓3%    │                   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Breakdown по 9 метаданным

Dropdown "Breakdown" позволяет группировать креативы по любому из 9 атрибутов:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Breakdown: [▾ by Placement]                                                 │
│                                                                              │
│  ▼ instagram_feed              Spend: $1,900   ROMI: 280%                   │
│    ├─ 🥇 Summer_V1             $800            300%                         │
│    ├─ 🥉 Carousel_2            $650            223%                         │
│    └─    Banner_3              $450            320%                         │
│                                                                              │
│  ▼ instagram_stories           Spend: $950    ROMI: 310%                    │
│    ├─ 🥈 Story_UGC             $450            300%                         │
│    └─    Story_Promo           $500            320%                         │
│                                                                              │
│  ▼ facebook_feed               Spend: $1,200   ROMI: 85%  ⚠️ слабое место  │
│    └─    Reel_Demo             $1,200          25%                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Доступные breakdown атрибуты (из метаданных):**

| # | Атрибут | Уровень | Пример значений |
|---|---------|---------|-----------------|
| 1 | Placement | AdSet | instagram_feed, instagram_stories, facebook_feed |
| 2 | Objective | Campaign | CONVERSIONS, LEAD_GENERATION, MESSAGES |
| 3 | Budget Type | Campaign | CBO, ABO |
| 4 | Optimization Goal | AdSet | LEAD_GENERATION, CONVERSATIONS, LINK_CLICKS |
| 5 | Bid Strategy | Campaign | LOWEST_COST_WITHOUT_CAP, COST_CAP |
| 6 | Destination Type | AdSet | WEBSITE, APP, MESSENGER |
| 7 | Buying Type | Campaign | AUCTION, RESERVED |
| 8 | Special Ad Category | Campaign | NONE, HOUSING, CREDIT |
| 9 | Promoted Object | AdSet | pixel_id, page_id, application_id |

### Data Model

```typescript
interface CreativeROMI {
  creativeId: string
  creativeName: string
  imageUrl?: string
  thumbnailUrl?: string
  
  // Parent IDs для breakdown
  adId: string
  adsetId: string
  campaignId: string
  
  // Метаданные (наследуются)
  placement?: string
  objective?: string
  budgetType?: 'CBO' | 'ABO'
  optimizationGoal?: string
  bidStrategy?: string
  destinationType?: string
  buyingType?: string
  specialAdCategory?: string
  promotedObject?: string
  
  // FB Metrics
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  
  // CRM Metrics (from KommoLead)
  leads: number           // count where fb_ad_id matches
  qualifiedLeads: number  // count where statusId = qualified
  wonDeals: number        // count where is_won = true
  revenue: number         // sum(price) where is_won = true
  
  // Calculated
  cpl: number             // spend / leads
  romi: number            // (revenue - spend) / spend × 100%
  conversionRate: number  // wonDeals / leads × 100%
}

interface CreativeROMIResponse {
  creatives: CreativeROMI[]
  
  totals: {
    spend: number
    leads: number
    qualifiedLeads: number
    wonDeals: number
    revenue: number
    avgRomi: number
  }
  
  // Для breakdown
  groups?: Array<{
    groupKey: string      // значение атрибута (e.g. "instagram_feed")
    creatives: CreativeROMI[]
    subtotals: {
      spend: number
      revenue: number
      romi: number
    }
  }>
  
  unmatchedLeads: number  // лиды без fb_ad_id
  matchRate: number       // % лидов с attribution
}
```

### API Endpoint (нужно реализовать)

```
GET /api/v1/fb-front/ads/romi-by-creative
  ?workspaceId=xxx
  &reportId=xxx
  &dateFrom=2025-12-01
  &dateTo=2025-12-23
  &breakdown=placement  // optional
  &sortBy=romi
  &sortOrder=desc
```

---

## Validation Checklist — ROMI by Creative

- [ ] Таблица показывает креативы с CRM-метриками (Leads, Qualified, Won, Revenue, ROMI)
- [ ] Bar chart визуализирует ROMI для каждого креатива
- [ ] Breakdown группирует по любому из 9 атрибутов
- [ ] Detail Panel показывает полную информацию о креативе
- [ ] Scatter: X=Spend, Y=Revenue, Size=ROMI — корреляция
- [ ] KPI плитка: Total Spend, Total Revenue, Avg ROMI, Best Performer, Unmatched Leads
- [ ] Overview: мини-виджет Top-3 ROMI с ссылкой на Compare
- [ ] Фильтры Query Builder влияют на выборку креативов

---

# ЧАСТЬ 5: Архитектура кэширования виджетов

> Статус: УТВЕРЖДЕНО (23.12.2025)
> Выбран: **Вариант Б — кэш на каждый виджет**

## Проблема

При реализации дашбордов с множеством виджетов нужна система кэширования, которая:
1. Не вызывает лагов при переключении виджетов
2. Позволяет виджетам работать независимо друг от друга
3. Не дублирует одинаковые запросы от разных виджетов

## Выбранное решение: useWidgetCache + React Query

```
┌────────────────────────────────────────────────────────────────┐
│                    Dashboard (Workspace)                        │
│                                                                 │
│   React Query Cache (автоматическая дедупликация)              │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  queryKey: ['widget-cache', widgetId, ...]              │  │
│   │  • staleTime: 5 минут                                   │  │
│   │  • одинаковые запросы НЕ дублируются                    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         ▼                 ▼                 ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ MetricCard   │  │ LineChart    │  │ TableWidget  │         │
│  │              │  │              │  │              │         │
│  │ useWidget    │  │ useWidget    │  │ useWidget    │         │
│  │ Cache()      │  │ Cache()      │  │ Cache()      │         │
│  │              │  │              │  │              │         │
│  │ isLoading    │  │ isLoading    │  │ isLoading    │         │
│  │ data         │  │ data         │  │ data         │         │
│  │ refetch()    │  │ refetch()    │  │ refetch()    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────────────────────────────────────────┘
```

## Преимущества Варианта Б

| Критерий | Описание |
|----------|----------|
| **Независимость** | Ошибка в одном виджете не влияет на другие |
| **Гибкость** | Каждый виджет может иметь свои параметры (фильтры, период) |
| **Производительность** | React Query автоматически дедуплицирует одинаковые запросы |
| **Обновление** | Можно обновить один виджет без перезагрузки всех |
| **Масштабируемость** | Легко добавлять новые виджеты без изменения архитектуры |

## Реализация: useWidgetCache

**Файл:** `packages/fb-front/client/src/hooks/useWidgetCache.ts`

### Типы виджетов

```typescript
type WidgetType = 
  | 'chart-line'        // Линейный график
  | 'chart-bar'         // Столбчатый график
  | 'chart-pie'         // Круговая диаграмма
  | 'metric-card'       // Карточка с одной метрикой
  | 'metric-cards'      // Группа карточек метрик
  | 'table'             // Таблица с данными
  | 'romi-creative'     // ROMI by Creative
  | 'funnel'            // Воронка конверсий
  | 'heatmap';          // Тепловая карта

type WidgetEntityType = 'campaign' | 'adset' | 'ad' | 'creative';
```

### Параметры виджета

```typescript
interface UseWidgetCacheParams {
  // Идентификация
  widgetId: string;
  widgetType: WidgetType;
  
  // Данные
  entityType: WidgetEntityType;
  metricIds: string[];
  entityIds?: string[];
  
  // Фильтры
  filters?: {
    // UTM
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    
    // CRM
    pipelineId?: number;
    userId?: number;
    isWon?: boolean;
    
    // FB
    status?: string[];
  };
  
  // Контекст
  workspaceId: string;
  reportId: string;
  dateFrom: string;
  dateTo: string;
  attribution: string;
  accountIds: string[];
}
```

### Данные виджета

```typescript
interface WidgetMetricsData {
  // Агрегированные метрики (для карточек)
  totals: Record<string, number>;
  
  // Метрики по датам (для графиков)
  byDate: Record<string, Record<string, number>>;
  
  // Метрики по сущностям (для таблиц)
  byEntity: Record<string, {
    id: string;
    name: string;
    status: string;
    thumbnail?: string;
    metrics: Record<string, number>;
    // Иерархия
    account?: string;
    campaign?: string;
    adset?: string;
    ad?: string;
  }>;
  
  availableMetrics: string[];
  loadedAt: number;
  entityCount: number;
  dateCount: number;
}
```

### Использование

```tsx
// Карточка метрики
function MetricCardWidget({ metricId, ...props }) {
  const { data, isLoading, refetch } = useWidgetCache({
    widgetId: `metric-card-${metricId}`,
    widgetType: 'metric-card',
    entityType: 'campaign',
    metricIds: [metricId],
    ...props,
  });
  
  if (isLoading) return <Skeleton />;
  
  return (
    <Card>
      <CardValue>{formatMetric(data.totals[metricId])}</CardValue>
    </Card>
  );
}

// График
function LineChartWidget({ metricIds, ...props }) {
  const { data, isLoading } = useWidgetCache({
    widgetId: 'spend-chart',
    widgetType: 'chart-line',
    entityType: 'campaign',
    metricIds,
    ...props,
  });
  
  if (isLoading) return <ChartSkeleton />;
  
  return (
    <LineChart data={data.byDate} metrics={metricIds} />
  );
}

// ROMI by Creative
function ROMIByCreativeWidget({ ...props }) {
  const { data, isLoading } = useWidgetCache({
    widgetId: 'romi-creative',
    widgetType: 'romi-creative',
    entityType: 'creative',
    metricIds: ['spend', 'revenue', 'romi', 'leads', 'cpl'],
    ...props,
  });
  
  if (isLoading) return <TableSkeleton />;
  
  return (
    <ROMITable creatives={Object.values(data.byEntity)} />
  );
}
```

### Дополнительные хуки

```typescript
// Инвалидация всех виджетов отчёта
const invalidateAll = useInvalidateAllWidgets(reportId);

// Вызов при смене периода или фильтров
invalidateAll();

// Prefetch виджета (для hover preview)
const prefetch = usePrefetchWidget();

// Пример: prefetch при наведении на превью
<WidgetPreview onMouseEnter={() => prefetch(widgetParams)} />
```

## Query Key структура

```typescript
queryKey = [
  'widget-cache',           // namespace
  widgetId,                 // уникальный ID виджета
  widgetType,               // тип виджета
  entityType,               // campaign/adset/ad/creative
  reportId,                 // ID отчёта
  dateFrom,                 // начало периода
  dateTo,                   // конец периода
  attribution,              // окно атрибуции
  accountIds.join(','),     // список аккаунтов
  metricIds.join(','),      // список метрик
  entityIds?.join(','),     // конкретные ID сущностей
  JSON.stringify(filters),  // фильтры
]
```

**Дедупликация:** Если два виджета имеют одинаковый queryKey — React Query выполнит только ОДИН запрос и раздаст данные обоим.

## Интеграция с существующим useReportCache

```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│   useReportCache (старый)           useWidgetCache (новый)     │
│   ───────────────────────           ─────────────────────────  │
│                                                                 │
│   • Загружает ВСЕ 4 таба           • Загружает данные для      │
│     параллельно                       ОДНОГО виджета            │
│                                                                 │
│   • Используется в                 • Используется в            │
│     AnalyticsPage.tsx                Workspace компонентах     │
│                                                                 │
│   • Signature-based                • React Query кэш           │
│     инвалидация                      (staleTime)                │
│                                                                 │
│   • Prefetch Period B              • Prefetch on hover          │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Миграция:** 
- AnalyticsPage продолжает использовать `useReportCache`
- Новые Workspace компоненты используют `useWidgetCache`
- Постепенная миграция по мере создания виджетов

## Validation Checklist — Widget Cache

- [ ] Каждый виджет имеет свой изолированный кэш
- [ ] Одинаковые запросы дедуплицируются через React Query
- [ ] Ошибка в одном виджете не влияет на другие
- [ ] Виджеты можно обновлять по отдельности
- [ ] staleTime предотвращает лишние запросы
- [ ] useInvalidateAllWidgets работает при смене отчёта
- [ ] usePrefetchWidget работает для превью