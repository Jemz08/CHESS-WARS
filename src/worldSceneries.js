import * as THREE_NS from 'three';

/** @type {any} */
const THREE = THREE_NS;

// ============================================================================
// Procedural Sky Dome & Horizon Sea GLSL Shaders
// ============================================================================

function createSkyDomeMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uMode: { value: 0 } // 0 = Celestial Observatory, 1 = Dragon Sky Citadel, 2 = Volcanic Titan Forge
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform int uMode;
      varying vec3 vWorldDir;

      float hash3(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(
            mix(hash3(i + vec3(0.0, 0.0, 0.0)), hash3(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x),
            f.y
          ),
          mix(
            mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x),
            f.y
          ),
          f.z
        );
      }

      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise3(p);
          p = p * 2.03 + vec3(1.7, 9.2, 4.3);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float y = clamp(dir.y, -1.0, 1.0);
        float up = max(0.0, y);

        if (uMode == 0) {
          // ------------------------------------------------------------------
          // MODE 0: CELESTIAL ASTRAL OBSERVATORY (Deep Space Nebulae & Aurora)
          // ------------------------------------------------------------------
          vec3 voidDark = vec3(0.025, 0.015, 0.075);
          vec3 deepIndigo = vec3(0.07, 0.04, 0.19);
          vec3 nebulaViolet = vec3(0.46, 0.14, 0.72);
          vec3 nebulaCyan = vec3(0.02, 0.85, 0.78);
          vec3 starGold = vec3(1.0, 0.84, 0.45);

          vec3 baseCol = mix(deepIndigo, voidDark, pow(up, 0.65));

          // Swirling cosmic nebula bands
          vec3 nebCoord = dir * 2.6 + vec3(uTime * 0.012, -uTime * 0.008, uTime * 0.010);
          float n1 = fbm(nebCoord);
          float n2 = fbm(nebCoord * 1.85 - vec3(n1 * 1.2));
          float galaxyBand = exp(-pow((dir.y - dir.x * 0.38 - 0.18) * 3.1, 2.0));

          vec3 nebCol = mix(nebulaViolet, nebulaCyan, smoothstep(0.32, 0.72, n2));
          nebCol = mix(nebCol, starGold, smoothstep(0.68, 0.92, n1 * n2 * 1.8));
          float nebMask = smoothstep(0.34, 0.78, n1) * (0.45 + 0.75 * galaxyBand);
          baseCol += nebCol * nebMask * 0.72;

          // Shimmering celestial aurora curtains in upper sky
          float auroraWave = sin(dir.x * 6.5 + dir.z * 4.2 + uTime * 0.45 + n1 * 4.0);
          float auroraCurtain = smoothstep(0.62, 0.96, auroraWave) * smoothstep(0.08, 0.55, up) * (1.0 - smoothstep(0.65, 0.95, up));
          baseCol += mix(vec3(0.0, 0.95, 0.75), vec3(0.65, 0.25, 1.0), n2) * auroraCurtain * 0.42;

          // Multi-layer twinkling starfield
          float starCell1 = hash3(floor(dir * 260.0));
          float star1 = smoothstep(0.9925, 0.9995, starCell1);
          float twinkle1 = 0.65 + 0.35 * sin(uTime * 3.4 + starCell1 * 62.8);

          float starCell2 = hash3(floor(dir * 115.0 + 19.3));
          float star2 = smoothstep(0.9955, 0.9998, starCell2);
          float twinkle2 = 0.7 + 0.3 * cos(uTime * 2.2 + starCell2 * 94.2);

          vec3 starColor = mix(vec3(0.82, 0.92, 1.0), starGold, fract(starCell1 * 17.3));
          baseCol += starColor * (star1 * twinkle1 * 1.35 + star2 * twinkle2 * 2.1) * smoothstep(-0.15, 0.12, y);

          // Horizon astral glow ring
          float horizonGlow = exp(-abs(y) * 7.5);
          baseCol += mix(nebulaViolet, nebulaCyan, 0.4) * horizonGlow * 0.38;

          gl_FragColor = vec4(baseCol, 1.0);
          return;
        }

        if (uMode == 1) {
          // ------------------------------------------------------------------
          // MODE 1: DRAGON PEAK SKY CITADEL (Alpine Zenith & Golden Cloud Glow)
          // ------------------------------------------------------------------
          vec3 zenithBlue = vec3(0.05, 0.12, 0.28);
          vec3 midCerulean = vec3(0.16, 0.38, 0.64);
          vec3 horizonGold = vec3(0.98, 0.66, 0.26);
          vec3 sunsetRose = vec3(0.88, 0.36, 0.28);

          vec3 skyCol = mix(horizonGold, midCerulean, smoothstep(0.0, 0.36, up));
          skyCol = mix(skyCol, zenithBlue, smoothstep(0.32, 0.88, up));

          // Golden sun disk & atmospheric scattering toward [0.45, 0.26, -0.85]
          vec3 sunDir = normalize(vec3(0.45, 0.26, -0.85));
          float sunDot = max(0.0, dot(dir, sunDir));
          skyCol += vec3(1.0, 0.78, 0.38) * pow(sunDot, 7.0) * 0.55;
          skyCol += vec3(1.0, 0.95, 0.80) * smoothstep(0.996, 0.9996, sunDot) * 2.2;

          // High-altitude sunlit cirrus cloud wisps
          vec3 cloudCoord = vec3(dir.x * 3.2 + uTime * 0.018, dir.y * 6.0, dir.z * 3.2 - uTime * 0.012);
          float cNoise = fbm(cloudCoord);
          float cirrus = smoothstep(0.48, 0.78, cNoise) * smoothstep(0.02, 0.35, up) * (1.0 - smoothstep(0.55, 0.92, up));
          vec3 cirrusCol = mix(sunsetRose, vec3(1.0, 0.90, 0.72), pow(sunDot, 1.5));
          skyCol = mix(skyCol, cirrusCol, cirrus * 0.48);

          // Faint high zenith stars
          float starVal = smoothstep(0.996, 0.9998, hash3(floor(dir * 210.0))) * smoothstep(0.45, 0.85, up);
          skyCol += vec3(1.0, 0.96, 0.88) * starVal * 0.75;

          // Warm golden-amber horizon haze blending into the sea of clouds below
          float horBand = exp(-abs(y + 0.02) * 6.5);
          skyCol += vec3(1.0, 0.68, 0.32) * horBand * 0.34;

          gl_FragColor = vec4(skyCol, 1.0);
          return;
        }

        // --------------------------------------------------------------------
        // MODE 2: VOLCANIC TITAN FORGE (Smoldering Caldera & Ash Storm Sky)
        // --------------------------------------------------------------------
        vec3 zenithAsh = vec3(0.04, 0.015, 0.015);
        vec3 stormSmoke = vec3(0.14, 0.04, 0.03);
        vec3 calderaCrimson = vec3(0.72, 0.14, 0.02);
        vec3 magmaAmber = vec3(1.0, 0.48, 0.06);

        vec3 baseSky = mix(calderaCrimson, stormSmoke, smoothstep(-0.1, 0.35, y));
        baseSky = mix(baseSky, zenithAsh, smoothstep(0.30, 0.85, up));

        // Billowing volcanic ash clouds illuminated from beneath by the magma sea
        vec3 smokeCoord = dir * 3.4 + vec3(uTime * 0.025, -uTime * 0.015, uTime * 0.018);
        float s1 = fbm(smokeCoord);
        float s2 = fbm(smokeCoord * 2.2 + vec3(s1 * 1.4));

        float underGlow = smoothstep(0.65, 0.0, up) * smoothstep(0.35, 0.78, s1);
        baseSky += mix(calderaCrimson, magmaAmber, smoothstep(0.45, 0.82, s2)) * underGlow * 0.68;

        // Pulsing volcanic heat-lightning veins in the ash clouds
        float vein = smoothstep(0.76, 0.82, s1) * smoothstep(0.88, 0.82, s1) * (0.5 + 0.5 * sin(uTime * 3.8 + s2 * 12.0));
        baseSky += vec3(1.0, 0.58, 0.14) * vein * 1.15;

        // Intense molten horizon rim glow
        float rimMagma = exp(-abs(y + 0.05) * 6.2);
        baseSky += magmaAmber * rimMagma * 0.52;

        gl_FragColor = vec4(baseSky, 1.0);
      }
    `
  });

  return material;
}

function createHorizonSeaMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uMode: { value: 0 } // 0 = Astral Void Vortex, 1 = Billowing Cloud Sea, 2 = Molten Magma Caldera
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      uniform int uMode;
      varying vec3 vLocalPos;
      varying float vWaveH;

      void main() {
        vec3 pos = position;
        float r = length(pos.xz);
        float wave = sin(pos.x * 0.18 + uTime * 0.65) * cos(pos.z * 0.16 - uTime * 0.52) * 0.55
                   + sin(r * 0.25 - uTime * 0.85) * 0.35;
        if (uMode == 1) {
          pos.y += wave * smoothstep(9.0, 22.0, r);
        } else if (uMode == 2) {
          pos.y += wave * 0.35 * smoothstep(9.0, 20.0, r);
        }
        vWaveH = wave;
        vLocalPos = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform int uMode;
      varying vec3 vLocalPos;
      varying float vWaveH;

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash2(i + vec2(0.0, 0.0)), hash2(i + vec2(1.0, 0.0)), f.x),
          mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float fbm2(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise2(p);
          p = p * 2.04 + vec2(3.1, 7.4);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        float r = length(vLocalPos.xz);
        float innerCut = smoothstep(8.2, 13.5, r);
        float outerFade = 1.0 - smoothstep(58.0, 84.0, r);
        float radialMask = innerCut * outerFade;
        if (radialMask < 0.01) discard;

        if (uMode == 0) {
          // Mode 0: Swirling Astral Star-Chart Vortex beneath the Observatory
          float ang = atan(vLocalPos.z, vLocalPos.x);
          float spiral = fbm2(vec2(r * 0.14 - uTime * 0.12, ang * 2.5 + r * 0.08));
          float ringGrid = abs(sin(r * 0.65 - uTime * 0.4));
          float runeRing = smoothstep(0.94, 0.995, ringGrid);

          vec3 col = mix(vec3(0.14, 0.05, 0.34), vec3(0.0, 0.88, 0.78), smoothstep(0.35, 0.75, spiral));
          col += vec3(1.0, 0.84, 0.42) * runeRing * 0.85;
          float alpha = radialMask * (0.38 * spiral + 0.45 * runeRing);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.78));
          return;
        }

        if (uMode == 1) {
          // Mode 1: Billowing Golden-Hour Sea of Clouds
          vec2 uv = vLocalPos.xz * 0.085 + vec2(uTime * 0.045, -uTime * 0.032);
          float c1 = fbm2(uv);
          float c2 = fbm2(uv * 2.1 + vec2(c1 * 1.4));
          float crest = clamp(c1 * 0.65 + c2 * 0.35 + vWaveH * 0.22, 0.0, 1.0);

          vec3 cloudShadow = vec3(0.14, 0.18, 0.32);
          vec3 cloudMid = vec3(0.58, 0.46, 0.54);
          vec3 cloudGold = vec3(1.0, 0.82, 0.48);

          vec3 col = mix(cloudShadow, cloudMid, smoothstep(0.25, 0.58, crest));
          col = mix(col, cloudGold, smoothstep(0.55, 0.88, crest));
          float alpha = radialMask * smoothstep(0.22, 0.55, crest) * 0.92;
          gl_FragColor = vec4(col, alpha);
          return;
        }

        // Mode 2: Bubbling Molten Magma Caldera Sea
        vec2 lavaUv = vLocalPos.xz * 0.11 + vec2(uTime * 0.03, uTime * 0.02);
        float nCrust = fbm2(lavaUv);
        float nVein = fbm2(lavaUv * 2.4 - vec2(uTime * 0.05, -uTime * 0.04));
        float magmaMask = smoothstep(0.42, 0.76, nCrust * 0.6 + nVein * 0.4);

        vec3 basaltCrust = vec3(0.06, 0.025, 0.02);
        vec3 redLava = vec3(0.92, 0.18, 0.02);
        vec3 yellowCore = vec3(1.0, 0.78, 0.16);

        vec3 col = mix(basaltCrust, redLava, magmaMask);
        col = mix(col, yellowCore, smoothstep(0.68, 0.92, magmaMask));
        float pulse = 0.88 + 0.12 * sin(uTime * 2.6 + r * 0.4);
        gl_FragColor = vec4(col * pulse, radialMask * 0.95);
      }
    `
  });

  return material;
}

