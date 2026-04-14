from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io
import os
import logging

logger = logging.getLogger(__name__)

# Try to load a Cyrillic font from Windows system
FONT_PATH = "C:\\Windows\\Fonts\\arial.ttf"
FONT_NAME = "ArialCustom"

try:
    if os.path.exists(FONT_PATH):
        pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))
    else:
        # Fallback to standard if not found (might not support Cyrillic well)
        FONT_NAME = "Helvetica"
        logger.warning("Arial font not found, falling back to Helvetica")
except Exception as e:
    FONT_NAME = "Helvetica"
    logger.error(f"Error registering font: {e}")

def generate_offer_pdf(offer_data: dict, items: list) -> bytes:
    """Generates a professional PDF for the offer."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header - Architectural Minimalist Style
    # Top horizontal line
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.5)
    c.line(20*mm, height - 20*mm, width - 20*mm, height - 20*mm)

    c.setFont(FONT_NAME, 24)
    c.drawString(20*mm, height - 35*mm, "STAIPO AI")
    
    c.setFont(FONT_NAME, 10)
    c.drawRightString(width - 20*mm, height - 35*mm, f"ОФЕРТА: {offer_data.get('slug', '')}")
    c.drawRightString(width - 20*mm, height - 40*mm, f"ДАТА: {offer_data.get('createdAt', '')[:10]}")

    # Client Info block
    c.line(20*mm, height - 50*mm, width - 20*mm, height - 50*mm)
    c.setFont(FONT_NAME, 12)
    c.drawString(20*mm, height - 60*mm, "ПОЛУЧАТЕЛ:")
    c.setFont(FONT_NAME, 14)
    c.drawString(20*mm, height - 68*mm, offer_data.get("clientName", "Ваш Клиент"))

    # Table Header
    y_pos = height - 90*mm
    c.setLineWidth(0.2)
    c.line(20*mm, y_pos, width - 20*mm, y_pos)
    
    c.setFont(FONT_NAME, 9)
    c.drawString(22*mm, y_pos - 5*mm, "№")
    c.drawString(32*mm, y_pos - 5*mm, "МАТЕРИАЛ / АРТИКУЛ")
    c.drawRightString(width - 45*mm, y_pos - 5*mm, "К-ВО / ПЛОЩ")
    c.drawRightString(width - 22*mm, y_pos - 5*mm, "ЕД. ЦЕНА")
    
    y_pos -= 8*mm
    c.line(20*mm, y_pos, width - 20*mm, y_pos)

    # Line Items
    y_pos -= 8*mm
    for i, item in enumerate(items, 1):
        if y_pos < 40*mm: # Page break logic simplified (manual for now)
            c.showPage()
            y_pos = height - 30*mm
            c.setFont(FONT_NAME, 9)

        c.setFont(FONT_NAME, 9)
        c.drawString(22*mm, y_pos, str(i))
        
        # Display material and code
        mat_text = item.get("material", "Неизвестен")
        if item.get("code"):
            mat_text += f" ({item['code']})"
        c.drawString(32*mm, y_pos, mat_text[:60]) # Truncate if too long

        # Quantity and unit
        qty_text = f"{item.get('qtyTotal', 0)} бр. / {item.get('areaM2Total', 0):.2f} м2"
        c.drawRightString(width - 45*mm, y_pos, qty_text)
        
        # Unit price placeholder
        c.drawRightString(width - 22*mm, y_pos, "— €")
        
        y_pos -= 6*mm
        if i < len(items):
            c.setStrokeColor(colors.lightgrey)
            c.line(20*mm, y_pos + 2*mm, width - 20*mm, y_pos + 2*mm)
            c.setStrokeColor(colors.black)

    # Totals Summary section
    y_pos -= 10*mm
    if y_pos < 50*mm:
        c.showPage()
        y_pos = height - 40*mm

    c.setLineWidth(0.5)
    c.line(120*mm, y_pos, width - 20*mm, y_pos)
    y_pos -= 8*mm
    
    totals = offer_data.get("totals") or {}
    manual = totals.get("manualCosts") or {}
    
    c.setFont(FONT_NAME, 10)
    c.drawString(120*mm, y_pos, "Междинна сума:")
    c.drawRightString(width - 22*mm, y_pos, f"{totals.get('subtotal', 0):.2f} €")
    
    y_pos -= 6*mm
    c.drawString(120*mm, y_pos, "Печалба/Марж:")
    c.drawRightString(width - 22*mm, y_pos, f"{totals.get('margin', 0):.2f} €")
    
    y_pos -= 8*mm
    c.setFont(FONT_NAME, 14)
    c.drawString(120*mm, y_pos, "ОБЩО:")
    c.drawRightString(width - 22*mm, y_pos, f"{totals.get('total', 0):.2f} €")

    # Footer & Digital Signatures
    foot_y = 40*mm
    if offer_data.get("clientApprovedAt"):
        c.setFont(FONT_NAME, 8)
        c.setStrokeColor(colors.emerald)
        c.line(20*mm, foot_y, width - 20*mm, foot_y)
        c.setFillColor(colors.emerald)
        c.drawString(20*mm, foot_y - 5*mm, "ОДОБРЕНО ЕЛЕКТРОННО ОТ КЛИЕНТА")
        c.setFillColor(colors.black)
        c.drawString(20*mm, foot_y - 9*mm, f"Дата: {offer_data['clientApprovedAt'][:16].replace('T', ' ')}")
        if offer_data.get("clientIp"):
            c.drawString(20*mm, foot_y - 13*mm, f"IP Адрес: {offer_data['clientIp']}")
    
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.5)
    c.line(20*mm, 20*mm, width - 20*mm, 20*mm)
    c.setFont(FONT_NAME, 8)
    c.drawCentredString(width / 2, 12*mm, "Генерирано автоматично от STAIPO AI - Премиум софтуер за мебелно производство")

    c.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
