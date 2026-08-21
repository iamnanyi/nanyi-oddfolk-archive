/* Oddfolk Archive — all portraits are drawn at runtime with Canvas 2D. */
const canvas = document.querySelector('#portraitCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  seed: document.querySelector('#seedInput'),
  previous: document.querySelector('#previousSeed'),
  next: document.querySelector('#nextSeed'),
  randomize: document.querySelector('#randomizeButton'),
  save: document.querySelector('#saveButton'),
  mood: document.querySelector('#moodSelect'),
  detail: document.querySelector('#detailRange'),
  detailOutput: document.querySelector('#detailOutput'),
  motion: document.querySelector('#motionToggle'),
  subject: document.querySelector('#subjectNumber'),
  archetype: document.querySelector('#archetypeLabel'),
  coordinate: document.querySelector('#coordinateLabel'),
  liveStatus: document.querySelector('#liveStatus'),
  archive: document.querySelector('#archiveGrid'),
  toast: document.querySelector('#toast')
};

const PALETTES = {
  archive: { ink: '#183153', accent: '#f15d4a', paper: '#eee4d3', shade: '#cfdae0' },
  moss: { ink: '#1c4b3e', accent: '#e45b37', paper: '#efe7d4', shade: '#ccd8c5' },
  plum: { ink: '#402846', accent: '#d0d33b', paper: '#efe4d7', shade: '#d9cad9' }
};
const TYPES = ['OBSERVER', 'WANDERER', 'COLLECTOR', 'NIGHT CLERK', 'OPTIMIST', 'QUIET REBEL', 'LISTENER'];
const MOODS = ['quiet', 'bright', 'skeptical', 'sleepy'];
const state = { seed: 314159, palette: 'archive', detail: .64, mood: 'native', motion: true, frame: 0, lastTick: 0 };

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function channel(seed, name) { return mulberry32(hashString(`${seed}:${name}`)); }
function range(rng, min, max) { return min + (max - min) * rng(); }
function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
function chance(rng, probability) { return rng() < probability; }

function createPerson(seed, forcedMood = 'native') {
  const anatomy = channel(seed, 'anatomy');
  const features = channel(seed, 'features');
  const styling = channel(seed, 'styling');
  const temperament = channel(seed, 'temperament');
  const headWidth = range(anatomy, 270, 390);
  const faceLength = range(anatomy, 390, 500);
  const eyeGap = range(features, 78, 125);
  return {
    headWidth, faceLength,
    jaw: range(anatomy, .56, .93),
    asymmetry: range(anatomy, -13, 13),
    earSize: range(anatomy, 48, 78),
    eyeGap,
    eyeSize: range(features, 35, 59),
    eyeTilt: range(features, -.16, .14),
    browWeight: range(features, 1.2, 3.5),
    noseLength: range(features, 88, 145),
    noseWidth: range(features, 31, 65),
    mouthWidth: range(features, 82, 142),
    lip: range(features, 8, 23),
    hair: Math.floor(range(styling, 0, 6)),
    hairVolume: range(styling, 20, 82),
    glasses: chance(styling, .31),
    facialHair: chance(styling, .24),
    earring: chance(styling, .28),
    freckles: chance(styling, .42),
    collar: Math.floor(range(styling, 0, 3)),
    mood: forcedMood === 'native' ? pick(temperament, MOODS) : forcedMood,
    type: pick(temperament, TYPES),
    accentSide: chance(styling, .5) ? -1 : 1
  };
}