// ============================================================================
// Realm 1 Builder: Celestial Astral Observatory
// ============================================================================
function buildCelestialObservatoryGroup() {
  const group = new THREE.Group();
  group.name = 'Realm_CelestialObservatory';

  const astralMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xded9ee,
    roughness: 0.24,
    metalness: 0.18
  });
  const voidSlateMat = new THREE.MeshStandardMaterial({
    color: 0x140e26,
    roughness: 0.22,
    metalness: 0.48
  });
  const celestialBrassMat = new THREE.MeshStandardMaterial({
    color: 0xe6be5a,
    roughness: 0.20,
    metalness: 0.90,
    emissive: 0x3b2604,
    emissiveIntensity: 0.22
  });
  const cyanRuneMat = new THREE.MeshStandardMaterial({
    color: 0x80ffea,
    roughness: 0.12,
    metalness: 0.35,
    emissive: 0x00f5d4,
    emissiveIntensity: 1.85
  });
  const violetCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xd8b4fe,
    roughness: 0.12,
    metalness: 0.28,
    emissive: 0x9333ea,
    emissiveIntensity: 1.45,
    transparent: true,
    opacity: 0.88
  });

  // 1. Grand Circular Stepped Observatory Platform (flush at y = 0.0 so altar & braziers sit on it)
  const mainDisc = new THREE.Mesh(new THREE.CylinderGeometry(10.8, 11.6, 0.48, 48), voidSlateMat);
  mainDisc.position.set(0, -0.24, 0);
  mainDisc.receiveShadow = true;
  group.add(mainDisc);

  const innerMarbleDisc = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.8, 0.08, 48), astralMarbleMat);
  innerMarbleDisc.position.set(0, -0.02, 0);
  innerMarbleDisc.receiveShadow = true;
  group.add(innerMarbleDisc);

  // Concentric inlaid brass & glowing cyan astrolabe rings on the observatory floor
  for (const [idx, rad] of [4.8, 6.8, 8.75, 10.65].entries()) {
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(rad, idx % 2 === 0 ? 0.07 : 0.045, 12, 72),
      idx % 2 === 0 ? celestialBrassMat : cyanRuneMat
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.01;
    group.add(ringMesh);
  }

  // 12 Perimeter Observatory Colonnade Pillars + Levitating Armillary Orbs
  const floatingNodes = [];
  const pillarCount = 12;
  for (let i = 0; i < pillarCount; i++) {
    const ang = (i / pillarCount) * Math.PI * 2 + Math.PI / 12;
    const px = Math.cos(ang) * 10.2;
    const pz = Math.sin(ang) * 10.2;

    const colGroup = new THREE.Group();
    colGroup.position.set(px, 0, pz);
    colGroup.rotation.y = -ang;

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.42, 8), voidSlateMat);
    plinth.position.y = 0.21;
    colGroup.add(plinth);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.8, 12), astralMarbleMat);
    shaft.position.y = 1.82;
    colGroup.add(shaft);

    const trimBand1 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 10, 24), celestialBrassMat);
    trimBand1.rotation.x = Math.PI / 2;
    trimBand1.position.y = 0.65;
    colGroup.add(trimBand1);

    const trimBand2 = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.045, 10, 24), celestialBrassMat);
    trimBand2.rotation.x = Math.PI / 2;
    trimBand2.position.y = 3.15;
    colGroup.add(trimBand2);

    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.30, 0.32, 8), celestialBrassMat);
    capital.position.y = 3.38;
    colGroup.add(capital);

    // Levitating crystal star-core & brass mini-ring above each pillar
    const orbNode = new THREE.Group();
    orbNode.position.set(0, 4.15, 0);
    const coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      i % 2 === 0 ? cyanRuneMat : violetCrystalMat
    );
    orbNode.add(coreCrystal);
    const miniRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.028, 8, 24), celestialBrassMat);
    miniRing.rotation.x = Math.PI * 0.35;
    orbNode.add(miniRing);
    colGroup.add(orbNode);

    floatingNodes.push({ mesh: orbNode, baseY: 4.15, phase: i * 0.75, speed: 1.4 });
    group.add(colGroup);
  }

  // 2. Three Colossal Gyroscopic Armillary Astrolabe Rings Encircling the Arena
  const armillaryRings = [];
  const ringConfigs = [
    { r: 15.2, tube: 0.14, tiltX: 0.38, tiltZ: 0.12, speedX: 0.09, speedY: 0.16, mat: celestialBrassMat },
    { r: 17.4, tube: 0.11, tiltX: -0.52, tiltZ: 0.28, speedX: -0.12, speedY: 0.11, mat: cyanRuneMat },
    { r: 19.6, tube: 0.16, tiltX: 0.22, tiltZ: -0.45, speedX: 0.07, speedY: -0.14, mat: celestialBrassMat }
  ];

  for (const cfg of ringConfigs) {
    const rGroup = new THREE.Group();
    rGroup.rotation.set(cfg.tiltX, 0, cfg.tiltZ);
    const mainTorus = new THREE.Mesh(new THREE.TorusGeometry(cfg.r, cfg.tube, 14, 96), cfg.mat);
    rGroup.add(mainTorus);

    // Stud the armillary ring with 8 celestial degree pointers & star nodes
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const pointer = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), cyanRuneMat);
      pointer.position.set(Math.cos(a) * cfg.r, Math.sin(a) * cfg.r, 0);
      rGroup.add(pointer);
    }

    group.add(rGroup);
    armillaryRings.push({ group: rGroup, speedX: cfg.speedX, speedY: cfg.speedY });
  }

  // 3. Distant Levitating Star-Monolith Islands (8 Composite Obelisks in Orbit)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const dist = 25.5 + (i % 2) * 4.5;
    const baseY = 2.5 + (i % 3) * 2.2;

    const monoGroup = new THREE.Group();
    monoGroup.position.set(Math.cos(ang) * dist, baseY, Math.sin(ang) * dist);
    monoGroup.rotation.y = -ang;

    const rockBase = new THREE.Mesh(new THREE.ConeGeometry(1.85, 3.8, 7), voidSlateMat);
    rockBase.rotation.x = Math.PI;
    rockBase.position.y = -1.9;
    monoGroup.add(rockBase);

    const obeliskBody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.15, 5.2, 6), astralMarbleMat);
    obeliskBody.position.y = 2.6;
    monoGroup.add(obeliskBody);

    const obeliskTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.6, 6),
      i % 2 === 0 ? cyanRuneMat : violetCrystalMat
    );
    obeliskTip.position.y = 6.0;
    monoGroup.add(obeliskTip);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 8, 32), celestialBrassMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 4.2;
    monoGroup.add(halo);

    group.add(monoGroup);
    floatingNodes.push({ mesh: monoGroup, baseY, phase: i * 1.1, speed: 0.75 });
  }

  // 4. Colossal Ringed Gas-Giant Planet & Crescent Moons on the Horizon
  const planetGroup = new THREE.Group();
  planetGroup.position.set(-28, 21, -52);
  planetGroup.rotation.set(0.28, 0.35, -0.32);

  const planetMat = new THREE.MeshStandardMaterial({
    color: 0x6d28d9,
    roughness: 0.55,
    metalness: 0.12,
    emissive: 0x2e1065,
    emissiveIntensity: 0.65
  });
  const planetSphere = new THREE.Mesh(new THREE.SphereGeometry(8.6, 36, 28), planetMat);
  planetGroup.add(planetSphere);

  const ringInner = new THREE.Mesh(
    new THREE.RingGeometry(11.2, 15.6, 64),
    new THREE.MeshBasicMaterial({
      color: 0xe9d5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.62
    })
  );
  ringInner.rotation.x = Math.PI / 2;
  planetGroup.add(ringInner);

  const ringOuter = new THREE.Mesh(
    new THREE.RingGeometry(16.4, 19.2, 64),
    new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42
    })
  );
  ringOuter.rotation.x = Math.PI / 2;
  planetGroup.add(ringOuter);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 24, 20),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.35,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45
    })
  );
  moonMesh.position.set(22, 4.5, 6);
  planetGroup.add(moonMesh);

  group.add(planetGroup);

  group.userData = {
    floatingNodes,
    armillaryRings,
    planetGroup
  };

  return group;
}

