import * as THREE_NS from 'three';
import { mountHalloweenModel, preloadHalloween3DAssets } from './halloweenAssetLoader.js';
import {
  mountCyberCityModel,
  mountFullCyberCityScene,
  preloadCyberCity3DAssets,
  getCyberCityMaterials
} from './cyberCityAssetLoader.js';
import {
  createPolyPizzaWyvern,
  animatePolyPizzaWyvern,
  mountDragonPeakObjAsset,
  preloadDragonPeak3DAssets
} from './dragonPeakAssetLoader.js';
import {
  mountInfernoWorldModel,
  mountFullInfernoWorldScene,
  preloadInfernoWorld3DAssets,
  getInfernoWorldMaterials
} from './infernoWorldAssetLoader.js';

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

        if (uMode == 3) {
          // ------------------------------------------------------------------
          // MODE 3: HAUNTED BLOOD-MOON GRAVEYARD (Crimson Blood Moon & Ecto Fog)
          // ------------------------------------------------------------------
          vec3 zenithNight = vec3(0.025, 0.012, 0.055);
          vec3 midHaunted = vec3(0.11, 0.035, 0.16);
          vec3 horizonBlood = vec3(0.48, 0.08, 0.12);
          vec3 pumpkinAmber = vec3(1.0, 0.43, 0.0);
          vec3 ectoGreen = vec3(0.0, 0.90, 0.46);

          vec3 skyCol = mix(horizonBlood, midHaunted, smoothstep(-0.05, 0.38, y));
          skyCol = mix(skyCol, zenithNight, smoothstep(0.32, 0.88, up));

          // Colossal Crimson-Orange Blood Moon Disk in the Samhain Sky
          vec3 moonDir = normalize(vec3(-0.36, 0.34, -0.86));
          float moonDot = max(0.0, dot(dir, moonDir));
          float moonHalo = pow(moonDot, 6.0);
          float moonDisk = smoothstep(0.986, 0.990, moonDot);
          float moonCrater = fbm(dir * 18.0);
          vec3 moonCol = mix(vec3(0.88, 0.14, 0.06), vec3(1.0, 0.58, 0.14), smoothstep(0.3, 0.75, moonCrater));
          skyCol += mix(vec3(0.85, 0.12, 0.08), pumpkinAmber, 0.45) * moonHalo * 0.65;
          skyCol = mix(skyCol, moonCol, moonDisk);

          // Eerie drifting Samhain cloud wisps & spectral ectoplasm mist ribbons
          vec3 mistCoord = dir * 3.2 + vec3(uTime * 0.022, -uTime * 0.008, uTime * 0.015);
          float m1 = fbm(mistCoord);
          float m2 = fbm(mistCoord * 2.1 - vec3(m1 * 1.3));
          float cloudBand = smoothstep(0.42, 0.78, m1) * (1.0 - smoothstep(0.58, 0.92, up));
          skyCol += mix(vec3(0.36, 0.06, 0.24), pumpkinAmber, smoothstep(0.45, 0.85, m2)) * cloudBand * 0.42;

          // Subtle spectral green ectoplasm aurora near the horizon
          float ectoRibbon = smoothstep(0.64, 0.92, sin(dir.x * 5.0 - dir.z * 4.0 + uTime * 0.5 + m1 * 3.5)) * exp(-abs(y - 0.06) * 8.0);
          skyCol += ectoGreen * ectoRibbon * 0.28;

          // Crisp autumn night stars
          float starVal = smoothstep(0.994, 0.9998, hash3(floor(dir * 230.0))) * (1.0 - moonDisk) * smoothstep(0.08, 0.55, up);
          skyCol += vec3(1.0, 0.88, 0.72) * starVal * 1.25;

          gl_FragColor = vec4(skyCol, 1.0);
          return;
        }

        if (uMode == 4) {
          // ------------------------------------------------------------------
          // MODE 4: FLOATING TOON KINGDOM (Quantized Cel-Shaded Sky & Sunbeams)
          // ------------------------------------------------------------------
          vec3 zenithToonBlue = vec3(0.11, 0.44, 0.72);
          vec3 midToonCyan = vec3(0.28, 0.79, 0.89);
          vec3 lowToonAqua = vec3(0.56, 0.88, 0.94);
          vec3 horizonToonGold = vec3(1.0, 0.85, 0.42);

          // Quantized cel-stepped sky bands with crisp comic transitions
          vec3 skyCol = horizonToonGold;
          skyCol = mix(skyCol, lowToonAqua, smoothstep(0.02, 0.06, up));
          skyCol = mix(skyCol, midToonCyan, smoothstep(0.20, 0.25, up));
          skyCol = mix(skyCol, zenithToonBlue, smoothstep(0.48, 0.54, up));

          // Subtle comic ink band separator lines between sky steps
          float bandEdge1 = exp(-pow((up - 0.04) * 55.0, 2.0));
          float bandEdge2 = exp(-pow((up - 0.225) * 45.0, 2.0));
          float bandEdge3 = exp(-pow((up - 0.51) * 40.0, 2.0));
          skyCol = mix(skyCol, skyCol * 0.82, clamp(bandEdge1 + bandEdge2 + bandEdge3, 0.0, 0.35));

          // Cartoon Sun Disk with Rotating Cel-Shaded Sunbeams & Bold Black Comic Ring
          vec3 sunDir = normalize(vec3(0.42, 0.34, -0.84));
          float sunDot = max(0.0, dot(dir, sunDir));
          float sunAngle = atan(dir.y - sunDir.y, dir.x - sunDir.x);
          float rayWave = step(0.25, sin(sunAngle * 12.0 + uTime * 0.45));
          float rayMask = smoothstep(0.72, 0.985, sunDot) * (1.0 - smoothstep(0.990, 0.994, sunDot));
          skyCol = mix(skyCol, vec3(1.0, 0.94, 0.58), rayWave * rayMask * 0.38);

          // Bold black comic outline ring around the cartoon sun disk
          float sunOutline = smoothstep(0.988, 0.9905, sunDot) * (1.0 - smoothstep(0.9925, 0.9945, sunDot));
          float sunCore = smoothstep(0.993, 0.995, sunDot);
          skyCol = mix(skyCol, vec3(0.02, 0.02, 0.04), sunOutline * 0.95);
          skyCol = mix(skyCol, vec3(1.0, 0.96, 0.42), sunCore);

          // Stylized quantized cel-clouds painted on the distant horizon
          vec3 cCoord = vec3(dir.x * 2.8 + uTime * 0.014, dir.y * 5.0, dir.z * 2.8 - uTime * 0.01);
          float cVal = fbm(cCoord);
          float toonCloudFill = smoothstep(0.56, 0.60, cVal) * smoothstep(0.01, 0.14, up) * (1.0 - smoothstep(0.32, 0.48, up));
          float toonCloudInk = smoothstep(0.52, 0.555, cVal) * (1.0 - smoothstep(0.565, 0.60, cVal)) * smoothstep(0.01, 0.14, up) * (1.0 - smoothstep(0.32, 0.48, up));
          skyCol = mix(skyCol, vec3(1.0, 0.99, 0.94), toonCloudFill * 0.88);
          skyCol = mix(skyCol, vec3(0.02, 0.02, 0.04), toonCloudInk * 0.85);

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
        if (uMode == 1 || uMode == 4) {
          pos.y += wave * (uMode == 4 ? 1.18 : 1.0) * smoothstep(9.0, 22.0, r);
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

        if (uMode == 3) {
          // Mode 3: Swirling Graveyard Ectoplasm & Pumpkin-Ember Mist Sea
          vec2 mistUv = vLocalPos.xz * 0.095 + vec2(uTime * 0.035, -uTime * 0.028);
          float m1 = fbm2(mistUv);
          float m2 = fbm2(mistUv * 2.2 - vec2(uTime * 0.04, uTime * 0.03));
          float fogMask = smoothstep(0.28, 0.76, m1 * 0.6 + m2 * 0.4);

          vec3 cryptViolet = vec3(0.08, 0.03, 0.14);
          vec3 ectoMist = vec3(0.0, 0.78, 0.42);
          vec3 pumpkinGlow = vec3(1.0, 0.45, 0.04);

          vec3 col = mix(cryptViolet, ectoMist * 0.55, smoothstep(0.35, 0.75, m1));
          col = mix(col, pumpkinGlow * 0.75, smoothstep(0.65, 0.92, m2));
          float alpha = radialMask * (0.35 + 0.55 * fogMask);
          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.86));
          return;
        }

        if (uMode == 4) {
          // Mode 4: Quantized Cel-Shaded Cartoon Cloud Sea with Bold Black Comic Ink Contour Lines
          vec2 uv = vLocalPos.xz * 0.075 + vec2(uTime * 0.038, -uTime * 0.026);
          float c1 = fbm2(uv);
          float c2 = fbm2(uv * 2.0 + vec2(c1 * 1.2));
          float crest = clamp(c1 * 0.65 + c2 * 0.35 + vWaveH * 0.24, 0.0, 1.0);

          vec3 toonShadow = vec3(0.42, 0.58, 0.82);
          vec3 toonMid = vec3(0.88, 0.95, 1.0);
          vec3 toonHighlight = vec3(1.0, 0.98, 0.88);
          vec3 comicInk = vec3(0.02, 0.02, 0.04);

          // Quantized 3-step cel bands
          vec3 col = toonShadow;
          col = mix(col, toonMid, smoothstep(0.38, 0.42, crest));
          col = mix(col, toonHighlight, smoothstep(0.64, 0.68, crest));

          // Bold pitch-black comic ink contour lines along cloud billow thresholds
          float inkLine1 = smoothstep(0.35, 0.38, crest) * (1.0 - smoothstep(0.41, 0.44, crest));
          float inkLine2 = smoothstep(0.61, 0.64, crest) * (1.0 - smoothstep(0.67, 0.70, crest));
          col = mix(col, comicInk, clamp(inkLine1 * 0.92 + inkLine2 * 0.75, 0.0, 0.95));

          float alpha = radialMask * smoothstep(0.20, 0.45, crest) * 0.95;
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
// Realm 1 Builder: Futuristic Cyber Metropolis (Niko's Low-Poly Futuristic City 3D Assets)
// ============================================================================
function buildCelestialObservatoryGroup() {
  preloadCyberCity3DAssets();

  const group = new THREE.Group();
  group.name = 'Realm_CelestialObservatory';

  const cyberMats = getCyberCityMaterials();
  const darkGunmetalMat = cyberMats['metalic dark gray'];
  const lightTitaniumMat = cyberMats['metalic light gray'];
  const cyanNeonMat = cyberMats.lights;
  const greenNeonMat = cyberMats.green;

  // 1. Central Cyber Landing Plaza Deck (flush at y = 0.0 so altar & braziers sit cleanly on it)
  const mainDisc = new THREE.Mesh(new THREE.CylinderGeometry(10.8, 11.5, 0.48, 32), darkGunmetalMat);
  mainDisc.position.set(0, -0.24, 0);
  mainDisc.receiveShadow = true;
  group.add(mainDisc);

  const innerTitaniumDeck = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.0, 0.06, 32), lightTitaniumMat);
  innerTitaniumDeck.position.set(0, -0.02, 0);
  innerTitaniumDeck.receiveShadow = true;
  group.add(innerTitaniumDeck);

  // Concentric glowing cyan & neon-green cyber landing-pad rings on the plaza deck
  for (const [idx, rad] of [5.0, 7.1, 8.95, 10.65].entries()) {
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(rad, idx % 2 === 0 ? 0.055 : 0.04, 10, 64),
      idx === 2 ? greenNeonMat : cyanNeonMat
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.01;
    group.add(ringMesh);
  }

  // 2. Mount the Complete 81-Mesh Low-Poly Futuristic City Scene from futuristic_city.fbx
  // Surrounds the central plaza with the actual 3D neon skyscrapers, overpass bridge, roads & landing pads
  mountFullCyberCityScene(group, {
    cityScale: 0.0042,
    plazaCenterFBX: [-576, 79, 4332],
    yOffset: -0.52,
    minClearanceRadius: 11.5
  });

  // 3. Perimeter Cyber Plaza Sectors (R = 10.0m) with Actual Loaded 3D Futuristic City Landmarks:
  //    - 4 Cardinal Holographic Forcefield Checkpoint Gates (`forcefield_gate`: Cube018 + Cube046)
  //    - 4 Diagonal Ribbed Reactor Spire Towers (`reactor_spire_twin`: Cube065 & `neon_beacon_spire`: Cube009)
  //    - Actual 3D Neon Cyber Tables (`Cube037`), Consoles (`Cube038`), Hourglass Pedestals (`Circle001`) & Hover-Ships
  const floatingNodes = [];
  const hoverShipModels = [
    'hover_cruiser',
    'hover_interceptor',
    'hover_shuttle',
    'hover_gunship',
    'hover_recon'
  ];

  const sectorCount = 8;
  for (let i = 0; i < sectorCount; i++) {
    const ang = (i / sectorCount) * Math.PI * 2;
    const r = 9.95;
    const sectorGroup = new THREE.Group();
    sectorGroup.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    sectorGroup.rotation.y = -ang - Math.PI / 2;

    if (i % 2 === 0) {
      // Cardinal Approach: Actual 3D Holographic Forcefield Checkpoint Gate (`Cube018` + `Cube046`)
      mountCyberCityModel(sectorGroup, 'forcefield_gate', {
        scale: 2.15,
        position: [0, 0, 0]
      });

      // Flanking Actual 3D Hourglass Cyber Pedestals (`Circle001`) & Copper Reactor Cells (`Cylinder006`)
      for (const side of [-1, 1]) {
        mountCyberCityModel(sectorGroup, 'cyber_pedestal', {
          scale: 0.92,
          position: [side * 2.45, 0, 0.25]
        });
        mountCyberCityModel(sectorGroup, 'copper_cell_cyl', {
          scale: 0.48,
          position: [side * 2.45, 0.92, 0.25]
        });
      }
    } else {
      // Diagonal Sector: Actual 3D Ribbed Futuristic Reactor Spire (`Cube065`) + Neon Cyber Console (`Cube038`)
      mountCyberCityModel(sectorGroup, 'reactor_spire_twin', {
        scale: 4.35,
        position: [0, 0, -0.45]
      });

      mountCyberCityModel(sectorGroup, 'neon_cyber_console', {
        scale: 1.28,
        position: [-1.65, 0, 0.55],
        rotationY: 0.35
      });

      mountCyberCityModel(sectorGroup, 'neon_cyber_table', {
        scale: 1.35,
        position: [1.65, 0, 0.55],
        rotationY: -0.35
      });

      mountCyberCityModel(sectorGroup, 'cyber_pedestal', {
        scale: 0.68,
        position: [1.65, 0, 1.25]
      });
    }

    // Hovering 3D Futuristic Ship / Drone stationed above each perimeter sector
    const hoverStation = new THREE.Group();
    const baseY = 3.25 + (i % 2) * 1.15;
    hoverStation.position.set(0, baseY, 0.35);
    mountCyberCityModel(hoverStation, hoverShipModels[i % hoverShipModels.length], {
      scale: 2.15,
      position: [0, 0, 0],
      rotationY: Math.PI / 2
    });
    sectorGroup.add(hoverStation);

    floatingNodes.push({
      mesh: hoverStation,
      baseY,
      phase: i * 0.85,
      speed: 1.45 + (i % 3) * 0.2
    });

    group.add(sectorGroup);
  }

  // 4. Eight Patrolling 3D Futuristic Hover-Ships Cruising Through the Aerial Sky-Lanes
  const patrollingShips = [];
  for (let i = 0; i < 8; i++) {
    const shipHolder = new THREE.Group();
    const modelName = hoverShipModels[i % hoverShipModels.length];
    mountCyberCityModel(shipHolder, modelName, {
      scale: 2.95 + (i % 3) * 0.45,
      position: [0, 0, 0]
    });
    group.add(shipHolder);

    patrollingShips.push({
      mesh: shipHolder,
      orbitR: 15.5 + (i % 4) * 4.2,
      baseY: 4.8 + (i % 4) * 2.4,
      speed: (i % 2 === 0 ? 1 : -1) * (0.22 + (i % 3) * 0.05),
      phase: (i / 8) * Math.PI * 2
    });
  }

  group.userData = {
    floatingNodes,
    armillaryRings: [],
    patrollingShips
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

  preloadDragonPeak3DAssets();

  const highlandStoneMat = new THREE.MeshStandardMaterial({
    color: 0xe5dec9,
    roughness: 0.42,
    metalness: 0.08
  });
  const sovereignBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd99b26,
    roughness: 0.24,
    metalness: 0.85,
    emissive: 0x3b2304,
    emissiveIntensity: 0.2
  });
  const waterfallMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide
  });

  // 1. Central Interdimensional Floating Island Foundation (`/assets/dragon_peak/floating_islands.obj`)
  const compassRing = new THREE.Mesh(new THREE.TorusGeometry(4.45, 0.055, 10, 64), sovereignBronzeMat);
  compassRing.rotation.x = Math.PI / 2;
  compassRing.position.y = 0.03;
  group.add(compassRing);

  // Mount the sanitized plateau 3D Interdimensional Floating Island directly beneath the central chess courtyard
  mountDragonPeakObjAsset(group, 'island_006', {
    scale: 12.2,
    position: [0, 0.0, 0],
    rotationY: 0.35,
    flattenTopPlateau: true
  });

  // Scenic props positioned on the flat outer grassy terrace of the central island (leaving front +Z camera view clear)
  const rimConfigs = [
    { key: 'bell_tower', scale: 2.5, r: 7.4, ang: Math.PI * 1.25 },
    { key: 'tree_pine_lod0', scale: 2.4, r: 7.2, ang: Math.PI * 1.48 },
    { key: 'curved_tree_lod0', scale: 2.3, r: 7.3, ang: Math.PI * 1.75 },
    { key: 'rock_1', scale: 1.5, r: 7.5, ang: Math.PI * 1.92 },
    { key: 'tree_generic_lod0', scale: 2.2, r: 7.2, ang: Math.PI * 0.12 },
    { key: 'tree_pine_lod0', scale: 2.3, r: 7.3, ang: Math.PI * 0.88 },
    { key: 'rock_2', scale: 1.5, r: 7.5, ang: Math.PI * 1.05 }
  ];
  for (const rc of rimConfigs) {
    mountDragonPeakObjAsset(group, rc.key, {
      scale: rc.scale,
      position: [Math.cos(rc.ang) * rc.r, -0.02, Math.sin(rc.ang) * rc.r],
      rotationY: -rc.ang + Math.PI * 0.5
    });
  }

  // 2. Surrounding Interdimensional Floating Islands (`island`, `island_002`, `island_003`, `island_004`, `island_006`)
  const islandVariants = ['island_002', 'island_003', 'island', 'island_006', 'island_004', 'island_002', 'island_003', 'island'];
  const buildingVariants = ['bell_tower', 'mill', 'house_1', 'inn', 'house_2', 'bell_tower', 'mill', 'house_1'];
  const treeVariants = ['tree_pine_lod0', 'curved_tree_lod0', 'tree_generic_lod0'];
  const waterfallStrips = [];
  const floatingIslands = [];

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.32;
    const dist = 34.0 + (i % 2) * 8.0;
    const baseY = -2.0 + (i % 3) * 1.6;
    const islandScale = 4.5 + (i % 3) * 0.85;

    const peakGroup = new THREE.Group();
    peakGroup.position.set(Math.cos(ang) * dist, baseY, Math.sin(ang) * dist);
    peakGroup.rotation.y = -ang + Math.PI;

    // 3D Interdimensional Floating Island OBJ mesh (with flattened top plateau so buildings & trees sit flush)
    mountDragonPeakObjAsset(peakGroup, islandVariants[i % islandVariants.length], {
      scale: islandScale,
      position: [0, 0, 0],
      rotationY: i * 0.8,
      flattenTopPlateau: true
    });

    // Sanctuary building on the floating island plateau
    mountDragonPeakObjAsset(peakGroup, buildingVariants[i % buildingVariants.length], {
      scale: islandScale * 0.46,
      position: [0, 0, 0],
      rotationY: 0.35
    });

    // Low-poly trees & rock pillars flanking the island plateau
    mountDragonPeakObjAsset(peakGroup, treeVariants[i % treeVariants.length], {
      scale: islandScale * 0.40,
      position: [-islandScale * 0.36, 0, islandScale * 0.22],
      rotationY: i * 1.3
    });
    mountDragonPeakObjAsset(peakGroup, treeVariants[(i + 1) % treeVariants.length], {
      scale: islandScale * 0.35,
      position: [islandScale * 0.35, 0, -islandScale * 0.22],
      rotationY: i * 2.1
    });
    mountDragonPeakObjAsset(peakGroup, i % 2 === 0 ? 'rock_pillar_1' : 'rock_1', {
      scale: islandScale * 0.26,
      position: [islandScale * 0.26, 0, islandScale * 0.30],
      rotationY: i * 0.9
    });

    // Floating Low-Poly Cloud from the Interdimensional Floating Islands pack
    mountDragonPeakObjAsset(peakGroup, i % 2 === 0 ? 'cloud' : 'cloud_001', {
      scale: islandScale * 0.52,
      position: [0, islandScale * 0.65, -islandScale * 0.35],
      rotationY: i * 0.6
    });

    // Cascading Waterfall Ribbon pouring from the floating island into the Sea of Clouds
    const wfMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 7.5), waterfallMat);
    wfMesh.position.set(0, -3.6, islandScale * 0.55);
    wfMesh.rotation.x = -0.12;
    peakGroup.add(wfMesh);
    waterfallStrips.push(wfMesh);

    group.add(peakGroup);
    floatingIslands.push({
      mesh: peakGroup,
      baseY,
      speed: 0.55 + (i % 3) * 0.15,
      phase: i * 0.95
    });
  }

  // 3. Three Majestic Soaring Wyverns (`https://poly.pizza/m/WIOTISRjeX` `/assets/dragon_peak/wyvern.obj`)
  const soaringDragons = [
    {
      mesh: createPolyPizzaWyvern(0.92, 0x1e293b, 0xd97706, 0xffd166),
      orbitR: 15.5,
      baseY: 5.8,
      speed: 0.28,
      phase: 0.0
    },
    {
      mesh: createPolyPizzaWyvern(0.84, 0x31102f, 0xe11d48, 0xfbbf24),
      orbitR: 20.5,
      baseY: 8.2,
      speed: -0.22,
      phase: 2.2
    },
    {
      mesh: createPolyPizzaWyvern(1.05, 0x0f172a, 0x0284c7, 0x38bdf8),
      orbitR: 25.5,
      baseY: 10.8,
      speed: 0.18,
      phase: 4.3
    }
  ];

  for (const d of soaringDragons) {
    group.add(d.mesh);
  }

  group.userData = {
    soaringDragons,
    waterfallStrips,
    floatingIslands
  };

  return group;
}