function pathStroke(target, points, options = {}) {
  if (points.length < 2) return;
  const { color = '#183153', width = 2.2, seed = 1, frame = 0, roughness = 1, passes = 2, closed = false, opacity = 1, gaps = 0 } = options;
  for (let pass = 0; pass < passes; pass++) {
    const rng = channel(seed + frame * 31, `stroke:${pass}:${points.length}`);
    target.save();
    target.strokeStyle = color;
    target.globalAlpha = opacity * (pass === 0 ? .76 : .34);
    target.lineWidth = Math.max(.5, width * range(rng, .62, 1.25));
    target.lineCap = 'round'; target.lineJoin = 'round';
    target.beginPath();
    points.forEach((p, index) => {
      const x = p[0] + range(rng, -roughness, roughness) + (pass * .65);
      const y = p[1] + range(rng, -roughness, roughness) - (pass * .35);
      if (index === 0) target.moveTo(x, y);
      else if (gaps && rng() < gaps) { target.stroke(); target.beginPath(); target.moveTo(x, y); }
      else {
        const prev = points[index - 1];
        const cx = (prev[0] + x) / 2 + range(rng, -roughness, roughness);
        const cy = (prev[1] + y) / 2 + range(rng, -roughness, roughness);
        target.quadraticCurveTo(prev[0], prev[1], cx, cy);
      }
    });
    if (closed) target.closePath();
    target.stroke(); target.restore();
  }
}

function ellipsePoints(cx, cy, rx, ry, start = 0, end = Math.PI * 2, segments = 42) {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = start + (end - start) * (i / segments);
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}
function linePoints(x1, y1, x2, y2, segments = 10) {
  return Array.from({ length: segments + 1 }, (_, i) => [x1 + (x2 - x1) * i / segments, y1 + (y2 - y1) * i / segments]);
}
function fillOrganic(target, points, color, alpha = 1) {
  target.save(); target.fillStyle = color; target.globalAlpha = alpha; target.beginPath();
  points.forEach((p, i) => i ? target.lineTo(p[0], p[1]) : target.moveTo(p[0], p[1]));
  target.closePath(); target.fill(); target.restore();
}

function drawPaper(target, seed, palette, width, height, detail) {
  target.fillStyle = palette.paper; target.fillRect(0, 0, width, height);
  const rng = channel(seed, 'paper');
  target.save();
  for (let i = 0; i < 480 * detail; i++) {
    target.globalAlpha = range(rng, .02, .1); target.fillStyle = rng() > .5 ? palette.ink : '#fff';
    const s = range(rng, .4, 2.4); target.fillRect(rng() * width, rng() * height, s, s * range(rng, .3, 1.1));
  }
  target.globalAlpha = .16; target.strokeStyle = palette.ink; target.lineWidth = 1;
  target.setLineDash([2, 10]); target.strokeRect(32, 32, width - 64, height - 64);
  target.restore();
}

function drawRegistration(target, seed, palette, width, height) {
  const rng = channel(seed, 'marks');
  target.save(); target.strokeStyle = palette.accent; target.fillStyle = palette.accent; target.globalAlpha = .8; target.lineWidth = 2;
  const x = chance(rng, .5) ? 74 : width - 74;
  target.beginPath(); target.arc(x, 92, 14, 0, Math.PI * 2); target.stroke();
  target.beginPath(); target.moveTo(x - 21, 92); target.lineTo(x + 21, 92); target.moveTo(x, 71); target.lineTo(x, 113); target.stroke();
  target.font = '700 14px monospace'; target.fillText(String(seed).padStart(6, '0').slice(-6), 66, height - 65);
  target.translate(width - 60, height * .5); target.rotate(Math.PI / 2); target.fillText('ODDFOLK / FIELD PORTRAIT', 0, 0); target.restore();
}