// ============================================================================
// Realm 2 Builder: Dragon Peak Sky Citadel
// ============================================================================
function createSculptedSkyDragon(scale = 1.0, primaryColor = 0x1e293b, wingColor = 0xd97706, accentColor = 0xffd166) {
  const dragon = new THREE.Group();
  dragon.scale.setScalar(scale);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    roughness: 0.36,
    metalness: 0.35
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: wingColor,
    roughness: 0.42,
    metalness: 0.18,
    emissive: wingColor,
    emissiveIntensity: 0.28,
    side: THREE.DoubleSide
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.22,
    metalness: 0.78,
    emissive: accentColor,
    emissiveIntensity: 0.35
  });

  // Torso & Chest
  const torso = new THREE.Mesh(new THREE.ConeGeometry(0.65, 3.2, 8), bodyMat);
  torso.rotation.x = Math.PI / 2;
  dragon.add(torso);

  // Sinuous Neck & Sculpted Horned Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.45, 1.5, 8), bodyMat);
  neck.position.set(0, 0.45, 1.75);
  neck.rotation.x = Math.PI * 0.32;
  dragon.add(neck);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.15, 6), bodyMat);
  head.position.set(0, 0.85, 2.55);
  head.rotation.x = Math.PI * 0.46;
  dragon.add(head);

  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.85, 6), hornMat);
    horn.position.set(s * 0.24, 1.12, 2.05);
    horn.rotation.set(-Math.PI * 0.38, 0, s * 0.28);
    dragon.add(horn);
  }

  // Long Tapering Tail + Tail Fin
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.38, 3.8, 7), bodyMat);
  tail.position.set(0, -0.1, -3.2);
  tail.rotation.x = -Math.PI / 2;
  dragon.add(tail);

  const tailCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), hornMat);
  tailCrest.scale.set(0.35, 1.0, 1.6);
  tailCrest.position.set(0, -0.1, -5.0);
  dragon.add(tailCrest);

  // Articulated Left & Right Bat-Wings
  const buildWing = (sideSign) => {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(sideSign * 0.45, 0.25, 0.35);

    const sparInner = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.6, 6), hornMat);
    sparInner.position.set(sideSign * 1.25, 0.15, 0.2);
    sparInner.rotation.z = -sideSign * Math.PI * 0.46;
    wingPivot.add(sparInner);

    const sparOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 2.4, 6), hornMat);
    sparOuter.position.set(sideSign * 3.4, 0.05, -0.15);
    sparOuter.rotation.z = -sideSign * Math.PI * 0.52;
    wingPivot.add(sparOuter);

    const membraneShape = new THREE.Shape();
    membraneShape.moveTo(0, 0.4);
    membraneShape.lineTo(sideSign * 2.4, 0.55);
    membraneShape.lineTo(sideSign * 4.6, -0.1);
    membraneShape.lineTo(sideSign * 3.1, -1.35);
    membraneShape.lineTo(sideSign * 1.4, -1.1);
    membraneShape.lineTo(0, -1.2);
    membraneShape.closePath();

    const membrane = new THREE.Mesh(new THREE.ShapeGeometry(membraneShape), wingMat);
    membrane.rotation.x = Math.PI / 2;
    wingPivot.add(membrane);

    return wingPivot;
  };

  const leftWing = buildWing(-1);
  const rightWing = buildWing(1);
  dragon.add(leftWing, rightWing);

  dragon.userData = { leftWing, rightWing };
  return dragon;
}

