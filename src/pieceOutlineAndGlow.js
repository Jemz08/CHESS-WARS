import * as THREE from 'three';

/**
 * Configures a MeshStandardMaterial (piece body material) with a custom GLSL
 * Fresnel Rim Aura + High-Contrast Silhouette Outline (for glowing skins) AND/OR
 * Quantized 3-Band Cel-Shading + Bold Pitch-Black Cartoon Ink Contour (for cartoon skins/sets).
 */
export function configureGlowingPieceBodyMaterial(mat, skin, colorCode = 'w', forceCartoon = false) {
  if (!mat) return null;

  const isWhite = colorCode === 'w';
  const isGlowing = Boolean(skin?.isGlowing);
  const isCartoon = Boolean(skin?.isCartoon || forceCartoon);

  if (!mat.userData.glowOutlineUniforms) {
    mat.userData.glowOutlineUniforms = {
      uGlowActive: { value: 0.0 },
      uCartoonActive: { value: 0.0 },
      uGlowPulse: { value: 1.0 },
      uGlowRimColor: { value: new THREE.Color(0x00f5d4) },
      uGlowSilhouetteColor: { value: new THREE.Color(0x070a12) },
      uIsWhitePiece: { value: isWhite ? 1.0 : 0.0 }
    };

    const prevOnBeforeCompile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      if (typeof prevOnBeforeCompile === 'function') {
        try {
          prevOnBeforeCompile(shader, renderer);
        } catch {
          // ignore chained compile fallback
        }
      }
      const uniforms = mat.userData.glowOutlineUniforms;
      shader.uniforms.uGlowActive = uniforms.uGlowActive;
      shader.uniforms.uCartoonActive = uniforms.uCartoonActive;
      shader.uniforms.uGlowPulse = uniforms.uGlowPulse;
      shader.uniforms.uGlowRimColor = uniforms.uGlowRimColor;
      shader.uniforms.uGlowSilhouetteColor = uniforms.uGlowSilhouetteColor;
      shader.uniforms.uIsWhitePiece = uniforms.uIsWhitePiece;

      if (!shader.fragmentShader.includes('uniform float uGlowActive;')) {
        shader.fragmentShader =
          `
          uniform float uGlowActive;
          uniform float uCartoonActive;
          uniform float uGlowPulse;
          uniform vec3 uGlowRimColor;
          uniform vec3 uGlowSilhouetteColor;
          uniform float uIsWhitePiece;
          ` + shader.fragmentShader;
      }

      const hookTarget = '#include <dithering_fragment>';
      if (shader.fragmentShader.includes(hookTarget)) {
        shader.fragmentShader = shader.fragmentShader.replace(
          hookTarget,
          `
          if (uCartoonActive > 0.5) {
            vec3 nView = normalize(vNormal);
            vec3 vDir = normalize(vViewPosition);
            float ndotv = clamp(abs(dot(nView, vDir)), 0.0, 1.0);

            // Fast branchless 3-band quantized cel-shading steps in view space
            vec3 keyLightDir = normalize(vec3(0.48, 0.76, 0.44));
            float ndotl = clamp(dot(nView, keyLightDir) * 0.5 + 0.5, 0.0, 0.999);
            float celStep = floor(ndotl * 3.0); // 0.0, 1.0, or 2.0
            float toonBand = 0.74 + celStep * 0.20;
            gl_FragColor.rgb *= toonBand;

            // Fast Blinn-Phong half-vector quantized specular highlight pop
            vec3 halfVec = normalize(keyLightDir + vDir);
            float specDot = max(0.0, dot(nView, halfVec));
            float toonSpec = step(0.91, specDot);
            gl_FragColor.rgb += vec3(0.22, 0.21, 0.17) * toonSpec;

            // Subtle inner cel rim on dark pieces so the black ink outline pops with 100% clarity
            float darkMask = 1.0 - step(0.5, uIsWhitePiece);
            float innerRim = smoothstep(0.44, 0.30, ndotv) * smoothstep(0.18, 0.30, ndotv);
            gl_FragColor.rgb += vec3(0.18, 0.22, 0.34) * (innerRim * darkMask);

            // Grazing silhouette ink contour complementing the post-processing outline pass
            float inkOutline = smoothstep(0.28, 0.14, ndotv);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.015, 0.015, 0.025), inkOutline * 0.92);
          } else if (uGlowActive > 0.5) {
            vec3 nView = normalize(vNormal);
            vec3 vDir = normalize(vViewPosition);
            float ndotv = clamp(abs(dot(nView, vDir)), 0.0, 1.0);
            float rim = 1.0 - ndotv;

            // 1. Keep center-facing body surfaces (ndotv > 0.55) sculpted and high-contrast
            // so chest armor, faces, scales, and bevels never wash out into a flat blob
            float centerContrastMask = smoothstep(0.35, 0.85, ndotv);
            gl_FragColor.rgb *= mix(1.0, 0.90, centerContrastMask * (uIsWhitePiece > 0.5 ? 0.55 : 0.25));

            // 2. Inner Fresnel contour rim band that breathes with uGlowPulse
            float fresnelBand = smoothstep(0.24, 0.74, rim) * smoothstep(0.96, 0.72, rim);
            gl_FragColor.rgb += uGlowRimColor * fresnelBand * (0.62 * uGlowPulse);

            // 3. Crisp outer silhouette outline at grazing angles (ndotv < 0.28)
            // so the piece body outline is always sharp and unmistakable
            float silhouetteFactor = smoothstep(0.29, 0.08, ndotv);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uGlowSilhouetteColor, silhouetteFactor * 0.86);
          }
          ${hookTarget}
          `
        );
      }
    };
    mat.customProgramCacheKey = () => 'wizard_piece_glow_outline_v3';
    mat.needsUpdate = true;
  }

  const uniforms = mat.userData.glowOutlineUniforms;
  uniforms.uGlowActive.value = isGlowing ? 1.0 : 0.0;
  uniforms.uCartoonActive.value = isCartoon ? 1.0 : 0.0;
  uniforms.uGlowPulse.value = 1.0;
  uniforms.uIsWhitePiece.value = isWhite ? 1.0 : 0.0;

  if (isGlowing && skin) {
    const rawEmissive = isWhite
      ? skin.whiteEmissiveHex || skin.trimEmissiveHex || '#00f5d4'
      : skin.blackEmissiveHex || skin.bladeEmissiveHex || '#f72585';
    const bladeEmissive = skin.bladeEmissiveHex || skin.trimHex || '#ffffff';
    const rimCol = new THREE.Color(rawEmissive).lerp(new THREE.Color(bladeEmissive), 0.35);
    uniforms.uGlowRimColor.value.copy(rimCol);

    if (isWhite) {
      // Bright/White glowing piece: deep obsidian-ink silhouette outline tinted slightly with the skin's accent
      // so the bright body stands out with a clear, crisp dark contour
      const darkInk = new THREE.Color(0x060810).lerp(new THREE.Color(rawEmissive), 0.18);
      uniforms.uGlowSilhouetteColor.value.copy(darkInk);
    } else {
      // Dark/Black glowing piece: bright luminous accent silhouette outline
      // so the dark obsidian body has a clear, crisp glowing contour
      const brightRim = new THREE.Color(skin.trimHex || bladeEmissive).lerp(
        new THREE.Color(0xffffff),
        0.28
      );
      uniforms.uGlowSilhouetteColor.value.copy(brightRim);
    }
  }

  return uniforms;
}

