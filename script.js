const $ = id => document.getElementById(id);
const C = 299792458;
const presets = ["TE10","TE21","TM11","TM32","TM21","TE01","TE11","TM12"];
$("preset").innerHTML = presets.map(p => `<option>${p}</option>`).join("");

let P = {}, phase = 0, playing = true, last = performance.now(), grid = null;
const OX = 56, OY = 34, WALL = 9;

function params() {
  const a = +$("a").value / 1000, b = +$("b").value / 1000;
  const n = +$("n").value, m = +$("m").value, type = $("type").value;
  const A = n * Math.PI / a, B = m * Math.PI / b;
  const kc = Math.hypot(A, B), fc = C * kc / (2 * Math.PI);
  const f = +$("ratio").value * fc, k = 2 * Math.PI * f / C;
  const beta = Math.sqrt(Math.max(k * k - kc * kc, 1e-9));
  const valid = type === "TE" ? !(n === 0 && m === 0) : (n >= 1 && m >= 1);
  P = {a, b, n, m, type, A, B, kc, fc, f, beta, lg: 2 * Math.PI / beta, valid};
  const w = 400, h = Math.max(110, Math.round(400 * b / a));
  P.iw = w; P.ih = h;
  $("c1").width = OX + w + 34; $("c1").height = OY + h + 84;
  $("c2").width = OX + 520 + 34; $("c2").height = OY + 200 + 84;
  grid = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    grid[j * w + i] = scalar((i + 0.5) / w * a, (1 - (j + 0.5) / h) * b);
  const sfx = type === "TE" ? "H<sub>z</sub> = H₀ cos(nπx/a) cos(mπy/b)" : "E<sub>z</sub> = E₀ sen(nπx/a) sen(mπy/b)";
  $("eq").innerHTML = `<b>${type}<sub>${n}${m}</sub></b> &nbsp; ${sfx} · e<sup>−jβz</sup> e<sup>jωt</sup> &nbsp; (${type === "TE" ? "E<sub>z</sub>=0" : "H<sub>z</sub>=0"})`;
  $("info").textContent = `f_c = ${(fc / 1e9).toFixed(3)} GHz | f = ${(f / 1e9).toFixed(3)} GHz | β = ${beta.toFixed(1)} rad/m | λg = ${(P.lg * 1000).toFixed(1)} mm`;
  $("err").textContent = valid ? "" : (type === "TE" ? "TE: n y m no pueden ser ambos 0." : "TM: n y m deben ser ≥ 1.");
  $("rv").textContent = (+$("ratio").value).toFixed(2);
}

function scalar(x, y) {
  return P.type === "TE" ? Math.cos(P.A * x) * Math.cos(P.B * y) : Math.sin(P.A * x) * Math.sin(P.B * y);
}
function evec(x, y) {
  const {A, B, kc} = P;
  return P.type === "TE"
    ? [B * Math.cos(A * x) * Math.sin(B * y) / kc, -A * Math.sin(A * x) * Math.cos(B * y) / kc]
    : [A * Math.cos(A * x) * Math.sin(B * y) / kc, B * Math.sin(A * x) * Math.cos(B * y) / kc];
}
function color(v) {
  v = Math.max(-1, Math.min(1, v));
  return v >= 0 ? [255, 255 * (1 - v), 255 * (1 - v)] : [255 * (1 + v), 255 * (1 + v), 255];
}

// Paredes metálicas con rayado
function walls(ctx, iw, ih, full) {
  ctx.fillStyle = "#7b8794";
  const strips = [[-WALL, -WALL, iw + 2 * WALL, WALL], [-WALL, ih, iw + 2 * WALL, WALL]];
  if (full) strips.push([-WALL, -WALL, WALL, ih + 2 * WALL], [iw, -WALL, WALL, ih + 2 * WALL]);
  strips.forEach(s => ctx.fillRect(OX + s[0], OY + s[1], s[2], s[3]));
  ctx.strokeStyle = "#c5ccd4"; ctx.lineWidth = 1; ctx.beginPath();
  for (let t = -WALL; t < iw + WALL; t += 7) {
    ctx.moveTo(OX + t, OY - 1); ctx.lineTo(OX + t - 7, OY - WALL);
    ctx.moveTo(OX + t, OY + ih + WALL); ctx.lineTo(OX + t - 7, OY + ih);
  }
  if (full) for (let t = -WALL; t < ih + WALL; t += 7) {
    ctx.moveTo(OX - 1, OY + t); ctx.lineTo(OX - WALL, OY + t - 7);
    ctx.moveTo(OX + iw + WALL, OY + t); ctx.lineTo(OX + iw, OY + t - 7);
  }
  ctx.stroke();
  ctx.strokeStyle = "#444"; ctx.lineWidth = 1.5;
  ctx.strokeRect(OX, OY, iw, ih);
}
// Cota con flechas y texto
function dim(ctx, x1, y1, x2, y2, txt, tx, ty, rot) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  [[x2, y2, 0], [x1, y1, Math.PI]].forEach(([px, py, d]) => {
    ctx.moveTo(px, py); ctx.lineTo(px - 7 * Math.cos(ang + d - 0.4), py - 7 * Math.sin(ang + d - 0.4));
    ctx.moveTo(px, py); ctx.lineTo(px - 7 * Math.cos(ang + d + 0.4), py - 7 * Math.sin(ang + d + 0.4));
  });
  ctx.stroke(); ctx.save(); ctx.translate(tx, ty); if (rot) ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center"; ctx.fillText(txt, 0, 0); ctx.restore();
}

