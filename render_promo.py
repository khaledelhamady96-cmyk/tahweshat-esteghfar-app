# -*- coding: utf-8 -*-
"""
Tahweshat Esteghfar - Professional Mobile Promo Video Generator
Renders a 720x1280 30FPS MP4 video featuring actual in-app screenshots,
kinetic Arabic typography, smartphone frame mockup, and synchronized audio.
"""

import os
import math
import numpy as np
import wave
import imageio.v3 as iio
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import arabic_reshaper
from bidi.algorithm import get_display
import imageio_ffmpeg

# Paths
BASE_DIR = r"C:\Users\MSI\.gemini\antigravity\scratch\tahweshat-esteghfar"
BRAIN_DIR = r"C:\Users\MSI\.gemini\antigravity\brain\53a2a96d-9a76-4e0a-b8de-e5e27626dce6"
USER_UP = os.path.join(BRAIN_DIR, ".user_uploaded")

FONT_PATH_BOLD = r"C:\Windows\Fonts\tahoma.ttf"
FONT_PATH_REG = r"C:\Windows\Fonts\arial.ttf"

WIDTH = 720
HEIGHT = 1280
FPS = 30
TOTAL_SECONDS = 24
TOTAL_FRAMES = TOTAL_SECONDS * FPS

def ar(text):
    """Reshape and reorder Arabic text for correct RTL display in PIL."""
    if not text:
        return ""
    try:
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception:
        return text

# Load Fonts
font_huge = ImageFont.truetype(FONT_PATH_BOLD, 46)
font_title = ImageFont.truetype(FONT_PATH_BOLD, 36)
font_sub = ImageFont.truetype(FONT_PATH_REG, 24)
font_card_title = ImageFont.truetype(FONT_PATH_BOLD, 22)
font_card_body = ImageFont.truetype(FONT_PATH_REG, 18)
font_badge = ImageFont.truetype(FONT_PATH_BOLD, 17)
font_small = ImageFont.truetype(FONT_PATH_REG, 15)

# Load Real App Images
img_logo = Image.open(os.path.join(USER_UP, "media_1793784386490_b2ee7c4e.png")).convert("RGBA")
img_prayer = Image.open(os.path.join(USER_UP, "media_1793803842950_b9cb8e6f.png")).convert("RGBA")
img_azkar = Image.open(os.path.join(USER_UP, "media_1793789127525_bbf3523b.png")).convert("RGBA")
img_home = Image.open(os.path.join(USER_UP, "media_1793630712121_907198fb.png")).convert("RGBA")
img_veh = Image.open(os.path.join(USER_UP, "media_1793635508671_52ccc92b.png")).convert("RGBA")
img_fin = Image.open(os.path.join(USER_UP, "media_1793633894256_9ea675b9.png")).convert("RGBA")

def create_gradient_bg(w, h, top_color, bot_color):
    """Creates a smooth vertical gradient base."""
    base = Image.new("RGBA", (w, h))
    top = np.array(top_color, dtype=float)
    bot = np.array(bot_color, dtype=float)
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    for y in range(h):
        t = y / h
        c = (1 - t) * top + t * bot
        arr[y, :] = c.astype(np.uint8)
    return Image.fromarray(arr, "RGBA")

BG_BASE = create_gradient_bg(WIDTH, HEIGHT, (5, 30, 26, 255), (2, 10, 18, 255))

# Pre-generate floating particles
np.random.seed(42)
PARTICLES = []
for _ in range(40):
    PARTICLES.append({
        "x": np.random.uniform(20, WIDTH - 20),
        "y": np.random.uniform(20, HEIGHT - 20),
        "r": np.random.uniform(1.5, 4.0),
        "speed": np.random.uniform(0.5, 1.8),
        "alpha": np.random.uniform(80, 220),
        "color": (251, 191, 36) if np.random.rand() > 0.4 else (52, 211, 153)
    })

