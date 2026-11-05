# Hər yeniləmədə CSS/JS fayllarına yeni versiya nömrəsi yazır ki, telefonlar köhnə nüsxəni göstərməsin
import re, time, glob
v = time.strftime('%Y%m%d%H%M')
for f in ['index.html', 'admin/index.html', 'giris/index.html', 'devet/index.html', 'albom/index.html']:
    t = open(f).read()
    t2 = re.sub(r'((?:\.\./)?assets/[\w\-]+\.(?:css|js))(\?v=\d+)?"', lambda m: m.group(1) + '?v=' + v + '"', t)
    open(f, 'w').write(t2)
print(v)