/**
 * Attaches physical 3D geometric edge contour lines (EdgesGeometry LineSegments)
 * and a BackSide inverted-hull silhouette shell to a piece hierarchy for Glowing Skins.
 * Cartoon skins/sets now use the fast screen-space Post-Processing Cel-Shading Outline Shader
 * (`createCartoonOutlinePostProcessor`) so they don't incur per-mesh EdgesGeometry/hull draw calls.
 */
export function attachPieceBodyOutline(pieceRoot, skin, colorCode = 'w', forceCartoon = false) {
  if (!pieceRoot) return [];

  // Remove any previously attached dynamic skin outline children first
  const toRemove = [];
  pieceRoot.traverse((child) => {
    if (child.userData?.isPieceOutline && !child.userData?.isBuiltInCartoonOutline) {
      toRemove.push(child);
    }
  });
  for (const old of toRemove) {
    if (old.parent) old.parent.remove(old);
    if (old.geometry && old.userData?.ownsOutlineGeometry) {
      old.geometry.dispose();
    }
    if (old.material && typeof old.material.dispose === 'function') {
      old.material.dispose();
    }
  }

  const isCartoon = Boolean(skin?.isCartoon || forceCartoon);
  const isGlowing = Boolean(skin?.isGlowing);

  // Cartoon mode uses the screen-space post-processing outline shader + GLSL cel shader;
  // skip heavy per-mesh EdgesGeometry / BackSide hull clones unless it's a glowing non-cartoon skin.
  if (!isGlowing || isCartoon) {
    return [];
  }

  const isWhite = colorCode === 'w';
  const rawEmissive = isWhite
    ? skin.whiteEmissiveHex || skin.trimEmissiveHex || '#00f5d4'
    : skin.blackEmissiveHex || skin.bladeEmissiveHex || '#f72585';
  const accentHex = skin.bladeEmissiveHex || skin.trimHex || '#ffffff';

  const creaseColor = isWhite
    ? new THREE.Color(0x0a0e18).lerp(new THREE.Color(rawEmissive), 0.42)
    : new THREE.Color(accentHex).lerp(new THREE.Color(0xffffff), 0.22);

  const hullColor = isWhite
    ? new THREE.Color(0x070a12).lerp(new THREE.Color(rawEmissive), 0.22)
    : new THREE.Color(skin.trimHex || accentHex).lerp(new THREE.Color(rawEmissive), 0.35);

  const baseCreaseOpacity = isWhite ? 0.62 : 0.68;
  const baseHullOpacity = isWhite ? 0.72 : 0.64;
  const hullScale = 1.032;
  const edgeThresholdAngle = 28;

  const lineMat = new THREE.LineBasicMaterial({
    color: creaseColor,
    transparent: true,
    opacity: baseCreaseOpacity,
    depthWrite: false
  });

  const hullMat = new THREE.MeshBasicMaterial({
    color: hullColor,
    side: THREE.BackSide,
    transparent: true,
    opacity: baseHullOpacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2
  });

  const targetMeshes = [];
  pieceRoot.traverse((child) => {
    if (!child.isMesh || !child.visible || !child.geometry) return;
    if (
      child.userData?.isPieceOutline ||
      child.userData?.isBuiltInCartoonOutline ||
      child.userData?.excludeFromBounds ||
      child.userData?.isDragonFire ||
      child.material?.isShaderMaterial
    ) {
      return;
    }
    targetMeshes.push(child);
  });

  for (const mesh of targetMeshes) {
    if (mesh.isSkinnedMesh) continue;

    try {
      const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, edgeThresholdAngle);
      const posCount = edgesGeo.attributes.position ? edgesGeo.attributes.position.count : 0;
      if (posCount > 0) {
        const edgeLines = new THREE.LineSegments(edgesGeo, lineMat);
        edgeLines.userData.isPieceOutline = true;
        edgeLines.userData.ownsOutlineGeometry = true;
        edgeLines.userData.excludeFromBounds = true;
        edgeLines.raycast = () => {};
        mesh.add(edgeLines);
      } else {
        edgesGeo.dispose();
      }
    } catch {
      // Ignore edge generation on non-indexed exotic geometry
    }

    try {
      const hullMesh = new THREE.Mesh(mesh.geometry, hullMat);
      hullMesh.scale.setScalar(hullScale);
      hullMesh.userData.isPieceOutline = true;
      hullMesh.userData.ownsOutlineGeometry = false;
      hullMesh.userData.excludeFromBounds = true;
      hullMesh.castShadow = false;
      hullMesh.receiveShadow = false;
      hullMesh.raycast = () => {};
      mesh.add(hullMesh);
    } catch {
      // Ignore hull fallback
    }
  }

  return [
    { mat: lineMat, baseOpacity: baseCreaseOpacity, phase: 0.3 },
    { mat: hullMat, baseOpacity: baseHullOpacity, phase: 1.1 }
  ];
}