function buildDragonSkyCitadelGroup() {
  const group = new THREE.Group();
  group.name = 'Realm_DragonSkyCitadel';

  const highlandStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe5dec9,
    roughness: 0.42,
    metalness: 0.08
  });
  const cliffGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x333c4d,
    roughness: 0.76,
    metalness: 0.12
  });
  const sovereignBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    roughness: 0.24,
    metalness: 0.85,
    emissive: 0x3b2304,
    emissiveIntensity: 0.2
  });
  const sunCrystalMat = new THREE.MeshStandardMaterial({
    color: 0xffea9f,
    roughness: 0.15,
    metalness: 0.3,
    emissive: 0xffb703,
    emissiveIntensity: 1.75
  });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.5,
    metalness: 0.05
  });
  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  });

  // 1. Sovereign Highland Fortress Courtyard & Craggy Mountain Peak Foundation
  const courtyardSlab = new THREE.Mesh(new THREE.CylinderGeometry(11.2, 11.8, 0.52, 16), highlandStoneMat);
  courtyardSlab.position.set(0, -0.26, 0);
  courtyardSlab.receiveShadow = true;
  group.add(courtyardSlab);

  const cragPeakBase = new THREE.Mesh(new THREE.ConeGeometry(12.6, 8.5, 12), cliffGraniteMat);
  cragPeakBase.rotation.x = Math.PI;
  cragPeakBase.position.set(0, -4.5, 0);
  group.add(cragPeakBase);

  const compassRing = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.08, 10, 64), sovereignBronzeMat);
  compassRing.rotation.x = Math.PI / 2;
  compassRing.position.y = 0.01;
  group.add(compassRing);

  // 2. Six Carved Dragon-Prow Watchtowers & Pointed Sky-Arches Around the Courtyard
  const spireCount = 6;
  for (let i = 0; i < spireCount; i++) {
    const ang = (i / spireCount) * Math.PI * 2 + Math.PI / 6;
    const r = 10.6;
    const spire = new THREE.Group();
    spire.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    spire.rotation.y = -ang;

    const basePed = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.92, 1.2, 8), cliffGraniteMat);
    basePed.position.y = 0.6;
    spire.add(basePed);

    const towerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.72, 4.2, 8), highlandStoneMat);
    towerShaft.position.y = 3.3;
    spire.add(towerShaft);

    const spireRoof = new THREE.Mesh(new THREE.ConeGeometry(0.78, 2.2, 8), sovereignBronzeMat);
    spireRoof.position.y = 6.5;
    spire.add(spireRoof);

    // Sculpted Dragon-Prow Gargoyle jutting outward & inward
    const prowNeck = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.3, 6), sovereignBronzeMat);
    prowNeck.position.set(-0.65, 4.6, 0);
    prowNeck.rotation.z = Math.PI * 0.35;
    spire.add(prowNeck);

    // Glowing Sun-Beacon Lantern suspended from the spire
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), sunCrystalMat);
    beacon.position.set(-0.95, 4.05, 0);
    spire.add(beacon);

    group.add(spire);
  }

  // 3. Six Distant Floating Mountain Peaks with Snow Caps & Cascading Waterfalls
  const waterfallStrips = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.32;
    const dist = 34.0 + (i % 2) * 9.0;
    const peakH = 15.0 + (i % 3) * 4.5;

    const peakGroup = new THREE.Group();
    peakGroup.position.set(Math.cos(ang) * dist, -4.5, Math.sin(ang) * dist);
    peakGroup.rotation.y = -ang + Math.PI;

    const mainPeak = new THREE.Mesh(new THREE.ConeGeometry(6.8, peakH, 7), cliffGraniteMat);
    mainPeak.position.y = peakH * 0.5;
    peakGroup.add(mainPeak);

    const underRoot = new THREE.Mesh(new THREE.ConeGeometry(5.8, peakH * 0.65, 7), cliffGraniteMat);
    underRoot.rotation.x = Math.PI;
    underRoot.position.y = -peakH * 0.32;
    peakGroup.add(underRoot);

    const snowCap = new THREE.Mesh(new THREE.ConeGeometry(3.2, peakH * 0.42, 7), snowCapMat);
    snowCap.position.y = peakH * 0.81;
    peakGroup.add(snowCap);

    // Temple Sanctuary Spire on top of alternating peaks
    if (i % 2 === 0) {
      const shrine = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.85, 2.8, 6), highlandStoneMat);
      shrine.position.y = peakH + 1.1;
      peakGroup.add(shrine);
      const shrineRoof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.8, 6), sovereignBronzeMat);
      shrineRoof.position.y = peakH + 3.4;
      peakGroup.add(shrineRoof);
    }

    // Cascading Waterfall Ribbon pouring into the Sea of Clouds
    const wfMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 10.5), waterfallMat);
    wfMesh.position.set(0, 2.8, 3.6);
    wfMesh.rotation.x = -0.18;
    peakGroup.add(wfMesh);
    waterfallStrips.push(wfMesh);

    group.add(peakGroup);
  }

  // 4. Three Majestic Soaring Dragons Gliding in High Thermal Orbits
  const soaringDragons = [
    {
      mesh: createSculptedSkyDragon(1.15, 0x1e293b, 0xd97706, 0xffd166),
      orbitR: 23.5,
      baseY: 9.8,
      speed: 0.24,
      phase: 0.0
    },
    {
      mesh: createSculptedSkyDragon(0.95, 0x31102f, 0xe11d48, 0xfbbf24),
      orbitR: 29.0,
      baseY: 13.5,
      speed: -0.19,
      phase: 2.2
    },
    {
      mesh: createSculptedSkyDragon(1.30, 0x0f172a, 0x0284c7, 0x38bdf8),
      orbitR: 35.0,
      baseY: 16.2,
      speed: 0.16,
      phase: 4.3
    }
  ];

  for (const d of soaringDragons) {
    group.add(d.mesh);
  }

  group.userData = {
    soaringDragons,
    waterfallStrips
  };

  return group;
}