def draw_particles(im, frame_idx):
    draw = ImageDraw.Draw(im)
    for p in PARTICLES:
        y = (p["y"] - frame_idx * p["speed"]) % HEIGHT
        alpha = int(p["alpha"] * (0.6 + 0.4 * math.sin(frame_idx * 0.08 + p["x"])))
        c = p["color"] + (alpha,)
        draw.ellipse([p["x"] - p["r"], y - p["r"], p["x"] + p["r"], y + p["r"]], fill=c)

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def draw_phone_mockup(screen_img, x, y, w, h, radius=32):
    """Draws a modern smartphone frame mockup containing the real screen_img."""
    phone = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(phone)

    # 1. Outer drop shadow
    shadow_box = [15, 15, w + 25, h + 25]
    draw_rounded_rect(pdraw, shadow_box, radius + 4, fill=(0, 0, 0, 110))

    # 2. Outer titanium frame
    frame_box = [10, 10, w + 10, h + 10]
    draw_rounded_rect(pdraw, frame_box, radius, fill=(28, 35, 45, 255), outline=(71, 85, 105, 255), width=3)

    # 3. Inner screen area
    border = 6
    inner_w = w - border * 2
    inner_h = h - border * 2
    inner_x = 10 + border
    inner_y = 10 + border

    # Resize screen_img to fit
    scaled_screen = screen_img.resize((inner_w, inner_h), Image.Resampling.LANCZOS)

    # Rounded mask for screen content
    mask = Image.new("L", (inner_w, inner_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, inner_w, inner_h], radius=radius - 4, fill=255)

    phone.paste(scaled_screen, (inner_x, inner_y), mask)

    # 4. Dynamic Island / Camera pill at top
    island_w = 90
    island_h = 20
    island_x = 10 + (w - island_w) // 2
    island_y = 10 + border + 6
    draw_rounded_rect(pdraw, [island_x, island_y, island_x + island_w, island_y + island_h], 10, fill=(10, 10, 12, 255))
    # camera lens dot
    pdraw.ellipse([island_x + island_w - 18, island_y + 5, island_x + island_w - 8, island_y + 15], fill=(24, 30, 42, 255))

    # 5. Bottom home indicator bar
    bar_w = 110
    bar_h = 4
    bar_x = 10 + (w - bar_w) // 2
    bar_y = 10 + h - border - 8
    draw_rounded_rect(pdraw, [bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], 2, fill=(220, 220, 220, 180))

    return phone

