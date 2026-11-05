"""Builds Million Fathoms into one self-contained page with fonts, data and code inside."""
import base64, json, os, re
F = 'node_modules/@fontsource'
def font(fam, css, path, weight):
    b = base64.b64encode(open(f'{F}/{path}', 'rb').read()).decode()
    return f"@font-face{{font-family:'{fam}';font-weight:{weight};font-display:swap;src:url(data:font/woff2;base64,{b}) format('woff2')}}"
fonts = ''.join([
    font('Tilt Neon', '', 'tilt-neon/files/tilt-neon-latin-400-normal.woff2', 400),
    font('Bowlby One', '', 'bowlby-one/files/bowlby-one-latin-400-normal.woff2', 400),
    font('Baloo 2', '', 'baloo-2/files/baloo-2-latin-500-normal.woff2', 500),
    font('Baloo 2', '', 'baloo-2/files/baloo-2-latin-700-normal.woff2', 700),
    font('Baloo 2', '', 'baloo-2/files/baloo-2-latin-800-normal.woff2', 800),
])
css = open('src/style.css').read()
body = open('src/body.html').read()
rules = open('src/rules.js').read()
app = open('src/app.js').read()
data = open('src/data.json').read()
page = f'''<title>Million Fathoms</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{fonts}
{css}</style>
{body}
<script>window.MF_DATA={data};</script>
<script>{rules}
{app}</script>
'''
os.makedirs('dist', exist_ok=True)
open('dist/million-fathoms-page.html', 'w').write(page)
head, rest = page.split('<style>', 1)
styles, rest = rest.split('</style>\n', 1)
standalone = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Million Fathoms</title>
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}[hidden]{{display:none!important}}img{{max-width:100%}}
{styles}</style>
</head>
<body>
{rest}</body>
</html>
'''
open('dist/million-fathoms.html', 'w').write(standalone)
print(len(page) // 1024, 'KB page;', len(standalone) // 1024, 'KB offline file')