// ============================================================================
// Realm 3 Builder: Volcanic Titan Forge ("Inferno World Free" 76-Asset Pack)
// Source: https://www.cgtrader.com/free-3d-models/exterior/historic-exterior/inferno-world-free
// ============================================================================
function buildVolcanicTitanForgeGroup() {
  preloadInfernoWorld3DAssets();

  const group = new THREE.Group();
  group.name = 'Realm_VolcanicTitanForge';

  const infernoMats = getInfernoWorldMaterials();
  const forgeGears = [];
  const floatingCrystals = [];
  const orbitingLavaIslands = [];

  // 1. Central Inferno World Ritual Platform Foundation beneath the Chessboard (strictly below y = 0, zero Z-fighting)
  //    - `CirclePlatformSmall_001` (raw height 3.872m -> scale 1.15 = 4.453m height, bottom at y = -4.48 -> top at y = -0.027)
  //    - `PlatformStar_001.002` (raw height 4.94m -> scale 1.55 = 7.657m height, bottom at y = -7.78 -> top at y = -0.12)
  mountInfernoWorldModel(group, 'CirclePlatformSmall_001', {
    scale: 1.15,
    position: [0, -4.48, 0]
  });

  mountInfernoWorldModel(group, 'PlatformStar_001.002', {
    scale: 1.55,
    position: [0, -7.78, 0],
    rotationY: Math.PI / 4
  });

  // 2. Mount the Complete 288-Node Official "Inferno World Free" Volcanic Island & Mountain Caldera Scene
  //    (`Platform_003`, `PlatformStar_001`, `StatueKnight_002`, `Axe_001`, `PedestalBig_001`, `WellSmall_001`,
  //     `Bone_003..006`, `Gear_001..002`, `ChestBig_001`, `Brazier_002..004`, `ColumnBig_001`, `StairsMiddle_001`,
  //     `Crag_001..003`, `RockBig_001..004`, `RockMid_001..004`, `Stone_001..006`, `Grass_001..004`, `Cliff_003..005`)
  mountFullInfernoWorldScene(group, {
    sceneScale: 0.28,
    plazaCenter: [0.0, 15.22, -2.0],
    yOffset: -0.04,
    minClearanceRadius: 10.4,
    animatedGearsOut: forgeGears
  });

  // 3. Eight Perimeter Inferno Sanctuary Sectors (R = 10.6m) Showcasing All Key Modular Assets from the 76-Asset Pack:
  //    - Cardinal Sectors (i % 2 === 0): Carved Stone Stairs (`StairsMiddle_001`), Obsidian Pillars (`ColumnBig_001`,
  //      `ColumnBigBroken_001`, `ColumnBigBroken_002`), Lit Lava Braziers (`Brazier_002` + `Coal_002` + `Spike_001`
  //      on `Pedestal_001`, `Brazier_004`), Vases (`Vase_001`, `Vase_002`), Chalices (`Cup_001`, `Cup_002`) & Gold Piles
  //    - Diagonal Sectors (i % 2 === 1):
  //      * Sectors 1 & 5: Fantasy Inferno Towers (`TowerBig_001`), Rotating Forge Gears (`Gear_001`, `Gear_002`),
  //        Open Treasure Chests (`ChestBig_001` + `Lid_002` + `GoldPile_002`), Crates (`Box_001`) & Gold Hoards (`GoldPileBig_001`)
  //      * Sectors 3 & 7: Horned Warrior Knight Statues (`StatueKnight_002`) & Giant Battle Axe Monuments (`Axe_001`)
  //        on `PedestalBig_001`, Molten Lava Wells (`WellSmall_001`) ringed by Giant Demon Bones (`Bone_003`, `Bone_004`, `Bone_006`)
  const gemVariants = ['Gem_001', 'Gem_002', 'Gem_003', 'Gem_004', 'Gem_005'];
  const stoneVariants = ['Stone_001', 'Stone_002', 'Stone_003', 'Stone_004', 'Stone_005', 'Stone_006'];

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const r = 10.65;
    const sectorGroup = new THREE.Group();
    sectorGroup.position.set(Math.cos(ang) * r, -0.08, Math.sin(ang) * r);
    sectorGroup.rotation.y = -ang - Math.PI / 2;

    // Stepping stones (`Stone_001`..`Stone_006`) & scorched tufts (`Grass_001`..`Grass_004`) along perimeter rim
    mountInfernoWorldModel(sectorGroup, stoneVariants[i % stoneVariants.length], {
      scale: 0.34,
      position: [0, -0.04, 0.75]
    });
    mountInfernoWorldModel(sectorGroup, `Grass_00${(i % 4) + 1}`, {
      scale: 0.36,
      position: [-1.85, -0.02, 0.55],
      rotationY: i * 0.9
    });

    if (i % 2 === 0) {
      // Cardinal Sector: Carved Stone Staircase (`StairsMiddle_001`) + Flanking Obsidian Columns & Lit Braziers
      mountInfernoWorldModel(sectorGroup, 'StairsMiddle_001', {
        scale: 0.28,
        position: [0, -0.85, -0.45]
      });

      for (const side of [-1, 1]) {
        // Pedestal + Lit Brazier (`Brazier_002` includes `Coal_002.007` and `Spike_001.008`)
        mountInfernoWorldModel(sectorGroup, 'Pedestal_001', {
          scale: 0.36,
          position: [side * 2.25, 0, 0.25]
        });
        mountInfernoWorldModel(sectorGroup, 'Brazier_002', {
          scale: 0.42,
          position: [side * 2.25, 0.36, 0.25]
        });

        // Flanking Obsidian Columns (`ColumnBig_001` / `ColumnBigBroken_001` / `ColumnBigBroken_002`)
        const colName =
          side === -1
            ? 'ColumnBig_001'
            : i === 0 || i === 4
              ? 'ColumnBigBroken_001'
              : 'ColumnBigBroken_002';
        mountInfernoWorldModel(sectorGroup, colName, {
          scale: 0.34,
          position: [side * 3.45, 0, -0.35],
          rotationY: side * 0.4
        });
      }

      // Floor Brazier (`Brazier_004`), Ritual Vases (`Vase_001`, `Vase_002`), Chalices (`Cup_001`, `Cup_002`) & Gold Coins
      mountInfernoWorldModel(sectorGroup, 'Brazier_004', {
        scale: 0.38,
        position: [-1.35, 0, 0.65]
      });
      mountInfernoWorldModel(sectorGroup, i % 4 === 0 ? 'Vase_001' : 'Vase_002', {
        scale: 0.48,
        position: [1.35, 0, 0.65]
      });
      mountInfernoWorldModel(sectorGroup, i % 4 === 0 ? 'Cup_001' : 'Cup_002', {
        scale: 0.65,
        position: [1.75, 0, 0.82]
      });
      mountInfernoWorldModel(sectorGroup, 'GoldPileSmall_001', {
        scale: 0.45,
        position: [1.45, 0, 0.95]
      });
      mountInfernoWorldModel(sectorGroup, 'Coin_001', {
        scale: 0.85,
        position: [1.15, 0.04, 0.98]
      });
    } else if (i === 1 || i === 5) {
      // Diagonal Sector (1 & 5): Dark-Fantasy Inferno Tower (`TowerBig_001`), Rotating Forge Gears (`Gear_001`, `Gear_002`) & Treasure Chest
      mountInfernoWorldModel(sectorGroup, 'BaseSmall_001', {
        scale: 0.48,
        position: [0, -0.45, -2.1]
      });
      mountInfernoWorldModel(sectorGroup, 'TowerBig_001', {
        scale: 0.25,
        position: [0, 0.15, -2.1]
      });

      // Rotating Heavy Iron Forge Gears (`Gear_001` & `Gear_002`) mounted on the tower flanks
      const gear1Holder = mountInfernoWorldModel(sectorGroup, 'Gear_001', {
        scale: 0.26,
        position: [-2.35, 1.35, -1.25],
        normMode: 'origin'
      });
      const gear2Holder = mountInfernoWorldModel(sectorGroup, 'Gear_002', {
        scale: 0.28,
        position: [2.35, 1.65, -1.25],
        normMode: 'origin'
      });
      forgeGears.push(
        { mesh: gear1Holder, speed: 0.55 },
        { mesh: gear2Holder, speed: -0.78 }
      );

      // Open Treasure Chest (`ChestBig_001` includes `Lid_002` + `GoldPile_002`), `Box_001` & `GoldPileBig_001`
      mountInfernoWorldModel(sectorGroup, 'ChestBig_001', {
        scale: 0.46,
        position: [-1.45, 0, 0.35],
        rotationY: 0.32
      });
      mountInfernoWorldModel(sectorGroup, 'GoldPileBig_001', {
        scale: 0.44,
        position: [-0.45, 0, 0.55]
      });
      mountInfernoWorldModel(sectorGroup, 'Box_001', {
        scale: 0.48,
        position: [1.55, 0, 0.35],
        rotationY: -0.42
      });
      mountInfernoWorldModel(sectorGroup, 'Vase_001', {
        scale: 0.48,
        position: [2.25, 0, 0.55]
      });
    } else {
      // Diagonal Sector (3 & 7): Colossal Horned Warrior Statue (`StatueKnight_002`), Giant Battle Axe (`Axe_001`),
      // Molten Lava Well (`WellSmall_001`) & Giant Demon Bones (`Bone_003`, `Bone_004`, `Bone_006`)
      mountInfernoWorldModel(sectorGroup, 'PedestalBig_001', {
        scale: 0.22,
        position: [0, -0.25, -2.55]
      });
      mountInfernoWorldModel(sectorGroup, 'StatueKnight_002', {
        scale: 0.22,
        position: [0, 1.05, -2.55]
      });
      mountInfernoWorldModel(sectorGroup, 'Axe_001', {
        scale: 0.22,
        position: [2.15, 2.35, -1.85],
        rotation: [0.15, 0.35, -0.28]
      });

      // Molten Lava Well (`WellSmall_001`) in front of the Warrior Statue
      mountInfernoWorldModel(sectorGroup, 'WellSmall_001', {
        scale: 0.38,
        position: [0, 0, 0.45]
      });

      // Giant Curved Demon Ribs / Teeth (`Bone_003`, `Bone_004`, `Bone_006`) & Volcanic Mounds (`Mound_005`, `Mound_008`)
      mountInfernoWorldModel(sectorGroup, 'Bone_006', {
        scale: 0.34,
        position: [-2.45, -0.1, -0.25],
        rotationY: 0.45
      });
      mountInfernoWorldModel(sectorGroup, 'Bone_003', {
        scale: 0.32,
        position: [2.45, -0.1, -0.25],
        rotationY: -0.45
      });
      mountInfernoWorldModel(sectorGroup, 'Bone_004', {
        scale: 0.32,
        position: [1.85, -0.1, 0.75],
        rotationY: -0.85
      });
      mountInfernoWorldModel(sectorGroup, i === 3 ? 'Mound_005' : 'Mound_008', {
        scale: 0.36,
        position: [-1.85, -0.05, 0.75]
      });
    }

    // Hovering Glowing Inferno Crystal (`Gem_001`..`Gem_005`) levitating above each sector
    const crystalStation = new THREE.Group();
    const baseY = 2.65 + (i % 2) * 0.85;
    crystalStation.position.set(0, baseY, 0.55);
    mountInfernoWorldModel(crystalStation, gemVariants[i % gemVariants.length], {
      scale: 2.35,
      position: [0, 0, 0],
      overrideMaterial: infernoMats.Emission
    });
    sectorGroup.add(crystalStation);

    floatingCrystals.push({
      mesh: crystalStation,
      baseY,
      phase: i * 0.85,
      speed: 1.55 + (i % 3) * 0.22
    });

    group.add(sectorGroup);
  }

  // 4. Eight Floating Volcanic Lava Platforms & Crag Spires Orbiting the Caldera
  const floatingPlatformVariants = [
    'PlatformSmall_001',
    'PlatformSmall_002',
    'PlatformSmall_003',
    'PlatformSmall_004'
  ];
  const cragVariants = [
    'Crag_001',
    'Crag_003',
    'RockBig_001',
    'RockBig_003',
    'RockBig_004',
    'RockMid_001',
    'RockMid_002',
    'RockMid_003'
  ];

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.38;
    const islandHolder = new THREE.Group();

    mountInfernoWorldModel(
      islandHolder,
      floatingPlatformVariants[i % floatingPlatformVariants.length],
      {
        scale: 0.14,
        position: [0, -0.6, 0],
        rotationY: i * 0.9
      }
    );

    mountInfernoWorldModel(islandHolder, cragVariants[i % cragVariants.length], {
      scale: 0.16,
      position: [0, 0.05, 0],
      rotationY: i * 1.4
    });

    // Glowing crystal shard (`Gem_001`..`Gem_005`) embedded on the floating lava platform
    mountInfernoWorldModel(islandHolder, gemVariants[(i + 2) % gemVariants.length], {
      scale: 2.6,
      position: [0.85, 0.45, 0.35],
      overrideMaterial: infernoMats.Emission
    });

    const orbitR = 21.5 + (i % 2) * 4.5;
    const baseY = 1.8 + (i % 3) * 1.9;
    islandHolder.position.set(Math.cos(ang) * orbitR, baseY, Math.sin(ang) * orbitR);
    group.add(islandHolder);

    orbitingLavaIslands.push({
      mesh: islandHolder,
      orbitR,
      baseY,
      ang,
      speed: (i % 2 === 0 ? 1 : -1) * (0.06 + (i % 3) * 0.02)
    });
  }

  group.userData = {
    forgeGears,
    floatingCrystals,
    orbitingLavaIslands
  };

  return group;
}

