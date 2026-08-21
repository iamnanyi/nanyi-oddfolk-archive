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
  style: document.querySelector('#styleSelect'),
  gender: document.querySelector('#genderSelect'),
  age: document.querySelector('#ageSelect'),
  detail: document.querySelector('#detailRange'),
  detailOutput: document.querySelector('#detailOutput'),
  motion: document.querySelector('#motionToggle'),
  subject: document.querySelector('#subjectNumber'),
  archetype: document.querySelector('#archetypeLabel'),
  styleLabel: document.querySelector('#styleLabel'),
  profile: document.querySelector('#profileLabel'),
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
const STYLE_KEYS = ['classic', 'cutout', 'poster', 'geometry', 'mono'];
const STYLE_LABELS = { classic: 'LINEWORK', cutout: 'CUT PAPER', poster: 'POSTER', geometry: 'GEOMETRY', mono: 'MONO TRACE' };
const GENDER_LABELS = { feminine: 'FEMININE', masculine: 'MASCULINE', neutral: 'NEUTRAL' };
const AGE_LABELS = { young: 'YOUNG', adult: 'ADULT', mature: 'MATURE', elder: 'ELDER' };
const SKIN_TONES = ['#f5ecdb', '#ead2b8', '#d8b092', '#c58f73', '#9e6e59'];
const HEADWEAR_KEYS = ['none', 'cap', 'beanie', 'halo', 'headband', 'crown', 'scarf'];
const FACE_MARK_KEYS = ['none', 'patch', 'monocle', 'stripe', 'star', 'dots'];
const state = { seed: 314159, palette: 'archive', detail: .58, mood: 'native', style: 'native', gender: 'native', age: 'native', motion: true, frame: 0, lastTick: 0 };

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

