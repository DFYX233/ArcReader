from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "sample.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("YaHei", r"C:\Windows\Fonts\msyh.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("YaHeiBold", r"C:\Windows\Fonts\msyhbd.ttc", subfontIndex=0))

W, H = 595.28, 841.89
TEXT = HexColor("#2D2E2B")
MUTED = HexColor("#85847D")
ACCENT = HexColor("#B95F36")
PALE = HexColor("#EEE8DE")
LINE = HexColor("#DDD8CF")

c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
c.setTitle("ArcReader · 通透阅读指南")
c.setAuthor("ArcReader")
c.setSubject("透明阅读、夜间模式与专注阅读体验")


def font(size=11, bold=False):
    c.setFont("YaHeiBold" if bold else "YaHei", size)


def text(x, y, value, size=11, color=TEXT, bold=False):
    c.setFillColor(color)
    font(size, bold)
    c.drawString(x, y, value)


def centered(y, value, size=11, color=TEXT, bold=False):
    c.setFillColor(color)
    font(size, bold)
    c.drawCentredString(W / 2, y, value)


def header(section, page):
    text(52, 792, "ArcReader", 10, TEXT, True)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.line(52, 775, 543, 775)
    text(52, 752, section.upper(), 7.5, ACCENT, True)
    text(510, 48, f"0{page}", 8, MUTED)


def footer():
    c.setStrokeColor(LINE)
    c.line(52, 65, 487, 65)
    text(52, 45, "READ IN YOUR LIGHT", 6.5, MUTED, True)