// ============================================================================
// Realm 3 Builder: Volcanic Titan Forge
// ============================================================================
function buildVolcanicTitanForgeGroup() {
  const group = new THREE.Group();
  group.name = 'Realm_VolcanicTitanForge';

  const charredBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x1a1415,
    roughness: 0.62,
    metalness: 0.28
  });
  const titanIronMat = new THREE.MeshStandardMaterial({
    color: 0x2b2d38,
    roughness: 0.34,
    metalness: 0.86
  });
  const moltenMagmaMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    roughness: 0.18,
    metalness: 0.1,
    emissive: 0xff4800,
    emissiveIntensity: 2.25
  });
  const forgeBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xc25e00,
    roughness: 0.28,
    metalness: 0.82,
    emissive: 0x5c1900,
    emissiveIntensity: 0.45
  });

  // 1. Heavy Octagonal Suspended Basalt & Forged-Iron Caldera Platform
  const anvilDeck = new THREE.Mesh(new THREE.CylinderGeometry(11.0, 9.6, 1.35, 8), charredBasaltMat);
  anvilDeck.position.set(0, -0.68, 0);
  anvilDeck.receiveShadow = true;
  group.add(anvilDeck);

  const ironRim = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.26, 8, 8), titanIronMat);
  ironRim.rotation.x = Math.PI / 2;
  ironRim.position.y = -0.05;
  group.add(ironRim);

  // 8 Radial Glowing Magma Conduits inlaid across the forge deck
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const channel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 6.2), moltenMagmaMat);
    channel.position.set(Math.cos(ang) * 6.8, -0.005, Math.sin(ang) * 6.8);
    channel.rotation.y = -ang + Math.PI / 2;
    group.add(channel);
  }

  // 2. Four Colossal Titan Anchor Chains & Giant Anvil Towers Pouring Lava Falls
  const lavaFallMeshes = [];
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const dirX = Math.cos(ang);
    const dirZ = Math.sin(ang);

    // Giant Titan Anvil Tower at R = 14.2m
    const towerGroup = new THREE.Group();
    towerGroup.position.set(dirX * 14.2, -3.5, dirZ * 14.2);
    towerGroup.rotation.y = -ang;

    const pillarBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 9.5, 2.8), charredBasaltMat);
    pillarBase.position.y = 4.75;
    towerGroup.add(pillarBase);

    const anvilCrown = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.8, 2.6), titanIronMat);
    anvilCrown.position.y = 10.2;
    towerGroup.add(anvilCrown);

    const magmaSpout = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 1.8), forgeBronzeMat);
    magmaSpout.position.set(0, 8.8, -1.2);
    towerGroup.add(magmaSpout);

    // Vertical Molten Lava Fall pouring from the tower spout into the caldera sea
    const lavaStream = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 9.2, 12), moltenMagmaMat);
    lavaStream.position.set(0, 4.2, -1.65);
    towerGroup.add(lavaStream);
    lavaFallMeshes.push(lavaStream);

    group.add(towerGroup);

    // Colossal Multi-Link Titan Iron Chain stretching from platform rim (R=10.2) up to outer volcano crag (R=34, Y=18)
    const chainLinks = 14;
    for (let k = 0; k < chainLinks; k++) {
      const u = k / (chainLinks - 1);
      const rPos = 10.2 + u * 23.0;
      const yPos = 0.6 + u * 17.5 - Math.sin(u * Math.PI) * 1.4; // Catenary sag
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.18, 8, 18), titanIronMat);
      link.position.set(dirX * rPos, yPos, dirZ * rPos);
      link.rotation.y = -ang;
      link.rotation.x = 0.62 + (k % 2) * (Math.PI / 2);
      group.add(link);
    }

    // Outer Jagged Volcanic Crag Spire anchoring the Titan Chain
    const crag = new THREE.Mesh(new THREE.ConeGeometry(6.5, 26.0, 6), charredBasaltMat);
    crag.position.set(dirX * 36.0, 8.5, dirZ * 36.0);
    group.add(crag);
  }

  // 3. Eight Heat-Levitated Obsidian Slag Monoliths Orbiting the Caldera
  const slagBoulders = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const boulderGroup = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), charredBasaltMat);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), moltenMagmaMat);
    boulderGroup.add(rock, core);

    const orbitR = 20.5 + (i % 2) * 4.0;
    const baseY = 3.2 + (i % 3) * 2.4;
    boulderGroup.position.set(Math.cos(ang) * orbitR, baseY, Math.sin(ang) * orbitR);
    group.add(boulderGroup);
    slagBoulders.push({ mesh: boulderGroup, orbitR, baseY, ang, speed: 0.12 + (i % 3) * 0.04 });
  }

  group.userData = {
    lavaFallMeshes,
    slagBoulders
  };

  return group;
}