function createPerson(seed, forcedMood = 'native', forcedStyle = 'native', forcedGender = 'native', forcedAge = 'native') {
  const anatomy = channel(seed, 'anatomy');
  const features = channel(seed, 'features');
  const styling = channel(seed, 'styling');
  const temperament = channel(seed, 'temperament');
  const styleRng = channel(seed, 'style');
  const genderRng = channel(seed, 'gender');
  const ageRng = channel(seed, 'age');
  const style = forcedStyle === 'native' ? pick(styleRng, STYLE_KEYS) : forcedStyle;
  const gender = forcedGender === 'native' ? pick(genderRng, ['feminine', 'masculine', 'neutral']) : forcedGender;
  const age = forcedAge === 'native' ? pick(ageRng, ['young', 'adult', 'mature', 'elder']) : forcedAge;
  const genderTuning = {
    feminine: { jaw: -.11, eye: 6, brow: -.35 },
    masculine: { jaw: .05, eye: -2, brow: .4 },
    neutral: { jaw: 0, eye: 0, brow: 0 }
  }[gender];
  const ageTuning = {
    young: { eye: 4, hair: 12, wrinkles: 0, nose: -10, mouth: -7, cheek: .18 },
    adult: { eye: 0, hair: 0, wrinkles: 1, nose: 0, mouth: 0, cheek: .08 },
    mature: { eye: -2, hair: -8, wrinkles: 5, nose: 5, mouth: 3, cheek: .02 },
    elder: { eye: -4, hair: -20, wrinkles: 10, nose: 9, mouth: 6, cheek: -.04 }
  }[age];
  const headWidth = range(anatomy, 270, 390) * (gender === 'masculine' ? 1.03 : 1);
  const faceLength = range(anatomy, 390, 500);
  const eyeGap = range(features, 78, 125);
  let hair = Math.floor(range(styling, 0, 10));
  if (gender === 'feminine') {
    const feminineHairPool = forcedGender === 'feminine' ? [6, 6, 7, 7, 8, 8, 9, 9] : [2, 3, 5, 6, 6, 7, 7, 8, 8, 9, 9];
    hair = pick(channel(seed, 'feminine-hair-style'), feminineHairPool);
  }
  if (gender === 'masculine' && chance(channel(seed, 'masculine-hair'), .58)) hair = pick(channel(seed, 'masculine-hair-style'), [0, 1, 4, 5, 6]);
  const makeup = gender === 'feminine' ? chance(channel(seed, 'makeup'), .68) : chance(channel(seed, 'makeup'), .18);
  const faceMark = chance(channel(seed, 'face-mark-presence'), .34) ? pick(channel(seed, 'face-mark'), FACE_MARK_KEYS.slice(1)) : 'none';
  const headwear = chance(channel(seed, 'headwear-presence'), gender === 'feminine' ? .58 : .4) ? pick(channel(seed, 'headwear'), HEADWEAR_KEYS.slice(1)) : 'none';
  return {
    headWidth, faceLength,
    jaw: Math.max(.5, Math.min(.98, range(anatomy, .56, .93) + genderTuning.jaw)),
    asymmetry: range(anatomy, -13, 13),
    earSize: range(anatomy, 48, 78),
    eyeGap,
    eyeSize: range(features, 35, 59) + genderTuning.eye + ageTuning.eye,
    eyeTilt: range(features, -.16, .14),
    browWeight: Math.max(.8, range(features, 1.2, 3.5) + genderTuning.brow),
    noseLength: Math.max(72, range(features, 88, 145) + ageTuning.nose),
    noseWidth: Math.max(24, range(features, 31, 65) + (gender === 'feminine' ? -6 : 0)),
    mouthWidth: range(features, 82, 142) + (gender === 'feminine' ? 5 : 0),
    lip: range(features, 8, 23) + (makeup ? 4 : 0),
    hair,
    hairVolume: range(styling, 20, 82) + ageTuning.hair,
    glasses: chance(styling, .31),
    facialHair: gender === 'masculine' ? chance(styling, .42) : gender === 'feminine' ? false : chance(styling, .18),
    earring: gender === 'feminine' ? chance(styling, .48) : chance(styling, .28),
    freckles: chance(styling, .42),
    collar: Math.floor(range(styling, 0, 3)),
    mood: forcedMood === 'native' ? pick(temperament, MOODS) : forcedMood,
    type: pick(temperament, TYPES),
    accentSide: chance(styling, .5) ? -1 : 1,
    style,
    gender,
    age,
    wrinkleLevel: ageTuning.wrinkles,
    cheek: ageTuning.cheek,
    mouthOffset: ageTuning.mouth,
    skin: pick(channel(seed, 'skin-tone'), SKIN_TONES),
    eyeMode: gender === 'feminine' ? pick(channel(seed, 'eye-mode'), ['almond', 'round', 'wide']) : pick(channel(seed, 'eye-mode'), ['almond', 'round', 'sleepy', 'wide']),
    makeup,
    faceMark,
    headwear
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
  const grainCount = Math.round(180 + 700 * detail);
  for (let i = 0; i < grainCount; i++) {
    target.globalAlpha = range(rng, .02, .06 + detail * .07); target.fillStyle = rng() > .5 ? palette.ink : '#fff';
    const s = range(rng, .4, 2.4); target.fillRect(rng() * width, rng() * height, s, s * range(rng, .3, 1.1));
  }
  target.globalAlpha = .16; target.strokeStyle = palette.ink; target.lineWidth = 1;
  target.setLineDash([2, 10]); target.strokeRect(32, 32, width - 64, height - 64);
  target.restore();
}

function drawBackdrop(target, person, cx, top, half, palette, frame, seed, detail) {
  const rng = channel(seed, 'backdrop');
  const backdropColor = chance(rng, .5) ? palette.shade : palette.accent;
  const backAlpha = .3 + detail * .14;
  if (person.style === 'cutout') {
    const blob = [[cx-half-70,top+125],[cx-half-35,top-20],[cx+18,top-72],[cx+half+82,top+6],[cx+half+70,top+260],[cx+half+18,top+425],[cx-half-72,top+382]];
    fillOrganic(target, blob, backdropColor, backAlpha + .14);
    pathStroke(target, blob, { color: palette.accent, width: 2, roughness: 3, seed: seed+700, frame, passes: 1, closed: true, opacity: .45 });
  } else if (person.style === 'poster') {
    target.save(); target.globalAlpha = backAlpha + .08; target.fillStyle = backdropColor; target.fillRect(cx-half-74, top-22, half*2+150, 438); target.fillStyle = palette.accent; target.fillRect(cx-half-90, top+52, 26, 360); target.restore();
    pathStroke(target, linePoints(cx-half-76,top+5,cx+half+76,top+30,4), { color: palette.ink, width: 2, roughness: 2, seed: seed+701, frame, passes: 1, opacity: .4 });
  } else if (person.style === 'geometry') {
    target.save(); target.globalAlpha = backAlpha + .05; target.fillStyle = backdropColor; target.beginPath(); target.arc(cx,top+220,half+98,0,Math.PI*2); target.fill(); target.restore();
    pathStroke(target, ellipsePoints(cx,top+220,half+110,half+110,0,Math.PI*2,42), { color: palette.accent, width: 3, roughness: 1.5, seed: seed+702, frame, passes: 1, closed: true, opacity: .55 });
  } else if (person.style === 'mono') {
    for (let i = 0; i < 7; i++) {
      const y = top + 60 + i * 54;
      pathStroke(target, linePoints(cx-half-60,y,cx+half+70,y+range(rng,-28,28),9), { color: backdropColor, width: 10 + i%2*4, roughness: 4, seed: seed+703+i, frame, passes: 1, opacity: .22 });
    }
  } else {
    target.save(); target.globalAlpha = backAlpha; target.fillStyle = backdropColor; target.beginPath(); target.arc(cx,top+222,half+88,0,Math.PI*2); target.fill(); target.restore();
  }
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

function drawHeadwear(target, person, cx, top, half, palette, frame, seed) {
  const ink = palette.ink;
  if (person.headwear === 'cap') {
    fillOrganic(target, [[cx-half*.8,top+25],[cx-half*.42,top-24],[cx+half*.5,top-28],[cx+half*.9,top+26],[cx+half*.4,top+47],[cx-half*.7,top+45]], ink, .88);
    pathStroke(target, [[cx-half*.9,top+38],[cx+half*.92,top+32]], { color: palette.accent, width: 4, roughness: 1.5, seed: seed+710, frame, passes: 2 });
  } else if (person.headwear === 'beanie') {
    fillOrganic(target, [[cx-half*.78,top+54],[cx-half*.7,top-5],[cx-45,top-64],[cx+45,top-70],[cx+half*.72,top-4],[cx+half*.8,top+54]], ink, .9);
    pathStroke(target, [[cx-half*.74,top+23],[cx+half*.75,top+22]], { color: palette.accent, width: 5, roughness: 1.3, seed: seed+711, frame, passes: 2 });
  } else if (person.headwear === 'halo') {
    pathStroke(target, ellipsePoints(cx,top-10,half*.7,28,Math.PI,Math.PI*2,24), { color: palette.accent, width: 3, roughness: 1.2, seed: seed+712, frame, passes: 2 });
  } else if (person.headwear === 'headband') {
    pathStroke(target, [[cx-half*.88,top+82],[cx,top+69],[cx+half*.9,top+80]], { color: palette.accent, width: 9, roughness: 1.5, seed: seed+713, frame, passes: 2 });
  } else if (person.headwear === 'crown') {
    fillOrganic(target, [[cx-half*.55,top+28],[cx-half*.42,top-55],[cx-20,top-18],[cx+4,top-68],[cx+half*.3,top-14],[cx+half*.58,top-46],[cx+half*.68,top+35]], palette.accent, .8);
    pathStroke(target, [[cx-half*.55,top+28],[cx+half*.68,top+35]], { color: ink, width: 2, roughness: 1.2, seed: seed+714, frame, passes: 2 });
  } else if (person.headwear === 'scarf') {
    pathStroke(target, [[cx-half*.92,top+72],[cx-half*.25,top+55],[cx+half*.42,top+66],[cx+half*.92,top+58]], { color: palette.accent, width: 10, roughness: 2, seed: seed+715, frame, passes: 2 });
  }
}

function drawFaceMark(target, person, cx, top, half, eyeY, palette, frame, seed) {
  const side = person.accentSide;
  if (person.faceMark === 'patch') {
    fillOrganic(target, [[cx+side*half*.74,eyeY-33],[cx+side*half*.42,eyeY-40],[cx+side*half*.42,eyeY+37],[cx+side*half*.74,eyeY+30]], palette.ink, .9);
  } else if (person.faceMark === 'monocle') {
    pathStroke(target, ellipsePoints(cx+side*person.eyeGap,eyeY,person.eyeSize+21,43,0,Math.PI*2,28), { color: palette.accent, width: 2.4, roughness: 1, seed: seed+720, frame, passes: 2, closed: true });
    pathStroke(target, linePoints(cx+side*(person.eyeGap+person.eyeSize+20),eyeY+38,cx+side*(person.eyeGap+person.eyeSize+40),eyeY+88,4), { color: palette.accent, width: 1.2, roughness: .7, seed: seed+721, frame, passes: 1 });
  } else if (person.faceMark === 'stripe') {
    pathStroke(target, [[cx+side*half*.85,top+118],[cx+side*half*.4,top+330]], { color: palette.accent, width: 8, roughness: 1.8, seed: seed+722, frame, passes: 2, opacity: .7 });
  } else if (person.faceMark === 'star') {
    target.save(); target.fillStyle = palette.accent; target.globalAlpha = .85; target.beginPath();
    for (let i = 0; i < 10; i++) { const angle = -Math.PI/2 + i*Math.PI/5; const radius = i%2 ? 6 : 16; const x = cx+side*half*.58 + Math.cos(angle)*radius; const y = top+300 + Math.sin(angle)*radius; i ? target.lineTo(x,y) : target.moveTo(x,y); }
    target.closePath(); target.fill(); target.restore();
  } else if (person.faceMark === 'dots') {
    target.save(); target.fillStyle = palette.accent; target.globalAlpha = .78;
    for (let i = 0; i < 3; i++) { target.beginPath(); target.arc(cx+side*(half*.55+i*12), top+292+i*15, 3+i, 0, Math.PI*2); target.fill(); }
    target.restore();
  }
}

function drawPresentationDetails(target, person, cx, eyeY, mouthY, palette, frame, seed) {
  if (!person.makeup) return;
  [-1, 1].forEach((side, index) => {
    target.save(); target.fillStyle = palette.accent; target.globalAlpha = .22; target.beginPath(); target.ellipse(cx+side*person.eyeGap, eyeY+48, 27, 10, 0, 0, Math.PI*2); target.fill(); target.restore();
    pathStroke(target, [[cx+side*(person.eyeGap-person.eyeSize*.85),eyeY-18],[cx+side*person.eyeGap,eyeY-30],[cx+side*(person.eyeGap+person.eyeSize*.85),eyeY-18]], { color: palette.ink, width: 1.1, roughness: .7, seed: seed+730+index, frame, passes: 1 });
  });
  pathStroke(target, [[cx-24,mouthY+5],[cx,mouthY+10],[cx+24,mouthY+5]], { color: palette.accent, width: 2.5, roughness: .8, seed: seed+732, frame, passes: 2, opacity: .72 });
}

function drawHair(target, person, cx, top, palette, frame, seed, detail) {
  const half = person.headWidth / 2;
  const baseY = top + 95;
  const ink = palette.ink;
  const preserveLongHair = person.gender === 'feminine' && person.hair >= 6;
  if (person.gender === 'feminine' && person.hair < 6 && chance(channel(seed, 'soft-locks'), .72)) {
    for (const side of [-1, 1]) {
      pathStroke(target, [[cx+side*(half-15),baseY-8],[cx+side*(half+18),top+280],[cx+side*(half+12),top+person.faceLength+42]], { color: ink, width: 4.5, roughness: 2.8, seed: seed+605+side, frame, passes: 2, opacity: .82 });
    }
  }
  if (person.style === 'cutout' && !preserveLongHair) {
    fillOrganic(target, [[cx-half-28,baseY+55],[cx-half-18,top+24],[cx-70,top-person.hairVolume-15],[cx+half+18,top+35],[cx+half+30,baseY+64],[cx+55,baseY+22],[cx-30,top+58]], ink, .93);
    fillOrganic(target, [[cx+person.accentSide*40,top+28],[cx+person.accentSide*115,top+8],[cx+person.accentSide*125,top+116],[cx+person.accentSide*58,top+148]], palette.accent, .75);
    return;
  }
  if (person.style === 'poster' && !preserveLongHair) {
    fillOrganic(target, [[cx-half-18,baseY+36],[cx-half-38,top+45],[cx-60,top-person.hairVolume-22],[cx+half+36,top+18],[cx+half+16,baseY+75],[cx+70,baseY+18],[cx-5,top+58]], ink, .95);
    pathStroke(target, [[cx-half-35,top+38],[cx-10,top-18],[cx+half+27,top+38]], { color: palette.accent, width: 12, roughness: 1.8, seed: seed+501, frame, passes: 2, opacity: .82 });
    return;
  }
  if (person.style === 'geometry' && !preserveLongHair) {
    const crown = [[cx-half-20,baseY+36],[cx-half+12,top-30],[cx-30,top+12],[cx+28,top-52],[cx+half+28,top+36],[cx+half-5,baseY+54],[cx,top+42]];
    fillOrganic(target, crown, ink, .94);
    pathStroke(target, [[cx-half+12,top-30],[cx-30,top+12],[cx+28,top-52],[cx+half+28,top+36]], { color: palette.accent, width: 3, roughness: .7, seed: seed+502, frame, passes: 2 });
    return;
  }
  if (person.style === 'mono' && !preserveLongHair) {
    pathStroke(target, ellipsePoints(cx, top + 70, half + 19, 116, Math.PI * 1.02, Math.PI * 1.98, 32), { color: ink, width: 4, roughness: .8, seed: seed+503, frame, passes: 2 });
    pathStroke(target, [[cx-half+8,baseY+8],[cx-half-10,top+16],[cx+18,top-20],[cx+half+25,baseY+42]], { color: ink, width: 2, roughness: .7, seed: seed+504, frame, passes: 2 });
    return;
  }
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
  } else if (person.hair === 5) {
    const sweep = [[cx-half-14,baseY+50],[cx-half-25,top+28],[cx-30,top-person.hairVolume],[cx+half+32,top+40],[cx+half-5,baseY+82],[cx+90,baseY+25],[cx-20,top+70]];
    fillOrganic(target, sweep, ink, .94);
    pathStroke(target, sweep, { color: ink, width: 2, roughness: 3, seed, frame, passes: 2, closed: true });
  } else if (person.hair === 6) {
    fillOrganic(target, [[cx-half-24,baseY+48],[cx-half-14,top+35],[cx-34,top-person.hairVolume],[cx+half+20,top+38],[cx+half+24,baseY+50],[cx+half-20,baseY+12],[cx,top+50]], ink, .9);
    for (let side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = cx + side * (half - 28 + i * 12);
        pathStroke(target, [[x,baseY+12],[x+side*range(channel(seed, `wave:${side}:${i}`), 4, 18),top+360],[x+side*range(channel(seed, `wave-end:${side}:${i}`), 12, 30),top+person.faceLength+55]], { color: ink, width: 3.2, roughness: 2.5, seed: seed+610+i*side, frame, passes: 2 });
      }
    }
  } else if (person.hair === 7) {
    const side = person.accentSide;
    fillOrganic(target, [[cx-half-20,baseY+46],[cx-half-18,top+35],[cx-20,top-person.hairVolume],[cx+half+24,top+42],[cx+half+12,baseY+54],[cx,top+48]], ink, .9);
    target.save(); target.fillStyle = ink; target.globalAlpha = .9; target.beginPath(); target.arc(cx+side*(half+64), top+66, 58, 0, Math.PI*2); target.fill(); target.restore();
    pathStroke(target, [[cx+side*(half-8),baseY+20],[cx+side*(half+42),top+120],[cx+side*(half+80),top+240],[cx+side*(half+58),top+380]], { color: ink, width: 15, roughness: 4, seed: seed+620, frame, passes: 2 });
  } else if (person.hair === 8) {
    fillOrganic(target, [[cx-half-30,baseY+115],[cx-half-36,top+52],[cx-70,top-person.hairVolume],[cx+80,top-person.hairVolume-4],[cx+half+34,top+52],[cx+half+30,baseY+115],[cx+half-15,baseY+170],[cx-half+15,baseY+170]], ink, .9);
    pathStroke(target, [[cx-half-28,baseY+70],[cx-half-34,baseY+180]], { color: ink, width: 4, roughness: 1.7, seed: seed+630, frame, passes: 2 });
    pathStroke(target, [[cx+half+27,baseY+70],[cx+half+33,baseY+180]], { color: ink, width: 4, roughness: 1.7, seed: seed+631, frame, passes: 2 });
  } else {
    fillOrganic(target, [[cx-half-28,baseY+75],[cx-half-22,top+55],[cx-55,top-person.hairVolume],[cx+half+25,top+48],[cx+half+28,baseY+78],[cx+half-2,baseY+142],[cx-half+2,baseY+142]], ink, .9);
    pathStroke(target, [[cx-half-22,baseY+35],[cx+half+22,baseY+35]], { color: palette.accent, width: 8, roughness: 2, seed: seed+640, frame, passes: 2 });
  }
}

