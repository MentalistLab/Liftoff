# Macht den Web-Export „Zum Home-Bildschirm“-tauglich (iPad/iPhone/Android): Icons, Manifest, Vollbild.
# Aufruf nach `npx expo export --platform web --output-dir dist`: python3 scripts/prepare-web.py
import json
from PIL import Image

d = 'dist/'
src = Image.open('assets/icon.png').convert('RGB')
for s in (180, 192, 512):
    src.resize((s, s), Image.LANCZOS).save(f'{d}icon-{s}.png')
json.dump({
    'name': 'Ascend', 'short_name': 'Ascend', 'start_url': '/', 'display': 'standalone', 'orientation': 'portrait',
    'background_color': '#0B0D12', 'theme_color': '#0B0D12',
    'icons': [{'src': '/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': '/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}],
}, open(d + 'manifest.webmanifest', 'w'))
p = d + 'index.html'
h = open(p).read()
if 'apple-touch-icon' not in h:
    h = h.replace('</head>', '''<meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Ascend" />
    <meta name="theme-color" content="#0B0D12" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <style>html,body{background:#0B0D12}</style>
  </head>''', 1)
    h = h.replace('initial-scale=1, shrink-to-fit=no', 'initial-scale=1, viewport-fit=cover')
open(p, 'w').write(h)
print('dist/ bereit für eas deploy')