function drawHair(target, person, cx, top, palette, frame, seed, detail) {
  const half = person.headWidth / 2;
  const baseY = top + 95;
  const ink = palette.ink;
  if (person.hair === 0) {
    const cap = ellipsePoints(cx, top + 76, half + person.hairVolume * .3, 105, Math.PI, Math.PI * 2, 30);
    fillOrganic(target, [...cap, [cx + half, baseY + 26], [cx - half, baseY + 26]], ink, .92);
  } else if (person.hair === 1) {
    for (let i = -5; i <= 5; i++) {
      const x = cx + i * (half / 5.4);
      pathStroke(target, [[x - 20, baseY + 12], [x - 25, top + 20 + Math.abs(i) * 5], [x + 10, top - person.hairVolume + Math.abs(i) * 8], [x + 24, baseY]], { color: ink, width: 3, roughness: 2.1, seed: seed + i * 17, frame, passes: 2 });
    }
  } else if (person.hair === 2) {
    fillOrganic(target, [[cx-half-25,baseY+95],[cx-half-38,top+44],[cx-80,top-person.hairVolume],[cx+100,top-35],[cx+half+30,baseY+100],[cx+half-5,baseY+35],[cx,top+55],[cx-half+5,baseY+32]], ink, .92);
  } else if (person.hair === 3) {
    for (let a = 0; a < 14; a++) {
      const angle = Math.PI + (Math.PI * a / 13); const x = cx + Math.cos(angle) * (half + 15); const y = top + 79 + Math.sin(angle) * (105 + person.hairVolume * .35);
      target.save(); target.fillStyle = ink; target.globalAlpha = .88; target.beginPath(); target.arc(x, y, 25 + (a % 3) * 5, 0, Math.PI * 2); target.fill(); target.restore();
    }
  } else if (person.hair === 4) {
    pathStroke(target, ellipsePoints(cx, top + 74, half + 14, 115, Math.PI * 1.04, Math.PI * 1.96, 36), { color: ink, width: 15, roughness: 3, seed, frame, passes: 3 });
    for (let i = 0; i < 8 + detail * 8; i++) {
      const r = channel(seed, `crop:${i}`); const x = range(r, cx-half, cx+half); const y = top + 50 - Math.sqrt(Math.max(0, half*half - (x-cx)*(x-cx))) * .25;
      pathStroke(target, linePoints(x, y, x + range(r,-12,12), y-25-range(r,0,25), 4), { color: ink, width: 3, roughness: 1.3, seed: seed+i, frame });
    }
  } else {
    const sweep = [[cx-half-14,baseY+50],[cx-half-25,top+28],[cx-30,top-person.hairVolume],[cx+half+32,top+40],[cx+half-5,baseY+82],[cx+90,baseY+25],[cx-20,top+70]];
    fillOrganic(target, sweep, ink, .94);
    pathStroke(target, sweep, { color: ink, width: 2, roughness: 3, seed, frame, passes: 2, closed: true });
  }
}