// ============================================================================
// Realm 4 Builder: Haunted Blood-Moon Graveyard (Halloween Samhain Realm)
// Enriched with Cozy Cartoon Halloween 3D Asset Pack props:
// Crooked Haunted Houses, Bubbling Witch Cauldrons, Floating Sheet Ghosts,
// Pumpkin Scarecrows, Coffins, Skull Candles, Potion Bottles, Candy & Cobwebs
// ============================================================================
function buildHauntedBloodGraveyardGroup() {
  preloadHalloween3DAssets();

  const group = new THREE.Group();
  group.name = 'Realm_HauntedBloodGraveyard';

  const cryptSlateMat = new THREE.MeshStandardMaterial({
    color: 0x1a1524,
    roughness: 0.68,
    metalness: 0.22
  });
  const pumpkinShellMat = new THREE.MeshStandardMaterial({
    color: 0xff6d00,
    roughness: 0.38,
    metalness: 0.15,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.55
  });
  const ectoCrystalMat = new THREE.MeshStandardMaterial({
    color: 0x00e676,
    roughness: 0.2,
    metalness: 0.3,
    emissive: 0x00e676,
    emissiveIntensity: 1.85
  });
  const potionMagentaMat = new THREE.MeshStandardMaterial({
    color: 0xd946ef,
    roughness: 0.15,
    metalness: 0.2,
    emissive: 0xc026d3,
    emissiveIntensity: 1.35
  });

  // 1. Cracked Cobblestone Cemetery Courtyard Platform
  const cemeteryDeck = new THREE.Mesh(new THREE.CylinderGeometry(11.0, 11.8, 0.54, 16), cryptSlateMat);
  cemeteryDeck.position.set(0, -0.27, 0);
  cemeteryDeck.receiveShadow = true;
  group.add(cemeteryDeck);

  // Glowing Samhain Hexagram & Ecto Rune Ring on the cemetery floor
  const samhainRing = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.065, 10, 64), pumpkinShellMat);
  samhainRing.rotation.x = Math.PI / 2;
  samhainRing.position.y = 0.01;
  group.add(samhainRing);

  const ectoOuterRing = new THREE.Mesh(new THREE.TorusGeometry(9.6, 0.045, 10, 64), ectoCrystalMat);
  ectoOuterRing.rotation.x = Math.PI / 2;
  ectoOuterRing.position.y = 0.01;
  group.add(ectoOuterRing);

  // Helper: Actual 3D Cauldron GLB + Animated Potion Bubbles + Candle Props
  function buildActualWitchCauldronStation(cauldronBubblesArr) {
    const cGroup = new THREE.Group();

    // Mount actual 3D cauldron.glb model
    mountHalloweenModel(cGroup, 'cauldron', {
      scale: 0.95,
      position: [0, 0, 0]
    });

    // Glowing neon-green witch potion liquid surface inside the 3D cauldron
    const liquidDisc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), ectoCrystalMat);
    liquidDisc.rotation.x = -Math.PI / 2;
    liquidDisc.position.y = 0.88;
    cGroup.add(liquidDisc);

    // 4 Animated rising 3D potion bubbles
    const bGeo = new THREE.SphereGeometry(0.075, 10, 8);
    for (let b = 0; b < 4; b++) {
      const bAng = (b / 4) * Math.PI * 2;
      const bRad = 0.12 + (b % 2) * 0.14;
      const bubble = new THREE.Mesh(bGeo, b % 2 === 0 ? ectoCrystalMat : potionMagentaMat);
      const baseY = 0.90 + (b % 3) * 0.12;
      bubble.position.set(Math.cos(bAng) * bRad, baseY, Math.sin(bAng) * bRad);
      cGroup.add(bubble);
      cauldronBubblesArr.push({
        mesh: bubble,
        baseY: 0.90,
        phase: b * 1.35,
        speed: 1.8 + (b % 2) * 0.45
      });
    }

    // Companion actual 3D triple candles & small pumpkin beside the cauldron
    mountHalloweenModel(cGroup, 'candle_triple', {
      scale: 0.85,
      position: [0.68, 0, 0.25]
    });
    mountHalloweenModel(cGroup, 'pumpkin_orange_small', {
      scale: 0.85,
      position: [-0.62, 0, 0.32],
      rotationY: 0.5
    });

    return cGroup;
  }

  // 2. Perimeter Graveyard Sectors with Actual Loaded 3D GLTF/GLB Halloween Assets
  const floatingPumpkins = [];
  const floatingGhosts = [];
  const cauldronBubbles = [];
  const treeCount = 8;

  for (let i = 0; i < treeCount; i++) {
    const ang = (i / treeCount) * Math.PI * 2 + Math.PI / 8;
    const r = 10.2;
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    nodeGroup.rotation.y = -ang - Math.PI / 2;

    // A. Actual 3D Dead Graveyard Oak Tree (decorated with hanging lanterns on even sectors)
    const treeModelName = i % 2 === 0 ? 'tree_dead_large_decorated' : 'tree_dead_medium';
    mountHalloweenModel(nodeGroup, treeModelName, {
      scale: i % 2 === 0 ? 0.92 : 1.05,
      position: [0, 0, 0],
      rotationY: (i % 3) * 0.4
    });

    // B. Actual 3D Wrought-Iron Cemetery Fence & Pillar flanking each sector
    mountHalloweenModel(nodeGroup, i % 3 === 0 ? 'fence_broken' : 'fence', {
      scale: 0.72,
      position: [2.1, 0, 0.15],
      rotationY: -0.18
    });
    mountHalloweenModel(nodeGroup, 'fence_pillar', {
      scale: 0.82,
      position: [3.55, 0, 0.35]
    });

    // C. Actual 3D Gravestones, Graves, Cross Gravemarkers, Decorated Coffins & Skull Candles
    mountHalloweenModel(nodeGroup, i % 2 === 0 ? 'grave_A' : 'grave_B', {
      scale: 0.78,
      position: [-1.15, 0, 0.85],
      rotationY: 0.25
    });
    mountHalloweenModel(nodeGroup, 'gravestone', {
      scale: 0.82,
      position: [0.95, 0, 0.92],
      rotationY: -0.22
    });
    mountHalloweenModel(nodeGroup, i % 2 === 0 ? 'gravemarker_A' : 'gravemarker_B', {
      scale: 0.85,
      position: [-0.35, 0, 1.35],
      rotationY: 0.15
    });
    mountHalloweenModel(nodeGroup, i % 2 === 0 ? 'coffin_decorated' : 'coffin', {
      scale: 0.62,
      position: [1.35, 0, 0.65],
      rotationY: -0.42
    });
    mountHalloweenModel(nodeGroup, 'skull_candle', {
      scale: 0.55,
      position: [0.95, 1.26, 0.92],
      rotationY: 0.3
    });

    // D. Alternate Actual 3D Bubbling Witch Cauldrons & Gothic Shrines / Lantern Posts
    if (i % 2 === 0) {
      const cauldronStation = buildActualWitchCauldronStation(cauldronBubbles);
      cauldronStation.position.set(-1.55, 0, -0.25);
      nodeGroup.add(cauldronStation);
      mountHalloweenModel(nodeGroup, 'post_skull', {
        scale: 0.85,
        position: [-2.25, 1.12, 0.45],
        rotationY: 0.4
      });
    } else {
      mountHalloweenModel(nodeGroup, 'shrine_candles', {
        scale: 0.85,
        position: [-1.55, 0, -0.25],
        rotationY: 0.35
      });
      mountHalloweenModel(nodeGroup, 'bench_decorated', {
        scale: 0.72,
        position: [1.85, 0, 0.95],
        rotationY: -0.35
      });
      mountHalloweenModel(nodeGroup, 'lantern_standing', {
        scale: 0.88,
        position: [-0.85, 0, 1.45]
      });
    }

    // E. Drifting 3D Skeleton Wraith / Haunted Lantern Spirit patrolling the graveyard ring
    const ghostHolder = new THREE.Group();
    const gBaseY = 0.65 + (i % 3) * 0.35;
    const gRad = 8.1 + (i % 2) * 0.95;
    ghostHolder.position.set(Math.cos(ang + 0.22) * gRad, gBaseY, Math.sin(ang + 0.22) * gRad);
    ghostHolder.lookAt(0, gBaseY, 0);
    mountHalloweenModel(
      ghostHolder,
      i % 2 === 0 ? 'character_skeleton_minion' : 'lantern_hanging',
      {
        scale: i % 2 === 0 ? 0.52 : 0.78,
        position: [0, i % 2 === 0 ? -0.45 : 0.65, 0]
      }
    );
    group.add(ghostHolder);
    floatingGhosts.push({
      mesh: ghostHolder,
      baseAngle: ang + 0.22,
      orbitR: gRad,
      baseY: gBaseY,
      speed: (i % 2 === 0 ? 1 : -1) * 0.22,
      phase: i * 0.95
    });

    // F. Floating Actual 3D Carved Jack-o'-Lantern (`pumpkin_orange_jackolantern.gltf` / `pumpkin_yellow_jackolantern.gltf`)
    const lanternGroup = new THREE.Group();
    const baseY = 2.45 + (i % 3) * 0.42;
    lanternGroup.position.set(-0.55, baseY, 0.75);
    mountHalloweenModel(
      lanternGroup,
      i % 2 === 0 ? 'pumpkin_orange_jackolantern' : 'pumpkin_yellow_jackolantern',
      {
        scale: 0.58,
        position: [0, -0.35, 0]
      }
    );
    nodeGroup.add(lanternGroup);
    floatingPumpkins.push({
      mesh: lanternGroup,
      baseY,
      phase: i * 0.85,
      speed: 1.5 + (i % 3) * 0.25
    });

    group.add(nodeGroup);
  }

  // 2b. Four Grand 3D Haunted Crypt Mausoleums (`crypt.gltf`), Arch Gates (`arch_gate.gltf`) & Autumn Pines on the Outer Hills
  for (let h = 0; h < 4; h++) {
    const hAng = (h / 4) * Math.PI * 2 + Math.PI / 4;
    const hDist = 17.6;
    const cryptCompound = new THREE.Group();
    cryptCompound.position.set(Math.cos(hAng) * hDist, -0.35, Math.sin(hAng) * hDist);
    cryptCompound.lookAt(0, 0.8, 0);

    // Actual 3D Haunted Crypt Building (`crypt.gltf`)
    mountHalloweenModel(cryptCompound, 'crypt', {
      scale: 0.88,
      position: [0, 0, 0]
    });

    // Actual 3D Graveyard Entrance Arch Gate (`arch_gate.gltf`) in front of the crypt
    mountHalloweenModel(cryptCompound, 'arch_gate', {
      scale: 1.05,
      position: [0, 0, 4.2]
    });

    // Actual 3D Halloween Autumn Pine Trees (`tree_pine_orange_large.gltf` & `tree_pine_yellow_large.gltf`) flanking the crypt
    mountHalloweenModel(cryptCompound, 'tree_pine_orange_large', {
      scale: 0.85,
      position: [-4.2, 0, -1.2],
      rotationY: h * 0.7
    });
    mountHalloweenModel(cryptCompound, 'tree_pine_yellow_large', {
      scale: 0.78,
      position: [4.2, 0, -1.0],
      rotationY: -h * 0.6
    });

    // Actual 3D Candle Plaque & Jack-o'-Lanterns at the crypt steps
    mountHalloweenModel(cryptCompound, 'plaque_candles', {
      scale: 0.85,
      position: [-1.6, 0, 3.4]
    });
    mountHalloweenModel(cryptCompound, 'pumpkin_orange_jackolantern', {
      scale: 0.55,
      position: [1.5, 0, 3.6],
      rotationY: -0.35
    });

    group.add(cryptCompound);
  }

  // 3. Six Circling Vampire Bats & Phantom Wraiths in the Blood-Moon Sky
  const circlingBats = [];
  for (let i = 0; i < 6; i++) {
    const batGroup = createSculptedSkyDragon(
      0.58 + (i % 3) * 0.12,
      0x140d1f,
      i % 2 === 0 ? 0xff6d00 : 0x00e676,
      0xffe066
    );
    group.add(batGroup);
    circlingBats.push({
      mesh: batGroup,
      orbitR: 18.5 + (i % 3) * 4.8,
      baseY: 7.5 + (i % 3) * 2.6,
      speed: (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.06),
      phase: i * 1.05
    });
  }

  group.userData = {
    floatingPumpkins,
    floatingGhosts,
    cauldronBubbles,
    circlingBats
  };

  return group;
}