// ============================================================================
// GPU Particle Weather System (Stardust, Sun-Motes/Mist, Volcanic Embers)
// ============================================================================
function createWeatherParticleSystem() {
  const count = 420;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 4.2 + Math.random() * 24.0;
    const theta = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = -1.5 + Math.random() * 14.5;
    positions[i * 3 + 2] = Math.sin(theta) * r;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xffd166,
    size: 0.16,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'WorldSceneryWeatherParticles';
  return { points, count, positions, phases, mat };
}

// ============================================================================
// Public World Scenery Manager API
// ============================================================================
export function createWorldSceneryManager(scene) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'WorldSceneriesRoot';
  rootGroup.visible = false;
  scene.add(rootGroup);

  const skyDomeMat = createSkyDomeMaterial();
  const skyDomeMesh = new THREE.Mesh(new THREE.SphereGeometry(92, 40, 28), skyDomeMat);
  skyDomeMesh.renderOrder = -10;
  rootGroup.add(skyDomeMesh);

  const horizonSeaMat = createHorizonSeaMaterial();
  const horizonSeaMesh = new THREE.Mesh(new THREE.PlaneGeometry(176, 176, 64, 64), horizonSeaMat);
  horizonSeaMesh.rotation.x = -Math.PI / 2;
  horizonSeaMesh.position.y = -3.2;
  horizonSeaMesh.renderOrder = -5;
  rootGroup.add(horizonSeaMesh);

  const celestialGroup = buildCelestialObservatoryGroup();
  const dragonCitadelGroup = buildDragonSkyCitadelGroup();
  const titanForgeGroup = buildVolcanicTitanForgeGroup();

  rootGroup.add(celestialGroup, dragonCitadelGroup, titanForgeGroup);

  const weather = createWeatherParticleSystem();
  rootGroup.add(weather.points);

  let activeSceneryId = 'gothic_cathedral';

  function setScenery(sceneryObj) {
    const id = typeof sceneryObj === 'string' ? sceneryObj : sceneryObj?.id || 'gothic_cathedral';
    activeSceneryId = id;

    if (id === 'gothic_cathedral') {
      rootGroup.visible = false;
      return;
    }

    rootGroup.visible = true;
    celestialGroup.visible = id === 'celestial_observatory';
    dragonCitadelGroup.visible = id === 'dragon_sky_citadel';
    titanForgeGroup.visible = id === 'volcanic_titan_forge';

    if (id === 'celestial_observatory') {
      skyDomeMat.uniforms.uMode.value = 0;
      horizonSeaMat.uniforms.uMode.value = 0;
      weather.mat.color.setHex(0x80ffea);
      weather.mat.size = 0.15;
    } else if (id === 'dragon_sky_citadel') {
      skyDomeMat.uniforms.uMode.value = 1;
      horizonSeaMat.uniforms.uMode.value = 1;
      weather.mat.color.setHex(0xffe082);
      weather.mat.size = 0.14;
    } else if (id === 'volcanic_titan_forge') {
      skyDomeMat.uniforms.uMode.value = 2;
      horizonSeaMat.uniforms.uMode.value = 2;
      weather.mat.color.setHex(0xff5400);
      weather.mat.size = 0.18;
    }
  }

  function update(dt, elapsedTotal) {
    if (!rootGroup.visible || activeSceneryId === 'gothic_cathedral') return;

    skyDomeMat.uniforms.uTime.value = elapsedTotal;
    horizonSeaMat.uniforms.uTime.value = elapsedTotal;

    // 1. Animate Celestial Astral Observatory
    if (celestialGroup.visible) {
      const { floatingNodes, armillaryRings, planetGroup } = celestialGroup.userData;
      for (const node of floatingNodes) {
        node.mesh.position.y = node.baseY + Math.sin(elapsedTotal * node.speed + node.phase) * 0.28;
        node.mesh.rotation.y += dt * 0.65;
      }
      for (const ring of armillaryRings) {
        ring.group.rotation.x += dt * ring.speedX;
        ring.group.rotation.y += dt * ring.speedY;
      }
      if (planetGroup) {
        planetGroup.rotation.y += dt * 0.04;
      }
    }

    // 2. Animate Dragon Peak Sky Citadel (Soaring Dragons & Wingbeats)
    if (dragonCitadelGroup.visible) {
      const { soaringDragons, waterfallStrips } = dragonCitadelGroup.userData;
      for (const d of soaringDragons) {
        const theta = elapsedTotal * d.speed + d.phase;
        const nextTheta = theta + (d.speed >= 0 ? 0.05 : -0.05);
        const x = Math.cos(theta) * d.orbitR;
        const z = Math.sin(theta) * d.orbitR;
        const y = d.baseY + Math.sin(elapsedTotal * 1.1 + d.phase) * 1.35;

        d.mesh.position.set(x, y, z);
        d.mesh.lookAt(
          Math.cos(nextTheta) * d.orbitR,
          y + Math.cos(elapsedTotal * 1.1 + d.phase) * 0.15,
          Math.sin(nextTheta) * d.orbitR
        );

        const flap = Math.sin(elapsedTotal * 4.2 + d.phase) * 0.42;
        if (d.mesh.userData.leftWing) d.mesh.userData.leftWing.rotation.z = flap;
        if (d.mesh.userData.rightWing) d.mesh.userData.rightWing.rotation.z = -flap;
      }
      for (let i = 0; i < waterfallStrips.length; i++) {
        waterfallStrips[i].material.opacity = 0.45 + 0.15 * Math.sin(elapsedTotal * 3.5 + i);
      }
    }

    // 3. Animate Volcanic Titan Forge (Orbiting Slag Boulders & Pulsing Lava Falls)
    if (titanForgeGroup.visible) {
      const { lavaFallMeshes, slagBoulders } = titanForgeGroup.userData;
      for (const b of slagBoulders) {
        const a = b.ang + elapsedTotal * b.speed;
        b.mesh.position.x = Math.cos(a) * b.orbitR;
        b.mesh.position.z = Math.sin(a) * b.orbitR;
        b.mesh.position.y = b.baseY + Math.sin(elapsedTotal * 1.6 + b.ang) * 0.42;
        b.mesh.rotation.x += dt * 0.45;
        b.mesh.rotation.y += dt * 0.62;
      }
      for (let i = 0; i < lavaFallMeshes.length; i++) {
        const pulse = 1.85 + 0.45 * Math.sin(elapsedTotal * 4.8 + i * 1.5);
        lavaFallMeshes[i].material.emissiveIntensity = pulse;
      }
    }

    // 4. Animate Particle Weather
    const posArr = weather.positions;
    const phaseArr = weather.phases;
    const isVolcanic = activeSceneryId === 'volcanic_titan_forge';
    const isSkyCitadel = activeSceneryId === 'dragon_sky_citadel';

    for (let i = 0; i < weather.count; i++) {
      const idx = i * 3;
      const ph = phaseArr[i];
      if (isVolcanic) {
        // Fast rising volcanic embers
        posArr[idx + 1] += dt * (1.65 + (i % 5) * 0.25);
        posArr[idx] += Math.sin(elapsedTotal * 2.2 + ph) * dt * 0.45;
        posArr[idx + 2] += Math.cos(elapsedTotal * 1.9 + ph) * dt * 0.45;
        if (posArr[idx + 1] > 14.0) posArr[idx + 1] = -2.0;
      } else if (isSkyCitadel) {
        // Wind-swept sun-motes & alpine mist
        posArr[idx] += dt * 0.85;
        posArr[idx + 1] += Math.sin(elapsedTotal * 1.5 + ph) * dt * 0.22;
        if (posArr[idx] > 24.0) posArr[idx] = -24.0;
      } else {
        // Slowly ascending & orbiting stardust
        posArr[idx + 1] += dt * 0.42;
        posArr[idx] += Math.cos(elapsedTotal * 0.8 + ph) * dt * 0.25;
        if (posArr[idx + 1] > 13.5) posArr[idx + 1] = -1.5;
      }
    }
    weather.points.geometry.attributes.position.needsUpdate = true;
  }

  return {
    setScenery,
    update,
    getActiveSceneryId: () => activeSceneryId
  };
}
