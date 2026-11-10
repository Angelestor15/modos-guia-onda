const $ = id => document.getElementById(id), C = 299792458;
const PRE = ["TE10", "TE21", "TM11", "TM32", "TM21", "TE01", "TE11", "TM12"];
const OY = 40, WALL = 8, CW = 620, LW = 520, LX = 60;
let P = {}, phase = 0, playing = true, last = performance.now(), grid = null;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let off1 = mk(2, 2), off2 = mk(2, 2);

$("pills").innerHTML = PRE.map(p => `<button class="pill" data-m="${p}">${p}</button>`).join("");
$("pills").onclick = e => {
  const m = e.target.dataset.m; if (!m) return;
  $("type").value = m.slice(0, 2); $("n").value = m[2]; $("m").value = m[3]; params();
};

function params() {
  const a = Math.max(+$("a").value || 1, 1) / 1000, b = Math.max(+$("b").value || 1, 1) / 1000;
  const n = Math.max(0, Math.floor(+$("n").value || 0)), m = Math.max(0, Math.floor(+$("m").value || 0)), type = $("type").value;
  const A = n * Math.PI / a, B = m * Math.PI / b, kc = Math.max(Math.hypot(A, B), 1e-9);
  const fc = C * kc / (2 * Math.PI), f = +$("ratio").value * fc, k = 2 * Math.PI * f / C;
  const beta = Math.sqrt(Math.max(k * k - kc * kc, 1e-9));
  const valid = type === "TE" ? !(n === 0 && m === 0) : (n >= 1 && m >= 1);
  const fit = Math.min(488 / (a * 1000), 280 / (b * 1000));
  const s = $("fit").checked ? fit : Math.min(12, fit);
  const w = Math.max(24, Math.round(a * 1000 * s)), h = Math.max(24, Math.round(b * 1000 * s));
  P = {a, b, n, m, type, A, B, kc, fc, f, beta, lg: 2 * Math.PI / beta, valid, iw: w, ih: h, s, ox: Math.round((CW - w) / 2)};
  $("c1").width = CW; $("c1").height = OY + h + 80;
  $("c2").width = LX + LW + 30; $("c2").height = OY + w + 80;
  off1 = mk(w, h); off2 = mk(LW, w);
  grid = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    grid[j * w + i] = scalar((i + 0.5) / w * a, (1 - (j + 0.5) / h) * b);
  document.querySelectorAll(".pill").forEach(p => p.classList.toggle("on", p.dataset.m === `${type}${n}${m}`));
  $("t-mode").textContent = `${type}${n}${m}`;
  $("eq").innerHTML = (type === "TE" ? "H<sub>z</sub> = H₀ cos(nπx/a) cos(mπy/b)" : "E<sub>z</sub> = E₀ sen(nπx/a) sen(mπy/b)") +
    " · e<sup>−jβz</sup>e<sup>jωt</sup> · " + (type === "TE" ? "E<sub>z</sub>=0" : "H<sub>z</sub>=0");
  $("t-fc").textContent = (fc / 1e9).toFixed(2) + " GHz"; $("t-f").textContent = (f / 1e9).toFixed(2) + " GHz";
  $("t-beta").textContent = beta.toFixed(0) + " rad/m"; $("t-lg").textContent = (P.lg * 1000).toFixed(1) + " mm";
  $("err").textContent = valid ? "" : (type === "TE" ? "TE: n y m no pueden ser ambos 0." : "TM: n y m deben ser ≥ 1.");
  $("rv").textContent = (+$("ratio").value).toFixed(2);
}

const scalar = (x, y) => P.type === "TE" ? Math.cos(P.A * x) * Math.cos(P.B * y) : Math.sin(P.A * x) * Math.sin(P.B * y);
function evec(x, y) {
  const {A, B, kc} = P;
  return P.type === "TE"
    ? [B * Math.cos(A * x) * Math.sin(B * y) / kc, -A * Math.sin(A * x) * Math.cos(B * y) / kc]
    : [A * Math.cos(A * x) * Math.sin(B * y) / kc, B * Math.sin(A * x) * Math.cos(B * y) / kc];
}
function color(v, o, i) {   // negativo cian · cero oscuro · positivo magenta, con brillo en picos
  const t = Math.min(1, Math.abs(v)), k = Math.pow(t, 0.8), g = t > 0.85 ? (t - 0.85) / 0.15 * 90 : 0;
  const T = v >= 0 ? [255, 60, 150] : [0, 215, 255];
  o[i] = 5 + (T[0] - 5) * k + g; o[i + 1] = 9 + (T[1] - 9) * k + g; o[i + 2] = 22 + (T[2] - 22) * k + g; o[i + 3] = 255;
}

