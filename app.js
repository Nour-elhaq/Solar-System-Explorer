// ===== Solar System Explorer — Three.js Application =====
(function () {
  'use strict';

  // ===== SCENE SETUP =====
  const canvas = document.getElementById('solar-canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  camera.position.set(40, 50, 80);
  camera.lookAt(0, 0, 0);

  // Orbit controls
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 10;
  controls.maxDistance = 250;
  controls.autoRotate = false;
  controls.enablePan = true;

  // ===== LIGHTING =====
  const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
  scene.add(ambientLight);

  const sunLight = new THREE.PointLight(0xFFF5E0, 2.5, 500);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  scene.add(sunLight);

  // ===== STARFIELD =====
  function createStarfield() {
    const starCount = 5000;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 300 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random warm/cool star colors
      const temp = Math.random();
      if (temp > 0.9) { colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1.0; }
      else if (temp > 0.7) { colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.8; }
      else { colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; }

      sizes[i] = 0.3 + Math.random() * 1.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({ size: 0.8, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: true });
    const stars = new THREE.Points(geo, mat);
    scene.add(stars);
    return stars;
  }
  const starfield = createStarfield();

  // ===== PROCEDURAL TEXTURE =====
  function createPlanetTexture(baseColor, variationColor, noiseScale) {
    const size = 256;
    const cnv = document.createElement('canvas');
    cnv.width = size;
    cnv.height = size;
    const ctx = cnv.getContext('2d');

    // Base gradient
    const c = new THREE.Color(baseColor);
    const v = new THREE.Color(variationColor || baseColor);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const noise = (Math.sin(x * noiseScale * 0.05) * Math.cos(y * noiseScale * 0.08) + 1) * 0.5;
        const band = (Math.sin(y * 0.15 + Math.cos(x * 0.02) * 3) + 1) * 0.25;
        const t = noise * 0.6 + band * 0.4;
        const r = Math.floor((c.r * (1 - t) + v.r * t) * 255);
        const g = Math.floor((c.g * (1 - t) + v.g * t) * 255);
        const b = Math.floor((c.b * (1 - t) + v.b * t) * 255);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return new THREE.CanvasTexture(cnv);
  }

  // Color variations for each planet
  const TEXTURE_VARIATIONS = {
    sun: 0xFF8800,
    mercury: 0x888888,
    venus: 0xBB9955,
    earth: 0x225588,
    mars: 0xAA4422,
    jupiter: 0x886633,
    saturn: 0xBBA866,
    uranus: 0x44AAAA,
    neptune: 0x3355CC
  };

  // ===== CREATE CELESTIAL BODIES =====
  const planetMeshes = {};
  const orbitLines = {};
  const planetLabels = [];
  const planetGroups = {};

  function createSunGlow() {
    const glowGeo = new THREE.SphereGeometry(6.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFDB813,
      transparent: true,
      opacity: 0.08,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    // Inner glow
    const glow2Geo = new THREE.SphereGeometry(5.8, 32, 32);
    const glow2Mat = new THREE.MeshBasicMaterial({
      color: 0xFFCC44,
      transparent: true,
      opacity: 0.12,
    });
    const glow2 = new THREE.Mesh(glow2Geo, glow2Mat);
    scene.add(glow2);

    return [glow, glow2];
  }

  function createOrbitLine(radius, color) {
    const segments = 128;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.15 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return line;
  }

  function createLabel(name) {
    const cnv = document.createElement('canvas');
    cnv.width = 256;
    cnv.height = 64;
    const ctx = cnv.getContext('2d');
    ctx.font = '600 28px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);
    const texture = new THREE.CanvasTexture(cnv);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4, 1, 1);
    return sprite;
  }

  function createPlanet(data) {
    const group = new THREE.Group();

    // Texture
    const texture = createPlanetTexture(data.color, TEXTURE_VARIATIONS[data.id], data.id === 'sun' ? 2 : 5 + Math.random() * 5);

    let mesh;
    if (data.id === 'sun') {
      const geo = new THREE.SphereGeometry(data.radius, 64, 64);
      const mat = new THREE.MeshBasicMaterial({ map: texture, color: data.color });
      mesh = new THREE.Mesh(geo, mat);
      createSunGlow();
    } else {
      const geo = new THREE.SphereGeometry(data.radius, 48, 48);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1,
        emissive: new THREE.Color(data.emissive),
        emissiveIntensity: 0.15,
      });
      mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    mesh.userData = { planetId: data.id };
    group.add(mesh);

    // Saturn rings
    if (data.hasRings) {
      const ringGeo = new THREE.RingGeometry(data.ringInner, data.ringOuter, 64);
      // Fix ring UVs for proper display
      const pos = ringGeo.attributes.position;
      const uv = ringGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getY(i);
        const dist = Math.sqrt(x * x + z * z);
        uv.setXY(i, (dist - data.ringInner) / (data.ringOuter - data.ringInner), 0.5);
      }

      const ringCnv = document.createElement('canvas');
      ringCnv.width = 256;
      ringCnv.height = 16;
      const ringCtx = ringCnv.getContext('2d');
      for (let x = 0; x < 256; x++) {
        const a = Math.sin(x * 0.1) * 0.3 + 0.4 + (Math.random() * 0.15);
        ringCtx.fillStyle = `rgba(200, 185, 140, ${a})`;
        ringCtx.fillRect(x, 0, 1, 16);
      }
      const ringTex = new THREE.CanvasTexture(ringCnv);

      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        color: data.ringColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2.3;
      group.add(ring);
    }

    // Label
    const label = createLabel(data.name);
    label.position.y = data.radius + 1.5;
    group.add(label);
    planetLabels.push(label);

    // Tilt
    group.rotation.z = THREE.MathUtils.degToRad(data.tilt);

    // Position on orbit
    if (data.orbitRadius > 0) {
      group.position.x = data.orbitRadius;
    }

    scene.add(group);
    planetMeshes[data.id] = mesh;
    planetGroups[data.id] = group;

    // Orbit line
    if (data.orbitRadius > 0) {
      orbitLines[data.id] = createOrbitLine(data.orbitRadius, data.color);
    }

    return group;
  }

  // Create all planets
  PLANETS.forEach(p => createPlanet(p));

  // ===== STATE =====
  let paused = false;
  let speedMultiplier = 1.0;
  let showOrbits = true;
  let showLabels = true;
  let time = 0;
  let focusTarget = null;
  let focusTransition = 0;
  let focusStartPos = new THREE.Vector3();
  let focusEndPos = new THREE.Vector3();

  // ===== RAYCASTING =====
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const tooltip = document.getElementById('tooltip');

  function getPlanetMeshes() {
    return Object.values(planetMeshes);
  }

  canvas.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(getPlanetMeshes());

    if (intersects.length > 0) {
      const id = intersects[0].object.userData.planetId;
      const planet = PLANETS.find(p => p.id === id);
      if (planet) {
        tooltip.textContent = planet.name;
        tooltip.className = 'tooltip-visible';
        tooltip.style.left = e.clientX + 15 + 'px';
        tooltip.style.top = e.clientY - 10 + 'px';
        canvas.style.cursor = 'pointer';
      }
    } else {
      tooltip.className = 'tooltip-hidden';
      canvas.style.cursor = 'grab';
    }
  });

  canvas.addEventListener('click', (e) => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(getPlanetMeshes());
    if (intersects.length > 0) {
      const id = intersects[0].object.userData.planetId;
      openInfoPanel(id);
      focusPlanet(id);
    }
  });

  // ===== INFO PANEL =====
  const infoPanel = document.getElementById('info-panel');
  const panelClose = document.getElementById('panel-close');

  function openInfoPanel(id) {
    const planet = PLANETS.find(p => p.id === id);
    if (!planet) return;

    // Update nav buttons
    document.querySelectorAll('.planet-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.planet-btn[data-planet="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Planet preview color
    const preview = document.getElementById('panel-icon');
    const color = new THREE.Color(planet.color);
    preview.style.background = `radial-gradient(circle at 35% 35%, ${lighten(color, 0.4)}, #${color.getHexString()}, ${darken(color, 0.5)})`;
    preview.style.boxShadow = `0 0 30px rgba(${Math.floor(color.r*255)}, ${Math.floor(color.g*255)}, ${Math.floor(color.b*255)}, 0.4)`;

    document.getElementById('panel-name').textContent = planet.name;
    document.getElementById('panel-type').textContent = planet.type;
    document.getElementById('panel-description').textContent = planet.description;

    // Facts
    const factsGrid = document.getElementById('facts-grid');
    factsGrid.innerHTML = Object.entries(planet.facts)
      .map(([label, value]) => `<div class="fact-card"><div class="fact-label">${label}</div><div class="fact-value">${value}</div></div>`)
      .join('');

    document.getElementById('fun-fact-text').textContent = planet.funFact;

    // Show panel
    infoPanel.classList.remove('panel-hidden');
    infoPanel.classList.add('panel-visible');
  }

  function closeInfoPanel() {
    infoPanel.classList.remove('panel-visible');
    infoPanel.classList.add('panel-hidden');
    document.querySelectorAll('.planet-btn').forEach(b => b.classList.remove('active'));
  }

  panelClose.addEventListener('click', closeInfoPanel);

  function lighten(c, amount) {
    const r = Math.min(255, Math.floor(c.r * 255 + 255 * amount));
    const g = Math.min(255, Math.floor(c.g * 255 + 255 * amount));
    const b = Math.min(255, Math.floor(c.b * 255 + 255 * amount));
    return `rgb(${r},${g},${b})`;
  }

  function darken(c, amount) {
    const r = Math.floor(c.r * 255 * (1 - amount));
    const g = Math.floor(c.g * 255 * (1 - amount));
    const b = Math.floor(c.b * 255 * (1 - amount));
    return `rgb(${r},${g},${b})`;
  }

  // ===== FOCUS CAMERA =====
  function focusPlanet(id) {
    const planet = PLANETS.find(p => p.id === id);
    const group = planetGroups[id];
    if (!planet || !group) return;

    focusTarget = group;
    focusTransition = 0;
    focusStartPos.copy(camera.position);

    const pos = new THREE.Vector3();
    group.getWorldPosition(pos);

    const dist = Math.max(planet.radius * 5, 8);
    focusEndPos.set(pos.x + dist * 0.6, pos.y + dist * 0.5, pos.z + dist * 0.8);
  }

  // ===== CONTROLS =====
  const btnPause = document.getElementById('btn-pause');
  const iconPause = document.getElementById('icon-pause');
  const iconPlay = document.getElementById('icon-play');
  const speedSlider = document.getElementById('speed-slider');
  const speedValueEl = document.getElementById('speed-value');
  const zoomSlider = document.getElementById('zoom-slider');
  const btnOrbits = document.getElementById('btn-orbits');
  const btnLabelsEl = document.getElementById('btn-labels');

  btnPause.addEventListener('click', () => {
    paused = !paused;
    iconPause.style.display = paused ? 'none' : 'block';
    iconPlay.style.display = paused ? 'block' : 'none';
  });

  speedSlider.addEventListener('input', () => {
    speedMultiplier = speedSlider.value / 100;
    speedValueEl.textContent = speedMultiplier.toFixed(1) + 'x';
  });

  zoomSlider.addEventListener('input', () => {
    const dist = parseFloat(zoomSlider.value);
    const dir = camera.position.clone().normalize();
    camera.position.copy(dir.multiplyScalar(dist));
  });

  btnOrbits.addEventListener('click', () => {
    showOrbits = !showOrbits;
    btnOrbits.classList.toggle('active', showOrbits);
    Object.values(orbitLines).forEach(line => { line.visible = showOrbits; });
  });

  btnLabelsEl.addEventListener('click', () => {
    showLabels = !showLabels;
    btnLabelsEl.classList.toggle('active', showLabels);
    planetLabels.forEach(label => { label.visible = showLabels; });
  });

  // Planet nav
  document.querySelectorAll('.planet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.planet;
      openInfoPanel(id);
      focusPlanet(id);
    });
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeInfoPanel();
    if (e.key === ' ') { e.preventDefault(); btnPause.click(); }
  });

  // ===== ANIMATION LOOP =====
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (!paused) {
      time += delta * speedMultiplier;
    }

    // Orbit planets
    PLANETS.forEach(planet => {
      if (planet.orbitRadius <= 0) return;
      const group = planetGroups[planet.id];
      if (!group) return;

      const angle = time * planet.orbitSpeed * 0.3;
      group.position.x = Math.cos(angle) * planet.orbitRadius;
      group.position.z = Math.sin(angle) * planet.orbitRadius;

      // Self rotation
      const mesh = planetMeshes[planet.id];
      if (mesh && !paused) {
        mesh.rotation.y += planet.rotationSpeed * speedMultiplier;
      }
    });

    // Sun rotation
    const sunMesh = planetMeshes['sun'];
    if (sunMesh && !paused) {
      sunMesh.rotation.y += 0.002 * speedMultiplier;
    }

    // Sun glow pulsation
    const sunGlows = scene.children.filter(c => c.isMesh && c.material.opacity && c.material.opacity < 0.15 && c.geometry.type === 'SphereGeometry');
    sunGlows.forEach((glow, i) => {
      const pulse = Math.sin(time * 2 + i * Math.PI) * 0.03;
      glow.material.opacity = (i === 0 ? 0.08 : 0.12) + pulse;
    });

    // Camera focus transition
    if (focusTarget && focusTransition < 1) {
      focusTransition = Math.min(1, focusTransition + delta * 1.5);
      const t = easeInOutCubic(focusTransition);
      camera.position.lerpVectors(focusStartPos, focusEndPos, t);

      const targetPos = new THREE.Vector3();
      focusTarget.getWorldPosition(targetPos);
      controls.target.lerp(targetPos, t);

      if (focusTransition >= 1) {
        focusTarget = null;
      }
    }

    // Labels face camera
    planetLabels.forEach(label => {
      if (label.visible) {
        label.lookAt(camera.position);
      }
    });

    // Slow starfield rotation
    if (starfield) {
      starfield.rotation.y += 0.00005;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ===== RESIZE =====
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ===== START =====
  animate();

})();