function buildFace(person, cx, top, bottom, half) {
  if (person.gender === 'feminine' && person.style !== 'geometry') {
    const softJaw = Math.min(person.jaw, .76);
    const styleWidth = person.style === 'poster' ? 1.04 : person.style === 'cutout' ? .94 : person.style === 'mono' ? .97 : 1;
    const faceHalf = half * styleWidth;
    return [[cx-faceHalf*.64,top+25],[cx-faceHalf*.91,top+112],[cx-faceHalf*.98,top+235],[cx-faceHalf*.9,bottom-92],[cx-faceHalf*softJaw,bottom-34],[cx-faceHalf*.48,bottom+10],[cx-30,bottom+38],[cx+31,bottom+37],[cx+faceHalf*.5,bottom+8],[cx+faceHalf*softJaw,bottom-36],[cx+faceHalf*.9,bottom-94],[cx+faceHalf*.98,top+232],[cx+faceHalf*.9,top+108],[cx+faceHalf*.62,top+23]];
  }
  if (person.style === 'cutout') {
    return [[cx-half*.62,top+18],[cx-half-4,top+148],[cx-half*.86,bottom-58],[cx-68,bottom+28],[cx+30,bottom+51],[cx+half*.84,bottom-42],[cx+half+5,top+145],[cx+half*.55,top+22]];
  }
  if (person.style === 'poster') {
    return [[cx-half*.78,top+28],[cx-half*1.05,top+150],[cx-half*.86,bottom-22],[cx-46,bottom+48],[cx+56,bottom+38],[cx+half*.91,bottom-32],[cx+half*1.06,top+142],[cx+half*.7,top+26]];
  }
  if (person.style === 'geometry') {
    return [[cx-half*.58,top+28],[cx-half*.98,top+138],[cx-half*.9,top+285],[cx-half*.7,bottom-28],[cx-38,bottom+44],[cx+32,bottom+38],[cx+half*.72,bottom-35],[cx+half*.92,top+278],[cx+half*1.02,top+130],[cx+half*.52,top+22]];
  }
  if (person.style === 'mono') {
    return [[cx-half*.68,top+28],[cx-half*.92,top+142],[cx-half*.86,bottom-38],[cx-42,bottom+34],[cx+43,bottom+33],[cx+half*.87,bottom-38],[cx+half*.93,top+140],[cx+half*.64,top+25]];
  }
  return [
    [cx-half*.72, top+30], [cx-half, top+130], [cx-half*.95, top+285],
    [cx-half*person.jaw, bottom-35], [cx-45, bottom+35], [cx+45, bottom+33],
    [cx+half*person.jaw, bottom-40], [cx+half*.96, top+280], [cx+half, top+125], [cx+half*.7, top+25]
  ];
}