function drawPortrait(target, seed, width, height, options = {}) {
  const palette = PALETTES[options.palette || state.palette];
  const detail = options.detail ?? state.detail;
  const frame = options.frame ?? 0;
  const person = createPerson(seed, options.mood || state.mood);
  drawPaper(target, seed, palette, width, height, detail);
  target.save(); target.scale(width / 900, height / 1050);
  const cx = 450 + person.asymmetry, top = 205, half = person.headWidth / 2;
  const bottom = top + person.faceLength;
  const face = [
    [cx-half*.72, top+30], [cx-half, top+130], [cx-half*.95, top+285],
    [cx-half*person.jaw, bottom-35], [cx-45, bottom+35], [cx+45, bottom+33],
    [cx+half*person.jaw, bottom-40], [cx+half*.96, top+280], [cx+half, top+125], [cx+half*.7, top+25]
  ];
  fillOrganic(target, face.map(([x,y]) => [x + person.accentSide*10, y+8]), palette.accent, .2);
  fillOrganic(target, face, '#f5ecdb', .96);
  pathStroke(target, face, { color: palette.ink, width: 3.1, roughness: 2.6, seed: seed+4, frame, passes: 3, closed: true, gaps: .025 });

  // ears
  [-1, 1].forEach((side, index) => {
    const ex = cx + side * (half + 3), ey = top + 245;
    pathStroke(target, ellipsePoints(ex, ey, person.earSize*.48, person.earSize, side < 0 ? Math.PI*.46 : Math.PI*.55, side < 0 ? Math.PI*1.53 : Math.PI*1.45, 18), { color: palette.ink, width: 2.3, roughness: 1.7, seed: seed+80+index, frame, passes: 2 });
    pathStroke(target, [[ex,ey-18],[ex-side*15,ey],[ex,ey+19]], { color: palette.ink, width: 1.3, roughness: 1.3, seed: seed+90+index, frame });
  });

  drawHair(target, person, cx, top, palette, frame, seed, detail);

  // eyes and brows
  const eyeY = top + 205; const mood = person.mood;
  [-1, 1].forEach((side, index) => {
    const ex = cx + side * person.eyeGap; const tilt = person.eyeTilt * side + (mood === 'skeptical' && side === 1 ? -.12 : 0);
    const yL = eyeY - tilt * person.eyeSize, yR = eyeY + tilt * person.eyeSize;
    const upper = [[ex-person.eyeSize,yL],[ex,eyeY-12-(mood==='sleepy'? -5:0)],[ex+person.eyeSize,yR]];
    const lower = [[ex-person.eyeSize,yL],[ex,eyeY+10-(mood==='sleepy'?5:0)],[ex+person.eyeSize,yR]];
    pathStroke(target, upper, { color: palette.ink, width: 2.4, roughness: 1.2, seed: seed+110+index, frame, passes: 2 });
    pathStroke(target, lower, { color: palette.ink, width: 1.2, roughness: 1.1, seed: seed+120+index, frame, passes: 2 });
    target.save(); target.fillStyle = palette.ink; target.beginPath(); target.ellipse(ex + side*2, eyeY+(mood==='sleepy'?4:0), 6.5, 9, 0, 0, Math.PI*2); target.fill(); target.restore();
    const browLift = mood === 'bright' ? -9 : mood === 'skeptical' && side === 1 ? -17 : 0;
    pathStroke(target, [[ex-person.eyeSize-3, eyeY-45+browLift+side*4],[ex,eyeY-53+browLift],[ex+person.eyeSize+4,eyeY-48+browLift-side*4]], { color: palette.ink, width: person.browWeight, roughness: 2, seed: seed+130+index, frame, passes: 3 });
  });

  // nose
  const noseTop = eyeY + 13, noseBottom = noseTop + person.noseLength;
  pathStroke(target, [[cx-7,noseTop],[cx-12,noseTop+48],[cx-person.noseWidth*.27,noseBottom-17],[cx-person.noseWidth*.55,noseBottom],[cx-5,noseBottom+8]], { color: palette.ink, width: 1.8, roughness: 1.7, seed: seed+150, frame, passes: 2, gaps: .04 });
  pathStroke(target, [[cx-4,noseBottom+8],[cx+person.noseWidth*.38,noseBottom+4],[cx+person.noseWidth*.55,noseBottom-7]], { color: palette.ink, width: 1.5, roughness: 1.4, seed: seed+151, frame, passes: 2 });

  // mouth
  const mouthY = noseBottom + 67; let curve = 0;
  if (mood === 'bright') curve = 18; if (mood === 'skeptical') curve = -7; if (mood === 'quiet') curve = 2;
  const mouth = [[cx-person.mouthWidth/2,mouthY],[cx-12,mouthY+curve],[cx,mouthY+curve*.72],[cx+13,mouthY+curve],[cx+person.mouthWidth/2,mouthY-2]];
  pathStroke(target, mouth, { color: palette.ink, width: 2.2, roughness: 1.5, seed: seed+170, frame, passes: 3 });
  if (person.lip > 13) pathStroke(target, [[cx-person.mouthWidth*.34,mouthY+9],[cx,mouthY+person.lip],[cx+person.mouthWidth*.35,mouthY+7]], { color: palette.accent, width: 1.6, roughness: 1.1, seed: seed+171, frame, passes: 2, opacity: .8 });

  // glasses
  if (person.glasses) {
    [-1,1].forEach((side,i) => pathStroke(target, ellipsePoints(cx+side*person.eyeGap, eyeY, person.eyeSize+17, 38, 0, Math.PI*2, 27), { color: palette.ink, width: 2.5, roughness: 1.1, seed: seed+200+i, frame, passes: 2, closed: true }));
    pathStroke(target, linePoints(cx-person.eyeGap+person.eyeSize+17,eyeY-2,cx+person.eyeGap-person.eyeSize-17,eyeY-2,8), { color: palette.ink, width: 2.2, roughness: 1, seed: seed+203, frame });
  }

  // freckles and facial hair
  if (person.freckles) {
    const freckles = channel(seed, 'freckles'); target.save(); target.fillStyle = palette.accent; target.globalAlpha = .65;
    for (let i=0;i<18*detail;i++) { const side = chance(freckles,.5)?-1:1; target.beginPath(); target.arc(cx+side*range(freckles,42,125), eyeY+range(freckles,42,88), range(freckles,1,2.5),0,Math.PI*2); target.fill(); }
    target.restore();
  }
  if (person.facialHair) {
    const beard = channel(seed, 'beard');
    for (let i=0;i<22*detail;i++) { const x=range(beard,cx-half*.55,cx+half*.55), y=range(beard,mouthY+28,bottom-3); pathStroke(target, linePoints(x,y,x+range(beard,-3,3),y+range(beard,5,12),2), { color: palette.ink,width:.8,roughness:.5,seed:seed+i+240,frame,passes:1,opacity:.55 }); }
  }
  if (person.earring) {
    const side = person.accentSide, ex = cx + side*(half+7), ey = top+315;
    pathStroke(target, ellipsePoints(ex,ey,17,23,0,Math.PI*2,18), { color: palette.accent,width:3,roughness:1.4,seed:seed+260,frame,passes:2,closed:true });
  }

  // neck and clothing
  const neckW = person.headWidth * .27;
  pathStroke(target, [[cx-neckW,bottom-8],[cx-neckW-5,bottom+95],[cx-230,900]], { color: palette.ink,width:3,roughness:2,seed:seed+280,frame,passes:2 });
  pathStroke(target, [[cx+neckW,bottom-9],[cx+neckW+5,bottom+95],[cx+230,900]], { color: palette.ink,width:3,roughness:2,seed:seed+281,frame,passes:2 });
  const collarY = bottom+90;
  if (person.collar === 0) {
    fillOrganic(target, [[cx-235,900],[cx-neckW-5,collarY],[cx,collarY+65],[cx+neckW+5,collarY],[cx+235,900]], palette.shade, .65);
    pathStroke(target, [[cx-neckW-5,collarY],[cx,collarY+65],[cx+neckW+5,collarY]], { color:palette.ink,width:2.2,roughness:1.6,seed:seed+285,frame,passes:2 });
  } else if (person.collar === 1) {
    pathStroke(target, ellipsePoints(cx,collarY+20,neckW+18,43,0,Math.PI*2,28), {color:palette.accent,width:8,roughness:2,seed:seed+286,frame,passes:2});
  } else {
    pathStroke(target, [[cx-neckW-20,collarY-8],[cx-95,collarY+75],[cx,collarY+25],[cx+95,collarY+75],[cx+neckW+20,collarY-8]], {color:palette.ink,width:2.4,roughness:1.7,seed:seed+287,frame,passes:2});
  }

  // contour hatching
  const hatch = channel(seed, 'hatch');
  for (let i=0;i<14*detail;i++) {
    const side=chance(hatch,.5)?-1:1; const x=cx+side*range(hatch,half*.58,half*.83); const y=range(hatch,top+275,bottom-55);
    pathStroke(target,linePoints(x,y,x-side*range(hatch,8,25),y+range(hatch,5,18),3),{color:palette.ink,width:.8,roughness:.8,seed:seed+310+i,frame,passes:1,opacity:.45});
  }
  drawRegistration(target, seed, palette, 900, 1050);
  target.restore();
  return person;
}