def pill(x, y, label, width):
    c.setFillColor(PALE)
    c.roundRect(x, y, width, 25, 12, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    font(8, True)
    c.drawCentredString(x + width / 2, y + 8, label)


def new_page():
    footer()
    c.showPage()


# 01 — Cover
c.setFillColor(PALE)
c.circle(485, 710, 102, fill=1, stroke=0)
c.setFillColor(ACCENT)
c.circle(485, 710, 5, fill=1, stroke=0)
c.setStrokeColor(ACCENT)
c.setLineWidth(1.2)
c.circle(485, 710, 36, fill=0, stroke=1)
c.circle(485, 710, 65, fill=0, stroke=1)
text(54, 778, "ArcReader / 阅读指南", 9, MUTED)
text(54, 620, "让阅读，", 38, TEXT, True)
text(54, 566, "回归专注。", 38, TEXT, True)
c.setFillColor(ACCENT)
c.rect(55, 526, 44, 3, fill=1, stroke=0)
text(54, 485, "一份关于透明阅读、夜间模式与轻松浏览的使用指南。", 11, MUTED)
text(54, 464, "没有干扰，只有文字与此刻的你。", 11, MUTED)
pill(54, 390, "透明阅读", 78)
pill(142, 390, "夜间模式", 78)
pill(230, 390, "本地安全", 78)
text(54, 122, "DESIGNED FOR DEEP READING", 7.5, ACCENT, True)
text(54, 96, "通透阅读 · 专注当下", 10, TEXT)
new_page()

# 02 — Transparency
header("01 / Transparent reading", 2)
text(52, 694, "让页面，融入你的视界", 25, TEXT, True)
text(52, 662, "透明阅读不是降低文字的清晰度，而是减少纸张边界的存在。", 10.5, MUTED)
text(52, 644, "你可以自由调整背景不透明度，在沉浸与可读性之间找到平衡。", 10.5, MUTED)

c.setFillColor(PALE)
c.roundRect(52, 392, 491, 202, 12, fill=1, stroke=0)
c.setFillColor(HexColor("#FCFBF7"))
c.roundRect(112, 418, 371, 150, 5, fill=1, stroke=0)
c.setStrokeColor(ACCENT)
c.setLineWidth(2)
c.line(142, 532, 214, 532)
c.setStrokeColor(LINE)
c.setLineWidth(4)
for y, width in [(506, 292), (486, 312), (466, 266), (446, 182)]:
    c.line(142, y, 142 + width, y)

text(52, 346, "三种常用状态", 11, TEXT, True)
items = [
    ("悬浮", "25% 背景", "文字仿佛悬浮于背景之上，适合轻松浏览。"),
    ("柔和", "76% 背景", "保留轻微纸张感，是长时间阅读的理想默认。"),
    ("纸张", "100% 背景", "恢复传统纸面，适合批注与精细阅读。"),
]
for i, (name, value, desc) in enumerate(items):
    y = 305 - i * 66
    c.setFillColor(ACCENT)
    c.circle(58, y + 6, 3, fill=1, stroke=0)
    text(72, y, name, 10, TEXT, True)
    text(121, y, value, 8, ACCENT)
    text(72, y - 21, desc, 9, MUTED)
text(52, 91, "快捷操作：按 T 随时切换透明阅读。", 9, ACCENT, True)
new_page()

# 03 — Night
header("02 / Night mode", 3)
text(52, 694, "夜深了，文字依然清晰", 25, TEXT, True)
text(52, 662, "夜间模式重新平衡页面亮度与文字对比度，减少纯白背景的刺眼感。", 10.5, MUTED)
text(52, 644, "界面、纸张和 PDF 内容会同步切换，无需反复调整。", 10.5, MUTED)

c.setFillColor(HexColor("#24252B"))
c.roundRect(52, 382, 491, 214, 12, fill=1, stroke=0)
c.setFillColor(ACCENT)
c.circle(97, 550, 13, fill=1, stroke=0)
c.setFillColor(HexColor("#24252B"))
c.circle(103, 555, 12, fill=1, stroke=0)
text(126, 544, "NIGHT READING", 8, HexColor("#E69568"), True)
c.setStrokeColor(HexColor("#54565F"))
c.setLineWidth(4)
for y, width in [(503, 380), (478, 412), (453, 345), (428, 228)]:
    c.line(88, y, 88 + width, y)

text(52, 330, "为不同光线环境而设计", 11, TEXT, True)
for i, (title, desc) in enumerate([
    ("柔和对比", "保留清晰文字，同时弱化高亮背景与视觉疲劳。"),
    ("同步界面", "工具栏、缩略图与阅读页面保持一致的暗色体验。"),
    ("记忆偏好", "下次打开阅读器，会自动恢复你上次选择的模式。"),
]):
    y = 288 - i * 63
    text(54, y, f"0{i+1}", 8, ACCENT, True)
    text(92, y, title, 10, TEXT, True)
    text(92, y - 21, desc, 9, MUTED)
text(52, 91, "快捷操作：按 N 在日间与夜间之间切换。", 9, ACCENT, True)
new_page()

# 04 — Workflow
header("03 / Effortless workflow", 4)
text(52, 694, "少一步操作，多一分专注", 25, TEXT, True)
text(52, 662, "从打开文件到找到目标内容，每一个动作都应当直接而自然。", 10.5, MUTED)

steps = [
    ("打开", "拖入 PDF，或点击顶部“打开 PDF”。文件仅在本地处理。"),
    ("浏览", "使用连续滚动阅读，也可以从左侧缩略图快速定位。"),
    ("搜索", "按 Ctrl + F 搜索全文，点击结果即可跳转到对应页面。"),
    ("调节", "缩放、适应宽度、全屏与专注模式，随阅读场景调整。"),
]
for i, (title, desc) in enumerate(steps):
    y = 566 - i * 107
    c.setFillColor(PALE)
    c.circle(75, y + 3, 20, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    font(10, True)
    c.drawCentredString(75, y, f"0{i+1}")
    text(113, y + 6, title, 12, TEXT, True)
    text(113, y - 19, desc, 9.5, MUTED)
    if i < 3:
        c.setStrokeColor(LINE)
        c.setLineWidth(1)
        c.line(75, y - 25, 75, y - 78)

c.setFillColor(PALE)
c.roundRect(52, 103, 491, 58, 9, fill=1, stroke=0)
text(72, 132, "隐私提示", 9, ACCENT, True)
text(137, 132, "你的文档不会上传到服务器，关闭页面后也不会保留文件内容。", 9, TEXT)
new_page()

# 05 — Shortcuts
header("04 / Keyboard shortcuts", 5)
text(52, 694, "把常用操作，留在指尖", 25, TEXT, True)
text(52, 662, "一组简单的快捷键，让阅读保持连贯。", 10.5, MUTED)

shortcuts = [
    ("打开 PDF", "Ctrl  +  O"),
    ("文档内搜索", "Ctrl  +  F"),
    ("上一页 / 下一页", "←  /  →"),
    ("放大 / 缩小", "+  /  −"),
    ("适应页面宽度", "0"),
    ("切换夜间模式", "N"),
    ("切换透明阅读", "T"),
    ("切换专注模式", "F"),
]
for i, (label, key) in enumerate(shortcuts):
    y = 590 - i * 55
    if i % 2 == 0:
        c.setFillColor(HexColor("#F4F0E9"))
        c.roundRect(52, y - 12, 491, 40, 5, fill=1, stroke=0)
    text(70, y, label, 10, TEXT)
    c.setFillColor(PALE)
    c.roundRect(405, y - 7, 112, 26, 5, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    font(8.5, True)
    c.drawCentredString(461, y + 1, key)

text(52, 104, "提示：输入框激活时，单键快捷键不会干扰文字输入。", 9, MUTED)
new_page()

# 06 — Closing
c.setStrokeColor(LINE)
c.setLineWidth(0.6)
c.line(52, 775, 543, 775)
text(52, 792, "ArcReader", 10, TEXT, True)
c.setFillColor(PALE)
c.circle(W / 2, 472, 142, fill=1, stroke=0)
c.setStrokeColor(ACCENT)
c.setLineWidth(1)
c.circle(W / 2, 472, 105, fill=0, stroke=1)
centered(526, "“", 50, ACCENT, True)
centered(474, "阅读的意义，", 23, TEXT, True)
centered(433, "是抵达文字之外的世界。", 23, TEXT, True)
centered(359, "愿 ArcReader 为你留下一片安静、通透的空间。", 10, MUTED)
c.setFillColor(ACCENT)
c.circle(W / 2, 312, 3, fill=1, stroke=0)
centered(185, "现在，打开你的下一本 PDF。", 11, TEXT, True)
centered(157, "拖入文件，或按 Ctrl + O 开始。", 9, MUTED)
footer()
c.save()

# Add a real PDF outline so the desktop reader's navigation panel is usable.
from pypdf import PdfReader, PdfWriter

reader = PdfReader(str(OUTPUT))
writer = PdfWriter()
writer.append(reader)
writer.add_outline_item("开始阅读", 0)
appearance = writer.add_outline_item("阅读外观", 1)
writer.add_outline_item("透明阅读", 1, parent=appearance)
writer.add_outline_item("夜间模式", 2, parent=appearance)
workflow = writer.add_outline_item("阅读操作", 3)
writer.add_outline_item("轻松浏览", 3, parent=workflow)
writer.add_outline_item("键盘快捷键", 4, parent=workflow)
writer.add_outline_item("结语", 5)
with OUTPUT.open("wb") as output_file:
    writer.write(output_file)

print(f"Created {OUTPUT}")