/**
 * Builds a subtle, premium pulsing Aura Halo & Rising Luminous Motes on the 3D Showcase pedestal
 * for glowing piece skins so the showcase feels alive and collector-grade.
 */
export function createShowcaseGlowPedestalAura(skin, colorCode = 'w') {
  const group = new THREE.Group();
  group.userData.excludeFromBounds = true;

  const isWhite = colorCode === 'w';
  const primaryGlowHex = isWhite
    ? skin.whiteEmissiveHex || skin.trimEmissiveHex || '#00f5d4'
    : skin.blackEmissiveHex || skin.bladeEmissiveHex || '#f72585';
  const secondaryGlowHex = skin.bladeEmissiveHex || skin.trimHex || '#ffffff';

  const primaryCol = new THREE.Color(primaryGlowHex);
  const secondaryCol = new THREE.Color(secondaryGlowHex);

  // 1. Soft radial energy ring on the pedestal surface beneath the piece
  const outerHaloGeo = new THREE.RingGeometry(0.46, 0.88, 48);
  const outerHaloMat = new THREE.MeshBasicMaterial({
    color: primaryCol,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const outerHalo = new THREE.Mesh(outerHaloGeo, outerHaloMat);
  outerHalo.rotation.x = -Math.PI / 2;
  outerHalo.position.y = 0.006;
  group.add(outerHalo);

  // 2. Crisp inner rune-circle ring
  const innerRingGeo = new THREE.RingGeometry(0.34, 0.385, 36);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: secondaryCol,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.009;
  group.add(innerRing);

  // 3. Delicate rising luminous motes around the piece
  const moteCount = 26;
  const positions = new Float32Array(moteCount * 3);
  const phases = new Float32Array(moteCount);
  const speeds = new Float32Array(moteCount);
  const radii = new Float32Array(moteCount);
  const angles = new Float32Array(moteCount);

  for (let i = 0; i < moteCount; i++) {
    const r = 0.28 + Math.random() * 0.56;
    const ang = Math.random() * Math.PI * 2;
    const y = 0.05 + Math.random() * 1.35;
    radii[i] = r;
    angles[i] = ang;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.14 + Math.random() * 0.18;
    positions[i * 3] = Math.cos(ang) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(ang) * r;
  }

  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const moteMat = new THREE.PointsMaterial({
    color: secondaryCol.clone().lerp(new THREE.Color(0xffffff), 0.35),
    size: 0.036,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  const update = (dt, elapsed) => {
    const breath = 0.85 + 0.15 * Math.sin(elapsed * 2.2);
    outerHaloMat.opacity = 0.18 * breath;
    innerRingMat.opacity = 0.42 * (0.82 + 0.18 * Math.sin(elapsed * 2.2 + 0.8));
    outerHalo.scale.setScalar(0.97 + 0.05 * Math.sin(elapsed * 2.2));
    innerRing.rotation.z = elapsed * 0.35;

    const posAttr = moteGeo.getAttribute('position');
    for (let i = 0; i < moteCount; i++) {
      let y = posAttr.getY(i) + speeds[i] * dt;
      if (y > 1.45) {
        y = 0.04;
      }
      const swirlAng = angles[i] + elapsed * 0.32 + Math.sin(elapsed * 1.4 + phases[i]) * 0.18;
      const r = radii[i] * (0.94 + 0.08 * Math.sin(elapsed * 1.8 + phases[i]));
      posAttr.setXYZ(i, Math.cos(swirlAng) * r, y, Math.sin(swirlAng) * r);
    }
    posAttr.needsUpdate = true;
    moteMat.opacity = 0.48 + 0.18 * Math.sin(elapsed * 2.6);
    return true;
  };

  return { group, update };
}

/**
 * Creates a lightweight Screen-Space Cel-Shading Edge-Detection Post-Processing Pass
 * that renders crisp pitch-black (#050508) cartoon ink outlines around all 3D pieces,
 * board elements, and scenery in a single fullscreen GPU draw call.
 */
export function createCartoonOutlinePostProcessor(renderer) {
  const sizeVec = new THREE.Vector2();
  renderer.getDrawingBufferSize(sizeVec);
  const initW = Math.max(1, Math.floor(sizeVec.x || 800));
  const initH = Math.max(1, Math.floor(sizeVec.y || 600));

  const depthTexture = new THREE.DepthTexture(initW, initH);
  depthTexture.type = THREE.UnsignedIntType;
  depthTexture.minFilter = THREE.NearestFilter;
  depthTexture.magFilter = THREE.NearestFilter;

  const renderTarget = new THREE.WebGLRenderTarget(initW, initH, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
    depthTexture
  });

  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const outlineMaterial = new THREE.ShaderMaterial({
    toneMapped: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      tDepth: { value: depthTexture },
      uResolution: { value: new THREE.Vector2(initW, initH) },
      uCameraNear: { value: 0.1 },
      uCameraFar: { value: 120.0 },
      uOutlineColor: { value: new THREE.Color(0x050508) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      #include <packing>
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform vec2 uResolution;
      uniform float uCameraNear;
      uniform float uCameraFar;
      uniform vec3 uOutlineColor;
      varying vec2 vUv;

      float getLinearDepth(vec2 coord) {
        float fragCoordZ = texture2D(tDepth, coord).x;
        float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
        return viewZToOrthographicDepth(viewZ, uCameraNear, uCameraFar);
      }

      float getLuma(vec3 c) {
        return dot(c, vec3(0.299, 0.587, 0.114));
      }

      void main() {
        vec2 texel = 1.0 / max(uResolution, vec2(1.0));
        vec4 baseSample = texture2D(tDiffuse, vUv);

        // 5-tap cross + 4-corner Roberts-Cross neighborhood for sharp 1.25px ink outlines
        vec2 off = texel * 1.25;
        float dCenter = getLinearDepth(vUv);

        float dTL = getLinearDepth(vUv + vec2(-off.x,  off.y));
        float dTR = getLinearDepth(vUv + vec2( off.x,  off.y));
        float dBL = getLinearDepth(vUv + vec2(-off.x, -off.y));
        float dBR = getLinearDepth(vUv + vec2( off.x, -off.y));

        // Depth discontinuity (Roberts-Cross gradient normalized by depth to prevent grazing surface artifacts)
        float depthDiff1 = dTL - dBR;
        float depthDiff2 = dTR - dBL;
        float depthGrad = sqrt(depthDiff1 * depthDiff1 + depthDiff2 * depthDiff2);
        float adaptiveDepthThreshold = max(0.00055, dCenter * 0.016);
        float depthEdge = smoothstep(adaptiveDepthThreshold, adaptiveDepthThreshold * 2.2, depthGrad);

        // Color & luminance discontinuity for crisp board tile & internal crease lines
        vec3 cTL = texture2D(tDiffuse, vUv + vec2(-off.x,  off.y)).rgb;
        vec3 cTR = texture2D(tDiffuse, vUv + vec2( off.x,  off.y)).rgb;
        vec3 cBL = texture2D(tDiffuse, vUv + vec2(-off.x, -off.y)).rgb;
        vec3 cBR = texture2D(tDiffuse, vUv + vec2( off.x, -off.y)).rgb;

        vec3 colDiff1 = cTL - cBR;
        vec3 colDiff2 = cTR - cBL;
        float colorGrad = sqrt(dot(colDiff1, colDiff1) + dot(colDiff2, colDiff2));
        float lumaGrad = length(vec2(getLuma(cTL) - getLuma(cBR), getLuma(cTR) - getLuma(cBL)));
        float creaseEdge = smoothstep(0.20, 0.44, max(colorGrad * 0.65, lumaGrad));

        // Fade out internal color edges in the far background sky so only 3D geometry & islands get inked
        float skyMask = 1.0 - smoothstep(0.88, 0.98, dCenter);
        float edgeFactor = clamp(max(depthEdge, creaseEdge * 0.82) * skyMask, 0.0, 1.0);

        // Subtle cel-saturation boost on cartoon surfaces
        float luma = getLuma(baseSample.rgb);
        vec3 celBoosted = mix(vec3(luma), baseSample.rgb, 1.12);
        vec3 finalRgb = mix(celBoosted, uOutlineColor, edgeFactor * 0.95);

        gl_FragColor = vec4(finalRgb, baseSample.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadMesh = new THREE.Mesh(quadGeo, outlineMaterial);
  quadMesh.frustumCulled = false;
  postScene.add(quadMesh);

  const syncSize = () => {
    renderer.getDrawingBufferSize(sizeVec);
    const w = Math.max(1, Math.floor(sizeVec.x));
    const h = Math.max(1, Math.floor(sizeVec.y));
    if (renderTarget.width !== w || renderTarget.height !== h) {
      renderTarget.setSize(w, h);
      outlineMaterial.uniforms.uResolution.value.set(w, h);
    }
  };

  return {
    setSize() {
      syncSize();
    },
    render(scene, camera, enabled = false) {
      if (!enabled) {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        return;
      }
      syncSize();
      outlineMaterial.uniforms.uCameraNear.value = camera.near || 0.1;
      outlineMaterial.uniforms.uCameraFar.value = camera.far || 120.0;

      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(scene, camera);

      renderer.setRenderTarget(prevTarget);
      renderer.render(postScene, postCamera);
    },
    dispose() {
      renderTarget.dispose();
      depthTexture.dispose();
      quadGeo.dispose();
      outlineMaterial.dispose();
    }
  };
}