// ============================================================================
// Realm 5 Builder: Cozy Cartoon Parlor Box ('toon_sky_kingdom')
// Isolated enclosed box room matching the default Cathedral Sanctum dimensions
// (X: ±7.0m, Z: ±18.5m, Y: 0..9.45m) with bold pitch-black comic ink outlines,
// cel-shaded timber wainscoting, sunlit cartoon windows, bookcases & chandeliers!
// ============================================================================
function buildToonSkyKingdomGroup() {
  const group = new THREE.Group();
  group.name = 'Realm_ToonSkyKingdom';

  const inkHullMat = new THREE.MeshBasicMaterial({
    color: 0x050508,
    side: THREE.BackSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2
  });

  const inkLineMat = new THREE.MeshBasicMaterial({
    color: 0x09080c
  });

  const makeToonMat = (hex, emissiveHex = hex, emissiveIntensity = 0.14, roughness = 0.44) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: emissiveHex,
      emissiveIntensity,
      roughness,
      metalness: 0.04
    });

  const wallPlasterMat = makeToonMat(0xfff5d6, 0xffd166, 0.16, 0.46);
  const wainscotWoodMat = makeToonMat(0x8c5228, 0x582f0e, 0.12, 0.50);
  const wainscotPanelMat = makeToonMat(0xb06d3b, 0x7f4f24, 0.14, 0.46);
  const floorWoodMat = makeToonMat(0xc98a4b, 0x7f4f24, 0.14, 0.44);
  const floorPlankAltMat = makeToonMat(0xb87638, 0x6b3e1a, 0.12, 0.46);
  const ceilingCreamMat = makeToonMat(0xf7e3b5, 0xd9a05b, 0.15, 0.50);
  const darkTimberMat = makeToonMat(0x5e3417, 0x3b1f0c, 0.10, 0.52);
  const toonGoldMat = makeToonMat(0xffbe0b, 0xfb8500, 0.28, 0.30);
  const rugBerryMat = makeToonMat(0xd6405b, 0x9e1932, 0.18, 0.48);
  const rugCreamMat = makeToonMat(0xfff0c2, 0xffbe0b, 0.18, 0.44);
  const curtainBlueMat = makeToonMat(0x3a86ff, 0x1d4ed8, 0.18, 0.38);
  const curtainRedMat = makeToonMat(0xff4d6d, 0xc9184a, 0.18, 0.38);
  const foliageGreenMat = makeToonMat(0x52b788, 0x2d6a4f, 0.18, 0.44);
  const foliageBrightMat = makeToonMat(0x74c69d, 0x40916c, 0.20, 0.42);
  const potTerracottaMat = makeToonMat(0xd97742, 0x8c421e, 0.14, 0.48);
  const stoneHearthMat = makeToonMat(0xd8cbb8, 0x8c7a65, 0.14, 0.48);

  const windowSkyMat = new THREE.MeshBasicMaterial({ color: 0x72efdd });
  const windowSunMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
  const cloudWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const candleFlameMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const hearthFireOuterMat = new THREE.MeshBasicMaterial({ color: 0xff6d00 });

  const addToonMesh = (parent, geo, mat, hullScale = 1.045, castShadow = false) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = castShadow;
    mesh.raycast = () => {};

    if (hullScale > 1.0) {
      const hull = new THREE.Mesh(geo, inkHullMat);
      hull.scale.setScalar(hullScale);
      hull.castShadow = false;
      hull.receiveShadow = false;
      hull.raycast = () => {};
      mesh.add(hull);
    }

    parent.add(mesh);
    return mesh;
  };

  // Room interior dimensions matching CATHEDRAL_BOUNDS (X: ±6.65, Z: ±18.10, Y: 0..8.85)
  const ROOM_HALF_W = 7.05;
  const ROOM_HALF_L = 18.55;
  const ROOM_H = 9.45;

  // --------------------------------------------------------------------------
  // 1. Enclosed Parlor Floor, Comic Plank Grooves & Cozy Center Parlor Rug
  // --------------------------------------------------------------------------
  const floorSlabGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2 + 0.8, 0.36, ROOM_HALF_L * 2 + 0.8);
  const floorSlab = addToonMesh(group, floorSlabGeo, floorWoodMat, 1.015, false);
  floorSlab.position.set(0, -0.18, 0);
  floorSlab.receiveShadow = true;

  // Alternating cel-shaded floorboards & bold black comic ink seam lines
  const plankStripeGeo = new THREE.BoxGeometry(0.95, 0.012, ROOM_HALF_L * 2);
  const inkSeamZGeo = new THREE.BoxGeometry(0.055, 0.016, ROOM_HALF_L * 2);
  for (let ix = -6; ix <= 6; ix++) {
    const px = ix * 1.08;
    if (Math.abs(ix) % 2 === 1) {
      const plank = new THREE.Mesh(plankStripeGeo, floorPlankAltMat);
      plank.position.set(px, 0.002, 0);
      plank.receiveShadow = true;
      plank.raycast = () => {};
      group.add(plank);
    }
    const seam = new THREE.Mesh(inkSeamZGeo, inkLineMat);
    seam.position.set(px + 0.54, 0.005, 0);
    seam.raycast = () => {};
    group.add(seam);
  }

  // Cross-plank comic joint lines along Z
  const inkSeamXGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2, 0.015, 0.05);
  for (let iz = -8; iz <= 8; iz++) {
    if (iz === 0) continue;
    const crossSeam = new THREE.Mesh(inkSeamXGeo, inkLineMat);
    crossSeam.position.set(0, 0.005, iz * 2.15);
    crossSeam.raycast = () => {};
    group.add(crossSeam);
  }

  // Central Cozy Woven Parlor Rug under the Chessboard Altar (r = 5.15m)
  const outerRugGeo = new THREE.CylinderGeometry(5.15, 5.22, 0.028, 36);
  const outerRug = addToonMesh(group, outerRugGeo, rugBerryMat, 1.025, false);
  outerRug.position.set(0, 0.012, 0);

  const innerRugGeo = new THREE.CylinderGeometry(4.35, 4.40, 0.032, 36);
  const innerRug = addToonMesh(group, innerRugGeo, rugCreamMat, 1.022, false);
  innerRug.position.set(0, 0.016, 0);

  const rugGoldRingGeo = new THREE.TorusGeometry(5.16, 0.075, 10, 48);
  const rugGoldRing = addToonMesh(group, rugGoldRingGeo, toonGoldMat, 1.05, false);
  rugGoldRing.rotation.x = Math.PI / 2;
  rugGoldRing.position.set(0, 0.028, 0);

  // --------------------------------------------------------------------------
  // 2. Four Enclosed Box Walls (West, East, North, South) & Timber Ceiling Box
  // --------------------------------------------------------------------------
  const sideWallGeo = new THREE.BoxGeometry(0.45, ROOM_H, ROOM_HALF_L * 2 + 0.8);
  for (const sx of [-1, 1]) {
    const sideWall = addToonMesh(group, sideWallGeo, wallPlasterMat, 1.015, false);
    sideWall.position.set(sx * (ROOM_HALF_W + 0.22), ROOM_H * 0.5, 0);

    // Lower Honey-Timber Wainscoting along East & West walls
    const wainscotGeo = new THREE.BoxGeometry(0.18, 2.35, ROOM_HALF_L * 2 + 0.2);
    const wainscot = addToonMesh(group, wainscotGeo, wainscotWoodMat, 1.025, false);
    wainscot.position.set(sx * (ROOM_HALF_W - 0.05), 1.175, 0);

    // Golden Chair-Rail Molding & Baseboard Skirting with Black Ink Outlines
    const railGeo = new THREE.BoxGeometry(0.26, 0.18, ROOM_HALF_L * 2 + 0.2);
    const chairRail = addToonMesh(group, railGeo, toonGoldMat, 1.04, false);
    chairRail.position.set(sx * (ROOM_HALF_W - 0.08), 2.38, 0);

    const baseboard = addToonMesh(group, railGeo, darkTimberMat, 1.04, false);
    baseboard.position.set(sx * (ROOM_HALF_W - 0.08), 0.12, 0);

    // Upper Crown Cornice Beam
    const corniceGeo = new THREE.BoxGeometry(0.38, 0.34, ROOM_HALF_L * 2 + 0.2);
    const cornice = addToonMesh(group, corniceGeo, darkTimberMat, 1.035, false);
    cornice.position.set(sx * (ROOM_HALF_W - 0.12), ROOM_H - 0.22, 0);
  }

  const endWallGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2 + 0.8, ROOM_H, 0.45);
  for (const sz of [-1, 1]) {
    const endWall = addToonMesh(group, endWallGeo, wallPlasterMat, 1.015, false);
    endWall.position.set(0, ROOM_H * 0.5, sz * (ROOM_HALF_L + 0.22));

    const endWainscotGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2 + 0.2, 2.35, 0.18);
    const endWainscot = addToonMesh(group, endWainscotGeo, wainscotWoodMat, 1.025, false);
    endWainscot.position.set(0, 1.175, sz * (ROOM_HALF_L - 0.05));

    const endRailGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2 + 0.2, 0.18, 0.26);
    const endRail = addToonMesh(group, endRailGeo, toonGoldMat, 1.04, false);
    endRail.position.set(0, 2.38, sz * (ROOM_HALF_L - 0.08));
  }

  // Enclosed Cartoon Ceiling Lid & Central Timber Ridge Beam
  const ceilingSlabGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2 + 0.9, 0.42, ROOM_HALF_L * 2 + 0.9);
  const ceilingSlab = addToonMesh(group, ceilingSlabGeo, ceilingCreamMat, 1.015, false);
  ceilingSlab.position.set(0, ROOM_H + 0.18, 0);

  const ridgeBeamGeo = new THREE.BoxGeometry(0.48, 0.44, ROOM_HALF_L * 2 + 0.2);
  const ridgeBeam = addToonMesh(group, ridgeBeamGeo, darkTimberMat, 1.04, false);
  ridgeBeam.position.set(0, ROOM_H - 0.18, 0);

  // Cross-Nave Timber Ceiling Rafters & Sloped Eave Braces
  const rafterZPositions = [-16.65, -11.85, -6.85, 0.0, 6.85, 11.85, 16.65];
  const crossRafterGeo = new THREE.BoxGeometry(ROOM_HALF_W * 2, 0.36, 0.38);
  const bossMedallionGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.16, 12);
  for (const rz of rafterZPositions) {
    const rafter = addToonMesh(group, crossRafterGeo, darkTimberMat, 1.04, false);
    rafter.position.set(0, ROOM_H - 0.20, rz);

    const boss = addToonMesh(group, bossMedallionGeo, toonGoldMat, 1.06, false);
    boss.position.set(0, ROOM_H - 0.36, rz);
  }

  // --------------------------------------------------------------------------
  // 3. Twelve Cartoon Timber & Stone Parlor Columns (Matching CATHEDRAL_COLUMN_ROWS)
  // --------------------------------------------------------------------------
  const columnRows = [
    { z: -16.65, xAbs: 4.25 },
    { z: -11.85, xAbs: 4.25 },
    { z: -6.85, xAbs: 4.65 },
    { z: 6.85, xAbs: 4.65 },
    { z: 11.85, xAbs: 4.25 },
    { z: 16.65, xAbs: 4.25 }
  ];

  const colPlinthGeo = new THREE.CylinderGeometry(0.58, 0.66, 0.72, 8);
  const colShaftGeo = new THREE.CylinderGeometry(0.42, 0.46, 7.65, 8);
  const colCapitalGeo = new THREE.CylinderGeometry(0.66, 0.44, 0.56, 8);
  const colGoldBandGeo = new THREE.TorusGeometry(0.46, 0.065, 8, 20);
  const sconceBracketGeo = new THREE.BoxGeometry(0.12, 0.12, 0.38);
  const sconceLanternGeo = new THREE.OctahedronGeometry(0.20, 0);

  for (const row of columnRows) {
    for (const sx of [-1, 1]) {
      const colGroup = new THREE.Group();
      colGroup.position.set(sx * row.xAbs, 0, row.z);

      const plinth = addToonMesh(colGroup, colPlinthGeo, stoneHearthMat, 1.05, false);
      plinth.position.y = 0.36;

      const shaft = addToonMesh(colGroup, colShaftGeo, wainscotWoodMat, 1.045, false);
      shaft.position.y = 4.52;

      const capital = addToonMesh(colGroup, colCapitalGeo, stoneHearthMat, 1.05, false);
      capital.position.y = 8.62;

      for (const by of [0.74, 2.65, 6.45, 8.32]) {
        const band = addToonMesh(colGroup, colGoldBandGeo, toonGoldMat, 1.06, false);
        band.rotation.x = Math.PI / 2;
        band.position.y = by;
      }

      // Cozy Glowing Lantern Sconce facing the center aisle
      const bracket = addToonMesh(colGroup, sconceBracketGeo, darkTimberMat, 1.06, false);
      bracket.position.set(-sx * 0.52, 3.15, 0);
      bracket.rotation.y = Math.PI / 2;

      const lantern = addToonMesh(colGroup, sconceLanternGeo, candleFlameMat, 1.08, false);
      lantern.position.set(-sx * 0.66, 3.32, 0);

      group.add(colGroup);
    }
  }

  // --------------------------------------------------------------------------
  // 4. Sunlit Cartoon Arched Windows with Puffy Clouds & Cozy Curtains (East/West)
  // --------------------------------------------------------------------------
  const winFrameGeo = new THREE.BoxGeometry(0.22, 3.4, 2.25);
  const winPaneGeo = new THREE.BoxGeometry(0.08, 3.0, 1.85);
  const winMullionVGeo = new THREE.BoxGeometry(0.14, 3.05, 0.09);
  const winMullionHGeo = new THREE.BoxGeometry(0.14, 0.09, 1.88);
  const curtainDrapeGeo = new THREE.CylinderGeometry(0.18, 0.28, 3.55, 8);
  const cloudPuffGeo = new THREE.SphereGeometry(0.28, 10, 8);

  const windowZList = [-14.25, -9.35, 0.0, 9.35, 14.25];
  for (const sx of [-1, 1]) {
    for (let wi = 0; wi < windowZList.length; wi++) {
      const wz = windowZList[wi];
      const winGroup = new THREE.Group();
      winGroup.position.set(sx * (ROOM_HALF_W - 0.06), 5.15, wz);

      addToonMesh(winGroup, winFrameGeo, darkTimberMat, 1.045, false);
      const paneMat = wi === 2 ? windowSunMat : windowSkyMat;
      addToonMesh(winGroup, winPaneGeo, paneMat, 1.0, false);

      // Comic window mullions
      addToonMesh(winGroup, winMullionVGeo, darkTimberMat, 1.04, false);
      const hBar = addToonMesh(winGroup, winMullionHGeo, darkTimberMat, 1.04, false);
      hBar.position.y = 0.45;

      // Miniature Puffy Outlined Cartoon Cloud silhouetted inside the window
      const puff1 = addToonMesh(winGroup, cloudPuffGeo, cloudWhiteMat, 1.07, false);
      puff1.position.set(-sx * 0.05, -0.35, -0.22);
      const puff2 = addToonMesh(winGroup, cloudPuffGeo, cloudWhiteMat, 1.07, false);
      puff2.scale.setScalar(0.78);
      puff2.position.set(-sx * 0.05, -0.42, 0.18);

      // Flanking Storybook Curtains
      const cMat = (wi + (sx > 0 ? 1 : 0)) % 2 === 0 ? curtainBlueMat : curtainRedMat;
      for (const cz of [-1.18, 1.18]) {
        const drape = addToonMesh(winGroup, curtainDrapeGeo, cMat, 1.05, false);
        drape.position.set(-sx * 0.12, -0.05, cz);
      }

      group.add(winGroup);
    }
  }

  // --------------------------------------------------------------------------
  // 5. North & South Feature Walls: Storybook Hearth Fireplace + Rose Window & Grand Doors
  // --------------------------------------------------------------------------
  // North Wall (Z = -18.30): Cozy Cartoon Fireplace Hearth & Glowing Rose Window
  const hearthGroup = new THREE.Group();
  hearthGroup.position.set(0, 0, -ROOM_HALF_L + 0.25);

  const chimney = addToonMesh(
    hearthGroup,
    new THREE.BoxGeometry(4.4, 8.8, 0.75),
    stoneHearthMat,
    1.03,
    false
  );
  chimney.position.set(0, 4.4, 0);

  const mantelBeam = addToonMesh(
    hearthGroup,
    new THREE.BoxGeometry(5.1, 0.42, 1.05),
    darkTimberMat,
    1.045,
    false
  );
  mantelBeam.position.set(0, 3.25, 0.15);

  const fireboxVoid = new THREE.Mesh(
    new THREE.BoxGeometry(2.65, 2.45, 0.65),
    inkLineMat
  );
  fireboxVoid.position.set(0, 1.25, 0.16);
  hearthGroup.add(fireboxVoid);

  // Stylized Cel-Shaded Cartoon Hearth Flames
  for (let fi = -1; fi <= 1; fi++) {
    const fCone = addToonMesh(
      hearthGroup,
      new THREE.ConeGeometry(0.42 - Math.abs(fi) * 0.08, 1.25 - Math.abs(fi) * 0.22, 8),
      fi === 0 ? windowSunMat : hearthFireOuterMat,
      1.06,
      false
    );
    fCone.position.set(fi * 0.55, 0.72, 0.35);
  }

  // North Cartoon Rose Window above the Mantel
  const roseRing = addToonMesh(
    hearthGroup,
    new THREE.TorusGeometry(1.75, 0.18, 10, 32),
    toonGoldMat,
    1.05,
    false
  );
  roseRing.position.set(0, 6.25, 0.42);

  const roseDisc = addToonMesh(
    hearthGroup,
    new THREE.CylinderGeometry(1.65, 1.65, 0.10, 24),
    windowSunMat,
    1.0,
    false
  );
  roseDisc.rotation.x = Math.PI / 2;
  roseDisc.position.set(0, 6.25, 0.38);
  group.add(hearthGroup);

  // South Wall (Z = +18.30): Grand Cartoon Double Parlor Doors & Sunlit Fanlight
  const southDoorGroup = new THREE.Group();
  southDoorGroup.position.set(0, 0, ROOM_HALF_L - 0.25);

  const doorFrame = addToonMesh(
    southDoorGroup,
    new THREE.BoxGeometry(3.8, 5.2, 0.48),
    darkTimberMat,
    1.04,
    false
  );
  doorFrame.position.set(0, 2.6, 0);

  const doorLeafGeo = new THREE.BoxGeometry(1.55, 4.65, 0.26);
  const knockerGeo = new THREE.TorusGeometry(0.18, 0.045, 8, 18);
  for (const sx of [-1, 1]) {
    const leaf = addToonMesh(southDoorGroup, doorLeafGeo, wainscotPanelMat, 1.04, false);
    leaf.position.set(sx * 0.82, 2.38, -0.14);

    const knocker = addToonMesh(southDoorGroup, knockerGeo, toonGoldMat, 1.06, false);
    knocker.position.set(sx * 0.36, 2.15, -0.30);
  }

  const southRose = addToonMesh(
    southDoorGroup,
    new THREE.CylinderGeometry(1.55, 1.55, 0.12, 24),
    windowSkyMat,
    1.05,
    false
  );
  southRose.rotation.x = Math.PI / 2;
  southRose.position.set(0, 6.65, -0.18);
  group.add(southDoorGroup);

  // --------------------------------------------------------------------------
  // 6. Cozy Cartoon Parlor Bookcases, Potted Toon Shrubs & Swaying Chandeliers
  // --------------------------------------------------------------------------
  const bookcaseGeo = new THREE.BoxGeometry(0.68, 3.85, 2.35);
  const bookGeo = new THREE.BoxGeometry(0.38, 0.52, 0.18);
  const bookMats = [curtainRedMat, curtainBlueMat, foliageGreenMat, toonGoldMat];

  for (const sx of [-1, 1]) {
    for (const bz of [-4.25, 4.25]) {
      const bcGroup = new THREE.Group();
      bcGroup.position.set(sx * (ROOM_HALF_W - 0.42), 0, bz);

      const caseMesh = addToonMesh(bcGroup, bookcaseGeo, darkTimberMat, 1.045, false);
      caseMesh.position.y = 1.925;

      // Colorful chunky cartoon spellbooks along 3 shelf tiers
      for (let tier = 0; tier < 3; tier++) {
        const sy = 0.95 + tier * 1.05;
        for (let bi = -3; bi <= 3; bi++) {
          const bMat = bookMats[Math.abs(bi + tier) % bookMats.length];
          const book = addToonMesh(bcGroup, bookGeo, bMat, 1.06, false);
          book.position.set(-sx * 0.22, sy, bi * 0.26);
          if (bi === 2) book.rotation.x = 0.22;
        }
      }

      // Potted Cartoon Shrub beside each bookcase
      const pot = addToonMesh(
        bcGroup,
        new THREE.CylinderGeometry(0.34, 0.24, 0.52, 10),
        potTerracottaMat,
        1.06,
        false
      );
      pot.position.set(-sx * 0.15, 0.26, 1.58);

      const bush1 = addToonMesh(
        bcGroup,
        new THREE.DodecahedronGeometry(0.42, 0),
        foliageGreenMat,
        1.06,
        false
      );
      bush1.position.set(-sx * 0.15, 0.72, 1.58);

      const bush2 = addToonMesh(
        bcGroup,
        new THREE.DodecahedronGeometry(0.30, 0),
        foliageBrightMat,
        1.06,
        false
      );
      bush2.position.set(-sx * 0.15, 1.08, 1.58);

      group.add(bcGroup);
    }
  }

  // Two Overhead Storybook Wheel Chandeliers with gentle pendulum sway
  const swayingChandeliers = [];
  const chanWheelGeo = new THREE.TorusGeometry(1.65, 0.12, 10, 28);
  const chanChainGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8);
  const chanCandleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.34, 8);
  const chanFlameGeo = new THREE.ConeGeometry(0.09, 0.24, 7);

  for (const [idx, cz] of [-5.25, 5.25].entries()) {
    const chanPivot = new THREE.Group();
    chanPivot.position.set(0, ROOM_H - 0.25, cz);

    const chain = addToonMesh(chanPivot, chanChainGeo, darkTimberMat, 1.05, false);
    chain.position.y = -1.05;

    const wheel = addToonMesh(chanPivot, chanWheelGeo, toonGoldMat, 1.05, false);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.y = -2.1;

    for (let ci = 0; ci < 8; ci++) {
      const ang = (ci / 8) * Math.PI * 2;
      const cx = Math.cos(ang) * 1.65;
      const czz = Math.sin(ang) * 1.65;
      const candle = addToonMesh(chanPivot, chanCandleGeo, cloudWhiteMat, 1.06, false);
      candle.position.set(cx, -1.90, czz);

      const flame = addToonMesh(chanPivot, chanFlameGeo, candleFlameMat, 1.06, false);
      flame.position.set(cx, -1.62, czz);
    }

    group.add(chanPivot);
    swayingChandeliers.push({
      mesh: chanPivot,
      phase: idx * 1.5,
      speed: 1.15
    });
  }

  // Floating Golden Comic Star-Gems inside the Parlor Atrium
  const floatingParlorStars = [];
  const starGemGeo = new THREE.OctahedronGeometry(0.16, 0);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const rad = 4.8 + (i % 2) * 0.9;
    const baseY = 3.2 + (i % 3) * 1.15;
    const star = addToonMesh(group, starGemGeo, toonGoldMat, 1.08, false);
    star.position.set(Math.cos(ang) * rad, baseY, Math.sin(ang) * (rad * 1.8));
    floatingParlorStars.push({
      mesh: star,
      baseY,
      speed: 1.6 + (i % 3) * 0.25,
      phase: i * 0.75
    });
  }

  group.userData = {
    swayingChandeliers,
    floatingParlorStars
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
  const hauntedGraveyardGroup = buildHauntedBloodGraveyardGroup();
  const toonKingdomGroup = buildToonSkyKingdomGroup();

  rootGroup.add(
    celestialGroup,
    dragonCitadelGroup,
    titanForgeGroup,
    hauntedGraveyardGroup,
    toonKingdomGroup
  );

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
    // Hide open-world sky dome & horizon sea when inside the enclosed Cozy Cartoon Parlor Box
    const isEnclosedCartoonBox = id === 'toon_sky_kingdom';
    skyDomeMesh.visible = !isEnclosedCartoonBox;
    horizonSeaMesh.visible = !isEnclosedCartoonBox;

    celestialGroup.visible = id === 'celestial_observatory';
    dragonCitadelGroup.visible = id === 'dragon_sky_citadel';
    titanForgeGroup.visible = id === 'volcanic_titan_forge';
    hauntedGraveyardGroup.visible = id === 'haunted_blood_graveyard';
    toonKingdomGroup.visible = id === 'toon_sky_kingdom';

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
    } else if (id === 'haunted_blood_graveyard') {
      skyDomeMat.uniforms.uMode.value = 3;
      horizonSeaMat.uniforms.uMode.value = 3;
      weather.mat.color.setHex(0xff6d00);
      weather.mat.size = 0.17;
    } else if (id === 'toon_sky_kingdom') {
      skyDomeMat.uniforms.uMode.value = 4;
      horizonSeaMat.uniforms.uMode.value = 4;
      weather.mat.color.setHex(0xffbe0b);
      weather.mat.size = 0.14;
    }
  }

  function update(dt, elapsedTotal) {
    if (!rootGroup.visible || activeSceneryId === 'gothic_cathedral') return;

    skyDomeMat.uniforms.uTime.value = elapsedTotal;
    horizonSeaMat.uniforms.uTime.value = elapsedTotal;

    // 0. Animate Cozy Cartoon Parlor Box (Swaying Storybook Chandeliers & Bobbing Golden Star-Gems)
    if (toonKingdomGroup.visible) {
      const { swayingChandeliers, floatingParlorStars } = toonKingdomGroup.userData;
      if (swayingChandeliers) {
        for (const ch of swayingChandeliers) {
          ch.mesh.rotation.z = Math.sin(elapsedTotal * ch.speed + ch.phase) * 0.032;
          ch.mesh.rotation.x = Math.cos(elapsedTotal * (ch.speed * 0.8) + ch.phase) * 0.022;
        }
      }
      if (floatingParlorStars) {
        for (const st of floatingParlorStars) {
          st.mesh.position.y = st.baseY + Math.sin(elapsedTotal * st.speed + st.phase) * 0.18;
          st.mesh.rotation.y += dt * 1.1;
        }
      }
    }

    // 1. Animate Futuristic Cyber Metropolis (Hover-Drone Stations & Patrolling 3D Hover-Ships)
    if (celestialGroup.visible) {
      const { floatingNodes, patrollingShips } = celestialGroup.userData;
      if (floatingNodes) {
        for (const node of floatingNodes) {
          node.mesh.position.y = node.baseY + Math.sin(elapsedTotal * node.speed + node.phase) * 0.24;
        }
      }
      if (patrollingShips) {
        for (const ship of patrollingShips) {
          const theta = elapsedTotal * ship.speed + ship.phase;
          const nextTheta = theta + (ship.speed >= 0 ? 0.05 : -0.05);
          const x = Math.cos(theta) * ship.orbitR;
          const z = Math.sin(theta) * ship.orbitR;
          const y = ship.baseY + Math.sin(elapsedTotal * 1.4 + ship.phase) * 0.55;
          ship.mesh.position.set(x, y, z);
          ship.mesh.lookAt(
            Math.cos(nextTheta) * ship.orbitR,
            y + Math.cos(elapsedTotal * 1.4 + ship.phase) * 0.08,
            Math.sin(nextTheta) * ship.orbitR
          );
        }
      }
    }

    // 2. Animate Dragon Peak Sky Citadel (Soaring Wyverns, Bobbing Floating Islands & Waterfalls)
    if (dragonCitadelGroup.visible) {
      const { soaringDragons, waterfallStrips, floatingIslands } = dragonCitadelGroup.userData;
      if (floatingIslands) {
        for (const fi of floatingIslands) {
          fi.mesh.position.y = fi.baseY + Math.sin(elapsedTotal * fi.speed + fi.phase) * 0.45;
        }
      }
      for (const d of soaringDragons) {
        const theta = elapsedTotal * d.speed + d.phase;
        const dtStep = d.speed >= 0 ? 0.04 : -0.04;
        const nextTheta = theta + dtStep;
        const weaveR = d.orbitR + Math.sin(elapsedTotal * 2.4 + d.phase) * 1.15;
        const nextWeaveR = d.orbitR + Math.sin((elapsedTotal + 0.12) * 2.4 + d.phase) * 1.15;
        const x = Math.cos(theta) * weaveR;
        const z = Math.sin(theta) * weaveR;
        const y = d.baseY;

        d.mesh.position.set(x, y, z);
        d.mesh.lookAt(
          Math.cos(nextTheta) * nextWeaveR,
          y,
          Math.sin(nextTheta) * nextWeaveR
        );

        animatePolyPizzaWyvern(d.mesh, elapsedTotal, d.phase);
      }
      for (let i = 0; i < waterfallStrips.length; i++) {
        waterfallStrips[i].material.opacity = 0.45 + 0.15 * Math.sin(elapsedTotal * 3.5 + i);
      }
    }

    // 3. Animate Volcanic Titan Forge ("Inferno World Free" Rotating Forge Gears, Levitating Crystals & Orbiting Lava Islands)
    if (titanForgeGroup.visible) {
      const { forgeGears, floatingCrystals, orbitingLavaIslands } = titanForgeGroup.userData;
      if (forgeGears) {
        for (const fg of forgeGears) {
          if (fg.mesh) {
            fg.mesh.rotation.z += dt * fg.speed;
          }
        }
      }
      if (floatingCrystals) {
        for (const fc of floatingCrystals) {
          fc.mesh.position.y = fc.baseY + Math.sin(elapsedTotal * fc.speed + fc.phase) * 0.28;
          fc.mesh.rotation.y += dt * 0.85;
        }
      }
      if (orbitingLavaIslands) {
        for (const isl of orbitingLavaIslands) {
          const a = isl.ang + elapsedTotal * isl.speed;
          isl.mesh.position.x = Math.cos(a) * isl.orbitR;
          isl.mesh.position.z = Math.sin(a) * isl.orbitR;
          isl.mesh.position.y = isl.baseY + Math.sin(elapsedTotal * 1.3 + isl.ang) * 0.45;
        }
      }
    }

    // 3b. Animate Haunted Blood-Moon Graveyard (Bobbing Jack-o'-Lanterns, Sheet Ghosts, Bubbling Cauldrons & Circling Vampire Bats)
    if (hauntedGraveyardGroup.visible) {
      const { floatingPumpkins, floatingGhosts, cauldronBubbles, circlingBats } = hauntedGraveyardGroup.userData;
      for (const fp of floatingPumpkins) {
        fp.mesh.position.y = fp.baseY + Math.sin(elapsedTotal * fp.speed + fp.phase) * 0.34;
        fp.mesh.rotation.y = Math.sin(elapsedTotal * 0.9 + fp.phase) * 0.35;
      }
      if (floatingGhosts) {
        for (const fg of floatingGhosts) {
          const ang = fg.baseAngle + Math.sin(elapsedTotal * fg.speed + fg.phase) * 0.25;
          fg.mesh.position.x = Math.cos(ang) * fg.orbitR;
          fg.mesh.position.z = Math.sin(ang) * fg.orbitR;
          fg.mesh.position.y = fg.baseY + Math.sin(elapsedTotal * 2.1 + fg.phase) * 0.38;
          fg.mesh.rotation.z = Math.sin(elapsedTotal * 1.6 + fg.phase) * 0.12;
        }
      }
      if (cauldronBubbles) {
        for (const cb of cauldronBubbles) {
          const cycle = (elapsedTotal * cb.speed + cb.phase) % 1.0;
          cb.mesh.position.y = cb.baseY + cycle * 0.48;
          const s = Math.sin(cycle * Math.PI) * 1.15;
          cb.mesh.scale.setScalar(Math.max(0.05, s));
        }
      }
      for (const bat of circlingBats) {
        const theta = elapsedTotal * bat.speed + bat.phase;
        const nextTheta = theta + (bat.speed >= 0 ? 0.06 : -0.06);
        const x = Math.cos(theta) * bat.orbitR;
        const z = Math.sin(theta) * bat.orbitR;
        const y = bat.baseY + Math.sin(elapsedTotal * 1.8 + bat.phase) * 1.15;
        bat.mesh.position.set(x, y, z);
        bat.mesh.lookAt(
          Math.cos(nextTheta) * bat.orbitR,
          y + Math.cos(elapsedTotal * 1.8 + bat.phase) * 0.15,
          Math.sin(nextTheta) * bat.orbitR
        );
        const flap = Math.sin(elapsedTotal * 7.5 + bat.phase) * 0.52;
        if (bat.mesh.userData.leftWing) bat.mesh.userData.leftWing.rotation.z = flap;
        if (bat.mesh.userData.rightWing) bat.mesh.userData.rightWing.rotation.z = -flap;
      }
    }

    // 4. Animate Particle Weather
    const posArr = weather.positions;
    const phaseArr = weather.phases;
    const isVolcanic = activeSceneryId === 'volcanic_titan_forge';
    const isSkyCitadel = activeSceneryId === 'dragon_sky_citadel';
    const isGraveyard = activeSceneryId === 'haunted_blood_graveyard';

    for (let i = 0; i < weather.count; i++) {
      const idx = i * 3;
      const ph = phaseArr[i];
      if (isVolcanic || isGraveyard) {
        // Rising volcanic embers or floating Halloween Jack-o'-Lantern cinders
        posArr[idx + 1] += dt * (1.35 + (i % 5) * 0.22);
        posArr[idx] += Math.sin(elapsedTotal * 2.0 + ph) * dt * 0.42;
        posArr[idx + 2] += Math.cos(elapsedTotal * 1.8 + ph) * dt * 0.42;
        if (posArr[idx + 1] > 14.0) posArr[idx + 1] = -2.0;
      } else if (isSkyCitadel) {
        // Wind-swept sun-motes & alpine mist
        posArr[idx] += dt * 0.85;
        posArr[idx + 1] += Math.sin(elapsedTotal * 1.5 + ph) * dt * 0.22;
        if (posArr[idx] > 24.0) posArr[idx] = -24.0;
      } else {
        // Slowly ascending & orbiting stardust / comic star-motes
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
