document.addEventListener('DOMContentLoaded', () => {

  // =================== ELEMENTS ===================
  const preloader      = document.getElementById('preloader');
  const entryScreen    = document.getElementById('entry-screen');
  const mainContent    = document.getElementById('main-content');
  const giftBox        = document.getElementById('gift-box');
  const musicToggle    = document.getElementById('music-toggle');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const fireworksCanvas= document.getElementById('fireworks-canvas');
  const starsCanvas    = document.getElementById('stars-canvas');
  const blowBtn        = document.getElementById('blow-btn');
  const makeWishText   = document.getElementById('make-wish-text');

  const confCtx  = confettiCanvas ? confettiCanvas.getContext('2d') : null;
  const fwCtx    = fireworksCanvas ? fireworksCanvas.getContext('2d') : null;
  const starCtx  = starsCanvas ? starsCanvas.getContext('2d') : null;

  let musicPlaying = false;
  let audioCtx = null;
  let masterGain = null;
  let melodyTimeout = null;
  let ambientOscs = [];
  let candlesBlown = false;

  // =================== PRELOADER ===================
  setTimeout(() => {
    preloader.classList.add('fade-out');
    setTimeout(() => preloader.style.display = 'none', 600);
  }, 2000);

  // =================== STAR FIELD (Entry Screen) ===================
  function initStarField() {
    if (!starsCanvas || !starCtx) return;
    starsCanvas.width = window.innerWidth;
    starsCanvas.height = window.innerHeight;

    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height,
        r: Math.random() * 1.8 + 0.3,
        alpha: Math.random(),
        dAlpha: (Math.random() - 0.5) * 0.02,
        color: ['#ffffff', '#ffe88a', '#c4a1ff', '#ff80c0', '#5eecc8'][Math.floor(Math.random() * 5)]
      });
    }

    // Shooting stars
    const shootingStars = [];
    function addShootingStar() {
      shootingStars.push({
        x: Math.random() * starsCanvas.width,
        y: Math.random() * starsCanvas.height * 0.3,
        vx: 4 + Math.random() * 4,
        vy: 2 + Math.random() * 2,
        life: 1,
        trail: []
      });
      setTimeout(addShootingStar, 3000 + Math.random() * 5000);
    }
    setTimeout(addShootingStar, 1000);

    function drawStars() {
      starCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);

      stars.forEach(s => {
        s.alpha += s.dAlpha;
        if (s.alpha > 1 || s.alpha < 0.1) s.dAlpha *= -1;
        s.alpha = Math.max(0.1, Math.min(1, s.alpha));

        starCtx.beginPath();
        starCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        starCtx.fillStyle = s.color;
        starCtx.globalAlpha = s.alpha * 0.7;
        starCtx.fill();
        starCtx.globalAlpha = 1;
      });

      // Shooting stars
      shootingStars.forEach((ss, i) => {
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= 0.015;
        ss.trail.push({ x: ss.x, y: ss.y });
        if (ss.trail.length > 20) ss.trail.shift();

        for (let t = 0; t < ss.trail.length; t++) {
          const a = (t / ss.trail.length) * ss.life * 0.6;
          starCtx.beginPath();
          starCtx.arc(ss.trail[t].x, ss.trail[t].y, 1.5 * (t / ss.trail.length), 0, Math.PI * 2);
          starCtx.fillStyle = '#ffffff';
          starCtx.globalAlpha = a;
          starCtx.fill();
        }
        starCtx.globalAlpha = 1;

        if (ss.life <= 0) shootingStars.splice(i, 1);
      });

      if (entryScreen.style.display !== 'none') {
        requestAnimationFrame(drawStars);
      }
    }

    drawStars();
  }

  initStarField();

  // =================== FLOATING HEARTS ===================
  function createFloatingHearts(container, count) {
    if (!container) return;
    const emojis = ['💖', '💜', '💛', '🩷', '🤍', '✨', '🌸', '💗', '💕', '🌟'];
    for (let i = 0; i < count; i++) {
      const h = document.createElement('span');
      h.classList.add('floating-heart');
      h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      h.style.left = Math.random() * 100 + '%';
      h.style.animationDelay = Math.random() * 7 + 's';
      h.style.animationDuration = (5 + Math.random() * 5) + 's';
      h.style.fontSize = (0.7 + Math.random() * 1.4) + 'rem';
      container.appendChild(h);
    }
  }

  createFloatingHearts(document.getElementById('entry-hearts'), 25);
  createFloatingHearts(document.getElementById('letter-particles'), 18);
  createFloatingHearts(document.getElementById('cake-particles'), 12);

  // =================== WEB AUDIO — PREMIUM BIRTHDAY MUSIC ===================

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.45;

    // Reverb via delay (simple convolution substitute)
    const convolver = audioCtx.createConvolver();
    const reverbLen = audioCtx.sampleRate * 1.5;
    const reverbBuf = audioCtx.createBuffer(2, reverbLen, audioCtx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = reverbBuf.getChannelData(ch);
      for (let i = 0; i < reverbLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLen, 2.5);
      }
    }
    convolver.buffer = reverbBuf;

    const wetGain = audioCtx.createGain();
    wetGain.gain.value = 0.18;
    const dryGain = audioCtx.createGain();
    dryGain.gain.value = 0.82;

    masterGain.connect(dryGain);
    masterGain.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(audioCtx.destination);
    wetGain.connect(audioCtx.destination);
  }

  // Note frequency helper
  function nf(note, oct) {
    const n = { 'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11 };
    return 440 * Math.pow(2, (n[note] - 9) / 12 + (oct - 4));
  }

  // Happy Birthday melody
  const melody = [
    ['G',4,0.75],['G',4,0.25],['A',4,1],['G',4,1],['C',5,1],['B',4,2],
    ['G',4,0.75],['G',4,0.25],['A',4,1],['G',4,1],['D',5,1],['C',5,2],
    ['G',4,0.75],['G',4,0.25],['G',5,1],['E',5,1],['C',5,0.75],['C',5,0.25],['B',4,1],['A',4,1],
    ['F',5,0.75],['F',5,0.25],['E',5,1],['C',5,1],['D',5,1],['C',5,2],
    [null,0,1.5]
  ];

  // Chord progression
  const chordProg = [
    [['C',3],['E',3],['G',3]], [['C',3],['E',3],['G',3]],
    [['F',3],['A',3],['C',4]], [['C',3],['E',3],['G',3]],
    [['C',3],['E',3],['G',3]], [['C',3],['E',3],['G',3]],
    [['G',3],['B',3],['D',4]], [['F',3],['A',3],['C',4]],
    [['C',3],['E',3],['G',3]], [['G',3],['B',3],['D',4]],
    [['C',3],['E',3],['G',3]], [['C',3],['E',3],['G',3]],
  ];

  // Music box note — warm triangle wave with vibrato & rich harmonics
  function playMusicBoxNote(freq, time, dur) {
    // Fundamental — triangle for warmth
    const o1 = audioCtx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq;

    // Gentle vibrato for warmth
    const vibrato = audioCtx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5;
    const vibGain = audioCtx.createGain();
    vibGain.gain.value = 2;
    vibrato.connect(vibGain);
    vibGain.connect(o1.frequency);

    // 2nd harmonic — sine for bell-like quality
    const o2 = audioCtx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const g2 = audioCtx.createGain();
    g2.gain.value = 0.08;

    // 3rd harmonic (sparkle)
    const o3 = audioCtx.createOscillator();
    o3.type = 'sine';
    o3.frequency.value = freq * 3;
    const g3 = audioCtx.createGain();
    g3.gain.value = 0.035;

    // Octave below for body
    const oLow = audioCtx.createOscillator();
    oLow.type = 'sine';
    oLow.frequency.value = freq / 2;
    const gLow = audioCtx.createGain();
    gLow.gain.value = 0.03;

    // Main envelope — longer sustain for warmth
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.22, time + 0.006);
    env.gain.exponentialRampToValueAtTime(0.15, time + dur * 0.15);
    env.gain.exponentialRampToValueAtTime(0.06, time + dur * 0.5);
    env.gain.exponentialRampToValueAtTime(0.001, time + dur);

    o1.connect(env);
    o2.connect(g2); g2.connect(env);
    o3.connect(g3); g3.connect(env);
    oLow.connect(gLow); gLow.connect(env);
    env.connect(masterGain);

    [o1,o2,o3,oLow,vibrato].forEach(o => { o.start(time); o.stop(time + dur + 0.05); });
  }

  // Warm ambient pad — wider detuning & triangle for lush sound
  function playAmbientPad(chordNotes, time, dur) {
    chordNotes.forEach(([note, oct]) => {
      const freq = nf(note, oct);

      // Three detuned oscillators for richness
      for (let detune of [-7, 0, 7]) {
        const osc = audioCtx.createOscillator();
        osc.type = detune === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        // Subtle LFO for movement
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3 + Math.random() * 0.2;
        const lfoG = audioCtx.createGain();
        lfoG.gain.value = 1.5;
        lfo.connect(lfoG);
        lfoG.connect(osc.detune);

        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(0.028, time + 0.6);
        g.gain.setValueAtTime(0.028, time + dur - 0.6);
        g.gain.linearRampToValueAtTime(0.001, time + dur);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(time);
        osc.stop(time + dur + 0.1);
        lfo.start(time);
        lfo.stop(time + dur + 0.1);
      }
    });
  }

  // Gentle chime accent
  function playChime(freq, time) {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.06, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, time + 2);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(time);
    osc.stop(time + 2);
  }

  // Soft bass note
  function playBass(note, oct, time, dur) {
    const freq = nf(note, oct);
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.08, time + 0.1);
    g.gain.setValueAtTime(0.08, time + dur - 0.3);
    g.gain.linearRampToValueAtTime(0.001, time + dur);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(time);
    osc.stop(time + dur + 0.1);
  }

  // Full melody playback
  function playFullMelody() {
    if (!audioCtx || !musicPlaying) return;
    const bpm = 120;
    const beat = 60 / bpm;
    let t = audioCtx.currentTime + 0.15;
    const startT = t;

    // Bass line
    const bassNotes = [
      ['C',2,4],['F',2,4],['C',2,4],['G',2,2],['C',2,2],
      ['C',2,4],['F',2,2],['G',2,2],['C',2,4]
    ];
    let bt = t;
    bassNotes.forEach(([n,o,dur]) => {
      playBass(n, o, bt, dur * beat);
      bt += dur * beat;
    });

    // Pad chords
    let ct = t;
    chordProg.forEach(chord => {
      playAmbientPad(chord, ct, 2 * beat);
      ct += 2 * beat;
    });

    // Melody
    let mt = t;
    melody.forEach(([note, oct, beats], i) => {
      const dur = beats * beat;
      if (note) {
        playMusicBoxNote(nf(note, oct), mt, dur);
        // Small chime accent on long notes
        if (beats >= 2) {
          playChime(nf(note, oct) * 2, mt + 0.01);
        }
      }
      mt += dur;
    });

    const totalDur = mt - startT;
    melodyTimeout = setTimeout(() => {
      if (musicPlaying) playFullMelody();
    }, totalDur * 1000 + 600);

    return totalDur;
  }

  // Continuous ambient drone
  function startAmbientDrone() {
    if (!audioCtx) return;
    const freqs = [nf('C', 2), nf('G', 2), nf('C', 3)];
    freqs.forEach(freq => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const lfo = audioCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.15 + Math.random() * 0.1;
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.value = 0.008;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const g = audioCtx.createGain();
      g.gain.value = 0.015;

      osc.connect(g);
      g.connect(masterGain);
      osc.start();
      lfo.start();
      ambientOscs.push({ osc, lfo, gain: g });
    });
  }

  function stopAmbientDrone() {
    ambientOscs.forEach(({ osc, lfo, gain }) => {
      gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      setTimeout(() => { try { osc.stop(); lfo.stop(); } catch(e){} }, 600);
    });
    ambientOscs = [];
  }

  function startMusic() {
    initAudio();
    if (musicPlaying) return;
    musicPlaying = true;
    masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.45, audioCtx.currentTime + 1);
    startAmbientDrone();
    playFullMelody();
    musicToggle.classList.remove('muted');
    musicToggle.querySelector('.music-icon').textContent = '🎵';
  }

  function stopMusic() {
    musicPlaying = false;
    if (melodyTimeout) clearTimeout(melodyTimeout);
    stopAmbientDrone();
    if (masterGain && audioCtx) {
      masterGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    }
    musicToggle.classList.add('muted');
    musicToggle.querySelector('.music-icon').textContent = '🔇';
  }

  // Pop / sparkle sound
  function playPop() {
    initAudio();
    const now = audioCtx.currentTime;

    // Noise burst
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const ns = audioCtx.createBufferSource();
    ns.buffer = buf;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.25, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 4000;
    ns.connect(flt);
    flt.connect(ng);
    ng.connect(audioCtx.destination);
    ns.start(now);
    ns.stop(now + 0.12);

    // Sparkle tones
    [1600, 2400, 3200].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.08, now + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + i * 0.04);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now + i * 0.04);
      o.stop(now + 0.35 + i * 0.04);
    });
  }

  // Blow whoosh sound
  function playWhoosh() {
    initAudio();
    const now = audioCtx.currentTime;
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = Math.sin(Math.PI * i / d.length);
      d[i] = (Math.random() * 2 - 1) * env * 0.3;
    }
    const ns = audioCtx.createBufferSource();
    ns.buffer = buf;
    const flt = audioCtx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(2000, now);
    flt.frequency.linearRampToValueAtTime(500, now + 0.6);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.linearRampToValueAtTime(0.001, now + 0.6);
    ns.connect(flt);
    flt.connect(g);
    g.connect(audioCtx.destination);
    ns.start(now);
    ns.stop(now + 0.6);
  }

  // =================== MUSIC TOGGLE ===================
  musicToggle.addEventListener('click', () => {
    if (musicPlaying) stopMusic();
    else startMusic();
  });

  // =================== GIFT BOX ===================
  giftBox.addEventListener('click', () => {
    giftBox.classList.add('opened');
    playPop();

    setTimeout(() => {
      startMusic();
      entryScreen.classList.add('fade-out');
      mainContent.classList.remove('hidden');
      resizeCanvases();
      launchConfetti();

      setTimeout(() => {
        entryScreen.style.display = 'none';
        initScrollReveal();
        initParallax();
      }, 1000);
    }, 900);
  });

  // =================== CANDLE BLOWING ===================
  if (blowBtn) {
    blowBtn.addEventListener('click', () => {
      if (candlesBlown) return;
      candlesBlown = true;
      playWhoosh();

      // Blow out candles sequentially
      const flames = [
        document.getElementById('flame1'),
        document.getElementById('flame2'),
        document.getElementById('flame3'),
        document.getElementById('flame4'),
        document.getElementById('flame5')
      ];

      flames.forEach((f, i) => {
        setTimeout(() => {
          f.classList.add('blown-out');
          // Add smoke
          const smoke = document.createElement('div');
          smoke.classList.add('smoke');
          smoke.style.left = '50%';
          smoke.style.top = '-10px';
          f.parentElement.appendChild(smoke);
          setTimeout(() => smoke.remove(), 1500);
        }, i * 200);
      });

      // After all candles blown
      setTimeout(() => {
        blowBtn.classList.add('hidden');
        makeWishText.textContent = '🎉 Your wish has been granted! 🎉';
        makeWishText.style.color = '#ff80c0';

        // Launch fireworks!
        launchFireworks();

        // Auto scroll to birthday section after fireworks
        setTimeout(() => {
          document.getElementById('birthday-section').scrollIntoView({ behavior: 'smooth' });
          // Start typewriter for birthday title
          setTimeout(() => startTitleTypewriter(), 800);
        }, 3000);
      }, 1200);
    });
  }

  // =================== CONFETTI SYSTEM ===================
  let confettiPieces = [];
  let confettiActive = false;

  function resizeCanvases() {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
    if (fireworksCanvas) {
      fireworksCanvas.width = window.innerWidth;
      fireworksCanvas.height = window.innerHeight;
    }
  }
  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);

  function launchConfetti() {
    confettiPieces = [];
    confettiActive = true;
    const colors = [
      '#ffd700','#ff4d7a','#b490ff','#8257e6','#ff80c0',
      '#2dd4a8','#ffe566','#d93065','#ff69b4','#87ceeb','#98fb98','#ff9ec4'
    ];
    for (let i = 0; i < 250; i++) {
      confettiPieces.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 500,
        w: 5 + Math.random() * 7,
        h: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 5,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 12,
        opacity: 1,
        shape: ['rect','circle','star'][Math.floor(Math.random() * 3)]
      });
    }
    animateConfetti();
    setTimeout(() => confettiActive = false, 5500);
  }

  function drawStar(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
  }

  function animateConfetti() {
    if (!confCtx) return;
    if (!confettiActive && confettiPieces.every(p => p.opacity <= 0)) {
      confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      return;
    }
    confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    confettiPieces.forEach(p => {
      if (p.opacity <= 0) return;
      p.x += p.vx; p.y += p.vy; p.vy += 0.035;
      p.rot += p.rotV; p.vx *= 0.998;
      if (!confettiActive) p.opacity -= 0.012;
      if (p.y > confettiCanvas.height + 30) { p.opacity = 0; return; }

      confCtx.save();
      confCtx.translate(p.x, p.y);
      confCtx.rotate(p.rot * Math.PI / 180);
      confCtx.globalAlpha = Math.max(0, p.opacity);
      confCtx.fillStyle = p.color;

      if (p.shape === 'rect') {
        confCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      } else if (p.shape === 'circle') {
        confCtx.beginPath();
        confCtx.arc(0, 0, p.w/2, 0, Math.PI * 2);
        confCtx.fill();
      } else {
        drawStar(confCtx, 0, 0, p.w/2);
      }
      confCtx.restore();
    });
    requestAnimationFrame(animateConfetti);
  }

  // =================== FIREWORKS SYSTEM ===================
  let fireworks = [];
  let fwParticles = [];
  let fwActive = false;

  function launchFireworks() {
    fwActive = true;
    fireworks = [];
    fwParticles = [];

    // Launch 8 fireworks over 3 seconds
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        fireworks.push({
          x: fireworksCanvas.width * (0.2 + Math.random() * 0.6),
          y: fireworksCanvas.height,
          targetY: fireworksCanvas.height * (0.15 + Math.random() * 0.3),
          vy: -(6 + Math.random() * 4),
          color: ['#ffd700','#ff4d7a','#b490ff','#ff80c0','#2dd4a8','#ffe566'][Math.floor(Math.random() * 6)],
          exploded: false
        });
        // Play a small pop for each launch
        if (audioCtx) {
          const o = audioCtx.createOscillator();
          o.type = 'sine';
          o.frequency.value = 300 + Math.random() * 200;
          const g = audioCtx.createGain();
          g.gain.setValueAtTime(0.05, audioCtx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
          o.connect(g); g.connect(audioCtx.destination);
          o.start(); o.stop(audioCtx.currentTime + 0.3);
        }
      }, i * 400);
    }

    animateFireworks();
    setTimeout(() => fwActive = false, 5000);
  }

  function explodeFirework(fw) {
    const count = 60 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 4;
      fwParticles.push({
        x: fw.x, y: fw.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: fw.color,
        alpha: 1,
        r: 1.5 + Math.random() * 1.5,
        decay: 0.015 + Math.random() * 0.01,
        trail: []
      });
    }

    // Explosion sound
    if (audioCtx) {
      const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/d.length, 2);
      const ns = audioCtx.createBufferSource();
      ns.buffer = buf;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      ns.connect(g); g.connect(audioCtx.destination);
      ns.start(); ns.stop(audioCtx.currentTime + 0.3);
    }
  }

  function animateFireworks() {
    if (!fwCtx) return;
    if (!fwActive && fireworks.length === 0 && fwParticles.length === 0) {
      fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
      fireworksCanvas.style.opacity = '0';
      return;
    }

    fireworksCanvas.style.opacity = '1';

    // Clear then redraw with semi-transparent bg for trail effect
    fwCtx.globalCompositeOperation = 'destination-out';
    fwCtx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    fwCtx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    fwCtx.globalCompositeOperation = 'source-over';

    // Rising fireworks
    fireworks.forEach((fw, i) => {
      if (fw.exploded) return;
      fw.y += fw.vy;
      fw.vy += 0.05;

      fwCtx.beginPath();
      fwCtx.arc(fw.x, fw.y, 2, 0, Math.PI * 2);
      fwCtx.fillStyle = fw.color;
      fwCtx.fill();

      // Trail
      fwCtx.beginPath();
      fwCtx.moveTo(fw.x, fw.y);
      fwCtx.lineTo(fw.x + (Math.random() - 0.5) * 2, fw.y + 15);
      fwCtx.strokeStyle = fw.color;
      fwCtx.globalAlpha = 0.4;
      fwCtx.stroke();
      fwCtx.globalAlpha = 1;

      if (fw.y <= fw.targetY) {
        fw.exploded = true;
        explodeFirework(fw);
      }
    });

    fireworks = fireworks.filter(fw => !fw.exploded);

    // Particles
    fwParticles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.04; p.vx *= 0.98;
      p.alpha -= p.decay;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.shift();

      // Trail
      p.trail.forEach((t, ti) => {
        const a = (ti / p.trail.length) * p.alpha * 0.4;
        fwCtx.beginPath();
        fwCtx.arc(t.x, t.y, p.r * (ti / p.trail.length), 0, Math.PI * 2);
        fwCtx.fillStyle = p.color;
        fwCtx.globalAlpha = Math.max(0, a);
        fwCtx.fill();
      });

      fwCtx.beginPath();
      fwCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      fwCtx.fillStyle = p.color;
      fwCtx.globalAlpha = Math.max(0, p.alpha);
      fwCtx.fill();
      fwCtx.globalAlpha = 1;
    });

    fwParticles = fwParticles.filter(p => p.alpha > 0);

    requestAnimationFrame(animateFireworks);
  }

  // =================== TYPEWRITER EFFECTS ===================

  function typeText(element, text, speed, callback) {
    let i = 0;
    const cursor = document.createElement('span');
    cursor.classList.add('typewriter-cursor');
    element.appendChild(cursor);

    function type() {
      if (i < text.length) {
        element.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(type, speed);
      } else {
        setTimeout(() => cursor.remove(), 1500);
        if (callback) callback();
      }
    }
    type();
  }

  function startTitleTypewriter() {
    const line1 = document.getElementById('title-line1');
    const line2 = document.getElementById('title-line2');
    const subtitle = document.getElementById('birthday-subtitle');

    typeText(line1, 'Happpyy Birthdayyy', 80, () => {
      typeText(line2, 'Diidiii!!!', 100, () => {
        typeText(subtitle, 'Today the world got a little brighter, a lot more beautiful, and infinitely more special!', 30);
      });
    });
  }

  // Letter typewriter
  const letterParagraphs = [
    'Some people come into life and quietly become irreplaceable…You’re that person for me. Happy Birthday didi 💙.',
    'Thank you for tolerating me every single time. Thank you for making me sometimes feel like I belong.',
    'Thank you for giving me the best memories of my life. Thank you for being part of some of the best moments of my life. Thank you being there in my life.',
    'Thank you for being someone whose birthday feels more special to me than my own.',
    'Thank you for everything you have done for me, knowingly or unknowingly. Thank you didi for being my didii.',
    'On your special day, I wish you all the happiness this world can hold. May your dreams chase you as fiercely as you chase them. May life give you back tenfold the love and kindness you pour into everyone around you.',
  ];

  const letterSign = '<p class="letter-sign">With all my love & warmth,<br><span class="letter-signature">Your loving junior 💛</span></p>';

  function initLetterContent() {
    const letterBody = document.getElementById('letter-body');
    if (!letterBody) return;

    letterParagraphs.forEach(text => {
      const p = document.createElement('p');
      p.textContent = text;
      letterBody.appendChild(p);
    });

    // Add signature
    const signDiv = document.createElement('div');
    signDiv.innerHTML = letterSign;
    const signP = signDiv.firstChild;
    signP.style.opacity = '0';
    signP.style.transform = 'translateY(8px)';
    signP.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    letterBody.appendChild(signP);

    // Fix italic text
    letterBody.querySelectorAll('p').forEach(p => {
      p.innerHTML = p.innerHTML.replace(/"I want to be like her."/, '<em>"I want to be like her."</em>');
    });
  }

  initLetterContent();

  // =================== SCROLL REVEAL ===================
  function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal-item').forEach(el => observer.observe(el));

    // Letter paragraphs reveal one by one
    const letterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Reveal paragraphs sequentially
          const paragraphs = entry.target.querySelectorAll('p');
          paragraphs.forEach((p, i) => {
            setTimeout(() => p.classList.add('visible'), i * 400);
          });
          letterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const letterBody = document.getElementById('letter-body');
    if (letterBody) letterObserver.observe(letterBody);

    // Final HBD typewriter
    const hbdFinal = document.getElementById('hbd-final');
    if (hbdFinal) {
      const hbdObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            typeText(hbdFinal, 'Happy Birthday, Didi!', 60);
            hbdObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      hbdObserver.observe(hbdFinal);
    }
  }

  // =================== PARALLAX ===================
  function initParallax() {
    const bgs = document.querySelectorAll('.parallax-bg');
    window.addEventListener('scroll', () => {
      const scrollY = window.pageYOffset;
      bgs.forEach(bg => {
        const speed = parseFloat(bg.dataset.speed) || 0.2;
        bg.style.transform = `translateY(${scrollY * speed}px)`;
      });
    });
  }

  // =================== HEARTS BURST ===================
  const heartsBurst = document.getElementById('hearts-burst');
  if (heartsBurst) {
    const emojis = ['💖','💜','🩷','💛','💗','✨','🌟','💕'];
    emojis.forEach((e, i) => {
      const s = document.createElement('span');
      s.textContent = e;
      s.style.display = 'inline-block';
      s.style.animation = `emojiBounce 2s ease-in-out ${i * 0.12}s infinite`;
      heartsBurst.appendChild(s);
    });
  }

  // =================== TWINKLING STARS (Birthday section) ===================
  function addTwinklingStars(sectionId, count) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.style.cssText = `
        position:absolute;width:${1+Math.random()*2.2}px;height:${1+Math.random()*2.2}px;
        background:white;border-radius:50%;top:${Math.random()*100}%;left:${Math.random()*100}%;
        opacity:${0.15+Math.random()*0.4};
        animation:twinkle ${2+Math.random()*3}s ease-in-out ${Math.random()*3}s infinite alternate;
        pointer-events:none;z-index:1;
      `;
      section.appendChild(star);
    }
  }

  // Inject twinkle keyframe
  const twinkleStyle = document.createElement('style');
  twinkleStyle.textContent = `
    @keyframes twinkle {
      0% { opacity: 0.15; transform: scale(0.7); }
      100% { opacity: 0.75; transform: scale(1.4); }
    }
    @keyframes sparkleFade {
      0% { opacity: 1; transform: scale(1) translateY(0); }
      100% { opacity: 0; transform: scale(0.15) translateY(-25px); }
    }
  `;
  document.head.appendChild(twinkleStyle);

  addTwinklingStars('cake-section', 40);
  addTwinklingStars('birthday-section', 50);
  addTwinklingStars('letter-section', 35);

  // =================== CURSOR SPARKLE TRAIL ===================
  let sparkleN = 0;
  document.addEventListener('mousemove', (e) => {
    sparkleN++;
    if (sparkleN % 3 !== 0) return;
    const s = document.createElement('div');
    const size = 3 + Math.random() * 7;
    const colors = ['#ffd700','#ff4d7a','#b490ff','#ff80c0','#2dd4a8','#ffe566'];
    const c = colors[Math.floor(Math.random() * colors.length)];
    s.style.cssText = `
      position:fixed;width:${size}px;height:${size}px;background:${c};border-radius:50%;
      left:${e.clientX}px;top:${e.clientY}px;pointer-events:none;z-index:9998;
      box-shadow:0 0 ${size+2}px ${c};animation:sparkleFade 0.7s ease-out forwards;
    `;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });

  // =================== HEART PARTICLE EMITTER ===================
  const heartParticlesContainer = document.getElementById('heart-particles');
  if (heartParticlesContainer) {
    const heartEmojis = ['💗','💖','💜','💛','🩷','✨','💕'];

    function emitHeartParticle() {
      const p = document.createElement('span');
      p.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 50;
      const startX = 50 + Math.random() * 20;
      const startY = 50 + Math.random() * 20;
      const endX = startX + Math.cos(angle) * distance;
      const endY = startY + Math.sin(angle) * distance;
      const dur = 1.5 + Math.random() * 1.5;

      p.style.cssText = `
        position:absolute;font-size:${0.5 + Math.random() * 0.6}rem;
        left:${startX}%;top:${startY}%;opacity:0;pointer-events:none;
        animation:heartFloat ${dur}s ease-out forwards;
        --endX:${endX - startX}px;--endY:${endY - startY}px;
      `;
      heartParticlesContainer.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000);
    }

    // Emit particles every 400ms when the heart is in view
    const heartObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          heartEmitterInterval = setInterval(emitHeartParticle, 400);
        } else {
          clearInterval(heartEmitterInterval);
        }
      });
    }, { threshold: 0.3 });

    let heartEmitterInterval;
    heartObserver.observe(heartParticlesContainer.closest('.pulsing-heart-container'));

    // Add keyframe for heart float
    const heartFloatStyle = document.createElement('style');
    heartFloatStyle.textContent = `
      @keyframes heartFloat {
        0% { opacity: 0.8; transform: translate(0, 0) scale(1); }
        100% { opacity: 0; transform: translate(var(--endX), var(--endY)) scale(0.3); }
      }
    `;
    document.head.appendChild(heartFloatStyle);
  }

  // =================== DRAMATIC TITLE ENTRANCE ===================
  // Add a burst glow when the birthday section scrolls into view
  const birthdaySection = document.getElementById('birthday-section');
  if (birthdaySection) {
    const titleObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const wishContainer = document.getElementById('wish-container');
          if (wishContainer) {
            wishContainer.style.animation = 'titleEntrance 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards';
          }
          titleObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    titleObserver.observe(birthdaySection);

    const titleStyle = document.createElement('style');
    titleStyle.textContent = `
      @keyframes titleEntrance {
        0% { opacity: 0; transform: scale(0.8) translateY(40px); filter: blur(8px); }
        40% { opacity: 1; filter: blur(0); }
        60% { transform: scale(1.03) translateY(-5px); }
        80% { transform: scale(0.99) translateY(2px); }
        100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
      }
      #wish-container { opacity: 0; }
    `;
    document.head.appendChild(titleStyle);
  }

});