function drawStyleTreatment(target, person, cx, top, bottom, half, palette, frame, seed) {
  if (person.style === 'cutout') {
    fillOrganic(target, [[cx+person.accentSide*8,top+120],[cx+person.accentSide*half*.82,top+188],[cx+person.accentSide*half*.7,bottom-70],[cx+person.accentSide*18,bottom+22],[cx-10,bottom-110]], palette.shade, .7);
    pathStroke(target, [[cx-half*.72,top+55],[cx-half*.93,top+250],[cx-half*.48,bottom-18]], { color: palette.accent, width: 4, roughness: 1.2, seed: seed+520, frame, passes: 2 });
  } else if (person.style === 'poster') {
    fillOrganic(target, [[cx+person.accentSide*22,top+120],[cx+person.accentSide*42,top+170],[cx+person.accentSide*36,top+330],[cx+person.accentSide*6,top+360]], palette.accent, .62);
    target.save(); target.fillStyle = palette.accent; target.globalAlpha = .85; target.beginPath(); target.arc(cx-person.accentSide*half*.58, top+215, 16, 0, Math.PI*2); target.fill(); target.restore();
  } else if (person.style === 'geometry') {
    fillOrganic(target, [[cx-half*.85,top+300],[cx-half*.4,top+245],[cx-half*.25,top+362],[cx-half*.75,top+405]], palette.accent, .62);
    fillOrganic(target, [[cx+half*.85,top+285],[cx+half*.42,top+252],[cx+half*.28,top+370],[cx+half*.75,top+398]], palette.shade, .7);
    pathStroke(target, [[cx-half*.92,top+180],[cx,top+220],[cx+half*.92,top+180]], { color: palette.ink, width: 1.3, roughness: .4, seed: seed+521, frame, passes: 1 });
  } else if (person.style === 'mono') {
    pathStroke(target, ellipsePoints(cx, top+236, half+34, person.faceLength*.55, Math.PI*.24, Math.PI*1.76, 38), { color: palette.ink, width: 1, roughness: .45, seed: seed+522, frame, passes: 1, opacity: .45 });
  }
}

