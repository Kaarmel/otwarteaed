
import io, json, sys, os, math
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform
from fontTools.svgLib.path import parse_path
import uharfbuzz as hb

FONT, OUT, CFG = sys.argv[1:4]
cfg = json.load(open(CFG))
f = TTFont(FONT); f.flavor = None; b = io.BytesIO(); f.save(b); data = b.getvalue()
f = TTFont(io.BytesIO(data)); upem = f['head'].unitsPerEm; gset = f.getGlyphSet()
hbf = hb.Font(hb.Face(data))

class Rec(BasePen):
    def __init__(s): super().__init__(None); s.ops = []
    def _moveTo(s, p): s.ops.append(('M', p))
    def _lineTo(s, p): s.ops.append(('L', p))
    def _curveToOne(s, a, b, c): s.ops.append(('C', a, b, c))
    def _closePath(s): s.ops.append(('Z',))
    def _endPath(s): s.ops.append(('Z',))

F = 100.0  # 1 em = 100 jednostek
def text_shapes(txt, x0, base):
    buf = hb.Buffer(); buf.add_str(txt); buf.guess_segment_properties()
    hb.shape(hbf, buf, {"kern": True, "liga": True})
    s = F / upem; x = x0; r = Rec()
    for inf, pos in zip(buf.glyph_infos, buf.glyph_positions):
        g = f.getGlyphName(inf.codepoint)
        gset[g].draw(TransformPen(r, Transform(s, 0, 0, -s, x + pos.x_offset * s, base - pos.y_offset * s)))
        x += pos.x_advance * s + cfg['ls'] * F
    return r.ops, x - x0

def svgshape(d, t):
    r = Rec(); parse_path(d, TransformPen(r, t)); return r.ops

def rrect(x, y, w, h, rx):
    return (f"M{x+rx} {y}H{x+w-rx}A{rx} {rx} 0 0 1 {x+w} {y+rx}V{y+h-rx}A{rx} {rx} 0 0 1 {x+w-rx} {y+h}"
            f"H{x+rx}A{rx} {rx} 0 0 1 {x} {y+h-rx}V{y+rx}A{rx} {rx} 0 0 1 {x+rx} {y}Z")

H, B = cfg['heart'], cfg['bolt']
def marks(outer):  # serce i blyskawica w ukladzie 64
    return (svgshape(H['d'], outer.transform(Transform(H['s'], 0, 0, H['s'], H['tx'], H['ty']))),
            svgshape(B['d'], outer.transform(Transform(B['s'], 0, 0, B['s'], B['tx'], B['ty']))))

def sygnet(X, Y, size, kol, tlo, znak):
    k = size / 64; o = Transform(k, 0, 0, k, X, Y)
    rect = svgshape(rrect(0, 0, 64, 64, 15), o); h, b = marks(o)
    if znak is None:  # jednobarwny: znak wyciety w tle
        return [(tlo, 'evenodd', rect + h + b)]
    return [(tlo, 'nonzero', rect), (znak, 'nonzero', h + b)]

def napis(x0, base, c_otw, c_sr, c_aed):
    o, w = text_shapes("otwarte", x0, base)
    bx_, by_, bw, bh = cfg['box']; sr = cfg['sr']; k = sr['h'] * F / bh
    t = Transform(k, 0, 0, k, x0 + sr['x'] * F - bx_ * k, base + sr['y'] * F - by_ * k)
    h, b = marks(t)
    a, _ = text_shapes("AED", x0 + cfg['aed_x'] * F, base)
    return [(c_otw, 'nonzero', o), (c_sr, 'nonzero', h + b), (c_aed, 'nonzero', a)], w

WARIANTY = {  # otwarte, srednik, AED, tlo sygnetu, znak w sygnecie (None = wyciety)
  'kolor':        ('N', 'G', 'G', 'G', 'W'),
  'negatyw':      ('W', 'M', 'M', 'G', 'W'),
  'mono-czarne':  ('K', 'K', 'K', 'K', None),
  'mono-biale':   ('W', 'W', 'W', 'W', None),
}
def uklad(nazwa, war):
    c_o, c_s, c_a, tlo, znak = WARIANTY[war]
    if nazwa == 'poziome':
        sh, _ = napis(0, 0, c_o, c_s, c_a); sy = cfg['syg']
        return sygnet(sy['x'] * F, sy['y'] * F, sy['size'] * F, None, tlo, znak) + sh
    if nazwa == 'pionowe':
        sh, _ = napis(0, 0, c_o, c_s, c_a)
        bb = bounds(sh); cx = (bb[0] + bb[2]) / 2; s = cfg['pion']['syg'] * F
        return sygnet(cx - s / 2, -cfg['pion']['base'] * F, s, None, tlo, znak) + sh
    if nazwa == 'sygnet':
        return sygnet(0, 0, 64, None, tlo, znak)

def bounds(shapes):
    bp = BoundsPen(None)
    for _, _, ops in shapes:
        for op in ops:
            if op[0] == 'M': bp.moveTo(op[1])
            elif op[0] == 'L': bp.lineTo(op[1])
            elif op[0] == 'C': bp.curveTo(*op[1:])
            else: bp.closePath()
    return bp.bounds

