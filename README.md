# Outage Grid Card

Картка для Home Assistant: сітка графіка відключень світла по годинах (сьогодні / завтра).
Працює з календарем інтеграції [Svitlo Yeah](https://github.com/ALERua/ha-svitlo-yeah).

## Вимоги

Встановлена інтеграція Svitlo Yeah з календарем відключень.

## Встановлення через HACS

1. HACS → ⋮ → Custom repositories.
2. Вставте посилання на цей репозиторій, категорія **Dashboard**.
3. Знайдіть **Outage Grid Card** → Download.
4. Оновіть сторінку (Ctrl+Shift+R).

## Налаштування

```yaml
type: custom:outage-grid-card
entity: calendar.vinnytsia_3_2_planned_outages
title: Графік відключень
```

`entity` — календар відключень вашої черги (подивіться назву в Інструменти розробника → Стани, фільтр `calendar.`).