function syncMetadata(person) {
  const padded = String(state.seed).padStart(6, '0').slice(-8);
  ui.subject.textContent = padded;
  ui.archetype.textContent = `TYPE / ${person.type}`;
  const coordinateRng = channel(state.seed, 'coordinates');
  ui.coordinate.textContent = `X ${range(coordinateRng,10,89).toFixed(2)} / Y ${range(coordinateRng,10,89).toFixed(2)}`;
}
function renderMain() {
  const person = drawPortrait(ctx, state.seed, canvas.width, canvas.height, state);
  syncMetadata(person);
}
function renderArchive() {
  ui.archive.replaceChildren();
  const offsets = [-2, -1, 1, 2];
  offsets.forEach((offset, index) => {
    const seed = Math.max(0, state.seed + offset);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'archive-card';
    button.style.setProperty('--tilt', `${index % 2 ? 1 : -1}deg`);
    button.setAttribute('aria-label', `载入人物 ${seed}`);
    const small = document.createElement('canvas'); small.width = 360; small.height = 420;
    const person = drawPortrait(small.getContext('2d'), seed, 360, 420, { palette: state.palette, detail: .42, mood: 'native', frame: 0 });
    const caption = document.createElement('span'); caption.innerHTML = `NO. ${String(seed).padStart(6,'0').slice(-6)} <b>${person.type}</b>`;
    button.append(small, caption); button.addEventListener('click', () => setSeed(seed)); ui.archive.append(button);
  });
}
function setSeed(value, refreshArchive = true) {
  const normalized = Math.abs(Number.parseInt(value, 10) || 0) % 2147483647;
  state.seed = normalized; state.frame = 0; ui.seed.value = String(normalized); renderMain();
  if (refreshArchive) renderArchive();
}
function showToast(message) {
  ui.toast.textContent = message; ui.toast.classList.add('show'); clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => ui.toast.classList.remove('show'), 1800);
}
function randomSeed() {
  const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] % 1000000000;
}