K = cfg['kolory']
def fmt(v): return ('%.2f' % v).rstrip('0').rstrip('.')
def zapisz(nazwa, war, szer_mm):
    sh = uklad(nazwa, war); x0, y0, x1, y1 = bounds(sh)
    pad = 0 if nazwa == 'sygnet' else 2
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad; W, Hh = x1 - x0, y1 - y0
    base = f"otwarte-aed-{nazwa}-{war}"
    # SVG
    paths = []
    for col, rule, ops in sh:
        d = ''.join(('M%s %s' % (fmt(o[1][0]-x0), fmt(o[1][1]-y0))) if o[0]=='M' else ('L%s %s' % (fmt(o[1][0]-x0), fmt(o[1][1]-y0))) if o[0]=='L' else ('C' + ' '.join('%s %s' % (fmt(p[0]-x0), fmt(p[1]-y0)) for p in o[1:])) if o[0]=='C' else 'Z' for o in ops)
        paths.append(f'<path fill="#{K[col]["hex"]}"' + (' fill-rule="evenodd"' if rule == 'evenodd' else '') + f' d="{d}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(W)} {fmt(Hh)}" width="{fmt(W)}" height="{fmt(Hh)}" role="img" aria-label="otwarte AED">'
           f'<title>otwarte AED</title>' + ''.join(paths) + '</svg>\n')
    open(f"{OUT}/rgb/svg/{base}.svg", 'w').write(svg)
    # PDF (RGB i CMYK) i EPS (CMYK), wymiary w punktach
    sc = szer_mm / 25.4 * 72 / W; Wpt, Hpt = W * sc, Hh * sc
    def body(ps, tryb):
        out = []
        for col, rule, ops in sh:
            if tryb == 'rgb':
                r, g, b_ = (int(K[col]['hex'][i:i+2], 16) / 255 for i in (0, 2, 4))
                out.append('%.4f %.4f %.4f %s' % (r, g, b_, 'setrgbcolor' if ps else 'rg'))
            else:
                c = [v / 100 for v in K[col]['cmyk']]
                out.append('%.2f %.2f %.2f %.2f %s' % (*c, 'setcmykcolor' if ps else 'k'))
            if ps: out.append('newpath')
            for o in ops:
                P_ = lambda p: '%.3f %.3f' % ((p[0] - x0) * sc, (y1 - p[1]) * sc)
                if o[0] == 'M': out.append(P_(o[1]) + (' moveto' if ps else ' m'))
                elif o[0] == 'L': out.append(P_(o[1]) + (' lineto' if ps else ' l'))
                elif o[0] == 'C': out.append(' '.join(P_(p) for p in o[1:]) + (' curveto' if ps else ' c'))
                else: out.append('closepath' if ps else 'h')
            out.append(('eofill' if rule == 'evenodd' else 'fill') if ps else ('f*' if rule == 'evenodd' else 'f'))
        return '\n'.join(out)
    for tryb in ('rgb', 'cmyk'):
        content = body(False, tryb).encode()
        objs = [b'<< /Type /Catalog /Pages 2 0 R >>',
                b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
                ('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.3f %.3f] /Contents 4 0 R /Resources << >> >>' % (Wpt, Hpt)).encode(),
                b'<< /Length %d >>\nstream\n' % len(content) + content + b'\nendstream',
                b'<< /Title (otwarte AED) /Producer (otwarte AED hub) >>']
        pdf = b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'; offs = []
        for i, o in enumerate(objs):
            offs.append(len(pdf)); pdf += b'%d 0 obj\n' % (i + 1) + o + b'\nendobj\n'
        x = len(pdf)
        pdf += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1) + b''.join(b'%010d 00000 n \n' % o for o in offs)
        pdf += b'trailer\n<< /Size %d /Root 1 0 R /Info 5 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, x)
        open(f"{OUT}/{tryb}/pdf/{base}.pdf", 'wb').write(pdf)
    eps = ('%%!PS-Adobe-3.0 EPSF-3.0\n%%%%BoundingBox: 0 0 %d %d\n%%%%HiResBoundingBox: 0 0 %.3f %.3f\n%%%%Title: otwarte AED\n%%%%EndComments\n' % (math.ceil(Wpt), math.ceil(Hpt), Wpt, Hpt)
           + body(True, 'cmyk') + '\nshowpage\n%%EOF\n')
    open(f"{OUT}/cmyk/eps/{base}.eps", 'w').write(eps)
    return base, Wpt, Hpt

for d in ('rgb/svg', 'rgb/png', 'rgb/pdf', 'cmyk/pdf', 'cmyk/eps', 'rgb/png/ikony'):
    os.makedirs(f"{OUT}/{d}", exist_ok=True)
wynik = []
for nazwa, mm in (('poziome', 100), ('pionowe', 60), ('sygnet', 30)):
    for war in WARIANTY:
        wynik.append(zapisz(nazwa, war, mm))
print(json.dumps(wynik))
