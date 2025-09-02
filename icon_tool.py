import cairosvg
import os

# 定义SVG文件路径
svg_file_path = "public/wxt.svg"

# 定义不同尺寸的PNG图标
sizes = [16, 32, 48, 96, 128]

# 确保输出目录存在
os.makedirs("output", exist_ok=True)

for size in sizes:
    png_file_path = f"public/{size}.png"
    cairosvg.svg2png(
        url=svg_file_path, write_to=png_file_path, output_width=size, output_height=size
    )
    print(f"已生成 {size}x{size} 的PNG图标")
