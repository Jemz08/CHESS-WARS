import * as THREE from 'three';

/**
 * Configures a MeshStandardMaterial (piece body material) with a custom GLSL
 * Fresnel Rim Aura + High-Contrast Silhouette Outline so that glowing piece skins
 * retain a crystal-clear, readable 3D body and sharp outer contour without flat washout.
 */
export function configureGlowingPieceBodyMaterial(mat, skin, colorCode = 'w') {
  if (!mat) return null;

  const isWhite = colorCode === 'w';
  const isGlowing = Boolean(skin?.isGlowing);

  if (!mat.userData.glowOutlineUniforms) {
    mat.userData.glowOutlineUniforms = {
      uGlowActive: { value: 0.0 },
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
      shader.uniforms.uGlowPulse = uniforms.uGlowPulse;
      shader.uniforms.uGlowRimColor = uniforms.uGlowRimColor;
      shader.uniforms.uGlowSilhouetteColor = uniforms.uGlowSilhouetteColor;
      shader.uniforms.uIsWhitePiece = uniforms.uIsWhitePiece;

      if (!shader.fragmentShader.includes('uniform float uGlowActive;')) {
        shader.fragmentShader =
          `
          uniform float uGlowActive;
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
          if (uGlowActive > 0.5) {
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
    mat.customProgramCacheKey = () => 'wizard_piece_glow_outline_v1';
    mat.needsUpdate = true;
  }

  const uniforms = mat.userData.glowOutlineUniforms;
  uniforms.uGlowActive.value = isGlowing ? 1.0 : 0.0;
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
 * and a subtle BackSide inverted-hull silhouette shell to a piece hierarchy so every
 * armor plate, crown spike, weapon bevel, and body silhouette remains crisp and visible.
 */
export function attachPieceBodyOutline(pieceRoot, skin, colorCode = 'w') {
  if (!pieceRoot) return [];

  // Remove any previously attached outline children first
  const toRemove = [];
  pieceRoot.traverse((child) => {
    if (child.userData?.isPieceOutline) {
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

  if (!skin?.isGlowing) {
    return [];
  }

  const isWhite = colorCode === 'w';
  const rawEmissive = isWhite
    ? skin.whiteEmissiveHex || skin.trimEmissiveHex || '#00f5d4'
    : skin.blackEmissiveHex || skin.bladeEmissiveHex || '#f72585';
  const accentHex = skin.bladeEmissiveHex || skin.trimHex || '#ffffff';

  // Crease line color: high-contrast dark-accent ink on white pieces so internal bevels pop,
  // and luminous accent line on dark pieces so dark armor plates are clearly defined
  const creaseColor = isWhite
    ? new THREE.Color(0x0a0e18).lerp(new THREE.Color(rawEmissive), 0.42)
    : new THREE.Color(accentHex).lerp(new THREE.Color(0xffffff), 0.22);

  // Outer hull outline color
  const hullColor = isWhite
    ? new THREE.Color(0x070a12).lerp(new THREE.Color(rawEmissive), 0.22)
    : new THREE.Color(skin.trimHex || accentHex).lerp(new THREE.Color(rawEmissive), 0.35);

  const baseCreaseOpacity = isWhite ? 0.62 : 0.68;
  const baseHullOpacity = isWhite ? 0.72 : 0.64;

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
      child.userData?.excludeFromBounds ||
      child.userData?.isDragonFire ||
      child.material?.isShaderMaterial
    ) {
      return;
    }
    targetMeshes.push(child);
  });

  for (const mesh of targetMeshes) {
    // Skip SkinnedMesh for static EdgesGeometry/Mesh clone (SkinnedMesh uses the shader silhouette + Fresnel rim)
    if (mesh.isSkinnedMesh) continue;

    try {
      const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 28);
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
      hullMesh.scale.setScalar(1.032);
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