ui.seed.addEventListener('change', () => setSeed(ui.seed.value));
ui.seed.addEventListener('keydown', event => { if (event.key === 'Enter') { setSeed(ui.seed.value); ui.seed.blur(); } });
ui.previous.addEventListener('click', () => setSeed(Math.max(0, state.seed - 1)));
ui.next.addEventListener('click', () => setSeed(state.seed + 1));
ui.randomize.addEventListener('click', () => setSeed(randomSeed()));
ui.mood.addEventListener('change', () => { state.mood = ui.mood.value; renderMain(); });
ui.detail.addEventListener('input', () => { state.detail = Number(ui.detail.value) / 100; ui.detailOutput.value = `${ui.detail.value}%`; renderMain(); });
ui.motion.addEventListener('change', () => { state.motion = ui.motion.checked; ui.liveStatus.textContent = state.motion ? 'LIVE INK' : 'STILL INK'; renderMain(); });
document.querySelectorAll('.palette').forEach(button => button.addEventListener('click', () => {
  state.palette = button.dataset.palette;
  document.querySelectorAll('.palette').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  const palette = PALETTES[state.palette]; document.documentElement.style.setProperty('--ink', palette.ink); document.documentElement.style.setProperty('--accent', palette.accent);
  renderMain(); renderArchive();
}));
ui.save.addEventListener('click', async () => {
  const miniTool = window.xhs && window.xhs.miniTool;
  if (!miniTool || typeof miniTool.writeTempFile !== 'function' || typeof miniTool.saveImageToPhotosAlbum !== 'function') {
    showToast('请在小红书小工具中使用相册保存');
    return;
  }

  const originalLabel = ui.save.innerHTML;
  ui.save.disabled = true;
  ui.save.setAttribute('aria-busy', 'true');
  ui.save.textContent = '正在生成高清档案…';

  const exportCanvas = document.createElement('canvas'); exportCanvas.width = 1800; exportCanvas.height = 2100;
  drawPortrait(exportCanvas.getContext('2d'), state.seed, 1800, 2100, { ...state, frame: 0 });
  try {
    const tempFile = await miniTool.writeTempFile({ data: exportCanvas.toDataURL('image/png') });
    if (!tempFile || !tempFile.filePath) throw new Error('writeTempFile returned no filePath');
    await miniTool.saveImageToPhotosAlbum({ filePath: tempFile.filePath });
    showToast('高清人物档案已保存到系统相册');
  } catch (error) {
    showToast('保存失败，请检查相册权限后重试');
  } finally {
    ui.save.disabled = false;
    ui.save.removeAttribute('aria-busy');
    ui.save.innerHTML = originalLabel;
  }
});

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function animate(timestamp) {
  if (state.motion && !reduceMotion.matches && timestamp - state.lastTick > 145) {
    state.frame += 1; state.lastTick = timestamp; renderMain();
  }
  requestAnimationFrame(animate);
}

setSeed(state.seed);
requestAnimationFrame(animate);