function frame(x, ox, oy, w, h, full) {
  x.save(); x.fillStyle = "#17263d";
  x.fillRect(ox - WALL, oy - WALL, w + 2 * WALL, WALL); x.fillRect(ox - WALL, oy + h, w + 2 * WALL, WALL);
  if (full) { x.fillRect(ox - WALL, oy - WALL, WALL, h + 2 * WALL); x.fillRect(ox + w, oy - WALL, WALL, h + 2 * WALL); }
  x.strokeStyle = "#00e5ff"; x.shadowColor = "#00e5ff"; x.shadowBlur = 10; x.lineWidth = 1.5; x.strokeRect(ox, oy, w, h);
  x.restore();
}
function dim(x, x1, y1, x2, y2, txt, tx, ty, rot) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  x.strokeStyle = "#5fd3ff"; x.fillStyle = "#9fdfff"; x.lineWidth = 1; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2);
  [[x2, y2, 0], [x1, y1, Math.PI]].forEach(([px, py, d]) => {
    x.moveTo(px, py); x.lineTo(px - 7 * Math.cos(ang + d - 0.4), py - 7 * Math.sin(ang + d - 0.4));
    x.moveTo(px, py); x.lineTo(px - 7 * Math.cos(ang + d + 0.4), py - 7 * Math.sin(ang + d + 0.4));
  });
  x.stroke(); x.save(); x.translate(tx, ty); if (rot) x.rotate(-Math.PI / 2); x.textAlign = "center"; x.fillText(txt, 0, 0); x.restore();
}
function arrows(x, ox, oy, w, h, sz) {
  const sp = 28; x.save(); x.strokeStyle = "rgba(255,255,255,.88)"; x.shadowColor = "#fff"; x.shadowBlur = 4; x.lineWidth = 1.4;
  for (let px = sp / 2; px < w; px += sp) for (let py = sp / 2; py < h; py += sp) {
    const [ex, ey] = evec(px / w * P.a, (1 - py / h) * P.b), dx = ex * sz * sp * 0.45, dy = -ey * sz * sp * 0.45;
    if (Math.hypot(dx, dy) < 2) continue;
    const tx = ox + px + dx, ty = oy + py + dy, an = Math.atan2(dy, dx);
    x.beginPath(); x.moveTo(ox + px - dx, oy + py - dy); x.lineTo(tx, ty);
    x.lineTo(tx - 5 * Math.cos(an - 0.45), ty - 5 * Math.sin(an - 0.45)); x.moveTo(tx, ty); x.lineTo(tx - 5 * Math.cos(an + 0.45), ty - 5 * Math.sin(an + 0.45)); x.stroke();
  }
  x.restore();
}
const mm = v => (v * 1000).toFixed(2) + " mm";