function draw() {
  if (!P.valid) return;
  const fg = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#111";
  const z0 = +$("z0").value * 2 * P.lg, y0 = +$("y0").value * P.b;
  const mm = v => (v * 1000).toFixed(2) + " mm";
  // ---------- Sección transversal
  const c1 = $("c1"), x1 = c1.getContext("2d"), w = P.iw, h = P.ih;
  x1.clearRect(0, 0, c1.width, c1.height);
  const img = x1.createImageData(w, h), cz = Math.cos(phase - P.beta * z0);
  for (let q = 0; q < w * h; q++) {
    const [r, g, bl] = color(grid[q] * cz);
    img.data[q * 4] = r; img.data[q * 4 + 1] = g; img.data[q * 4 + 2] = bl; img.data[q * 4 + 3] = 255;
  }
  x1.putImageData(img, OX, OY);
  x1.save(); x1.translate(OX, OY);
  if ($("vec").checked) {
    const s = 30, sz = Math.sin(phase - P.beta * z0);
    x1.strokeStyle = "#111"; x1.lineWidth = 1.4;
    for (let px = s / 2; px < w; px += s) for (let py = s / 2; py < h; py += s) {
      const [ex, ey] = evec(px / w * P.a, (1 - py / h) * P.b);
      const dx = ex * sz * s * 0.45, dy = -ey * sz * s * 0.45;
      if (Math.hypot(dx, dy) < 2) continue;
      const tx = px + dx, ty = py + dy, ang = Math.atan2(dy, dx);
      x1.beginPath(); x1.moveTo(px - dx, py - dy); x1.lineTo(tx, ty);
      x1.lineTo(tx - 5 * Math.cos(ang - 0.45), ty - 5 * Math.sin(ang - 0.45));
      x1.moveTo(tx, ty); x1.lineTo(tx - 5 * Math.cos(ang + 0.45), ty - 5 * Math.sin(ang + 0.45));
      x1.stroke();
    }
  }
  x1.setLineDash([5, 4]); x1.strokeStyle = "#16a34a"; x1.lineWidth = 2;
  const ly = (1 - y0 / P.b) * h; x1.beginPath(); x1.moveTo(0, ly); x1.lineTo(w, ly); x1.stroke();
  x1.restore();
  x1.setLineDash([]); walls(x1, w, h, true);
  x1.fillStyle = x1.strokeStyle = fg; x1.lineWidth = 1; x1.font = "12px system-ui,sans-serif";
  x1.textAlign = "left"; x1.fillText(`Sección transversal · ${P.type}${P.n}${P.m} · z = z₀`, OX - WALL, 16);
  dim(x1, OX, OY + h + 28, OX + w, OY + h + 28, "a = " + mm(P.a), OX + w / 2, OY + h + 46, false);
  dim(x1, OX - 30, OY, OX - 30, OY + h, "b = " + mm(P.b), OX - 36, OY + h / 2, true);
  x1.textAlign = "left"; x1.fillText("x →  (0,0) esquina inferior izquierda · y ↑", OX - WALL, OY + h + 70);
  // ---------- Corte longitudinal
  const c2 = $("c2"), x2 = c2.getContext("2d"), W = 520, H = 200, L = 2 * P.lg;
  x2.clearRect(0, 0, c2.width, c2.height);
  const im2 = x2.createImageData(W, H), col = new Float32Array(H);
  for (let j = 0; j < H; j++) col[j] = scalar((1 - (j + 0.5) / H) * P.a, y0);
  for (let i = 0; i < W; i++) {
    const cc = Math.cos(phase - P.beta * ((i + 0.5) / W * L));
    for (let j = 0; j < H; j++) {
      const [r, g, bl] = color(col[j] * cc), q = (j * W + i) * 4;
      im2.data[q] = r; im2.data[q + 1] = g; im2.data[q + 2] = bl; im2.data[q + 3] = 255;
    }
  }
  x2.putImageData(im2, OX, OY);
  x2.save(); x2.translate(OX, OY); x2.setLineDash([5, 4]); x2.strokeStyle = "#16a34a"; x2.lineWidth = 2;
  const lz = z0 / L * W; x2.beginPath(); x2.moveTo(lz, 0); x2.lineTo(lz, H); x2.stroke(); x2.restore();
  x2.setLineDash([]); walls(x2, W, H, false);
  x2.fillStyle = x2.strokeStyle = fg; x2.lineWidth = 1; x2.font = "12px system-ui,sans-serif";
  x2.textAlign = "left"; x2.fillText(`Corte longitudinal · y = y₀ = ${(y0 * 1000).toFixed(2)} mm · pared x = a (arriba), x = 0 (abajo)`, OX - WALL, 16);
  dim(x2, OX, OY + H + 28, OX + W, OY + H + 28, "z → (2 λg = " + mm(L) + ")", OX + W / 2, OY + H + 46, false);
  dim(x2, OX - 30, OY, OX - 30, OY + H, "a = " + mm(P.a), OX - 36, OY + H / 2, true);
}

function loop(t) {
  const dt = (t - last) / 1000; last = t;
  if (playing) phase += dt * +$("spd").value * 2 * Math.PI;
  draw(); requestAnimationFrame(loop);
}

$("preset").onchange = e => {
  const s = e.target.value;
  $("type").value = s.slice(0, 2); $("n").value = s[2]; $("m").value = s[3]; params();
};
["type", "n", "m", "a", "b", "ratio"].forEach(id => $(id).addEventListener("input", params));
$("play").onclick = () => { playing = !playing; $("play").textContent = playing ? "Pausa" : "Reanudar"; };
$("preset").dispatchEvent(new Event("change"));
requestAnimationFrame(loop);
