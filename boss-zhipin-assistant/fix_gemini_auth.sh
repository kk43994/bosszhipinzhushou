#!/bin/bash

# 修复analyzer.js
sed -i 's|gemini-2.5-flash:generateContent?key=${apiKey}`|gemini-2.5-flash:generateContent`|g' modules/analyzer.js
sed -i "s|'Content-Type': 'application/json'|'Content-Type': 'application/json',\n        'x-goog-api-key': apiKey|g" modules/analyzer.js

# 修复popup.js
sed -i 's|gemini-2.5-flash:generateContent?key=${apiKey}`|gemini-2.5-flash:generateContent`|g' popup/popup.js
sed -i "s|'Content-Type': 'application/json'|'Content-Type': 'application/json',\n      'x-goog-api-key': apiKey|g" popup/popup.js

# 更新API获取链接
sed -i "s|https://makersuite.google.com/app/apikey|https://aistudio.google.com/app/apikey|g" popup/popup.js

echo "✅ 修复完成！"