function view1(z0, y0) {
  const c = $("c1"), x = c.getContext("2d"), {iw: w, ih: h, ox} = P;
  x.clearRect(0, 0, c.width, c.height); x.drawImage(off1, ox, OY);
  if ($("vec").checked) arrows(x, ox, OY, w, h, Math.sin(phase - P.beta * z0));
  x.save(); x.setLineDash([6, 4]); x.strokeStyle = "#7cffb2"; x.lineWidth = 1.6;
  const ly = OY + (1 - y0 / P.b) * h; x.beginPath(); x.moveTo(ox, ly); x.lineTo(ox + w, ly); x.stroke(); x.restore();
  frame(x, ox, OY, w, h, true); x.font = "12px 'Share Tech Mono',monospace"; x.fillStyle = "#9fdfff";
  x.textAlign = "left"; x.fillText(`SECCIÓN ${P.type}${P.n}${P.m} · z = z₀`, 10, 18);
  dim(x, ox, OY + h + 28, ox + w, OY + h + 28, "a = " + mm(P.a), ox + w / 2, OY + h + 46, false);
  dim(x, ox - 30, OY, ox - 30, OY + h, "b = " + mm(P.b), ox - 38, OY + h / 2, true);
  const len = [1, 2, 5, 10, 20, 50].find(v => v * P.s >= 40) || 50, bx = CW - 14 - len * P.s;   // barra de escala
  x.strokeStyle = "#9fdfff"; x.beginPath(); x.moveTo(bx, 24); x.lineTo(bx + len * P.s, 24);
  x.moveTo(bx, 20); x.lineTo(bx, 28); x.moveTo(bx + len * P.s, 20); x.lineTo(bx + len * P.s, 28); x.stroke();
  x.textAlign = "center"; x.fillText(len + " mm", bx + len * P.s / 2, 16);
}
function view2(z0, y0) {
  const c = $("c2"), x = c.getContext("2d"), W = LW, H = P.iw, L = 2 * P.lg;
  x.clearRect(0, 0, c.width, c.height); x.drawImage(off2, LX, OY);
  x.save(); x.setLineDash([6, 4]); x.strokeStyle = "#ff3c96"; x.lineWidth = 1.6;
  const lz = LX + z0 / L * W; x.beginPath(); x.moveTo(lz, OY); x.lineTo(lz, OY + H); x.stroke(); x.restore();
  frame(x, LX, OY, W, H, false); x.font = "12px 'Share Tech Mono',monospace"; x.fillStyle = "#9fdfff";
  x.textAlign = "left"; x.fillText(`CORTE LONGITUDINAL · y₀ = ${(y0 * 1000).toFixed(2)} mm`, 10, 18);
  dim(x, LX, OY + H + 28, LX + W, OY + H + 28, "z →  2λg = " + mm(L), LX + W / 2, OY + H + 46, false);
  dim(x, LX - 30, OY, LX - 30, OY + H, "a = " + mm(P.a), LX - 38, OY + H / 2, true);
}
function view3() {
  const c = $("c3"), x = c.getContext("2d"), H = c.height, y0n = +$("y0").value, z0n = +$("z0").value;
  x.clearRect(0, 0, c.width, H);
  const k = Math.min(380 / (P.a * 1000), 120 / (P.b * 1000)), fw = P.a * 1000 * k, fh = P.b * 1000 * k;
  const ez = [250, -170], O = [40, H - 40], ex = [fw, 0], ey = [0, -fh];
  const pt = (X, Y, Z) => [O[0] + X * ex[0] + Y * ey[0] + Z * ez[0], O[1] + X * ex[1] + Y * ey[1] + Z * ez[1]];
  const poly = (pts, col, dash) => { x.save(); x.setLineDash(dash || []); x.strokeStyle = col; x.shadowColor = col; x.shadowBlur = 8; x.lineWidth = 1.5;
    x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.stroke(); x.restore(); };
  poly([pt(0, 1, 1), pt(1, 1, 1), pt(1, 0, 1), pt(0, 0, 1)], "rgba(0,229,255,.45)");      // fondo
  x.save(); let p = pt(1, y0n, 0);                                                           // plano z–x en y₀
  x.setTransform(ez[0] / LW, ez[1] / LW, -ex[0] / P.iw, -ex[1] / P.iw, p[0], p[1]); x.drawImage(off2, 0, 0); x.restore();
  poly([pt(0, y0n, 0), pt(1, y0n, 0), pt(1, y0n, 1), pt(0, y0n, 1)], "#7cffb2", [6, 4]);
  x.save(); p = pt(0, 1, z0n);                                                               // plano x–y en z₀
  x.setTransform(ex[0] / P.iw, ex[1] / P.iw, -ey[0] / P.ih, -ey[1] / P.ih, p[0], p[1]); x.drawImage(off1, 0, 0); x.restore();
  poly([pt(0, 0, z0n), pt(1, 0, z0n), pt(1, 1, z0n), pt(0, 1, z0n)], "#ff3c96");
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([X, Y]) => poly([pt(X, Y, 0), pt(X, Y, 1)], "rgba(0,229,255,.7)"));
  poly([pt(0, 0, 0), pt(1, 0, 0), pt(1, 1, 0), pt(0, 1, 0)], "#00e5ff");                    // frente
  x.fillStyle = "#9fdfff"; x.font = "13px 'Share Tech Mono',monospace";
  let q = pt(1.05, 0, 0); x.fillText("x", q[0], q[1]); q = pt(0, 1.12, 0); x.fillText("y", q[0] - 4, q[1]); q = pt(1, 1, 1.03); x.fillText("z →", q[0] + 6, q[1]);
}

function draw() {
  if (!P.valid) return;
  const z0 = +$("z0").value * 2 * P.lg, y0 = +$("y0").value * P.b, w = P.iw, h = P.ih, W = LW, H = P.iw, L = 2 * P.lg;
  const o1 = off1.getContext("2d"), im1 = o1.createImageData(w, h), cz = Math.cos(phase - P.beta * z0);
  for (let q = 0; q < w * h; q++) color(grid[q] * cz, im1.data, q * 4);
  o1.putImageData(im1, 0, 0);
  const o2 = off2.getContext("2d"), im2 = o2.createImageData(W, H), col = new Float32Array(H);
  for (let j = 0; j < H; j++) col[j] = scalar((1 - (j + 0.5) / H) * P.a, y0);
  for (let i = 0; i < W; i++) { const cc = Math.cos(phase - P.beta * ((i + 0.5) / W * L)); for (let j = 0; j < H; j++) color(col[j] * cc, im2.data, (j * W + i) * 4); }
  o2.putImageData(im2, 0, 0);
  view1(z0, y0); view2(z0, y0); view3();
}
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.1); last = t;
  if (playing) phase += dt * +$("spd").value * 2 * Math.PI;
  try { draw(); } catch (e) { console.error(e); $("err").textContent = "Error al dibujar: " + e.message; }
  requestAnimationFrame(loop);
}
["type", "n", "m", "a", "b", "ratio", "fit"].forEach(id => $(id).addEventListener("input", params));
$("play").onclick = () => { playing = !playing; $("play").textContent = playing ? "⏸ PAUSA" : "▶ REANUDAR"; };
params(); requestAnimationFrame(loop);
