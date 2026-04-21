import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

/**
 * Пълен каталог от инструменти (Function Calling schemas) за STAIPO Super Agent.
 * Спрямо имплементационен план: РАЗДЕЛ 6, РАЗДЕЛ 13 и РАЗДЕЛ 17.
 */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  // ---------------------------------------------------------
  // 1. OCHOBHИ CAD ОПЕРАЦИИ (Core Mutations)
  // ---------------------------------------------------------
  {
    name: "add_entity",
    description: "Използва се за поставяне на нов обект (шкаф, врата, прозорец, стена) в проекта. ВСИЧКИ РАЗМЕРИ ТРЯБВА ДА СА В МИЛИМЕТРИ (mm). Ако поставяш шкаф на стена, задължително подай 'wallId' от контекста.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        type: { type: SchemaType.STRING, description: "Например: 'cabinet', 'wall', 'door', 'window', 'appliance', 'furniture'" },
        position: {
          type: SchemaType.OBJECT,
          properties: {
            x: { type: SchemaType.NUMBER },
            y: { type: SchemaType.NUMBER }
          },
          required: ["x", "y"]
        },
        width: { type: SchemaType.NUMBER, description: "Ширина в mm (напр. 600)" },
        height: { type: SchemaType.NUMBER, description: "Височина в mm (напр. 720)" },
        depth: { type: SchemaType.NUMBER, description: "Дълбочина в mm (напр. 600)" },
        rotation: { type: SchemaType.NUMBER, description: "Ротация спрямо пода в радиани." },
        cabinetType: { type: SchemaType.STRING, description: "Само за шкафове: 'base', 'wall', 'tall', 'sink', 'stove', 'fridge'" },
        wallId: { type: SchemaType.STRING, description: "ID на стената, към която се закрепя." },
        // Това е stringified JSON обект:
        propertiesJson: { type: SchemaType.STRING, description: "Специфични материали/цветове като JSON string. Например: '{\"material\":\"mdf_painted\",\"color\":\"#FFFFFF\"}'" }
      },
      required: ["type", "position", "width", "height"]
    }
  },
  {
    name: "remove_entity",
    description: "Изтрива съществуващ обект по неговото ID от контекста.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Обектният ID." }
      },
      required: ["id"]
    }
  },
  {
    name: "update_entity",
    description: "Обновява пропъртита, цвят, стил или позиция на конкретен обект по ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING },
        updatesJson: { type: SchemaType.STRING, description: "JSON string със свойствата, които трябва да се обновят." }
      },
      required: ["id", "updatesJson"]
    }
  },
  {
    name: "bulk_update_entities",
    description: "Обновява стил/цвят/материали на МНОЖЕСТВО обекти едновременно (напр. смяна на стила на цялата кухня).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Масив от IDs на обекти." },
        updatesJson: { type: SchemaType.STRING, description: "JSON string със свойствата (стил, мат), които да се приложат на всички." }
      },
      required: ["ids", "updatesJson"]
    }
  },
  {
    name: "generate_countertops",
    description: "Автоматично генерира плотове (countertops) върху зададени долни шкафове.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        baseCabinetIds: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Масив от ID-та на долните шкафове ('base', 'sink', 'stove')." }
      },
      required: ["baseCabinetIds"]
    }
  },

  // ---------------------------------------------------------
  // 2. ВАЛИДАЦИЯ И АНАЛИЗ (Validation Tools)
  // ---------------------------------------------------------
  {
    name: "run_ergonomics_audit",
    description: "Проверява проекта (Работен триъгълник, Проходи, Безопасност) и връща резултати към AI агента.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: "check_accessibility",
    description: "Проверява кухнята за достъпност (инвалидни колички, височина на плотове, др.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: "get_budget_estimate",
    description: "Изчислява приблизителна цена във валута (BGN) на база брой шкафове, материали и уреди.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  },

  // ---------------------------------------------------------
  // 3. UI, VIEW & EXPORT УПРАВЛЕНИЕ (View Control)
  // ---------------------------------------------------------
  {
    name: "set_view_mode",
    description: "Пренасочва камерата/погледа към специфичен режим (2d, 3d, elevation, presentation).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        mode: { type: SchemaType.STRING, description: "'2d', '3d', 'elevation', 'presentation'" },
        wallId: { type: SchemaType.STRING, description: "Ако mode e 'elevation', трябва да се подаде ID на стената." }
      },
      required: ["mode"]
    }
  },
  {
    name: "toggle_layer_visibility",
    description: "Скрива или показва конкретен слой ('WALLS', 'FURNITURE', 'DIMENSIONS' и т.н.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        layer: { type: SchemaType.STRING, description: "Слой (напр. 'FURNITURE', 'WALLS')" },
        visible: { type: SchemaType.BOOLEAN, description: "Дали да е видим" }
      },
      required: ["layer", "visible"]
    }
  },
  {
    name: "export_bom_list",
    description: "Активира процеса по генериране и изтегляне на разкройната листа (CSV).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: "prepare_presentation_export",
    description: "Активира скрипт, който взема снимки от всички режими (3D, Elevation) и прави ZIP за клиента.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  }
];