def render_frame(f_idx):
    """Main frame rendering dispatcher across the 6 video scenes."""
    t = f_idx / FPS
    im = BG_BASE.copy()
    draw = ImageDraw.Draw(im)
    draw_particles(im, f_idx)

    # ================= SCENE 1: 0.0s - 3.8s (HERO INTRO) =================
    if t < 3.8:
        progress = t / 3.8
        # Logo scaling with smooth bounce
        scale = min(1.0, 0.7 + 0.35 * (1 - math.exp(-t * 3.5)))
        logo_sz = int(180 * scale)
        cur_logo = img_logo.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
        lx = (WIDTH - logo_sz) // 2
        ly = 240 - int(20 * math.sin(progress * math.pi))

        # Glowing halo ring
        halo_r = logo_sz // 2 + 16
        draw.ellipse([WIDTH // 2 - halo_r, ly + logo_sz // 2 - halo_r,
                      WIDTH // 2 + halo_r, ly + logo_sz // 2 + halo_r],
                     outline=(245, 158, 11, int(180 * scale)), width=4)

        im.paste(cur_logo, (lx, ly), cur_logo)

        # Badge
        b_text = ar("⭐ التطبيق الإسلامي والمالي الذكي المتكامل")
        bw, bh = 420, 44
        bx = (WIDTH - bw) // 2
        by = ly + logo_sz + 45
        draw_rounded_rect(draw, [bx, by, bx + bw, by + bh], 22, fill=(16, 185, 129, 45), outline=(52, 211, 153, 200), width=2)
        draw.text((bx + bw // 2, by + 10), b_text, font=font_badge, fill=(52, 211, 153), anchor="mt")

        # Main Title
        t_text = ar("تحويشة استغفار")
        draw.text((WIDTH // 2 + 2, by + 67), t_text, font=font_huge, fill=(0, 0, 0, 180), anchor="mt")
        draw.text((WIDTH // 2, by + 65), t_text, font=font_huge, fill=(251, 191, 36), anchor="mt")

        # Subtitle
        s_text = ar("بركة الرزق ونور الاستغفار في هاتفك يومياً")
        draw.text((WIDTH // 2, by + 130), s_text, font=font_sub, fill=(226, 232, 240), anchor="mt")

        # Feature pills
        feats = [
            ("📿", ar("عداد أذكار ذكي")),
            ("🕌", ar("مواقيت الصلاة وGPS")),
            ("🚗", ar("رخص السيارات والأقساط"))
        ]
        fy = by + 210
        for idx, (icon, text) in enumerate(feats):
            card_w = 460
            card_h = 56
            cx = (WIDTH - card_w) // 2
            cy = fy + idx * 72
            # Slide in animation
            alpha = min(1.0, max(0.0, (t - 0.8 - idx * 0.3) * 3))
            if alpha > 0:
                draw_rounded_rect(draw, [cx, cy, cx + card_w, cy + card_h], 16,
                                  fill=(15, 23, 42, int(200 * alpha)), outline=(51, 65, 85, int(220 * alpha)), width=2)
                draw.text((cx + card_w - 20, cy + 14), f"{icon}  {text}", font=font_card_title,
                          fill=(241, 245, 249, int(255 * alpha)), anchor="rt")

    # ================= SCENE 2: 3.8s - 8.2s (ATHKAR COUNTER & FLOATING ALERTS) =================
    elif t < 8.2:
        st = t - 3.8
        # Top Header
        h_text = ar("📿 عداد استغفار ذكي مع التنبيهات العائمة")
        draw.text((WIDTH // 2, 70), h_text, font=font_title, fill=(251, 191, 36), anchor="mt")
        sub_t = ar("تنبيهات منبثقة على الشاشة حتى لو الموبايل مقفول")
        draw.text((WIDTH // 2, 120), sub_t, font=font_sub, fill=(148, 163, 184), anchor="mt")

        # Phone slides up into center
        phone_w = 390
        phone_h = 800
        py_target = 185
        py_start = HEIGHT + 50
        progress = min(1.0, st * 2.0)
        py = int(py_start + (py_target - py_start) * (1 - math.pow(1 - progress, 3)))

        phone = draw_phone_mockup(img_azkar, 0, 0, phone_w, phone_h)
        im.paste(phone, ((WIDTH - phone_w) // 2 - 20, py), phone)

        # Pulse tap animation on Tasbih button
        if st > 1.2:
            tap_cycle = (st - 1.2) % 0.8
            if tap_cycle < 0.4:
                btn_cx = WIDTH // 2
                btn_cy = py + 480
                ring_r = int(25 + tap_cycle * 90)
                ring_alpha = int(220 * (1 - tap_cycle / 0.4))
                draw.ellipse([btn_cx - ring_r, btn_cy - ring_r, btn_cx + ring_r, btn_cy + ring_r],
                             outline=(16, 185, 129, ring_alpha), width=4)

        # Dynamic floating notification slides down from top of phone
        if st > 1.8:
            n_progress = min(1.0, (st - 1.8) * 3)
            nw = 370
            nh = 82
            nx = (WIDTH - nw) // 2
            ny_final = py + 40
            ny = int(py - 90 + (ny_final - (py - 90)) * (1 - math.pow(1 - n_progress, 3)))

            # Glass card notification
            draw_rounded_rect(draw, [nx, ny, nx + nw, ny + nh], 18,
                              fill=(15, 23, 42, 240), outline=(16, 185, 129, 230), width=2)
            # Notification icon dot
            draw.ellipse([nx + nw - 32, ny + 18, nx + nw - 18, ny + 32], fill=(16, 185, 129))
            draw.text((nx + nw - 42, ny + 13), ar("تنبيه استغفار • شاشة القفل"), font=font_badge, fill=(251, 191, 36), anchor="rt")
            draw.text((nx + nw - 20, ny + 44), ar("« أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ »"), font=font_card_body, fill=(241, 245, 249), anchor="rt")

        # Bottom benefit callout banner
        cw = 620
        ch = 70
        cx = (WIDTH - cw) // 2
        cy = HEIGHT - 110
        draw_rounded_rect(draw, [cx, cy, cx + cw, cy + ch], 20, fill=(6, 78, 59, 230), outline=(52, 211, 153, 220), width=2)
        draw.text((WIDTH // 2, cy + 12), ar("⚡ يعمل تلقائياً كل 30 دقيقة بدون استهلاك البطارية"), font=font_card_title, fill=(255, 255, 255), anchor="mt")
        draw.text((WIDTH // 2, cy + 40), ar("متوافق 100% مع أندرويد 13 و 14 وشاشات سامسونج وشاومي"), font=font_small, fill=(167, 243, 208), anchor="mt")

    # ================= SCENE 3: 8.2s - 12.8s (PRAYER TIMES & WINTER DST) =================
    elif t < 12.8:
        st = t - 8.2
        # Header
        h_text = ar("🕌 مواقيت الصلاة والقبلة والتوقيت الشتوي")
        draw.text((WIDTH // 2, 70), h_text, font=font_title, fill=(251, 191, 36), anchor="mt")
        sub_t = ar("حساب فلكي دقيق بالـ GPS حسب الهيئة المصرية للمساحة")
        draw.text((WIDTH // 2, 120), sub_t, font=font_sub, fill=(148, 163, 184), anchor="mt")

        phone_w = 390
        phone_h = 800
        py = 185
        phone = draw_phone_mockup(img_prayer, 0, 0, phone_w, phone_h)
        im.paste(phone, ((WIDTH - phone_w) // 2 - 20, py), phone)

        # Highlight Winter Time Badge on top
        glow_alpha = int(180 + 70 * math.sin(st * 6))
        hw = 360
        hh = 65
        hx = (WIDTH - hw) // 2
        hy = py + 55
        draw_rounded_rect(draw, [hx, hy, hx + hw, hy + hh], 16,
                          fill=(14, 116, 144, 70), outline=(56, 189, 248, glow_alpha), width=3)
        draw.text((hx + hw - 15, hy + 10), ar("❄️ زر تفعيل التوقيت الشتوي والصيفي"), font=font_card_title, fill=(56, 189, 248), anchor="rt")
        draw.text((hx + hw - 15, hy + 36), ar("تعديل فوري لجميع الصلوات بضغطة زر (-1 ساعة)"), font=font_small, fill=(224, 242, 254), anchor="rt")

        # Bottom Card
        cw = 620
        ch = 74
        cx = (WIDTH - cw) // 2
        cy = HEIGHT - 110
        draw_rounded_rect(draw, [cx, cy, cx + cw, cy + ch], 20, fill=(15, 23, 42, 230), outline=(56, 189, 248, 200), width=2)
        draw.text((WIDTH // 2, cy + 12), ar("🧭 بوصلة اتجاه القبلة ثلاثية الأبعاد + عداد الصلاة القادمة"), font=font_card_title, fill=(255, 255, 255), anchor="mt")
        draw.text((WIDTH // 2, cy + 42), ar("تنبيهات صوتية ومواقيت مطابقة تماماً للمسجد"), font=font_small, fill=(186, 230, 253), anchor="mt")

    # ================= SCENE 4: 12.8s - 17.2s (VEHICLE LICENSES & BUDGET) =================
    elif t < 17.2:
        st = t - 12.8
        # Header
        h_text = ar("🚗 رخص المركبات والجمعيات والأقساط")
        draw.text((WIDTH // 2, 70), h_text, font=font_title, fill=(251, 191, 36), anchor="mt")
        sub_t = ar("مساعدك المالي لحفظ مواعيد التجديد والسداد بدون نسيان")
        draw.text((WIDTH // 2, 120), sub_t, font=font_sub, fill=(148, 163, 184), anchor="mt")

        # Display two actual app cards with perspective presentation
        # 1. Vehicle Screen
        vw = 460
        vh = 240
        vx = (WIDTH - vw) // 2
        vy = 180
        veh_crop = img_veh.resize((vw, vh), Image.Resampling.LANCZOS)
        draw_rounded_rect(draw, [vx - 6, vy - 6, vx + vw + 6, vy + vh + 6], 20, fill=(30, 41, 59, 255), outline=(245, 158, 11, 220), width=3)
        v_mask = Image.new("L", (vw, vh), 0)
        ImageDraw.Draw(v_mask).rounded_rectangle([0, 0, vw, vh], radius=16, fill=255)
        im.paste(veh_crop, (vx, vy), v_mask)

        # Vehicle floating alert pill
        v_pill_w = 400
        v_pill_h = 50
        draw_rounded_rect(draw, [(WIDTH - v_pill_w) // 2, vy + vh - 25, (WIDTH + v_pill_w) // 2, vy + vh + 25], 25,
                          fill=(180, 83, 9, 240), outline=(251, 191, 36, 255), width=2)
        draw.text((WIDTH // 2, vy + vh - 13), ar("⚠️ تنبيه: اقتراب موعد تجديد رخصة السيارة"), font=font_badge, fill=(255, 255, 255), anchor="mt")

        # 2. Financials Screen
        fy = vy + vh + 55
        fw = 460
        fh = 240
        fx = (WIDTH - fw) // 2
        fin_crop = img_fin.resize((fw, fh), Image.Resampling.LANCZOS)
        draw_rounded_rect(draw, [fx - 6, fy - 6, fx + fw + 6, fy + fh + 6], 20, fill=(30, 41, 59, 255), outline=(59, 130, 246, 220), width=3)
        f_mask = Image.new("L", (fw, fh), 0)
        ImageDraw.Draw(f_mask).rounded_rectangle([0, 0, fw, fh], radius=16, fill=255)
        im.paste(fin_crop, (fx, fy), f_mask)

        # Financial floating pill
        f_pill_w = 400
        f_pill_h = 50
        draw_rounded_rect(draw, [(WIDTH - f_pill_w) // 2, fy + fh - 25, (WIDTH + f_pill_w) // 2, fy + fh + 25], 25,
                          fill=(29, 78, 216, 240), outline=(96, 165, 250, 255), width=2)
        draw.text((WIDTH // 2, fy + fh - 13), ar("💳 متابعة سداد الأقساط والجمعيات الشهرية"), font=font_badge, fill=(255, 255, 255), anchor="mt")

        # Bottom Card
        cw = 620
        ch = 70
        cx = (WIDTH - cw) // 2
        cy = HEIGHT - 110
        draw_rounded_rect(draw, [cx, cy, cx + cw, cy + ch], 20, fill=(15, 23, 42, 230), outline=(245, 158, 11, 200), width=2)
        draw.text((WIDTH // 2, cy + 12), ar("🛡️ قفل أمان مالي ببصمة الإصبع ورمز PIN لحماية خصوصيتك"), font=font_card_title, fill=(251, 191, 36), anchor="mt")
        draw.text((WIDTH // 2, cy + 40), ar("بياناتك مشفرة ومحفوظة بالكامل على هاتفك دون مشاركة"), font=font_small, fill=(226, 232, 240), anchor="mt")

    # ================= SCENE 5: 17.2s - 20.8s (DECEASED DUAA & VIRAL SHARE) =================
    elif t < 20.8:
        st = t - 17.2
        # Header
        h_text = ar("🤲 صدقة جارية واعمل لآخرتك")
        draw.text((WIDTH // 2, 80), h_text, font=font_title, fill=(251, 191, 36), anchor="mt")

        # Spiritual Center Card
        card_w = 580
        card_h = 420
        cx = (WIDTH - card_w) // 2
        cy = 180
        draw_rounded_rect(draw, [cx, cy, cx + card_w, cy + card_h], 28,
                          fill=(6, 78, 59, 210), outline=(245, 158, 11, 230), width=3)

        # Quranic verse or spiritual quote
        draw.text((WIDTH // 2, cy + 40), ar("﴿ وَبِالأَسْحَارِ هُمْ يَسْتَغْفِرُونَ ﴾"), font=font_huge, fill=(251, 191, 36), anchor="mt")
        draw.text((WIDTH // 2, cy + 130), ar("اكتب اسم المتوفي في التطبيق، وسيصلك دعاء مخصص له"), font=font_card_title, fill=(255, 255, 255), anchor="mt")
        draw.text((WIDTH // 2, cy + 175), ar("مع كل تسبيحة واستغفار كصدقة جارية مستمرة"), font=font_card_body, fill=(167, 243, 208), anchor="mt")

        # WhatsApp Viral Share Button (Pulsing)
        scale_btn = 1.0 + 0.04 * math.sin(st * 8)
        bw = int(480 * scale_btn)
        bh = int(76 * scale_btn)
        bx = (WIDTH - bw) // 2
        by = cy + 270
        draw_rounded_rect(draw, [bx, by, bx + bw, by + bh], 38,
                          fill=(37, 211, 102, 240), outline=(255, 255, 255, 240), width=3)
        draw.text((WIDTH // 2, by + bh // 2 - 14), ar("📲 انشر التطبيق تؤجر • شارك عبر واتساب"), font=font_card_title, fill=(10, 40, 20), anchor="mt")

        # Bottom explanation
        cw = 620
        ch = 70
        cx = (WIDTH - cw) // 2
        cy = HEIGHT - 140
        draw_rounded_rect(draw, [cx, cy, cx + cw, cy + ch], 20, fill=(15, 23, 42, 230), outline=(52, 211, 153, 200), width=2)
        draw.text((WIDTH // 2, cy + 12), ar("« الدال على الخير كفاعله »"), font=font_card_title, fill=(251, 191, 36), anchor="mt")
        draw.text((WIDTH // 2, cy + 40), ar("شارك الأجر مع أهلك وأصدقائك بضغطة زر واحدة"), font=font_small, fill=(226, 232, 240), anchor="mt")

    # ================= SCENE 6: 20.8s - 24.0s (CALL TO ACTION & DOWNLOAD) =================
    else:
        st = t - 20.8
        # Logo presentation
        l_sz = 140
        cur_logo = img_logo.resize((l_sz, l_sz), Image.Resampling.LANCZOS)
        im.paste(cur_logo, ((WIDTH - l_sz) // 2, 90), cur_logo)

        # Title
        draw.text((WIDTH // 2, 250), ar("تحويشة استغفار"), font=font_huge, fill=(251, 191, 36), anchor="mt")
        draw.text((WIDTH // 2, 310), ar("الإصدار الذهبي الحديث v2.5.3"), font=font_sub, fill=(52, 211, 153), anchor="mt")

        # Features list
        check_items = [
            ar("✅ يعمل في الخلفية والشاشة مقفولة تماماً"),
            ar("✅ مواقيت صلاة دقيقة + التوقيت الشتوي والصيفي"),
            ar("✅ إدارة رخص السيارات والأقساط والجمعيات"),
            ar("✅ آمن 100% ومجاني بدون إعلانات مزعجة")
        ]
        fy = 370
        for idx, item in enumerate(check_items):
            draw_rounded_rect(draw, [100, fy + idx * 56, WIDTH - 100, fy + idx * 56 + 46], 14,
                              fill=(15, 23, 42, 210), outline=(51, 65, 85, 220), width=2)
            draw.text((WIDTH - 120, fy + idx * 56 + 12), item, font=font_card_body, fill=(241, 245, 249), anchor="rt")

        # Big CTA Download Button (Animated glare)
        bw = 540
        bh = 90
        bx = (WIDTH - bw) // 2
        by = fy + len(check_items) * 56 + 40
        draw_rounded_rect(draw, [bx, by, bx + bw, by + bh], 26,
                          fill=(16, 185, 129, 255), outline=(251, 191, 36, 255), width=3)
        draw.text((WIDTH // 2, by + 16), ar("حمّل التطبيق الآن مجاناً 🚀"), font=font_title, fill=(255, 255, 255), anchor="mt")
        draw.text((WIDTH // 2, by + 54), ar("رابط مباشر وسريع لجميع أجهزة أندرويد"), font=font_small, fill=(254, 243, 199), anchor="mt")

        # Bottom Trust Badge
        draw.text((WIDTH // 2, HEIGHT - 100), ar("⭐ بركة الرزق ونور الاستغفار في كل يوم ⭐"), font=font_sub, fill=(251, 191, 36), anchor="mt")
        draw.text((WIDTH // 2, HEIGHT - 60), ar("صدقة جارية للمطور ووالديه ولجميع موتى المسلمين"), font=font_small, fill=(148, 163, 184), anchor="mt")

    return np.array(im.convert("RGB"))

def generate_soundtrack():
    """Synthesize harmonic soundtrack with crystal chimes and ambient swell."""
    sr = 44100
    n = int(sr * TOTAL_SECONDS)
    t = np.linspace(0, TOTAL_SECONDS, n, False)

    # 1. Warm harmonic pad chords
    # D minor / D major progression
    pad = (
        0.08 * np.sin(2 * np.pi * 146.83 * t) +   # D3
        0.06 * np.sin(2 * np.pi * 185.00 * t) +   # F#3
        0.07 * np.sin(2 * np.pi * 220.00 * t) +   # A3
        0.05 * np.sin(2 * np.pi * 277.18 * t) +   # C#4
        0.03 * np.sin(2 * np.pi * 440.00 * t)     # A4
    )

    # Slow rhythm shimmer
    shimmer = 0.02 * np.sin(2 * np.pi * 880 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.0 * t))
    mix = pad + shimmer

    # 2. Add Tasbih click chimes during Scene 2 (3.8s to 8.2s)
    for ct in [4.2, 5.0, 5.8, 6.6, 7.4]:
        start_idx = int(ct * sr)
        chime_len = int(0.6 * sr)
        if start_idx + chime_len < n:
            tc = np.linspace(0, 0.6, chime_len, False)
            chime = 0.18 * np.sin(2 * np.pi * 1046.50 * tc) * np.exp(-tc * 7) # C6 crystal bell
            mix[start_idx:start_idx + chime_len] += chime

    # 3. Add notification pop sound at 5.6s
    notif_start = int(5.6 * sr)
    n_len = int(0.5 * sr)
    if notif_start + n_len < n:
        tn = np.linspace(0, 0.5, n_len, False)
        # 2-tone pleasant ping
        ping1 = 0.15 * np.sin(2 * np.pi * 587.33 * tn) * np.exp(-tn * 8)
        ping2 = 0.20 * np.sin(2 * np.pi * 880.00 * tn) * np.exp(-tn * 6)
        mix[notif_start:notif_start + n_len] += ping1 + ping2

    # Fade in & out
    fade_in = int(sr * 1.0)
    fade_out = int(sr * 1.5)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)

    # Master limiter & 16-bit PCM conversion
    mix = np.clip(mix, -0.95, 0.95)
    audio_int16 = (mix * 32767).astype(np.int16)

    wav_path = os.path.join(BASE_DIR, "promo_audio.wav")
    with wave.open(wav_path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(audio_int16.tobytes())

    return wav_path

def main():
    print(f"Starting video generation: {WIDTH}x{HEIGHT} @ {FPS}fps, Total Frames: {TOTAL_FRAMES}")
    
    # 1. Render all frames
    frames = []
    for i in range(TOTAL_FRAMES):
        f = render_frame(i)
        frames.append(f)
        if i % 60 == 0:
            print(f"Rendered frame {i}/{TOTAL_FRAMES} ({(i/TOTAL_FRAMES)*100:.1f}%)")

    raw_video_path = os.path.join(BASE_DIR, "promo_video_silent.mp4")
    print("Encoding video frames to H.264 MP4...")
    iio.imwrite(raw_video_path, frames, fps=FPS)

    # 2. Generate Audio
    print("Synthesizing ambient audio track...")
    audio_path = generate_soundtrack()

    # 3. Merge Video and Audio using imageio-ffmpeg
    final_mp4 = os.path.join(BASE_DIR, "tahweshat_esteghfar_promo.mp4")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    
    print(f"Multiplexing audio and video with ffmpeg: {ffmpeg_exe}...")
    import subprocess
    cmd = [
        ffmpeg_exe, "-y",
        "-i", raw_video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        final_mp4
    ]
    subprocess.run(cmd, check=True)

    # 4. Copy to Artifacts & Public Web Directory
    artifact_mp4 = os.path.join(BRAIN_DIR, "tahweshat_esteghfar_promo.mp4")
    public_mp4 = os.path.join(BASE_DIR, "public", "tahweshat_esteghfar_promo.mp4")
    
    import shutil
    shutil.copyfile(final_mp4, artifact_mp4)
    shutil.copyfile(final_mp4, public_mp4)

    # Cleanup temporary files
    try:
        os.remove(raw_video_path)
        os.remove(audio_path)
    except Exception:
        pass

    size_mb = os.path.getsize(final_mp4) / (1024 * 1024)
    print(f"PROMO_VIDEO_SUCCESS: Generated {final_mp4} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()