function drawAgeDetails(target, person, cx, top, bottom, palette, frame, seed, detail) {
  if (!person.wrinkleLevel) return;
  const rng = channel(seed, 'age-lines');
  const lineCount = Math.round(person.wrinkleLevel * (.45 + detail * .75));
  for (let i = 0; i < lineCount; i++) {
    const side = chance(rng, .5) ? -1 : 1;
    const x = cx + side * range(rng, 42, 120);
    const y = range(rng, top+175, top+280);
    pathStroke(target, linePoints(x, y, x + side * range(rng, 10, 32), y + range(rng, 3, 13), 3), { color: palette.ink, width: .8, roughness: .65, seed: seed+540+i, frame, passes: 1, opacity: .42 });
  }
  if (person.age === 'elder') {
    pathStroke(target, [[cx-58,top+125],[cx,top+112],[cx+57,top+126]], { color: palette.ink, width: .9, roughness: .7, seed: seed+550, frame, passes: 1, opacity: .45 });
  }
}

function drawPortrait(target, seed, width, height, options = {}) {
  const palette = PALETTES[options.palette || state.palette];
  const detail = options.detail ?? state.detail;
  const frame = options.frame ?? 0;
  const person = createPerson(seed, options.mood ?? state.mood, options.style ?? state.style, options.gender ?? state.gender, options.age ?? state.age);
  drawPaper(target, seed, palette, width, height, detail);
  target.save(); target.scale(width / 900, height / 1050);
  const cx = 450 + person.asymmetry, top = 205, half = person.headWidth / 2;
  const bottom = top + person.faceLength;
  drawBackdrop(target, person, cx, top, half, palette, frame, seed, detail);
  const face = buildFace(person, cx, top, bottom, half);
  drawHair(target, person, cx, top, palette, frame, seed, detail);
  drawHeadwear(target, person, cx, top, half, palette, frame, seed);
  fillOrganic(target, face.map(([x,y]) => [x + person.accentSide*10, y+8]), palette.accent, .2);
  fillOrganic(target, face, person.skin, .96);
  pathStroke(target, face, { color: palette.ink, width: 3.1, roughness: 2.6, seed: seed+4, frame, passes: 3, closed: true, gaps: .025 });
  drawStyleTreatment(target, person, cx, top, bottom, half, palette, frame, seed);

  // ears
  [-1, 1].forEach((side, index) => {
    const ex = cx + side * (half + 3), ey = top + person.faceLength * .47;
    pathStroke(target, ellipsePoints(ex, ey, person.earSize*.48, person.earSize, side < 0 ? Math.PI*.46 : Math.PI*.55, side < 0 ? Math.PI*1.53 : Math.PI*1.45, 18), { color: palette.ink, width: 2.3, roughness: 1.7, seed: seed+80+index, frame, passes: 2 });
    pathStroke(target, [[ex,ey-18],[ex-side*15,ey],[ex,ey+19]], { color: palette.ink, width: 1.3, roughness: 1.3, seed: seed+90+index, frame });
  });

  // eyes and brows
  const eyeY = top + person.faceLength * .39; const mood = person.mood;
  [-1, 1].forEach((side, index) => {
    const ex = cx + side * person.eyeGap; const tilt = person.eyeTilt * side + (mood === 'skeptical' && side === 1 ? -.12 : 0);
    const yL = eyeY - tilt * person.eyeSize, yR = eyeY + tilt * person.eyeSize;
    const eyeOpen = { almond: 12, round: 18, sleepy: 6, wide: 22 }[person.eyeMode] - (mood === 'sleepy' ? 4 : 0);
    const lowerOpen = { almond: 10, round: 15, sleepy: 5, wide: 18 }[person.eyeMode] - (mood === 'sleepy' ? 3 : 0);
    const upper = [[ex-person.eyeSize,yL],[ex,eyeY-eyeOpen],[ex+person.eyeSize,yR]];
    const lower = [[ex-person.eyeSize,yL],[ex,eyeY+lowerOpen],[ex+person.eyeSize,yR]];
    pathStroke(target, upper, { color: palette.ink, width: 2.4, roughness: 1.2, seed: seed+110+index, frame, passes: 2 });
    pathStroke(target, lower, { color: palette.ink, width: 1.2, roughness: 1.1, seed: seed+120+index, frame, passes: 2 });
    target.save(); target.fillStyle = palette.ink; target.beginPath(); target.ellipse(ex + side*2, eyeY+(mood==='sleepy'?4:0), 6.5, 9, 0, 0, Math.PI*2); target.fill(); target.restore();
    const browLift = mood === 'bright' ? -9 : mood === 'skeptical' && side === 1 ? -17 : 0;
    pathStroke(target, [[ex-person.eyeSize-3, eyeY-45+browLift+side*4],[ex,eyeY-53+browLift],[ex+person.eyeSize+4,eyeY-48+browLift-side*4]], { color: palette.ink, width: person.browWeight, roughness: 2, seed: seed+130+index, frame, passes: 3 });
  });

  // nose
  const noseTop = eyeY + person.faceLength * .035;
  const noseLength = Math.min(person.noseLength, person.faceLength * .23);
  const noseBottom = noseTop + noseLength;
  pathStroke(target, [[cx-7,noseTop],[cx-12,noseTop+48],[cx-person.noseWidth*.27,noseBottom-17],[cx-person.noseWidth*.55,noseBottom],[cx-5,noseBottom+8]], { color: palette.ink, width: 1.8, roughness: 1.7, seed: seed+150, frame, passes: 2, gaps: .04 });
  pathStroke(target, [[cx-4,noseBottom+8],[cx+person.noseWidth*.38,noseBottom+4],[cx+person.noseWidth*.55,noseBottom-7]], { color: palette.ink, width: 1.5, roughness: 1.4, seed: seed+151, frame, passes: 2 });

  // mouth
  const mouthFloor = bottom - Math.max(52, person.faceLength * .12);
  const mouthTarget = top + person.faceLength * .76 + person.mouthOffset;
  const mouthY = Math.min(mouthFloor, Math.max(noseBottom + Math.max(28, person.faceLength * .07), mouthTarget)); let curve = 0;
  if (mood === 'bright') curve = 18; if (mood === 'skeptical') curve = -7; if (mood === 'quiet') curve = 2;
  const mouth = [[cx-person.mouthWidth/2,mouthY],[cx-12,mouthY+curve],[cx,mouthY+curve*.72],[cx+13,mouthY+curve],[cx+person.mouthWidth/2,mouthY-2]];
  pathStroke(target, mouth, { color: palette.ink, width: 2.2, roughness: 1.5, seed: seed+170, frame, passes: 3 });
  if (person.lip > 13) pathStroke(target, [[cx-person.mouthWidth*.34,mouthY+9],[cx,mouthY+person.lip],[cx+person.mouthWidth*.35,mouthY+7]], { color: palette.accent, width: 1.6, roughness: 1.1, seed: seed+171, frame, passes: 2, opacity: .8 });

  // glasses
  if (person.glasses) {
    [-1,1].forEach((side,i) => pathStroke(target, ellipsePoints(cx+side*person.eyeGap, eyeY, person.eyeSize+17, 38, 0, Math.PI*2, 27), { color: palette.ink, width: 2.5, roughness: 1.1, seed: seed+200+i, frame, passes: 2, closed: true }));
    pathStroke(target, linePoints(cx-person.eyeGap+person.eyeSize+17,eyeY-2,cx+person.eyeGap-person.eyeSize-17,eyeY-2,8), { color: palette.ink, width: 2.2, roughness: 1, seed: seed+203, frame });
  }

  drawFaceMark(target, person, cx, top, half, eyeY, palette, frame, seed);
  drawPresentationDetails(target, person, cx, eyeY, mouthY, palette, frame, seed);

  // freckles and facial hair
  if (person.freckles) {
    const freckles = channel(seed, 'freckles'); target.save(); target.fillStyle = palette.accent; target.globalAlpha = .65;
    for (let i=0;i<Math.round(8 + 20*detail);i++) { const side = chance(freckles,.5)?-1:1; target.beginPath(); target.arc(cx+side*range(freckles,42,125), eyeY+range(freckles,42,88), range(freckles,1,2.5),0,Math.PI*2); target.fill(); }
    target.restore();
  }
  if (person.gender !== 'feminine' && person.facialHair) {
    const beard = channel(seed, 'beard');
    for (let i=0;i<Math.round(8 + 24*detail);i++) { const x=range(beard,cx-half*.55,cx+half*.55), y=range(beard,mouthY+28,bottom-3); pathStroke(target, linePoints(x,y,x+range(beard,-3,3),y+range(beard,5,12),2), { color: palette.ink,width:.8,roughness:.5,seed:seed+i+240,frame,passes:1,opacity:.55 }); }
  }

  drawAgeDetails(target, person, cx, top, bottom, palette, frame, seed, detail);
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
  const hatchCount = person.gender === 'feminine' ? Math.round(2 + 6*detail) : Math.round(5 + 18*detail);
  for (let i=0;i<hatchCount;i++) {
    const side=chance(hatch,.5)?-1:1; const x=cx+side*range(hatch,half*.58,half*.83); const y=person.gender === 'feminine' ? range(hatch,top+235,bottom-145) : range(hatch,top+275,bottom-55);
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
  ui.styleLabel.textContent = `STYLE / ${STYLE_LABELS[person.style]}`;
  ui.profile.textContent = `${GENDER_LABELS[person.gender]} / ${AGE_LABELS[person.age]}`;
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
    const person = drawPortrait(small.getContext('2d'), seed, 360, 420, { palette: state.palette, detail: .42, mood: 'native', style: 'native', gender: 'native', age: 'native', frame: 0 });
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
ui.style.addEventListener('change', () => { state.style = ui.style.value; renderMain(); });
ui.gender.addEventListener('change', () => { state.gender = ui.gender.value; renderMain(); });
ui.age.addEventListener('change', () => { state.age = ui.age.value; renderMain(); });
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
