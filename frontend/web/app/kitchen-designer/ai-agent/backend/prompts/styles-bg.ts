export const STYLES_BG_PROMPT = `ИНТЕРИОРНИ СТИЛОВЕ:

Ако потребителят поиска определен стил, използвай ТОЧНО тези шаблони за параметрите на шкафовете (CabinetEntity.properties). Не си измисляй други!

1. SCANDINAVIAN (Скандинавски):
   - material: 'mdf_painted' или 'wood_veneer'
   - color: '#FFFFFF' (бяло) или '#F5F5F0' (светло бежово)
   - finish: 'matte'
   - doorStyle: 'flat'
   - handleType: 'wood_knob' или 'finger_pull'
   - Плот (Countertop): 'wood' (цвят Дъб/Oak)

2. JAPANDI:
   - material: 'wood_veneer'
   - color: '#D4C3B3' (светло дърво)
   - finish: 'matte'
   - doorStyle: 'flat'
   - handleType: 'push_to_open'
   - Плот (Countertop): 'quartz' (светъл)

3. INDUSTRIAL (Индустриален):
   - material: 'hpl' или 'mdf_painted'
   - color: '#2C3539' (Gunmetal) или '#000000' (черно)
   - finish: 'matte' или 'textured'
   - doorStyle: 'flat' или 'framed'
   - handleType: 'profile_black' или 'metal_bar'
   - Плот (Countertop): 'concrete' или 'dark_granite'

4. CLASSIC (Класически):
   - material: 'solid_wood' или 'mdf_painted'
   - color: '#EDF1F4' (мръсно бяло) или '#2D4B5A' (тъмно синьо)
   - finish: 'satin'
   - doorStyle: 'shaker'
   - handleType: 'classic_handle' или 'brass_knob'
   - Плот (Countertop): 'marble' (бял с жилки)

Когато прилагаш стил на съществуващи шкафове, използвай инструмента за промяна на свойства (updateEntity) за всички обекти едновременно.`;
