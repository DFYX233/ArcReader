from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
build = root / "build"
build.mkdir(exist_ok=True)
size = 512
image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((12, 12, 500, 500), radius=112, fill="#F2EEE6")
draw.rounded_rectangle((28, 28, 484, 484), radius=96, outline="#DED7CB", width=3)
accent = "#B95F36"
# Two geometric pages forming the ArcReader mark.
draw.rounded_rectangle((116, 126, 244, 360), radius=24, fill="#D5A084")
draw.pieslice((116, 82, 300, 266), start=180, end=270, fill="#D5A084")
draw.rectangle((116, 174, 244, 360), fill="#D5A084")
draw.rounded_rectangle((268, 112, 394, 360), radius=22, fill=accent)
draw.pieslice((220, 72, 440, 292), start=270, end=360, fill=accent)
draw.rectangle((268, 182, 394, 360), fill=accent)
draw.rounded_rectangle((96, 382, 416, 400), radius=9, fill=accent)
image.save(build / "icon.png")
image.save(build / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(f"Created {build / 'icon.ico'}")
