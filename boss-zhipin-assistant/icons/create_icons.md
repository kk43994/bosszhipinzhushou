# 图标生成说明

icon.svg 是SVG源文件，需要转换为PNG格式。

## 在线转换（推荐）
访问 https://svgtopng.com/
上传 icon.svg，生成以下尺寸：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

## 使用Inkscape（离线）
inkscape icon.svg -w 16 -h 16 -o icon16.png
inkscape icon.svg -w 48 -h 48 -o icon48.png
inkscape icon.svg -w 128 -h 128 -o icon128.png

## 临时方案
可以先使用 icon.svg 作为占位，Chrome支持SVG图标。
修改 manifest.json 中的图标路径为 icons/icon.svg
