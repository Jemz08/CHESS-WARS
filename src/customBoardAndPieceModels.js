import * as THREE from 'three';

/**
 * High-Detail Sculpted 3D Chess Piece & Board Architecture Builder
 *
 * Replaces low-poly geometric primitives with smooth, high-resolution 3D sculptures:
 * - 'classic_staunton': Master-turned tournament Staunton chessmen (64x56 spline lathes,
 *   fluted column shafts, carved warhorse head with curved bridle/mane, slotted mitre,
 *   scalloped 12-pearl Queen coronet, and arched Imperial King crown with patonce cross).
 * - 'arcane_cyber': High-detail Articulated Cyber-Arcane Paladin & Automaton statues
 *   (contoured cuirass armor, curved kite shields, fuller-grooved runic greatswords,
 *   feathered Valkyrie energy wings, and multi-ring gyroscopic astrolabes).
 * - 'dragon_elemental': Organic Sculpted Dragons & Elemental Avatars (sinuous S-curved
 *   CatmullRom dragon necks & coiled bodies, overlapping ventral scutes, swept spiral
 *   horns, ribbed bat-wing membranes, fanged jaws, and clawed crag pedestals).
 */

const geoCache = new Map();

function getCachedGeo(key, builderFn) {
  if (!geoCache.has(key)) {
    const g = builderFn();
    g.computeVertexNormals();
    geoCache.set(key, g);
  }
  return geoCache.get(key);
}

/**
 * Creates a smooth high-resolution LatheGeometry from [radius, y] control points
 * using Catmull-Rom spline interpolation between segments.
 */
function buildSmoothSplineLathe(controlPairs, sampleCount = 60, radialSegments = 52) {
  const vecs = controlPairs.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  const curve = new THREE.SplineCurve(vecs);
  const sampled = curve.getPoints(sampleCount);
  // Clamp any slight spline overshoot below r=0
  for (const pt of sampled) {
    if (pt.x < 0) pt.x = 0;
  }
  sampled[0].x = 0;
  sampled[sampled.length - 1].x = 0;
  return new THREE.LatheGeometry(sampled, radialSegments);
}

/**
 * Creates a LatheGeometry with optional vertical fluting or crown-rim scalloping.
 */
function buildSculptedLathe(controlPairs, options = {}) {
  const {
    sampleCount = 64,
    radialSegments = 56,
    fluteCount = 0,
    fluteDepth = 0.012,
    fluteYMin = 0.18,
    fluteYMax = 0.65,
    scallopCount = 0,
    scallopAmp = 0.03,
    scallopYMin = 0.7
  } = options;

  const geo = buildSmoothSplineLathe(controlPairs, sampleCount, radialSegments);
  if (!fluteCount && !scallopCount) return geo;

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.001) {
      const ang = Math.atan2(z, x);
      if (fluteCount > 0 && y >= fluteYMin && y <= fluteYMax) {
        const wy = Math.sin(((y - fluteYMin) / (fluteYMax - fluteYMin)) * Math.PI);
        const flute = Math.cos(ang * fluteCount) * fluteDepth * wy;
        const scale = Math.max(0.2, (r + flute) / r);
        x *= scale;
        z *= scale;
      }
      if (scallopCount > 0 && y >= scallopYMin) {
        const sy = Math.min(1, (y - scallopYMin) / 0.10);
        const sr = Math.pow(Math.min(1, r / 0.16), 2);
        y += Math.pow(Math.max(0, Math.cos((ang * scallopCount) / 2)), 2) * scallopAmp * sy * sr;
      }
      pos.setXYZ(i, x, y, z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a tapered organic tube along a 3D CatmullRomCurve3 (for curved horns, dragon necks, tails, and arches).
 */
function buildTaperedCurveGeo(points3D, rStart, rEnd, tubularSegments = 36, radialSegments = 18) {
  const curve = new THREE.CatmullRomCurve3(points3D);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, 1.0, radialSegments, false);
  const pos = geo.attributes.position;
  const ringStride = radialSegments + 1;

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const center = curve.getPointAt(u);
    // Smooth taper from rStart to rEnd
    const radius = rStart * (1 - u) + rEnd * u + Math.sin(u * Math.PI) * (rStart * 0.12);
    for (let j = 0; j < ringStride; j++) {
      const idx = i * ringStride + j;
      if (idx >= pos.count) continue;
      const vx = pos.getX(idx) - center.x;
      const vy = pos.getY(idx) - center.y;
      const vz = pos.getZ(idx) - center.z;
      pos.setXYZ(idx, center.x + vx * radius, center.y + vy * radius, center.z + vz * radius);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function buildProceduralPieceGroup(archetypeId, pieceType, color, mats) {
  const { whitePieceMat, blackPieceMat, goldTrimMat, forgedSteelMat } = mats;
  const primaryMat = color === 'w' ? whitePieceMat : blackPieceMat;

  const root = new THREE.Group();
  const animRig = new THREE.Group();
  root.add(animRig);

  const animParts = [];

  if (archetypeId === 'classic_staunton') {
    buildStauntonPiece(animRig, pieceType, primaryMat, goldTrimMat, forgedSteelMat, animParts);
  } else if (archetypeId === 'arcane_cyber') {
    buildArcaneCyberPiece(animRig, pieceType, primaryMat, goldTrimMat, forgedSteelMat, animParts);
  } else if (archetypeId === 'dragon_elemental') {
    buildDragonElementalPiece(animRig, pieceType, primaryMat, goldTrimMat, forgedSteelMat, animParts);
  } else {
    buildStauntonPiece(animRig, pieceType, primaryMat, goldTrimMat, forgedSteelMat, animParts);
  }

  root.traverse((child) => {
    if (child.isMesh) {
      if (child.userData.isDragonFire) {
        child.castShadow = false;
        child.receiveShadow = false;
      } else {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }
  });

  return { root, animRig, animParts };
}

// ============================================================================
// 1. CLASSIC STAUNTON GRANDMASTER (High-Detail Lathe, Carved Horse, Crowns)
// ============================================================================
function buildStauntonPiece(rig, type, primaryMat, trimMat, bladeMat, animParts) {
  const heightScale = {
    pawn: 0.94,
    rook: 1.06,
    knight: 1.14,
    bishop: 1.22,
    queen: 1.38,
    king: 1.52
  }[type] || 1.1;

  // High-detail Staunton pedestal & fluted baluster shaft
  const bodyGeo = getCachedGeo(`staunton_base_${type}`, () =>
    buildSculptedLathe(
      [
        [0.0, 0.0],
        [0.37, 0.0],
        [0.38, 0.035],
        [0.36, 0.065],
        [0.31, 0.085],
        [0.34, 0.115],
        [0.33, 0.145],
        [0.25, 0.185],
        [0.27, 0.215],
        [0.20, 0.27],
        [0.165, 0.42 * heightScale],
        [0.148, 0.56 * heightScale],
        [0.235, 0.61 * heightScale],
        [0.26, 0.64 * heightScale],
        [0.22, 0.67 * heightScale],
        [0.175, 0.70 * heightScale],
        [0.0, 0.70 * heightScale]
      ],
      {
        sampleCount: 72,
        radialSegments: 56,
        fluteCount: type === 'pawn' ? 0 : 16,
        fluteDepth: 0.007,
        fluteYMin: 0.26,
        fluteYMax: 0.56 * heightScale
      }
    )
  );
  rig.add(new THREE.Mesh(bodyGeo, primaryMat));

  // Weighted Brass Base Molding & Turned Neck Astragal Rings
  const baseRingGeo = getCachedGeo('staunton_base_ring', () => new THREE.TorusGeometry(0.352, 0.016, 18, 48));
  const lowerRing = new THREE.Mesh(baseRingGeo, trimMat);
  lowerRing.rotation.x = Math.PI / 2;
  lowerRing.position.y = 0.068;
  rig.add(lowerRing);

  const midRingGeo = getCachedGeo('staunton_mid_ring', () => new THREE.TorusGeometry(0.262, 0.014, 16, 48));
  const midRing = new THREE.Mesh(midRingGeo, trimMat);
  midRing.rotation.x = Math.PI / 2;
  midRing.position.y = 0.21;
  rig.add(midRing);

  const collarY = 0.635 * heightScale;
  const neckRingGeo = getCachedGeo('staunton_neck_ring', () => new THREE.TorusGeometry(0.252, 0.02, 18, 48));
  const neckRing = new THREE.Mesh(neckRingGeo, trimMat);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = collarY;
  rig.add(neckRing);

  const topY = 0.69 * heightScale;

  if (type === 'pawn') {
    const headGeo = getCachedGeo('staunton_pawn_head', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.14, 0.02],
          [0.205, 0.12],
          [0.21, 0.21],
          [0.16, 0.31],
          [0.06, 0.36],
          [0.0, 0.37]
        ],
        44,
        48
      )
    );
    const head = new THREE.Mesh(headGeo, primaryMat);
    head.position.y = topY - 0.01;
    rig.add(head);

    const finialGeo = getCachedGeo('staunton_pawn_finial', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.055, 0.02],
          [0.062, 0.05],
          [0.03, 0.09],
          [0.0, 0.10]
        ],
        24,
        32
      )
    );
    const finial = new THREE.Mesh(finialGeo, trimMat);
    finial.position.y = topY + 0.35;
    rig.add(finial);
  } else if (type === 'rook') {
    // Sculpted Castle Keep with Corbel Moldings, Recessed Inner Parapet & 6 Curved Arched Merlons
    const towerGeo = getCachedGeo('staunton_rook_tower', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.19, 0.0],
          [0.24, 0.05],
          [0.255, 0.09],
          [0.235, 0.14],
          [0.245, 0.26],
          [0.265, 0.30],
          [0.265, 0.34],
          [0.18, 0.34],
          [0.175, 0.25],
          [0.0, 0.25]
        ],
        48,
        48
      )
    );
    const tower = new THREE.Mesh(towerGeo, primaryMat);
    tower.position.y = topY - 0.02;
    rig.add(tower);

    const rim = new THREE.Mesh(
      getCachedGeo('staunton_rook_rim', () => new THREE.TorusGeometry(0.258, 0.016, 16, 48)),
      trimMat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = topY + 0.28;
    rig.add(rim);

    // 6 Curved Cylindrical-Sector Battlement Merlons
    const merlonGeo = getCachedGeo('staunton_rook_merlon', () => {
      const shape = new THREE.Shape();
      const rIn = 0.185;
      const rOut = 0.262;
      const halfAng = 0.34;
      shape.absarc(0, 0, rOut, -halfAng, halfAng, false);
      shape.absarc(0, 0, rIn, halfAng, -halfAng, true);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: 0.115,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.008,
        bevelThickness: 0.01
      });
      g.rotateX(-Math.PI / 2);
      return g;
    });

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const merlon = new THREE.Mesh(merlonGeo, primaryMat);
      merlon.position.y = topY + 0.31;
      merlon.rotation.y = ang;
      rig.add(merlon);
    }
  } else if (type === 'knight') {
    // True Hand-Carved Staunton Bridled Warhorse Bust
    const horseGroup = new THREE.Group();
    horseGroup.position.y = topY - 0.04;
    rig.add(horseGroup);

    const carvedHorseGeo = getCachedGeo('staunton_carved_horse_head', () => {
      // 2D Side Silhouette of a fierce tournament Staunton Knight (Z = forward, Y = up)
      const s = new THREE.Shape();
      s.moveTo(-0.14, 0.0);
      // Arched back of neck up to poll
      s.bezierCurveTo(-0.19, 0.16, -0.20, 0.36, -0.11, 0.50);
      // Poll & forehead down to nasal bridge
      s.bezierCurveTo(-0.04, 0.56, 0.06, 0.54, 0.13, 0.45);
      // Snout & upper muzzle
      s.bezierCurveTo(0.20, 0.38, 0.28, 0.31, 0.29, 0.25);
      // Parted mouth & lower jaw
      s.bezierCurveTo(0.28, 0.20, 0.21, 0.19, 0.16, 0.22);
      s.bezierCurveTo(0.20, 0.17, 0.24, 0.15, 0.21, 0.11);
      // Cheek jowl & throat-latch
      s.bezierCurveTo(0.14, 0.09, 0.05, 0.14, 0.02, 0.21);
      // Muscular chest down to pedestal collar
      s.bezierCurveTo(0.08, 0.13, 0.14, 0.05, 0.13, 0.0);
      s.closePath();

      const extrude = new THREE.ExtrudeGeometry(s, {
        steps: 3,
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.065,
        bevelSize: 0.055,
        bevelSegments: 8
      });
      // Center on X and orient so +X is Z-forward, wait: shape X -> +Z, shape Y -> +Y, extrude Z -> X
      extrude.translate(0, 0, -0.07);
      extrude.rotateY(-Math.PI / 2);

      // Anatomically taper the snout & swell the muscular cheeks/neck
      const pos = extrude.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        // Taper width toward muzzle (+Z) and poll (+Y)
        const snoutFactor = z > 0.08 ? Math.max(0.46, 1 - (z - 0.08) * 1.9) : 1.0;
        const cheekSwell =
          1.0 + Math.exp(-Math.pow((z - 0.04) / 0.1, 2) - Math.pow((y - 0.32) / 0.11, 2)) * 0.28;
        x *= snoutFactor * cheekSwell;
        pos.setX(i, x);
      }
      extrude.computeVertexNormals();
      return extrude;
    });
    horseGroup.add(new THREE.Mesh(carvedHorseGeo, primaryMat));

    // Flowing 10-Lock Carved Mane along the arched spine
    const maneLockGeo = getCachedGeo('staunton_mane_lock', () => {
      const g = new THREE.SphereGeometry(0.052, 16, 14);
      g.scale(0.68, 0.85, 1.45);
      return g;
    });
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const my = 0.06 + t * 0.43;
      const mz = -0.14 - Math.sin(t * Math.PI * 0.85) * 0.065 + t * 0.03;
      const lock = new THREE.Mesh(maneLockGeo, i % 2 === 0 ? trimMat : primaryMat);
      lock.position.set(0, my, mz);
      lock.rotation.x = 0.45 - t * 0.65;
      horseGroup.add(lock);
    }

    // Sculpted Alert Ears, Gleaming Eyes, Nostril Scrolls & Brass Bridle Bit/Reins
    const earGeo = getCachedGeo('staunton_ear', () => {
      const g = new THREE.ConeGeometry(0.038, 0.14, 16);
      g.scale(0.75, 1, 1.15);
      return g;
    });
    const eyeGeo = getCachedGeo('staunton_eye', () => new THREE.SphereGeometry(0.022, 14, 14));
    const bitRingGeo = getCachedGeo('staunton_bit', () => new THREE.TorusGeometry(0.034, 0.008, 12, 24));

    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, primaryMat);
      ear.position.set(s * 0.058, 0.54, -0.04);
      ear.rotation.x = 0.22;
      ear.rotation.z = -s * 0.18;
      horseGroup.add(ear);

      const eye = new THREE.Mesh(eyeGeo, trimMat);
      eye.position.set(s * 0.088, 0.39, 0.09);
      horseGroup.add(eye);

      const bitRing = new THREE.Mesh(bitRingGeo, trimMat);
      bitRing.position.set(s * 0.068, 0.20, 0.21);
      bitRing.rotation.y = Math.PI / 2;
      horseGroup.add(bitRing);

      const reinGeo = getCachedGeo(`staunton_rein_${s}`, () =>
        buildTaperedCurveGeo(
          [
            new THREE.Vector3(s * 0.068, 0.20, 0.21),
            new THREE.Vector3(s * 0.105, 0.19, 0.05),
            new THREE.Vector3(s * 0.095, 0.12, -0.09)
          ],
          0.011,
          0.011,
          20,
          12
        )
      );
      horseGroup.add(new THREE.Mesh(reinGeo, trimMat));
    }

    // Noseband strap across the muzzle
    const noseband = new THREE.Mesh(
      getCachedGeo('staunton_noseband', () => new THREE.TorusGeometry(0.078, 0.011, 12, 28)),
      trimMat
    );
    noseband.position.set(0, 0.27, 0.19);
    noseband.rotation.x = 0.55;
    horseGroup.add(noseband);

    animParts.push({ mesh: horseGroup, kind: 'headNod' });
  } else if (type === 'bishop') {
    // High-Resolution Sculpted Mitre with Carved Liturgical Cleft, Lappets & Cross Inlay
    const mitreGeo = getCachedGeo('staunton_bishop_mitre', () => {
      const g = buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.16, 0.02],
          [0.215, 0.14],
          [0.205, 0.28],
          [0.145, 0.42],
          [0.065, 0.51],
          [0.0, 0.54]
        ],
        56,
        52
      );
      // Carve the classic diagonal Staunton Bishop mitre slot on the upper front (+Z, +Y)
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        // Diagonal cleft plane centered around y - z*0.75 = 0.26 on the +Z side
        if (z > 0.02 && y > 0.22 && y < 0.47) {
          const distToCleft = Math.abs(y - 0.34 - z * 0.35);
          if (distToCleft < 0.036) {
            const depth = 1 - distToCleft / 0.036;
            pos.setZ(i, z - depth * 0.075);
            pos.setX(i, x * (1 - depth * 0.25));
          }
        }
      }
      g.computeVertexNormals();
      return g;
    });
    const mitre = new THREE.Mesh(mitreGeo, primaryMat);
    mitre.position.y = topY - 0.01;
    rig.add(mitre);

    // Gilded Mitre Orphrey Band & Cross Finial
    const band = new THREE.Mesh(
      getCachedGeo('staunton_bishop_band', () => new THREE.TorusGeometry(0.198, 0.015, 16, 44)),
      trimMat
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = topY + 0.14;
    rig.add(band);

    const finialOrb = new THREE.Mesh(
      getCachedGeo('staunton_bishop_orb', () => new THREE.SphereGeometry(0.048, 24, 24)),
      trimMat
    );
    finialOrb.position.y = topY + 0.55;
    rig.add(finialOrb);
  } else if (type === 'queen') {
    // Scalloped 12-Cusp Imperial Diadem Coronet + Velvet Dome + 12 Crown Pearls
    const coronetGeo = getCachedGeo('staunton_queen_coronet', () =>
      buildSculptedLathe(
        [
          [0.0, 0.0],
          [0.17, 0.0],
          [0.21, 0.08],
          [0.245, 0.18],
          [0.268, 0.28],
          [0.22, 0.30],
          [0.175, 0.22],
          [0.0, 0.22]
        ],
        {
          sampleCount: 52,
          radialSegments: 60,
          scallopCount: 12,
          scallopAmp: 0.048,
          scallopYMin: 0.20
        }
      )
    );
    const coronet = new THREE.Mesh(coronetGeo, primaryMat);
    coronet.position.y = topY - 0.01;
    rig.add(coronet);

    const innerDome = new THREE.Mesh(
      getCachedGeo('staunton_queen_dome', () => new THREE.SphereGeometry(0.185, 36, 28)),
      trimMat
    );
    innerDome.scale.set(1, 0.85, 1);
    innerDome.position.y = topY + 0.22;
    rig.add(innerDome);

    const pearlGeo = getCachedGeo('staunton_queen_pearl', () => new THREE.SphereGeometry(0.028, 18, 18));
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const pearl = new THREE.Mesh(pearlGeo, bladeMat);
      pearl.position.set(Math.cos(ang) * 0.245, topY + 0.31, Math.sin(ang) * 0.245);
      rig.add(pearl);
    }

    const monde = new THREE.Mesh(
      getCachedGeo('staunton_queen_monde', () => new THREE.SphereGeometry(0.052, 24, 24)),
      trimMat
    );
    monde.position.y = topY + 0.39;
    rig.add(monde);
  } else if (type === 'king') {
    // Imperial Sovereign Crown with 4 Arched Ribs, Velvet Cap & Beveled Patonce Cross
    const crownCupGeo = getCachedGeo('staunton_king_cup', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.18, 0.0],
          [0.225, 0.09],
          [0.265, 0.20],
          [0.25, 0.26],
          [0.19, 0.25],
          [0.0, 0.25]
        ],
        48,
        52
      )
    );
    const crownCup = new THREE.Mesh(crownCupGeo, primaryMat);
    crownCup.position.y = topY - 0.01;
    rig.add(crownCup);

    const circlet = new THREE.Mesh(
      getCachedGeo('staunton_king_circlet', () => new THREE.TorusGeometry(0.258, 0.02, 18, 48)),
      trimMat
    );
    circlet.rotation.x = Math.PI / 2;
    circlet.position.y = topY + 0.21;
    rig.add(circlet);

    // 4 Sweeping Imperial Crown Arches rising to the monde orb
    const archGeo = getCachedGeo('staunton_king_arch', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0.245, 0.0, 0),
          new THREE.Vector3(0.22, 0.12, 0),
          new THREE.Vector3(0.11, 0.19, 0),
          new THREE.Vector3(0.0, 0.17, 0)
        ],
        0.022,
        0.016,
        24,
        14
      )
    );
    for (let i = 0; i < 4; i++) {
      const arch = new THREE.Mesh(archGeo, trimMat);
      arch.position.y = topY + 0.21;
      arch.rotation.y = (i / 4) * Math.PI * 2;
      rig.add(arch);
    }

    // Beveled Flared Heraldic Cross Patonce Finial
    const crossGeo = getCachedGeo('staunton_king_cross', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.025, 0.0);
      s.lineTo(0.025, 0.0);
      s.lineTo(0.022, 0.09);
      s.lineTo(0.095, 0.075);
      s.lineTo(0.095, 0.135);
      s.lineTo(0.022, 0.12);
      s.lineTo(0.032, 0.21);
      s.lineTo(-0.032, 0.21);
      s.lineTo(-0.022, 0.12);
      s.lineTo(-0.095, 0.135);
      s.lineTo(-0.095, 0.075);
      s.lineTo(-0.022, 0.09);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.036,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.008,
        bevelThickness: 0.008
      });
      g.translate(0, 0, -0.018);
      return g;
    });
    const cross = new THREE.Mesh(crossGeo, trimMat);
    cross.position.y = topY + 0.39;
    rig.add(cross);
  }

  // Articulated Telekinetic Astrolabe Halo Ring around Classic Staunton pieces
  // (Sits flush around the collar at rest, expands & orbits rapidly during Telekinetic Ascension & Anvil Drop)
  const tkHaloGroup = new THREE.Group();
  tkHaloGroup.position.y = topY - 0.04;
  rig.add(tkHaloGroup);

  const tkOuterRing = new THREE.Mesh(
    getCachedGeo('staunton_tk_outer_ring', () => new THREE.TorusGeometry(0.185, 0.011, 14, 48)),
    trimMat
  );
  tkOuterRing.rotation.x = Math.PI / 2;
  tkHaloGroup.add(tkOuterRing);

  const tkInnerRing = new THREE.Mesh(
    getCachedGeo('staunton_tk_inner_ring', () => new THREE.TorusGeometry(0.165, 0.009, 12, 40)),
    bladeMat
  );
  tkInnerRing.rotation.x = Math.PI / 2;
  tkHaloGroup.add(tkInnerRing);

  animParts.push({
    mesh: tkHaloGroup,
    kind: 'stauntonTelekineticHalo',
    outerRing: tkOuterRing,
    innerRing: tkInnerRing,
    baseY: topY - 0.04
  });
}

// ============================================================================
// 2. ARCANE RUNIC & CYBER-MECH (Master-Crafted Paladin Exoskeletons & Crowns)
// ============================================================================
function buildArcaneCyberPiece(rig, type, primaryMat, trimMat, bladeMat, animParts) {
  const heightMap = {
    pawn: 0.94,
    rook: 1.10,
    knight: 1.18,
    bishop: 1.26,
    queen: 1.42,
    king: 1.56
  };
  const h = heightMap[type] || 1.15;

  // 1. Sculpted Multi-Tiered Runic Dais Pedestal + 4 Flush Corner Buttresses
  const plinthGeo = getCachedGeo('cyber_plinth_v2', () =>
    buildSculptedLathe(
      [
        [0.0, 0.0],
        [0.375, 0.0],
        [0.385, 0.038],
        [0.34, 0.072],
        [0.355, 0.115],
        [0.295, 0.155],
        [0.255, 0.185],
        [0.0, 0.185]
      ],
      {
        sampleCount: 44,
        radialSegments: 52,
        fluteCount: 12,
        fluteDepth: 0.009,
        fluteYMin: 0.02,
        fluteYMax: 0.15
      }
    )
  );
  rig.add(new THREE.Mesh(plinthGeo, primaryMat));

  // Recessed Glowing Runic Conduit Ring & Upper Gold Pedestal Collar
  const runeRing = new THREE.Mesh(
    getCachedGeo('cyber_base_rune_ring_v2', () => new THREE.TorusGeometry(0.348, 0.013, 18, 52)),
    bladeMat
  );
  runeRing.rotation.x = Math.PI / 2;
  runeRing.position.y = 0.075;
  rig.add(runeRing);

  const plinthCollar = new THREE.Mesh(
    getCachedGeo('cyber_base_gold_collar', () => new THREE.TorusGeometry(0.275, 0.014, 18, 52)),
    trimMat
  );
  plinthCollar.rotation.x = Math.PI / 2;
  plinthCollar.position.y = 0.172;
  rig.add(plinthCollar);

  // 4 Flush-Mounted Corner Stabilizer Buttress Fins on Pedestal
  const buttressGeo = getCachedGeo('cyber_plinth_buttress', () => {
    const s = new THREE.Shape();
    s.moveTo(0.24, 0.01);
    s.lineTo(0.39, 0.01);
    s.lineTo(0.36, 0.12);
    s.lineTo(0.25, 0.175);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.028,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.006,
      bevelThickness: 0.006
    });
    g.translate(0, 0, -0.014);
    return g;
  });
  for (let i = 0; i < 4; i++) {
    const buttress = new THREE.Mesh(buttressGeo, trimMat);
    buttress.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rig.add(buttress);
  }

  // 2. Sculpted Hourglass Paladin Cuirass, Waist Tassets, Gorget & Flush Chest Crest
  const topY = 0.69 * h;
  const torsoGeo = getCachedGeo(`cyber_torso_v2_${type}`, () =>
    buildSculptedLathe(
      [
        [0.0, 0.16],
        [0.245, 0.175],
        [0.215, 0.29 * h],
        [0.155, 0.42 * h], // Armored waist
        [0.215, 0.55 * h], // Broad Paladin breastplate
        [0.235, 0.62 * h], // Upper chest & shoulder shelf
        [0.165, 0.675 * h],
        [0.155, topY],
        [0.0, topY]
      ],
      {
        sampleCount: 56,
        radialSegments: 52,
        fluteCount: 8,
        fluteDepth: 0.008,
        fluteYMin: 0.20,
        fluteYMax: 0.60 * h
      }
    )
  );
  rig.add(new THREE.Mesh(torsoGeo, primaryMat));

  // Waist Belt Molding & Collar Gorget Ring (solidly seated on torso)
  const beltRing = new THREE.Mesh(
    getCachedGeo('cyber_waist_belt', () => new THREE.TorusGeometry(0.162, 0.015, 16, 48)),
    trimMat
  );
  beltRing.rotation.x = Math.PI / 2;
  beltRing.position.y = 0.42 * h;
  rig.add(beltRing);

  const gorgetRing = new THREE.Mesh(
    getCachedGeo('cyber_gorget_ring', () => new THREE.TorusGeometry(0.178, 0.016, 18, 48)),
    trimMat
  );
  gorgetRing.rotation.x = Math.PI / 2;
  gorgetRing.position.y = 0.675 * h;
  rig.add(gorgetRing);

  // Flush-Mounted Chest Aegis Emblem (seated cleanly on the front breastplate, never floating!)
  const chestFrameGeo = getCachedGeo('cyber_chest_frame', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.075);
    s.lineTo(0.062, 0.015);
    s.lineTo(0, -0.085);
    s.lineTo(-0.062, 0.015);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.022,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.006,
      bevelThickness: 0.006
    });
    g.translate(0, 0, -0.011);
    return g;
  });
  const chestFrame = new THREE.Mesh(chestFrameGeo, trimMat);
  chestFrame.position.set(0, 0.55 * h, 0.212);
  chestFrame.rotation.x = -0.16;
  rig.add(chestFrame);

  const chestGemGeo = getCachedGeo('cyber_chest_gem', () => {
    const g = new THREE.OctahedronGeometry(0.036, 1);
    g.scale(0.85, 1.25, 0.45);
    return g;
  });
  const chestGem = new THREE.Mesh(chestGemGeo, bladeMat);
  chestGem.position.set(0, 0.55 * h, 0.224);
  chestGem.rotation.x = -0.16;
  rig.add(chestGem);

  // ==========================================================================
  // CYBER-ARCANE LASER SHADER & MULTI-STAGE 3D LASER BEAM EMITTER SYSTEM
  // (Replaces all melee swords/daggers/halberds with detailed sci-fi laser cannons)
  // ==========================================================================
  const createCyberLaserMaterials = () => {
    const createBeamShader = (coreHex, midHex, edgeHex, speedMul = 1.0, opacity = 0.94) => {
      const uniforms = {
        uTime: { value: 0 },
        uPulse: { value: 1.0 },
        uCoreColor: { value: new THREE.Color(coreHex) },
        uMidColor: { value: new THREE.Color(midHex) },
        uEdgeColor: { value: new THREE.Color(edgeHex) },
        uSpeed: { value: speedMul },
        uOpacity: { value: opacity }
      };
      dragonFireUniformsList.push(uniforms);

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uPulse;
          uniform vec3 uCoreColor;
          uniform vec3 uMidColor;
          uniform vec3 uEdgeColor;
          uniform float uSpeed;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = clamp(abs(dot(normal, viewDir)), 0.0, 1.0);

            // High-speed photon wave packets racing along the laser beam (+Y in cylinder UV)
            float wave1 = 0.5 + 0.5 * sin(vUv.y * 42.0 - uTime * 34.0 * uSpeed);
            float wave2 = 0.5 + 0.5 * cos(vUv.y * 78.0 - uTime * 52.0 * uSpeed + vUv.x * 12.566);
            float hexBand = smoothstep(0.25, 0.95, wave1 * 0.65 + wave2 * 0.35);

            float tipFade = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.86, 1.0, vUv.y));
            float coreFactor = pow(fresnel, 1.65);

            vec3 col = mix(uEdgeColor, uMidColor, smoothstep(0.1, 0.65, fresnel));
            col = mix(col, uCoreColor, coreFactor * (0.65 + 0.35 * hexBand));

            float alpha = clamp(tipFade * pow(fresnel, 0.55) * (0.72 + 0.28 * hexBand) * uOpacity * uPulse, 0.0, 1.0);
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(col * (2.15 + 0.65 * hexBand), alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
    };

    return {
      coreBeamMat: createBeamShader('#ffffff', '#b8fff9', '#00f5d4', 1.25, 0.98),
      sheathBeamMat: createBeamShader('#00f5d4', '#00bbf9', '#7209b7', 0.95, 0.86),
      helixMat: new THREE.MeshBasicMaterial({
        color: 0x80ffea,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      reticleCyanMat: new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      reticleVioletMat: new THREE.MeshBasicMaterial({
        color: 0x9d4edd,
        transparent: true,
        opacity: 0.90,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      }),
      sparkWhiteMat: new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    };
  };

  const cyberLaserMats = createCyberLaserMaterials();

  const markAsCyberLaserVfx = (obj) => {
    obj.userData.excludeFromBounds = true;
    obj.traverse((ch) => {
      ch.userData.excludeFromBounds = true;
      if (ch.isMesh) {
        ch.userData.isCyberLaser = true;
      }
    });
    return obj;
  };

  /**
   * Builds a multi-stage 3D Laser Beam Emitter assembly anchored at a cannon muzzle (+Z forward):
   * 1. Muzzle Overcharge Capacitor Sphere & Inward-Imploding Charge Particles
   * 2. 3 Staggered Holographic Hexagonal Target-Lock & Collimator Lenses
   * 3. Coherent White-Cyan Inner Laser Core Beam
   * 4. Scrolling GLSL Plasma-Laser Outer Sheath
   * 5. Dual Counter-Rotating Helical Laser Coils wrapping the beam
   * 6. 6 Travelling Collimator Shockwave Rings & Target-Impact Supernova Flare + Ion Sparks
   */
  const buildCyberLaserBeamEmitter = (beamScale = 1.0, beamLength = 1.38) => {
    const emitterGroup = new THREE.Group();
    emitterGroup.scale.setScalar(beamScale);

    // 1. Muzzle Capacitor Charge Orb
    const chargeOrbGeo = getCachedGeo('cyber_laser_charge_orb', () => new THREE.OctahedronGeometry(0.036, 2));
    const chargeOrb = new THREE.Mesh(chargeOrbGeo, cyberLaserMats.coreBeamMat);
    chargeOrb.scale.setScalar(0.18);
    emitterGroup.add(chargeOrb);

    // 2. 3 Holographic Hexagonal Target-Lock & Collimator Lens Rings in front of muzzle
    const hexLensGeo = getCachedGeo('cyber_laser_hex_lens', () => new THREE.RingGeometry(0.034, 0.052, 6));
    const innerTickGeo = getCachedGeo('cyber_laser_circle_lens', () => new THREE.RingGeometry(0.022, 0.028, 24));
    const reticleRings = [];
    for (let r = 0; r < 3; r++) {
      const rGroup = new THREE.Group();
      rGroup.position.z = 0.03 + r * 0.075;
      const hexRing = new THREE.Mesh(
        hexLensGeo,
        r % 2 === 0 ? cyberLaserMats.reticleCyanMat : cyberLaserMats.reticleVioletMat
      );
      const innerRing = new THREE.Mesh(innerTickGeo, cyberLaserMats.sparkWhiteMat);
      innerRing.position.z = 0.002;
      rGroup.add(hexRing, innerRing);
      rGroup.scale.setScalar(0.01);
      emitterGroup.add(rGroup);
      reticleRings.push({
        group: rGroup,
        baseZ: 0.03 + r * 0.075,
        idx: r
      });
    }

    // 3. Coherent Inner Laser Core Beam & Scrolling GLSL Outer Plasma Sheath (extending forward along +Z)
    const coreCylGeo = getCachedGeo('cyber_laser_core_cyl_v2', () => {
      const g = new THREE.CylinderGeometry(0.018, 0.022, 1.0, 16, 12, true);
      g.translate(0, 0.5, 0);
      g.rotateX(Math.PI / 2);
      return g;
    });
    const sheathCylGeo = getCachedGeo('cyber_laser_sheath_cyl_v2', () => {
      const g = new THREE.CylinderGeometry(0.044, 0.052, 1.0, 20, 16, true);
      g.translate(0, 0.5, 0);
      g.rotateX(Math.PI / 2);
      return g;
    });

    const coreBeamMesh = new THREE.Mesh(coreCylGeo, cyberLaserMats.coreBeamMat);
    coreBeamMesh.scale.set(0.001, 0.001, 0.001);
    emitterGroup.add(coreBeamMesh);

    const sheathBeamMesh = new THREE.Mesh(sheathCylGeo, cyberLaserMats.sheathBeamMat);
    sheathBeamMesh.scale.set(0.001, 0.001, 0.001);
    emitterGroup.add(sheathBeamMesh);

    // 4. Dual Counter-Rotating Helical Laser Coils wrapping the main beam
    const helixGeoA = getCachedGeo('cyber_laser_helix_a', () => {
      const pts = [];
      for (let i = 0; i <= 36; i++) {
        const u = i / 36;
        const ang = u * Math.PI * 8.0;
        const r = 0.036 * (0.65 + 0.35 * Math.sin(u * Math.PI));
        pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, u * 1.0));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0055, 8, false);
    });
    const helixGeoB = getCachedGeo('cyber_laser_helix_b', () => {
      const pts = [];
      for (let i = 0; i <= 36; i++) {
        const u = i / 36;
        const ang = -u * Math.PI * 8.0 + Math.PI;
        const r = 0.042 * (0.65 + 0.35 * Math.sin(u * Math.PI));
        pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, u * 1.0));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.0045, 8, false);
    });

    const helixMeshA = new THREE.Mesh(helixGeoA, cyberLaserMats.helixMat);
    helixMeshA.scale.set(0.001, 0.001, 0.001);
    emitterGroup.add(helixMeshA);

    const helixMeshB = new THREE.Mesh(helixGeoB, cyberLaserMats.reticleVioletMat);
    helixMeshB.scale.set(0.001, 0.001, 0.001);
    emitterGroup.add(helixMeshB);

    // 5. 6 Travelling Collimator Shockwave Pulse Rings racing down the beam
    const pulseRingGeo = getCachedGeo('cyber_laser_pulse_torus', () => new THREE.TorusGeometry(0.048, 0.005, 10, 24));
    const pulseRings = [];
    for (let p = 0; p < 6; p++) {
      const pr = new THREE.Mesh(
        pulseRingGeo,
        p % 2 === 0 ? cyberLaserMats.sparkWhiteMat : cyberLaserMats.reticleCyanMat
      );
      pr.scale.setScalar(0.001);
      emitterGroup.add(pr);
      pulseRings.push({
        mesh: pr,
        phaseOffset: p / 6
      });
    }

    // 6. Target-End Impact Supernova Flare & 10 Ricocheting Laser Ion Sparks
    const impactGroup = new THREE.Group();
    impactGroup.scale.setScalar(0.001);
    emitterGroup.add(impactGroup);

    const impactCore = new THREE.Mesh(chargeOrbGeo, cyberLaserMats.sparkWhiteMat);
    impactCore.scale.setScalar(1.45);
    impactGroup.add(impactCore);

    const impactHalo = new THREE.Mesh(hexLensGeo, cyberLaserMats.reticleCyanMat);
    impactHalo.scale.setScalar(2.1);
    impactGroup.add(impactHalo);

    const ionSparkGeo = getCachedGeo('cyber_laser_ion_spark', () => {
      const g = new THREE.OctahedronGeometry(0.012, 0);
      g.scale(0.55, 0.55, 2.2);
      return g;
    });
    const ionSparks = [];
    for (let s = 0; s < 10; s++) {
      const sp = new THREE.Mesh(
        ionSparkGeo,
        s % 2 === 0 ? cyberLaserMats.sparkWhiteMat : cyberLaserMats.reticleCyanMat
      );
      impactGroup.add(sp);
      ionSparks.push({
        mesh: sp,
        angle: (s / 10) * Math.PI * 2,
        phase: s / 10,
        speed: 2.6 + (s % 3) * 0.55
      });
    }

    markAsCyberLaserVfx(emitterGroup);
    animParts.push({
      mesh: emitterGroup,
      kind: 'cyberLaserBeam',
      beamLength,
      chargeOrb,
      reticleRings,
      coreBeamMesh,
      sheathBeamMesh,
      helixMeshA,
      helixMeshB,
      pulseRings,
      impactGroup,
      impactHalo,
      ionSparks
    });

    return emitterGroup;
  };

  /**
   * Builds an Intricate Articulated 3D Sci-Fi Laser Cannon / Magnetic Railgun Pod:
   * - Armored Servo Gimbal Receiver Housing
   * - Upper & Lower Magnetic Railgun Accelerator Tracks with Glowing Plasma Induction Coils
   * - 4 Angled Thermal Radiator / Cooling Fins
   * - Telescoping Hexagonal Collimator Barrel & Muzzle Brake (recoils hydraulically during laser fire)
   * - Top-Mounted Holographic Hex Optic Sight
   * - Integrated 3D Multi-Stage Laser Beam Emitter at the Muzzle
   */
  const buildCyberLaserCannonUnit = (options = {}) => {
    const {
      x = 0.22,
      y = 0.48 * h,
      z = 0.12,
      scale = 1.0,
      beamLength = 1.38,
      baseRotX = 0,
      baseRotY = 0,
      baseRotZ = 0
    } = options;

    const cannonRoot = new THREE.Group();
    cannonRoot.position.set(x, y, z);
    cannonRoot.rotation.set(baseRotX, baseRotY, baseRotZ);
    cannonRoot.scale.setScalar(scale);
    rig.add(cannonRoot);

    // 1. Armored Servo Gimbal Shoulder/Flank Mount & Receiver Housing
    const receiverGeo = getCachedGeo('cyber_cannon_receiver', () => {
      const g = new THREE.BoxGeometry(0.088, 0.105, 0.24);
      return g;
    });
    const receiver = new THREE.Mesh(receiverGeo, primaryMat);
    cannonRoot.add(receiver);

    const gimbalCollar = new THREE.Mesh(
      getCachedGeo('cyber_cannon_gimbal', () => new THREE.CylinderGeometry(0.056, 0.062, 0.11, 16)),
      trimMat
    );
    gimbalCollar.rotation.z = Math.PI / 2;
    gimbalCollar.position.set(0, 0, -0.05);
    cannonRoot.add(gimbalCollar);

    // 2. Plasma Capacitor Core Cell & 4 Angled Thermal Radiator Fins on Receiver
    const capacitorCell = new THREE.Mesh(
      getCachedGeo('cyber_cannon_capacitor', () => new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12)),
      bladeMat
    );
    capacitorCell.rotation.x = Math.PI / 2;
    capacitorCell.position.set(0, -0.048, -0.02);
    cannonRoot.add(capacitorCell);

    const finGeo = getCachedGeo('cyber_cannon_radiator_fin', () => new THREE.BoxGeometry(0.012, 0.065, 0.045));
    for (const side of [-1, 1]) {
      for (let f = 0; f < 2; f++) {
        const fin = new THREE.Mesh(finGeo, trimMat);
        fin.position.set(side * 0.052, 0.032, -0.06 + f * 0.07);
        fin.rotation.z = -side * 0.38;
        cannonRoot.add(fin);
      }
    }

    // 3. Top-Mounted Holographic Hexagonal Optic Target Sight
    const opticMount = new THREE.Mesh(
      getCachedGeo('cyber_cannon_optic_ring', () => new THREE.TorusGeometry(0.028, 0.005, 10, 6)),
      bladeMat
    );
    opticMount.position.set(0, 0.078, 0.04);
    cannonRoot.add(opticMount);

    // 4. Recoiling Telescoping Barrel & Magnetic Railgun Accelerator Tracks
    const barrelAssembly = new THREE.Group();
    barrelAssembly.position.set(0, 0, 0.08);
    cannonRoot.add(barrelAssembly);

    // Central Hexagonal Collimator Barrel Tube
    const mainBarrel = new THREE.Mesh(
      getCachedGeo('cyber_cannon_hex_barrel', () => {
        const g = new THREE.CylinderGeometry(0.024, 0.030, 0.28, 6);
        g.rotateX(Math.PI / 2);
        g.translate(0, 0, 0.14);
        return g;
      }),
      bladeMat
    );
    barrelAssembly.add(mainBarrel);

    // Upper & Lower Parallel Magnetic Railgun Accelerator Bars
    const railTrackGeo = getCachedGeo('cyber_cannon_rail_track', () => {
      const g = new THREE.BoxGeometry(0.032, 0.020, 0.31);
      g.translate(0, 0, 0.155);
      return g;
    });
    const upperRail = new THREE.Mesh(railTrackGeo, trimMat);
    upperRail.position.y = 0.036;
    barrelAssembly.add(upperRail);

    const lowerRail = new THREE.Mesh(railTrackGeo, trimMat);
    lowerRail.position.y = -0.036;
    barrelAssembly.add(lowerRail);

    // 3 Glowing Magnetic Induction Focusing Coils around the Barrel
    const coilGeo = getCachedGeo('cyber_cannon_induction_coil', () => new THREE.TorusGeometry(0.040, 0.0065, 12, 6));
    for (let c = 0; c < 3; c++) {
      const coil = new THREE.Mesh(coilGeo, c % 2 === 0 ? bladeMat : trimMat);
      coil.position.z = 0.07 + c * 0.085;
      barrelAssembly.add(coil);
    }

    // Flared Hexagonal Muzzle Brake Crown at Barrel Tip (z = 0.30)
    const muzzleCrown = new THREE.Mesh(
      getCachedGeo('cyber_cannon_muzzle_crown', () => {
        const g = new THREE.CylinderGeometry(0.046, 0.034, 0.048, 6);
        g.rotateX(Math.PI / 2);
        return g;
      }),
      trimMat
    );
    muzzleCrown.position.z = 0.295;
    barrelAssembly.add(muzzleCrown);

    // 5. Integrated Multi-Stage 3D Laser Beam Emitter at the Muzzle Tip
    const beamEmitter = buildCyberLaserBeamEmitter(1.0, beamLength);
    beamEmitter.position.set(0, 0, 0.32);
    barrelAssembly.add(beamEmitter);

    animParts.push({
      mesh: cannonRoot,
      barrelAssembly,
      opticMount,
      kind: 'cyberLaserCannon',
      baseX: x,
      baseY: y,
      baseZ: z,
      baseRotX,
      baseRotY,
      baseRotZ
    });

    return cannonRoot;
  };

  // Articulated Chest Overdrive Laser Core Emitter (seated on the front breastplate, fires synchronized chest beam!)
  const cannonGroup = new THREE.Group();
  cannonGroup.position.set(0, 0.55 * h, 0.226);
  rig.add(cannonGroup);

  const cannonMuzzleRing = new THREE.Mesh(
    getCachedGeo('cyber_chest_cannon_muzzle', () => new THREE.TorusGeometry(0.054, 0.009, 12, 6)),
    bladeMat
  );
  cannonMuzzleRing.scale.setScalar(0.45);
  cannonGroup.add(cannonMuzzleRing);

  const chestLaserEmitter = buildCyberLaserBeamEmitter(0.82, 1.28);
  chestLaserEmitter.position.set(0, 0, 0.02);
  cannonGroup.add(chestLaserEmitter);

  animParts.push({
    mesh: cannonGroup,
    kind: 'cyberChestCannon',
    chestGem,
    muzzleRing: cannonMuzzleRing,
    baseY: 0.55 * h,
    baseZ: 0.226
  });

  // Sculpted Layered Pauldrons & Hip Tasset Plates (-X and +X)
  const pauldronGeo = getCachedGeo('cyber_pauldron_v2', () => {
    const g = new THREE.SphereGeometry(0.128, 24, 20, 0, Math.PI * 1.15, 0, Math.PI * 0.62);
    g.scale(1.12, 0.88, 0.96);
    return g;
  });
  const tassetGeo = getCachedGeo('cyber_hip_tasset', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.055, 0.06);
    s.lineTo(0.055, 0.06);
    s.lineTo(0.07, -0.06);
    s.lineTo(0, -0.11);
    s.lineTo(-0.07, -0.06);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.018,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.005,
      bevelThickness: 0.005
    });
    g.translate(0, 0, -0.009);
    return g;
  });

  for (const s of [-1, 1]) {
    const pauldron = new THREE.Mesh(pauldronGeo, trimMat);
    pauldron.position.set(s * 0.195, 0.61 * h, 0);
    pauldron.rotation.z = -s * 0.42;
    pauldron.rotation.y = s > 0 ? 0 : Math.PI;
    rig.add(pauldron);

    const tasset = new THREE.Mesh(tassetGeo, trimMat);
    tasset.position.set(s * 0.185, 0.34 * h, 0);
    tasset.rotation.y = s * (Math.PI / 2);
    tasset.rotation.z = s * 0.18;
    rig.add(tasset);
  }

  // Helper: Swept Feathered Valkyrie Energy Wings (anchored cleanly to a dorsal backplate)
  const addValkyrieWings = (yPos, wingScale = 1.0, featherCount = 6) => {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(0, yPos, -0.14);
    rig.add(wingGroup);

    // Solid Dorsal Wing Mount Bracket connecting wings to backplate
    const mountBracket = new THREE.Mesh(
      getCachedGeo('cyber_wing_mount', () => new THREE.CylinderGeometry(0.055, 0.07, 0.12, 16)),
      trimMat
    );
    mountBracket.rotation.x = Math.PI / 2;
    mountBracket.position.set(0, 0.02, 0.04);
    wingGroup.add(mountBracket);

    const featherGeo = getCachedGeo('cyber_valkyrie_feather_v2', () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.bezierCurveTo(0.055, 0.08, 0.095, 0.28, 0.018, 0.45);
      s.bezierCurveTo(-0.022, 0.32, -0.028, 0.14, 0, 0);
      return new THREE.ExtrudeGeometry(s, {
        depth: 0.014,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.005,
        bevelThickness: 0.005
      });
    });

    for (const side of [-1, 1]) {
      for (let f = 0; f < featherCount; f++) {
        const u = f / Math.max(1, featherCount - 1);
        const feather = new THREE.Mesh(featherGeo, f % 2 === 0 ? bladeMat : trimMat);
        feather.scale.set(side * wingScale * (1.04 - u * 0.30), wingScale * (1.08 - u * 0.26), 1);
        feather.position.set(side * (0.09 + u * 0.13) * wingScale, 0.04 - u * 0.07, -0.01 - u * 0.015);
        feather.rotation.z = -side * (0.35 + u * 0.68);
        feather.rotation.y = -side * 0.20;
        wingGroup.add(feather);
      }
    }
    animParts.push({ mesh: wingGroup, kind: 'wingPulse', baseY: yPos });
  };

  if (type === 'pawn') {
    // Aegis Vanguard Sentinel: Corinthian-Cyber Great-Helm, Plume Crest, Holographic Shield & Arm-Mounted Pulse-Laser Rail-Carbine (no halberd/blade!)
    const helmGeo = getCachedGeo('cyber_pawn_helm_v2', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.145, 0.01],
          [0.172, 0.10],
          [0.168, 0.21],
          [0.125, 0.29],
          [0.0, 0.32]
        ],
        40,
        44
      )
    );
    const helm = new THREE.Mesh(helmGeo, primaryMat);
    helm.position.y = topY - 0.01;
    rig.add(helm);

    // Flush Glowing Visor Band & Gold Brow Guard
    const visor = new THREE.Mesh(
      getCachedGeo(
        'cyber_pawn_visor_v2',
        () => new THREE.CylinderGeometry(0.173, 0.170, 0.044, 32, 1, false, -Math.PI * 0.36, Math.PI * 0.72)
      ),
      bladeMat
    );
    visor.position.y = topY + 0.145;
    rig.add(visor);

    const browBand = new THREE.Mesh(
      getCachedGeo('cyber_pawn_brow', () => new THREE.TorusGeometry(0.168, 0.012, 14, 40)),
      trimMat
    );
    browBand.rotation.x = Math.PI / 2;
    browBand.position.y = topY + 0.175;
    rig.add(browBand);

    // Swept Dorsal Helmet Crest Fin (anchored cleanly along top of helmet)
    const crestGeo = getCachedGeo('cyber_pawn_crest_fin', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.12, 0.20);
      s.bezierCurveTo(-0.14, 0.34, 0.02, 0.42, 0.14, 0.27);
      s.bezierCurveTo(0.06, 0.25, -0.04, 0.22, -0.12, 0.20);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.018,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.005,
        bevelThickness: 0.005
      });
      g.translate(0, 0, -0.009);
      g.rotateY(-Math.PI / 2);
      return g;
    });
    const crest = new THREE.Mesh(crestGeo, trimMat);
    crest.position.y = topY;
    rig.add(crest);

    // Sculpted Crusader Kite Shield (-X) with Gold Trim & Glowing Laser Emitter Boss
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.215, 0.46 * h, 0.11);
    shieldGroup.rotation.y = -0.32;
    rig.add(shieldGroup);

    const shieldGeo = getCachedGeo('cyber_kite_shield_v2', () => {
      const s = new THREE.Shape();
      s.moveTo(0, -0.20);
      s.bezierCurveTo(0.115, -0.10, 0.14, 0.08, 0.11, 0.18);
      s.lineTo(0, 0.21);
      s.lineTo(-0.11, 0.18);
      s.bezierCurveTo(-0.14, 0.08, -0.115, -0.10, 0, -0.20);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.018,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.007,
        bevelThickness: 0.007
      });
      g.translate(0, 0, -0.009);
      return g;
    });
    shieldGroup.add(new THREE.Mesh(shieldGeo, trimMat));

    const shieldCore = new THREE.Mesh(shieldGeo, primaryMat);
    shieldCore.scale.set(0.84, 0.86, 1.05);
    shieldCore.position.z = 0.003;
    shieldGroup.add(shieldCore);

    const shieldBoss = new THREE.Mesh(chestGemGeo, bladeMat);
    shieldBoss.position.set(0, 0.02, 0.018);
    shieldGroup.add(shieldBoss);

    animParts.push({
      mesh: shieldGroup,
      kind: 'cyberShield',
      baseX: -0.215,
      baseY: 0.46 * h,
      baseZ: 0.11,
      baseRotY: -0.32
    });

    // Right-Arm Articulated Pulse-Laser Rail-Carbine (+X)
    buildCyberLaserCannonUnit({
      x: 0.215,
      y: 0.50 * h,
      z: 0.11,
      scale: 0.86,
      beamLength: 1.32
    });
  } else if (type === 'rook') {
    // Aegis Citadel Bastion: Solid Flared Cyber-Turret Crown, 6 Merlons, Twin Siege Laser Cannons & Central Tesla Pylon
    const turretGeo = getCachedGeo('cyber_rook_turret_v2', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.175, 0.0],
          [0.245, 0.06],
          [0.265, 0.14],
          [0.27, 0.25],
          [0.20, 0.25],
          [0.19, 0.17],
          [0.0, 0.17]
        ],
        48,
        52
      )
    );
    const turret = new THREE.Mesh(turretGeo, primaryMat);
    turret.position.y = topY - 0.01;
    rig.add(turret);

    // Recessed Glowing Conduit Ring & Gold Corbel Collar on Turret
    const turretGlowRing = new THREE.Mesh(
      getCachedGeo('cyber_rook_glow_ring', () => new THREE.TorusGeometry(0.264, 0.013, 16, 52)),
      bladeMat
    );
    turretGlowRing.rotation.x = Math.PI / 2;
    turretGlowRing.position.y = topY + 0.135;
    rig.add(turretGlowRing);

    const turretGoldRing = new THREE.Mesh(
      getCachedGeo('cyber_rook_gold_ring', () => new THREE.TorusGeometry(0.252, 0.015, 16, 52)),
      trimMat
    );
    turretGoldRing.rotation.x = Math.PI / 2;
    turretGoldRing.position.y = topY + 0.065;
    rig.add(turretGoldRing);

    // 6 Sculpted Cyber-Battlement Merlons & External Gold Buttress Plates around Turret Rim
    const merlonCount = 6;
    const merlonArc = (Math.PI * 2) / merlonCount;
    const cyberMerlonGeo = getCachedGeo('cyber_rook_merlon_v2', () => {
      const s = new THREE.Shape();
      const rOut = 0.272;
      const rIn = 0.198;
      const halfA = merlonArc * 0.33;
      s.absarc(0, 0, rOut, -halfA, halfA, false);
      s.absarc(0, 0, rIn, halfA, -halfA, true);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.11,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.007,
        bevelThickness: 0.007
      });
      g.rotateX(-Math.PI / 2);
      return g;
    });

    const buttressPlateGeo = getCachedGeo('cyber_rook_buttress_plate', () => {
      const g = new THREE.BoxGeometry(0.036, 0.26, 0.042);
      return g;
    });

    for (let i = 0; i < merlonCount; i++) {
      const ang = i * merlonArc;
      const merlon = new THREE.Mesh(cyberMerlonGeo, primaryMat);
      merlon.position.y = topY + 0.235;
      merlon.rotation.y = ang;
      rig.add(merlon);

      const plate = new THREE.Mesh(buttressPlateGeo, trimMat);
      plate.position.set(Math.cos(ang) * 0.258, topY + 0.19, Math.sin(ang) * 0.258);
      plate.rotation.y = -ang + Math.PI / 2;
      rig.add(plate);
    }

    // Seated Central Hexagonal Arcane Spire Pylon (firmly mounted in a gold socket on turret deck)
    const pylonSocket = new THREE.Mesh(
      getCachedGeo('cyber_rook_socket', () => new THREE.CylinderGeometry(0.095, 0.125, 0.07, 6)),
      trimMat
    );
    pylonSocket.position.y = topY + 0.185;
    rig.add(pylonSocket);

    const pylonSpire = new THREE.Mesh(
      getCachedGeo('cyber_rook_pylon', () => new THREE.CylinderGeometry(0.018, 0.078, 0.22, 6)),
      bladeMat
    );
    pylonSpire.position.y = topY + 0.31;
    rig.add(pylonSpire);

    animParts.push({
      mesh: pylonSpire,
      kind: 'cyberTurretPylon',
      socketMesh: pylonSocket,
      baseY: topY + 0.31,
      socketBaseY: topY + 0.185
    });

    // Twin Flanking Heavy Siege Laser Cannons mounted on the Citadel Bastion shoulders
    for (const s of [-1, 1]) {
      buildCyberLaserCannonUnit({
        x: s * 0.22,
        y: topY + 0.08,
        z: 0.12,
        scale: 0.82,
        beamLength: 1.38
      });
    }
  } else if (type === 'knight') {
    // Mecha-Pegasus Valkyrie Charger: Sculpted Armored Warhorse Bust, Twin Wing-Root Laser Pods & Optic Horn Laser Emitter
    addValkyrieWings(topY - 0.07, 0.90, 6);

    const pegasusGroup = new THREE.Group();
    pegasusGroup.position.y = topY - 0.04;
    rig.add(pegasusGroup);

    // Sculpted Arched Neck
    const neckGeo = getCachedGeo('cyber_pegasus_neck_v2', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0.0, -0.01),
          new THREE.Vector3(0, 0.14, -0.05),
          new THREE.Vector3(0, 0.29, -0.02),
          new THREE.Vector3(0, 0.38, 0.05)
        ],
        0.165,
        0.105,
        32,
        24
      )
    );
    pegasusGroup.add(new THREE.Mesh(neckGeo, primaryMat));

    // Sculpted Armored Equine Head & Muzzle
    const headGeo = getCachedGeo('cyber_pegasus_head_v2', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.07, 0.24);
      s.bezierCurveTo(-0.11, 0.35, -0.04, 0.45, 0.05, 0.44);
      s.bezierCurveTo(0.14, 0.42, 0.21, 0.35, 0.26, 0.28);
      s.bezierCurveTo(0.27, 0.24, 0.24, 0.20, 0.19, 0.20);
      s.bezierCurveTo(0.13, 0.20, 0.08, 0.22, 0.04, 0.20);
      s.bezierCurveTo(-0.01, 0.18, -0.05, 0.19, -0.07, 0.24);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.10,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 2,
        bevelSize: 0.032,
        bevelThickness: 0.036
      });
      g.translate(0, 0, -0.05);
      g.rotateY(-Math.PI / 2);
      return g;
    });
    pegasusGroup.add(new THREE.Mesh(headGeo, primaryMat));

    // Golden Chanfron Armor Crest along Nose Bridge
    const chanfronGeo = getCachedGeo('cyber_pegasus_chanfron', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0.44, 0.02),
          new THREE.Vector3(0, 0.39, 0.14),
          new THREE.Vector3(0, 0.30, 0.26)
        ],
        0.042,
        0.020,
        20,
        14
      )
    );
    pegasusGroup.add(new THREE.Mesh(chanfronGeo, trimMat));

    // Seated Valkyrie Optic Laser-Horn on Forehead + Integrated Horn Laser Beam Emitter
    const hornGeo = getCachedGeo('cyber_pegasus_horn_v2', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0.41, 0.08),
          new THREE.Vector3(0, 0.50, 0.19),
          new THREE.Vector3(0, 0.58, 0.29)
        ],
        0.028,
        0.006,
        20,
        14
      )
    );
    pegasusGroup.add(new THREE.Mesh(hornGeo, bladeMat));

    const hornLaserEmitter = buildCyberLaserBeamEmitter(0.84, 1.32);
    hornLaserEmitter.position.set(0, 0.58, 0.29);
    pegasusGroup.add(hornLaserEmitter);

    // Alert Ears & Glowing Cyber-Optic Eyes
    const earGeo = getCachedGeo('cyber_pegasus_ear', () => new THREE.ConeGeometry(0.028, 0.10, 14));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, trimMat);
      ear.position.set(s * 0.048, 0.46, -0.01);
      ear.rotation.x = 0.20;
      ear.rotation.z = -s * 0.16;
      pegasusGroup.add(ear);

      const eye = new THREE.Mesh(
        getCachedGeo('cyber_pegasus_eye', () => new THREE.SphereGeometry(0.018, 12, 12)),
        bladeMat
      );
      eye.position.set(s * 0.072, 0.36, 0.08);
      pegasusGroup.add(eye);
    }

    // 7 Articulated Metallic Mane Fins seated directly along Neck Spine
    const maneFinGeo = getCachedGeo('cyber_mane_blade_v2', () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.lineTo(0.025, 0.04);
      s.lineTo(-0.075, 0.09);
      s.lineTo(-0.095, 0.02);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.016,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.004,
        bevelThickness: 0.004
      });
      g.translate(0, 0, -0.008);
      g.rotateY(-Math.PI / 2);
      return g;
    });
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      const fin = new THREE.Mesh(maneFinGeo, i % 2 === 0 ? trimMat : bladeMat);
      fin.position.set(0, 0.06 + u * 0.33, -0.06 - Math.sin(u * Math.PI) * 0.03);
      pegasusGroup.add(fin);
    }
    animParts.push({ mesh: pegasusGroup, kind: 'headNod' });

    // Twin Wing-Root Articulated Pulse-Laser Cannons flanking the Mecha-Pegasus shoulders
    for (const s of [-1, 1]) {
      buildCyberLaserCannonUnit({
        x: s * 0.215,
        y: 0.56 * h,
        z: 0.10,
        scale: 0.78,
        beamLength: 1.34
      });
    }
  } else if (type === 'bishop') {
    // Chronomancer Archon: Sculpted Gothic-Cyber Split Mitre Crown, Sunburst Halo & Twin-Lens Chronometric Laser Projector
    const mitreGeo = getCachedGeo('cyber_bishop_mitre_v2', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.16, 0.01],
          [0.205, 0.11],
          [0.195, 0.23],
          [0.145, 0.34],
          [0.075, 0.42],
          [0.0, 0.46]
        ],
        52,
        52
      )
    );
    const mitre = new THREE.Mesh(mitreGeo, primaryMat);
    mitre.position.y = topY - 0.01;
    rig.add(mitre);

    // Golden Mitre Circlet Brow Band & Vertical Orphrey Rib
    const mitreCirclet = new THREE.Mesh(
      getCachedGeo('cyber_bishop_circlet', () => new THREE.TorusGeometry(0.202, 0.014, 16, 48)),
      trimMat
    );
    mitreCirclet.rotation.x = Math.PI / 2;
    mitreCirclet.position.y = topY + 0.115;
    rig.add(mitreCirclet);

    const frontRuneStrip = new THREE.Mesh(
      getCachedGeo('cyber_bishop_rune_strip', () =>
        buildTaperedCurveGeo(
          [
            new THREE.Vector3(0, 0.12, 0.20),
            new THREE.Vector3(0, 0.25, 0.185),
            new THREE.Vector3(0, 0.38, 0.11)
          ],
          0.020,
          0.010,
          20,
          12
        )
      ),
      bladeMat
    );
    frontRuneStrip.position.y = topY;
    rig.add(frontRuneStrip);

    // Seated Mitre Finial Star at Apex
    const apexOrb = new THREE.Mesh(
      getCachedGeo('cyber_bishop_apex_orb', () => new THREE.OctahedronGeometry(0.042, 1)),
      trimMat
    );
    apexOrb.position.y = topY + 0.475;
    rig.add(apexOrb);

    // Stationary Sacred Sunburst Halo mounted cleanly BEHIND the Mitre (-Z)
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, topY + 0.24, -0.14);
    rig.add(haloGroup);

    const haloRing = new THREE.Mesh(
      getCachedGeo('cyber_bishop_halo_ring', () => new THREE.TorusGeometry(0.21, 0.013, 16, 48)),
      trimMat
    );
    haloGroup.add(haloRing);

    const rayGeo = getCachedGeo('cyber_bishop_halo_ray', () => new THREE.ConeGeometry(0.018, 0.085, 8));
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(rayGeo, i % 2 === 0 ? bladeMat : trimMat);
      ray.position.set(Math.cos(ang) * 0.245, Math.sin(ang) * 0.245, 0);
      ray.rotation.z = ang - Math.PI / 2;
      haloGroup.add(ray);
    }

    animParts.push({
      mesh: haloGroup,
      kind: 'cyberHalo',
      baseY: topY + 0.24,
      baseZ: -0.14
    });

    // Right-Flank Articulated Chronometric Prism-Laser Cannon & Left-Shoulder Focuser Pod
    buildCyberLaserCannonUnit({
      x: 0.22,
      y: 0.54 * h,
      z: 0.12,
      scale: 0.90,
      beamLength: 1.40
    });
    buildCyberLaserCannonUnit({
      x: -0.22,
      y: 0.54 * h,
      z: 0.12,
      scale: 0.82,
      beamLength: 1.36
    });
  } else if (type === 'queen') {
    // Valkyrie Seraph Empress: Swept Seraph Wings, 8-Spire Royal Diadem & 4 Articulated Orbital Fin-Funnel Laser Cannons
    addValkyrieWings(topY - 0.04, 1.08, 7);

    // 1. Sculpted Seraph Empress Helm & Inner Crown Cushion Dome
    const headGeo = getCachedGeo('cyber_queen_head_v2', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.145, 0.01],
          [0.18, 0.11],
          [0.185, 0.20],
          [0.165, 0.28],
          [0.11, 0.33],
          [0.0, 0.35]
        ],
        48,
        52
      )
    );
    const head = new THREE.Mesh(headGeo, primaryMat);
    head.position.y = topY - 0.01;
    rig.add(head);

    // Sleek Glowing V-Visor on Empress Helm
    const queenVisor = new THREE.Mesh(
      getCachedGeo(
        'cyber_queen_visor_v2',
        () => new THREE.CylinderGeometry(0.184, 0.180, 0.042, 32, 1, false, -Math.PI * 0.34, Math.PI * 0.68)
      ),
      bladeMat
    );
    queenVisor.position.y = topY + 0.135;
    rig.add(queenVisor);

    // 2. Solid Seated Imperial Diadem Circlet Band (Double Gold Rim + Glowing Inlay)
    const crownBaseY = topY + 0.195;
    const diademLowerRim = new THREE.Mesh(
      getCachedGeo('cyber_queen_diadem_lower', () => new THREE.TorusGeometry(0.188, 0.016, 18, 52)),
      trimMat
    );
    diademLowerRim.rotation.x = Math.PI / 2;
    diademLowerRim.position.y = crownBaseY;
    rig.add(diademLowerRim);

    const diademGlowBand = new THREE.Mesh(
      getCachedGeo('cyber_queen_diadem_glow', () => new THREE.CylinderGeometry(0.194, 0.186, 0.042, 48)),
      bladeMat
    );
    diademGlowBand.position.y = crownBaseY + 0.024;
    rig.add(diademGlowBand);

    const diademUpperRim = new THREE.Mesh(
      getCachedGeo('cyber_queen_diadem_upper', () => new THREE.TorusGeometry(0.195, 0.014, 18, 52)),
      trimMat
    );
    diademUpperRim.rotation.x = Math.PI / 2;
    diademUpperRim.position.y = crownBaseY + 0.046;
    rig.add(diademUpperRim);

    // 3. 8 Sculpted Royal Coronet Spires + Pearl Tips
    const tallSpireGeo = getCachedGeo('cyber_queen_tall_spire_v2', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0.188, 0.0, 0),
          new THREE.Vector3(0.215, 0.09, 0),
          new THREE.Vector3(0.228, 0.18, 0)
        ],
        0.028,
        0.008,
        20,
        14
      )
    );
    const shortSpireGeo = getCachedGeo('cyber_queen_short_spire_v2', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0.188, 0.0, 0),
          new THREE.Vector3(0.205, 0.06, 0),
          new THREE.Vector3(0.212, 0.13, 0)
        ],
        0.024,
        0.007,
        18,
        14
      )
    );
    const crownPearlGeo = getCachedGeo('cyber_queen_pearl_v2', () => new THREE.SphereGeometry(0.022, 16, 16));

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const isTall = i % 2 === 0;
      const spire = new THREE.Mesh(isTall ? tallSpireGeo : shortSpireGeo, trimMat);
      spire.position.y = crownBaseY + 0.035;
      spire.rotation.y = ang;
      rig.add(spire);

      const pearlR = isTall ? 0.228 : 0.212;
      const pearlY = crownBaseY + 0.035 + (isTall ? 0.185 : 0.135);
      const pearl = new THREE.Mesh(crownPearlGeo, bladeMat);
      pearl.position.set(Math.cos(ang) * pearlR, pearlY, -Math.sin(ang) * pearlR);
      rig.add(pearl);
    }

    // 4. Central Royal Lotus Finial seated on top of the Empress Helm Dome
    const apexRing = new THREE.Mesh(
      getCachedGeo('cyber_queen_apex_collar', () => new THREE.TorusGeometry(0.055, 0.012, 14, 32)),
      trimMat
    );
    apexRing.rotation.x = Math.PI / 2;
    apexRing.position.y = topY + 0.34;
    rig.add(apexRing);

    const apexLotus = new THREE.Mesh(
      getCachedGeo('cyber_queen_apex_lotus', () => {
        const g = new THREE.OctahedronGeometry(0.048, 1);
        g.scale(0.85, 1.45, 0.85);
        return g;
      }),
      bladeMat
    );
    apexLotus.position.y = topY + 0.39;
    rig.add(apexLotus);

    // 5. 4 Articulated Seraph Fin-Funnel Laser Cannons flanking the Empress in a Valkyrie Halo
    for (const s of [-1, 1]) {
      buildCyberLaserCannonUnit({
        x: s * 0.23,
        y: 0.52 * h,
        z: 0.12,
        scale: 0.88,
        beamLength: 1.45
      });
      buildCyberLaserCannonUnit({
        x: s * 0.26,
        y: topY + 0.12,
        z: 0.02,
        scale: 0.76,
        beamLength: 1.42,
        baseRotX: 0.08
      });
    }
  } else if (type === 'king') {
    // Sovereign Prime Imperator: Grand Valkyrie Wings, Imperator Helm, Arched Imperial Crown &
    // Twin Shoulder Heavy Ion-Laser Railgun Pods + Twin Arm Prism-Laser Cannons (NO SWORD OR DAGGER!)
    addValkyrieWings(topY - 0.02, 1.18, 8);

    // 1. Sculpted Imperator Great-Helm
    const helmGeo = getCachedGeo('cyber_king_helm_v2', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.16, 0.01],
          [0.195, 0.11],
          [0.20, 0.21],
          [0.175, 0.29],
          [0.12, 0.34],
          [0.0, 0.35]
        ],
        48,
        52
      )
    );
    const helm = new THREE.Mesh(helmGeo, primaryMat);
    helm.position.y = topY - 0.01;
    rig.add(helm);

    // Glowing Sovereign Visor
    const visor = new THREE.Mesh(
      getCachedGeo(
        'cyber_king_visor_v2',
        () => new THREE.CylinderGeometry(0.201, 0.198, 0.048, 32, 1, false, -Math.PI * 0.35, Math.PI * 0.70)
      ),
      bladeMat
    );
    visor.position.y = topY + 0.135;
    rig.add(visor);

    // 2. Solid Imperial Crown Band Seated on the Great-Helm
    const crownBaseY = topY + 0.195;
    const crownLowerTorus = new THREE.Mesh(
      getCachedGeo('cyber_king_crown_lower', () => new THREE.TorusGeometry(0.204, 0.018, 18, 52)),
      trimMat
    );
    crownLowerTorus.rotation.x = Math.PI / 2;
    crownLowerTorus.position.y = crownBaseY;
    rig.add(crownLowerTorus);

    const crownInlayBand = new THREE.Mesh(
      getCachedGeo('cyber_king_crown_inlay', () => new THREE.CylinderGeometry(0.212, 0.202, 0.052, 48)),
      bladeMat
    );
    crownInlayBand.position.y = crownBaseY + 0.028;
    rig.add(crownInlayBand);

    const crownUpperTorus = new THREE.Mesh(
      getCachedGeo('cyber_king_crown_upper', () => new THREE.TorusGeometry(0.214, 0.016, 18, 52)),
      trimMat
    );
    crownUpperTorus.rotation.x = Math.PI / 2;
    crownUpperTorus.position.y = crownBaseY + 0.055;
    rig.add(crownUpperTorus);

    // 3. 8 Beveled Heraldic Crown Peaks around the Crown Rim
    const peakGeo = getCachedGeo('cyber_king_crown_peak', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.034, 0);
      s.lineTo(0.034, 0);
      s.lineTo(0.022, 0.065);
      s.lineTo(0, 0.115);
      s.lineTo(-0.022, 0.065);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.018,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.005,
        bevelThickness: 0.005
      });
      g.translate(0, 0, -0.009);
      return g;
    });

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const peak = new THREE.Mesh(peakGeo, trimMat);
      const r = 0.212;
      peak.position.set(Math.cos(ang) * r, crownBaseY + 0.052, Math.sin(ang) * r);
      peak.rotation.y = -ang + Math.PI / 2;
      if (i % 2 === 1) peak.scale.set(0.82, 0.76, 0.85);
      rig.add(peak);
    }

    // 4. 4 Sweeping Imperial Crown Arches rising from the Cardinal Crown Peaks to the Apex Monde
    const archGeo = getCachedGeo('cyber_king_imperial_arch', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0.212, 0.0, 0),
          new THREE.Vector3(0.205, 0.12, 0),
          new THREE.Vector3(0.115, 0.21, 0),
          new THREE.Vector3(0.0, 0.195, 0)
        ],
        0.022,
        0.016,
        24,
        14
      )
    );
    for (let i = 0; i < 4; i++) {
      const arch = new THREE.Mesh(archGeo, trimMat);
      arch.position.y = crownBaseY + 0.055;
      arch.rotation.y = (i / 4) * Math.PI * 2;
      rig.add(arch);
    }

    // 5. Seated Imperial Monde Orb & Sovereign Cross Finial at the Crown Apex
    const mondeY = crownBaseY + 0.255;
    const mondeOrb = new THREE.Mesh(
      getCachedGeo('cyber_king_monde_orb', () => new THREE.SphereGeometry(0.046, 24, 24)),
      trimMat
    );
    mondeOrb.position.y = mondeY;
    rig.add(mondeOrb);

    const sovereignCrossGeo = getCachedGeo('cyber_king_sovereign_cross', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.022, 0.0);
      s.lineTo(0.022, 0.0);
      s.lineTo(0.018, 0.075);
      s.lineTo(0.082, 0.062);
      s.lineTo(0.082, 0.115);
      s.lineTo(0.018, 0.102);
      s.lineTo(0.028, 0.185);
      s.lineTo(-0.028, 0.185);
      s.lineTo(-0.018, 0.102);
      s.lineTo(-0.082, 0.115);
      s.lineTo(-0.082, 0.062);
      s.lineTo(-0.018, 0.075);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.028,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.006,
        bevelThickness: 0.006
      });
      g.translate(0, 0, -0.014);
      return g;
    });
    const sovereignCross = new THREE.Mesh(sovereignCrossGeo, trimMat);
    sovereignCross.position.y = mondeY + 0.032;
    rig.add(sovereignCross);

    const crossCoreGem = new THREE.Mesh(chestGemGeo, bladeMat);
    crossCoreGem.scale.setScalar(0.65);
    crossCoreGem.position.set(0, mondeY + 0.12, 0.016);
    rig.add(crossCoreGem);

    // 6. Quad-Mount Sovereign Laser Arsenal (Twin Shoulder Heavy Railgun Pods + Twin Arm Prism-Laser Cannons — ZERO swords/daggers!)
    for (const s of [-1, 1]) {
      // Lower Arm-Mounted Heavy Imperator Prism-Laser Cannons
      buildCyberLaserCannonUnit({
        x: s * 0.235,
        y: 0.50 * h,
        z: 0.14,
        scale: 0.96,
        beamLength: 1.52
      });
      // Upper Shoulder-Mounted Articulated Ion-Laser Railgun Pods
      buildCyberLaserCannonUnit({
        x: s * 0.255,
        y: topY + 0.06,
        z: 0.03,
        scale: 0.84,
        beamLength: 1.48,
        baseRotX: 0.06
      });
    }
  }
}

// ============================================================================
// 3. MYTHIC DRAGON & ELEMENTAL (Roaring 3D Dragonfire Plumes, Breath Jets, Wings & Horns)
// ============================================================================
const dragonFireUniformsList = [];
let cachedDragonFireMats = null;

function getDragonFireMaterials() {
  if (cachedDragonFireMats) return cachedDragonFireMats;

  const createFireShader = (cfg) => {
    const uniforms = {
      uTime: { value: 0 },
      uSeed: { value: cfg.seed },
      uStrength: { value: cfg.strength },
      uOpacity: { value: cfg.opacity },
      uBaseColor: { value: new THREE.Color(cfg.baseHex) },
      uMidColor: { value: new THREE.Color(cfg.midHex) },
      uTipColor: { value: new THREE.Color(cfg.tipHex) }
    };
    dragonFireUniformsList.push(uniforms);

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uSeed;
        varying vec3 vLocalPos;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vHeightNorm;

        void main() {
          vec3 pos = position;
          // Normalize height assuming flame geometry is built from y = 0.0 to y = ~0.26
          float h = clamp(pos.y / 0.24, 0.0, 1.0);
          vHeightNorm = h;

          float sway = pow(h, 1.15);
          float phase = uSeed + (pos.x * 18.0 + pos.z * 16.0);

          // Multi-frequency upward-convecting draconic flame wave (pinned at base h = 0)
          float waveX = sin(pos.y * 18.0 - uTime * 8.2 + phase) * 0.022
                      + cos(pos.y * 29.0 - uTime * 12.4 + phase * 1.3) * 0.012;
          float waveZ = cos(pos.y * 17.0 - uTime * 7.8 + phase * 1.1) * 0.022
                      + sin(pos.y * 27.0 - uTime * 11.6 + phase * 0.9) * 0.012;

          // Swirling thermal vortex twist around Y axis
          float twist = sin(uTime * 5.4 + pos.y * 14.0 + uSeed) * 0.38 * sway;
          float cA = cos(twist);
          float sA = sin(twist);
          vec2 rotXZ = vec2(pos.x * cA - pos.z * sA, pos.x * sA + pos.z * cA);

          float radialPulse = 1.0 + sin(uTime * 6.8 - h * 4.5 + phase) * 0.16 * sway;
          pos.x = rotXZ.x * radialPulse + waveX * sway;
          pos.z = rotXZ.y * radialPulse + waveZ * sway;

          // Active vertical flame-tongue licking
          float lick = 1.0 + (
            sin(uTime * 7.4 + phase * 1.2) * 0.24 +
            cos(uTime * 11.2 - phase * 0.8) * 0.14
          ) * smoothstep(0.05, 0.90, h);
          pos.y *= lick;

          vLocalPos = pos;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSeed;
        uniform float uStrength;
        uniform float uOpacity;
        uniform vec3 uBaseColor;
        uniform vec3 uMidColor;
        uniform vec3 uTipColor;
        varying vec3 vLocalPos;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vHeightNorm;

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

        void main() {
          float h = clamp(vHeightNorm, 0.0, 1.0);
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 N = normalize(vWorldNormal);
          float facing = clamp(abs(dot(N, V)), 0.0, 1.0);
          float edgeSoft = pow(facing, 0.85);

          // Fast upward-convecting 3D dragonfire turbulence
          float n1 = noise3(vec3(vLocalPos.x * 22.0, vLocalPos.y * 18.0 - uTime * 8.5, vLocalPos.z * 22.0 + uSeed));
          float n2 = noise3(vec3(vLocalPos.x * 42.0 + 3.1, vLocalPos.y * 34.0 - uTime * 13.5, vLocalPos.z * 42.0 - uSeed));
          float turb = mix(n1, n2, 0.45);

          float erodedH = clamp(h + (turb - 0.46) * 0.42 * smoothstep(0.06, 0.88, h), 0.0, 1.0);
          float heat = clamp(erodedH + (1.0 - facing) * 0.30 + (turb - 0.5) * 0.22, 0.0, 1.0);

          vec3 col = mix(uBaseColor, uMidColor, smoothstep(0.0, 0.46, heat));
          col = mix(col, uTipColor, smoothstep(0.46, 0.92, heat));

          float tipFade = (1.0 - smoothstep(0.68, 0.99, erodedH));
          float flicker = 0.78 + 0.44 * turb;
          float alpha = clamp(tipFade * edgeSoft * uOpacity * flicker, 0.0, 1.0);
          if (alpha < 0.01) discard;

          gl_FragColor = vec4(col * uStrength, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  };

  cachedDragonFireMats = {
    coreMat: createFireShader({
      seed: 1.7,
      strength: 2.35,
      opacity: 0.95,
      baseHex: '#fff8d6',
      midHex: '#ffbe0b',
      tipHex: '#ff5400'
    }),
    outerMat: createFireShader({
      seed: 4.9,
      strength: 1.95,
      opacity: 0.88,
      baseHex: '#ffd166',
      midHex: '#ff4800',
      tipHex: '#b50018'
    }),
    emberSparkMat: new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  };

  return cachedDragonFireMats;
}

/**
 * Helper to flag all meshes inside a dragonfire group so they never cast or receive opaque shadows.
 */
function markAsDragonFire(obj) {
  obj.traverse((ch) => {
    if (ch.isMesh) {
      ch.userData.isDragonFire = true;
    }
  });
  return obj;
}

/**
 * Builds a multi-layered, roaring 3D Dragon-Fire Plume & Crown of Licking Flame Tongues
 * (pure organic 3D fluted cores & spiraling flame tongues — zero flat blade/dagger slabs).
 */
function buildDragonFirePlumeGroup(animParts, options = {}) {
  const {
    scale = 1.0,
    tongueCount = 8,
    spreadRadius = 0.075,
    plumeHeight = 0.25,
    fanMode = false
  } = options;

  const { coreMat, outerMat, emberSparkMat } = getDragonFireMaterials();
  const fireGroup = new THREE.Group();
  fireGroup.scale.setScalar(scale);

  // 1. Sculpted Inner White-Hot / Solar-Gold Flame Core Plume (fluted teardrop spire anchored at y=0)
  const coreConeGeo = getCachedGeo('dragon_fire_core_plume_geo', () => {
    const g = buildSculptedLathe(
      [
        [0.0, 0.0],
        [0.052, 0.015],
        [0.068, 0.055],
        [0.054, 0.115],
        [0.032, 0.175],
        [0.012, 0.225],
        [0.0, 0.255]
      ],
      {
        sampleCount: 36,
        radialSegments: 28,
        fluteCount: 7,
        fluteDepth: 0.008,
        fluteYMin: 0.02,
        fluteYMax: 0.24
      }
    );
    return g;
  });
  const coreMesh = new THREE.Mesh(coreConeGeo, coreMat);
  fireGroup.add(coreMesh);

  // 2. Sculpted Outer Turbulent Flame Mantle (organic fluted aura surrounding the inner core)
  const outerMantleMesh = new THREE.Mesh(coreConeGeo, outerMat);
  outerMantleMesh.scale.set(1.28, (plumeHeight / 0.25) * 1.08, 1.28);
  outerMantleMesh.rotation.y = Math.PI / 7;
  fireGroup.add(outerMantleMesh);

  // 3. Ring / Diadem of Sculpted S-Curved Licking Dragon-Flame Tongues
  const outerTongueGeo = getCachedGeo('dragon_fire_licking_tongue_outer', () =>
    buildTaperedCurveGeo(
      [
        new THREE.Vector3(0, 0.0, 0.0),
        new THREE.Vector3(0.024, 0.065, 0.0),
        new THREE.Vector3(-0.012, 0.145, 0.008),
        new THREE.Vector3(0.018, 0.215, -0.006),
        new THREE.Vector3(0.0, 0.265, 0.0)
      ],
      0.036,
      0.003,
      24,
      12
    )
  );

  const innerTongueGeo = getCachedGeo('dragon_fire_licking_tongue_inner', () =>
    buildTaperedCurveGeo(
      [
        new THREE.Vector3(0, 0.0, 0.0),
        new THREE.Vector3(-0.016, 0.055, 0.0),
        new THREE.Vector3(0.014, 0.125, 0.0),
        new THREE.Vector3(0.0, 0.195, 0.0)
      ],
      0.028,
      0.002,
      20,
      10
    )
  );

  const tongues = [];
  for (let i = 0; i < tongueCount; i++) {
    const u = tongueCount > 1 ? i / (fanMode ? tongueCount - 1 : tongueCount) : 0;
    const ang = fanMode ? (u - 0.5) * Math.PI * 1.15 : u * Math.PI * 2;
    const isMajor = i % 2 === 0;

    const tonguePivot = new THREE.Group();
    const rad = spreadRadius * (isMajor ? 1.0 : 0.72);
    if (fanMode) {
      tonguePivot.position.set(Math.sin(ang) * rad * 1.35, Math.cos(ang * 0.7) * 0.02, -Math.cos(ang) * rad * 0.35);
      tonguePivot.rotation.z = -ang * 0.55;
      tonguePivot.rotation.x = -0.14;
    } else {
      tonguePivot.position.set(Math.cos(ang) * rad, 0.0, Math.sin(ang) * rad);
      tonguePivot.rotation.y = -ang;
      tonguePivot.rotation.z = -0.22 - (i % 3) * 0.08;
    }

    const tMesh = new THREE.Mesh(isMajor ? outerTongueGeo : innerTongueGeo, isMajor ? outerMat : coreMat);
    const baseSY = (isMajor ? 1.05 : 0.84) * (plumeHeight / 0.25);
    tMesh.scale.set(1.0, baseSY, 1.0);
    tonguePivot.add(tMesh);
    fireGroup.add(tonguePivot);

    tongues.push({
      mesh: tMesh,
      pivot: tonguePivot,
      baseSY,
      baseRotZ: tonguePivot.rotation.z,
      phase: i * 1.37 + (fanMode ? 2.1 : 0.4)
    });
  }

  // 4. Rising Draconic Ember Sparks spiraling up through the flames
  const sparkGeo = getCachedGeo('dragon_fire_ember_spark', () => {
    const g = new THREE.OctahedronGeometry(0.016, 0);
    g.scale(0.65, 1.85, 0.65);
    return g;
  });
  const sparks = [];
  for (let s = 0; s < 6; s++) {
    const sp = new THREE.Mesh(sparkGeo, s % 2 === 0 ? coreMat : emberSparkMat);
    fireGroup.add(sp);
    sparks.push({
      mesh: sp,
      angleOffset: (s / 6) * Math.PI * 2,
      phaseOffset: s / 6,
      radius: spreadRadius * 0.85,
      maxHeight: plumeHeight * 1.25,
      speed: 1.15 + (s % 3) * 0.25
    });
  }

  markAsDragonFire(fireGroup);
  animParts.push({
    mesh: fireGroup,
    kind: 'dragonFire',
    coreMesh,
    tongues,
    sparks
  });

  return fireGroup;
}

/**
 * Builds a multi-stage, sustained 3D Dragon-Breath Flamethrower Jet inside the dragon's parted fanged jaws:
 * 1. Throat Ignition Furnace Core Orb (swells white-hot as the dragon inhales)
 * 2. Volumetric Inner White-Hot & Outer Roaring Dragon-Breath Flame Cone Streams
 * 3. Dual Counter-Rotating Helical Fire-Vortex Coils wrapping the breath stream
 * 4. 7 Spiraling Licking Dragon-Flame Tongues
 * 5. 18 Pressurized Fireball Globules & Ember Sparks + Target-End Inferno Fireball Bloom
 */
function buildDragonJawBreathFire(animParts) {
  const { coreMat, outerMat, emberSparkMat } = getDragonFireMaterials();
  const breathGroup = new THREE.Group();
  // Positioned in the throat/parted jaws (+Z is forward out of the snout)
  breathGroup.position.set(0, -0.010, 0.105);
  breathGroup.userData.excludeFromBounds = true;

  // 1. Throat Ignition Furnace Core Orb
  const throatOrbGeo = getCachedGeo('dragon_jaw_throat_orb', () => new THREE.DodecahedronGeometry(0.032, 1));
  const throatOrb = new THREE.Mesh(throatOrbGeo, coreMat);
  throatOrb.scale.setScalar(0.55);
  breathGroup.add(throatOrb);

  // 2. Volumetric Inner & Outer Dragon-Breath Flame Cone Stream (erupts forward along +Z)
  const breathStreamConeGeo = getCachedGeo('dragon_jaw_breath_cone_v2', () => {
    const g = new THREE.ConeGeometry(0.072, 0.36, 20, 12, true);
    // Cone tip at origin (throat), flaring open forward along +Z
    g.translate(0, -0.18, 0);
    g.rotateX(-Math.PI / 2);
    return g;
  });

  const innerStreamCone = new THREE.Mesh(breathStreamConeGeo, coreMat);
  innerStreamCone.scale.set(0.32, 0.32, 0.42);
  breathGroup.add(innerStreamCone);

  const outerStreamCone = new THREE.Mesh(breathStreamConeGeo, outerMat);
  outerStreamCone.scale.set(0.46, 0.46, 0.52);
  breathGroup.add(outerStreamCone);

  // 3. Dual Counter-Rotating Helical Fire-Vortex Coils spiraling down the breath stream
  const fireHelixGeoA = getCachedGeo('dragon_jaw_fire_helix_a', () => {
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const u = i / 32;
      const ang = u * Math.PI * 6.5;
      const r = (0.018 + u * 0.095) * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.85);
      pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, u * 0.38));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.009, 8, false);
  });
  const fireHelixGeoB = getCachedGeo('dragon_jaw_fire_helix_b', () => {
    const pts = [];
    for (let i = 0; i <= 32; i++) {
      const u = i / 32;
      const ang = -u * Math.PI * 6.5 + Math.PI;
      const r = (0.022 + u * 0.11) * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.85);
      pts.push(new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, u * 0.38));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.008, 8, false);
  });

  const fireHelixA = new THREE.Mesh(fireHelixGeoA, coreMat);
  fireHelixA.scale.set(0.25, 0.25, 0.25);
  breathGroup.add(fireHelixA);

  const fireHelixB = new THREE.Mesh(fireHelixGeoB, outerMat);
  fireHelixB.scale.set(0.25, 0.25, 0.25);
  breathGroup.add(fireHelixB);

  // 4. Spiraling Licking Dragon-Flame Tongues shooting out of the jaws
  const jetTongueGeo = getCachedGeo('dragon_jaw_breath_tongue', () =>
    buildTaperedCurveGeo(
      [
        new THREE.Vector3(0, 0.0, 0.0),
        new THREE.Vector3(0, 0.006, 0.085),
        new THREE.Vector3(0, 0.024, 0.185),
        new THREE.Vector3(0, 0.055, 0.285)
      ],
      0.034,
      0.003,
      20,
      12
    )
  );

  const tongues = [];
  const configs = [
    { rotY: 0.0, rotZ: 0.0, scale: 0.58, mat: coreMat },
    { rotY: 0.20, rotZ: -0.25, scale: 0.50, mat: outerMat },
    { rotY: -0.20, rotZ: 0.25, scale: 0.50, mat: outerMat },
    { rotY: 0.09, rotZ: 0.45, scale: 0.45, mat: coreMat },
    { rotY: -0.09, rotZ: -0.45, scale: 0.45, mat: outerMat },
    { rotY: 0.32, rotZ: 0.15, scale: 0.42, mat: outerMat },
    { rotY: -0.32, rotZ: -0.15, scale: 0.42, mat: coreMat }
  ];

  configs.forEach((cfg, idx) => {
    const pivot = new THREE.Group();
    pivot.rotation.y = cfg.rotY;
    pivot.rotation.z = cfg.rotZ;
    const m = new THREE.Mesh(jetTongueGeo, cfg.mat);
    m.scale.setScalar(cfg.scale);
    pivot.add(m);
    breathGroup.add(pivot);
    tongues.push({
      mesh: m,
      pivot,
      baseScale: cfg.scale,
      baseRotY: cfg.rotY,
      phase: idx * 1.15
    });
  });

  // 5. 18 Pressurized Fireball Globules & Molten Ember Sparks streaming forward from the dragon's maw
  const jawEmberGeo = getCachedGeo('dragon_jaw_breath_ember', () => {
    const g = new THREE.OctahedronGeometry(0.016, 1);
    g.scale(0.85, 0.85, 1.85);
    return g;
  });
  const jawSparks = [];
  for (let i = 0; i < 18; i++) {
    const sp = new THREE.Mesh(jawEmberGeo, i % 3 === 0 ? coreMat : i % 2 === 0 ? outerMat : emberSparkMat);
    breathGroup.add(sp);
    jawSparks.push({
      mesh: sp,
      phaseOffset: i / 18,
      angleOffset: (i / 18) * Math.PI * 2,
      spreadR: 0.022 + (i % 4) * 0.018,
      reachZ: 0.24 + (i % 5) * 0.055,
      speed: 2.3 + (i % 4) * 0.45
    });
  }

  // 6. Target-End Rolling Inferno Fireball Bloom at the end of the breath stream
  const impactFireball = new THREE.Mesh(throatOrbGeo, outerMat);
  impactFireball.scale.setScalar(0.001);
  breathGroup.add(impactFireball);

  breathGroup.traverse((ch) => {
    ch.userData.excludeFromBounds = true;
  });
  markAsDragonFire(breathGroup);
  animParts.push({
    mesh: breathGroup,
    kind: 'dragonBreathJet',
    throatOrb,
    innerStreamCone,
    outerStreamCone,
    fireHelixA,
    fireHelixB,
    tongues,
    jawSparks,
    impactFireball
  });

  return breathGroup;
}

function buildDragonElementalPiece(rig, type, primaryMat, trimMat, bladeMat, animParts) {
  const heightMap = {
    pawn: 0.95,
    rook: 1.12,
    knight: 1.22,
    bishop: 1.28,
    queen: 1.44,
    king: 1.58
  };
  const h = heightMap[type] || 1.15;
  const { coreMat, outerMat } = getDragonFireMaterials();

  // 1. Sculpted Volcanic Crag & Coiled Dragon-Scale Pedestal + 4 Curved Talons
  const cragGeo = getCachedGeo('dragon_crag_pedestal', () =>
    buildSculptedLathe(
      [
        [0.0, 0.0],
        [0.37, 0.0],
        [0.38, 0.05],
        [0.33, 0.10],
        [0.31, 0.15],
        [0.24, 0.20],
        [0.0, 0.20]
      ],
      {
        sampleCount: 40,
        radialSegments: 48,
        fluteCount: 10,
        fluteDepth: 0.014,
        fluteYMin: 0.02,
        fluteYMax: 0.18
      }
    )
  );
  rig.add(new THREE.Mesh(cragGeo, primaryMat));

  const clawGeo = getCachedGeo('dragon_base_claw', () =>
    buildTaperedCurveGeo(
      [
        new THREE.Vector3(0.27, 0.14, 0),
        new THREE.Vector3(0.35, 0.10, 0),
        new THREE.Vector3(0.39, 0.01, 0)
      ],
      0.036,
      0.005,
      18,
      14
    )
  );
  for (let i = 0; i < 4; i++) {
    const claw = new THREE.Mesh(clawGeo, trimMat);
    claw.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rig.add(claw);
  }

  // 2. Sinuous S-Curved Organic Dragon Neck / Torso with Flush Ventral Scutes, Dorsal Spines & Dorsal Flame Wisps
  const neckCtrlPoints = [
    new THREE.Vector3(0, 0.15, 0.0),
    new THREE.Vector3(0, 0.30 * h, -0.05),
    new THREE.Vector3(0, 0.48 * h, 0.04),
    new THREE.Vector3(0, 0.66 * h, -0.02)
  ];
  const neckCurve = new THREE.CatmullRomCurve3(neckCtrlPoints);
  const neckBodyGeo = getCachedGeo(`dragon_sinuous_body_${type}`, () =>
    buildTaperedCurveGeo(neckCtrlPoints, 0.22, 0.135, 40, 28)
  );
  rig.add(new THREE.Mesh(neckBodyGeo, primaryMat));

  // Overlapping Golden Ventral Scute Plates on the chest (+Z) & Curved Dorsal Spines + Spine-Fire Wisps (-Z)
  const scuteGeo = getCachedGeo('dragon_scute_plate_v2', () => {
    const g = new THREE.SphereGeometry(0.082, 20, 14);
    g.scale(1.30, 0.42, 0.58);
    return g;
  });
  const spineHornGeo = getCachedGeo('dragon_dorsal_spine', () =>
    buildTaperedCurveGeo(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.05, -0.07),
        new THREE.Vector3(0, 0.11, -0.12)
      ],
      0.028,
      0.004,
      16,
      12
    )
  );
  const dorsalFlameWispGeo = getCachedGeo('dragon_dorsal_flame_wisp', () =>
    buildTaperedCurveGeo(
      [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.06, -0.05),
        new THREE.Vector3(0, 0.13, -0.08)
      ],
      0.024,
      0.002,
      14,
      10
    )
  );

  for (let i = 0; i < 6; i++) {
    const u = (i + 0.5) / 6;
    const centerPt = neckCurve.getPointAt(u);
    const localR = 0.22 * (1 - u) + 0.135 * u + Math.sin(u * Math.PI) * (0.22 * 0.12);

    const scute = new THREE.Mesh(scuteGeo, trimMat);
    scute.position.set(0, centerPt.y, centerPt.z + localR * 0.78);
    scute.rotation.x = 0.22;
    rig.add(scute);

    const spine = new THREE.Mesh(spineHornGeo, trimMat);
    spine.position.set(0, centerPt.y, centerPt.z - localR * 0.76);
    rig.add(spine);

    if (i % 2 === 1) {
      const wisp = new THREE.Mesh(dorsalFlameWispGeo, i === 3 ? coreMat : outerMat);
      wisp.position.set(0, centerPt.y + 0.02, centerPt.z - localR * 0.82);
      wisp.userData.isDragonFire = true;
      rig.add(wisp);
    }
  }

  // Exposed Incandescent Dragon-Heart Furnace Core on the upper sternum (glows white-hot when inhaling to breathe fire!)
  const heartCoreGroup = new THREE.Group();
  heartCoreGroup.position.set(0, 0.49 * h, 0.195);
  rig.add(heartCoreGroup);

  const heartFrameRing = new THREE.Mesh(
    getCachedGeo('dragon_heart_collar', () => new THREE.TorusGeometry(0.052, 0.011, 12, 6)),
    trimMat
  );
  heartCoreGroup.add(heartFrameRing);

  const heartFurnaceGem = new THREE.Mesh(
    getCachedGeo('dragon_heart_gem', () => {
      const g = new THREE.OctahedronGeometry(0.042, 1);
      g.scale(0.85, 1.25, 0.55);
      return g;
    }),
    coreMat
  );
  heartFurnaceGem.userData.isDragonFire = true;
  heartCoreGroup.add(heartFurnaceGem);

  animParts.push({
    mesh: heartCoreGroup,
    gemMesh: heartFurnaceGem,
    kind: 'dragonHeartCore'
  });

  // Helper: Sculpted Rearing Draconic Fore-Limbs & 3-Talon Claws (pure beast anatomy — never holds a dagger or sword!)
  const addRearingDragonForeTalons = (yPos, talonScale = 1.0) => {
    const foreArmGeo = getCachedGeo('dragon_fore_limb', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.06, -0.04, 0.09),
          new THREE.Vector3(0.04, 0.03, 0.17)
        ],
        0.044,
        0.024,
        18,
        14
      )
    );
    const talonDigitGeo = getCachedGeo('dragon_fore_talon_digit', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.02, 0.055),
          new THREE.Vector3(0, -0.035, 0.095)
        ],
        0.016,
        0.002,
        14,
        10
      )
    );

    for (const side of [-1, 1]) {
      const limbPivot = new THREE.Group();
      limbPivot.position.set(side * 0.145, yPos, 0.08);
      limbPivot.scale.set(side * talonScale, talonScale, talonScale);
      limbPivot.rotation.set(-0.15, side * 0.22, 0);
      rig.add(limbPivot);

      limbPivot.add(new THREE.Mesh(foreArmGeo, primaryMat));

      for (let d = -1; d <= 1; d++) {
        const digit = new THREE.Mesh(talonDigitGeo, trimMat);
        digit.position.set(0.04 + d * 0.018, 0.03 + (1 - Math.abs(d)) * 0.01, 0.165);
        digit.rotation.y = d * 0.28;
        limbPivot.add(digit);
      }

      animParts.push({
        mesh: limbPivot,
        kind: 'dragonForeTalons',
        side,
        baseX: side * 0.145,
        baseY: yPos,
        baseZ: 0.08
      });
    }
  };

  // Helper: Ribbed Bat-Membrane Dragon Wings (extruded scalloped wing membrane + curved bone struts + wingtip flame)
  const addSculptedDragonWings = (yPos, spanScale = 1.0) => {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(0, yPos, -0.06);
    rig.add(wingGroup);

    const membraneGeo = getCachedGeo('dragon_wing_membrane', () => {
      const s = new THREE.Shape();
      s.moveTo(0.0, 0.0);
      // Upper wing arm & swept wingtip
      s.bezierCurveTo(0.10, 0.18, 0.26, 0.34, 0.42, 0.38);
      // Scalloped bat-wing trailing edge between wing fingers
      s.bezierCurveTo(0.35, 0.24, 0.33, 0.16, 0.36, 0.08);
      s.bezierCurveTo(0.26, 0.06, 0.22, -0.02, 0.24, -0.10);
      s.bezierCurveTo(0.14, -0.06, 0.08, -0.08, 0.0, -0.12);
      s.closePath();
      return new THREE.ExtrudeGeometry(s, {
        depth: 0.012,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.006,
        bevelThickness: 0.006
      });
    });

    const strutGeo = getCachedGeo('dragon_wing_strut', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0, 0.01),
          new THREE.Vector3(0.16, 0.20, 0.02),
          new THREE.Vector3(0.41, 0.37, 0.01)
        ],
        0.022,
        0.006,
        20,
        12
      )
    );

    for (const side of [-1, 1]) {
      const sidePivot = new THREE.Group();
      sidePivot.scale.set(side * spanScale, spanScale, spanScale);
      sidePivot.position.set(side * 0.10, 0, 0);
      sidePivot.rotation.y = -side * 0.28;
      sidePivot.rotation.z = -side * 0.12;

      const mem = new THREE.Mesh(membraneGeo, primaryMat);
      sidePivot.add(mem);

      const strut = new THREE.Mesh(strutGeo, trimMat);
      sidePivot.add(strut);

      wingGroup.add(sidePivot);
    }
    animParts.push({ mesh: wingGroup, kind: 'wingPulse', baseY: yPos });
  };

  // Helper: Sculpted Fanged Dragon Head with Swept Spiral Horns, Fangs & Roaring Jaw Dragon-Breath Fire
  const buildDragonHeadGroup = (headScale = 1.0, hornCount = 2) => {
    const head = new THREE.Group();
    head.scale.setScalar(headScale);

    // Upper Cranium & Snout Ridge
    const skullGeo = getCachedGeo('dragon_carved_skull', () => {
      const s = new THREE.Shape();
      s.moveTo(-0.12, -0.04);
      s.bezierCurveTo(-0.14, 0.08, -0.06, 0.16, 0.05, 0.14);
      s.bezierCurveTo(0.16, 0.12, 0.26, 0.08, 0.28, 0.02);
      s.bezierCurveTo(0.24, -0.02, 0.12, -0.01, 0.02, -0.02);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.12,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 2,
        bevelSize: 0.038,
        bevelThickness: 0.042
      });
      g.translate(0, 0, -0.06);
      g.rotateY(-Math.PI / 2);
      return g;
    });
    head.add(new THREE.Mesh(skullGeo, primaryMat));

    // Articulated Lower Fanged Jaw Pivot (unhinges wide open when the Dragon breathes fire!)
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, -0.02, 0.02);
    head.add(jawPivot);

    const jawGeo = getCachedGeo('dragon_carved_jaw', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, -0.01, -0.04),
          new THREE.Vector3(0, -0.04, 0.10),
          new THREE.Vector3(0, -0.02, 0.22)
        ],
        0.075,
        0.035,
        18,
        16
      )
    );
    jawPivot.add(new THREE.Mesh(jawGeo, primaryMat));

    // Sculpted Dragon Fangs lining the upper and lower jaws
    const fangGeo = getCachedGeo('dragon_jaw_fang', () => new THREE.ConeGeometry(0.012, 0.042, 8));
    for (const s of [-1, 1]) {
      const upperFang = new THREE.Mesh(fangGeo, trimMat);
      upperFang.position.set(s * 0.042, 0.005, 0.21);
      upperFang.rotation.x = Math.PI;
      head.add(upperFang);

      const lowerFang = new THREE.Mesh(fangGeo, trimMat);
      lowerFang.position.set(s * 0.034, -0.008, 0.17);
      jawPivot.add(lowerFang);
    }

    animParts.push({
      mesh: jawPivot,
      kind: 'dragonLowerJaw'
    });

    // Living Dragon-Breath Fire Jet erupting from the parted jaws
    const jawFire = buildDragonJawBreathFire(animParts);
    head.add(jawFire);

    // Swept Spiral Dragon Great-Horns
    for (const s of [-1, 1]) {
      const hornGeo = getCachedGeo(`dragon_spiral_horn_${s}`, () =>
        buildTaperedCurveGeo(
          [
            new THREE.Vector3(s * 0.07, 0.10, -0.02),
            new THREE.Vector3(s * 0.15, 0.20, -0.14),
            new THREE.Vector3(s * 0.19, 0.32, -0.24),
            new THREE.Vector3(s * 0.14, 0.42, -0.28)
          ],
          0.042,
          0.005,
          28,
          16
        )
      );
      head.add(new THREE.Mesh(hornGeo, trimMat));

      // Slit-Crested Glowing Dragon Eyes
      const eye = new THREE.Mesh(
        getCachedGeo('dragon_eye_slit', () => {
          const g = new THREE.OctahedronGeometry(0.022, 1);
          g.scale(0.65, 0.85, 1.35);
          return g;
        }),
        coreMat
      );
      eye.userData.isDragonFire = true;
      eye.position.set(s * 0.082, 0.08, 0.08);
      head.add(eye);
    }

    if (hornCount > 2) {
      for (let c = 0; c < hornCount - 2; c++) {
        const ang = (c - (hornCount - 3) / 2) * 0.38;
        const crestHorn = new THREE.Mesh(spineHornGeo, trimMat);
        crestHorn.scale.setScalar(1.35);
        crestHorn.position.set(Math.sin(ang) * 0.09, 0.13, -0.06);
        crestHorn.rotation.z = -ang;
        head.add(crestHorn);
      }
    }

    return head;
  };

  const topY = 0.65 * h;

  if (type === 'pawn') {
    // Hatchling Drake Whelp: Sinuous Neck, Folded Pinions, Fore-Talons, Jaw Breath Fire & Blazing Skull-Crest Flame Plume
    addSculptedDragonWings(0.46 * h, 0.62);
    addRearingDragonForeTalons(0.44 * h, 0.72);
    const head = buildDragonHeadGroup(0.82, 2);
    head.position.set(0, topY + 0.04, 0.02);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });

    const crestFire = buildDragonFirePlumeGroup(animParts, {
      scale: 0.62,
      tongueCount: 6,
      spreadRadius: 0.045,
      plumeHeight: 0.22
    });
    crestFire.position.set(0, 0.12, -0.04);
    head.add(crestFire);
  } else if (type === 'rook') {
    // Wyvern-Wrapped Bastion Keep: Coiled Helical Dragon Body, Clawed Cauldron, Gargoyle Wyvern Head & Roaring Hellfire Brazier Plume
    const coilGeo = getCachedGeo('dragon_rook_coil', () => {
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const u = i / 28;
        const ang = u * Math.PI * 3.2;
        const r = 0.23 - u * 0.03;
        pts.push(new THREE.Vector3(Math.cos(ang) * r, 0.18 + u * 0.58 * h, Math.sin(ang) * r));
      }
      return buildTaperedCurveGeo(pts, 0.068, 0.028, 56, 18);
    });
    rig.add(new THREE.Mesh(coilGeo, trimMat));

    const crownTurret = new THREE.Mesh(
      getCachedGeo('dragon_rook_turret', () =>
        buildSculptedLathe(
          [
            [0.0, 0.0],
            [0.19, 0.0],
            [0.25, 0.08],
            [0.26, 0.22],
            [0.18, 0.22],
            [0.0, 0.16]
          ],
          {
            sampleCount: 36,
            radialSegments: 44,
            scallopCount: 6,
            scallopAmp: 0.04,
            scallopYMin: 0.14
          }
        )
      ),
      primaryMat
    );
    crownTurret.position.y = topY - 0.02;
    rig.add(crownTurret);

    // 4 Dragon Talons gripping the upper bastion rim around the fire cauldron
    for (let c = 0; c < 4; c++) {
      const tClaw = new THREE.Mesh(clawGeo, trimMat);
      tClaw.scale.setScalar(0.68);
      tClaw.position.y = topY + 0.14;
      tClaw.rotation.y = (c / 4) * Math.PI * 2;
      rig.add(tClaw);
    }

    // Roaring Multi-Tongue Dragonfire Brazier Plume erupting from the bastion bowl
    const brazierFire = buildDragonFirePlumeGroup(animParts, {
      scale: 1.18,
      tongueCount: 10,
      spreadRadius: 0.082,
      plumeHeight: 0.28
    });
    brazierFire.position.set(0, topY + 0.15, 0);
    rig.add(brazierFire);

    // Mounted Fanged Wyvern Gargoyle Head on the front of the Bastion Keep so Rook also unhinges its jaws & breathes fire!
    const rookDragonHead = buildDragonHeadGroup(0.76, 2);
    rookDragonHead.position.set(0, topY + 0.05, 0.19);
    rig.add(rookDragonHead);
    animParts.push({ mesh: rookDragonHead, kind: 'headNod' });
  } else if (type === 'knight') {
    // Winged Storm-Drake Charger: Unfurled Ribbed Wings, Rearing Fore-Talons, Horned Dragon Head & Blazing Hellfire Crest Mane
    addSculptedDragonWings(topY - 0.10, 0.98);
    addRearingDragonForeTalons(0.46 * h, 0.88);
    const head = buildDragonHeadGroup(1.02, 3);
    head.position.set(0, topY + 0.05, 0.04);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });

    const maneFire = buildDragonFirePlumeGroup(animParts, {
      scale: 0.82,
      tongueCount: 7,
      spreadRadius: 0.055,
      plumeHeight: 0.25,
      fanMode: true
    });
    maneFire.position.set(0, 0.13, -0.05);
    maneFire.rotation.y = Math.PI * 0.5;
    head.add(maneFire);
  } else if (type === 'bishop') {
    // Elder Dragon-Priest: Twin Coiled Wyvern Arches, Rearing Talons & Fire-Breathing Elder Dragon Head
    addRearingDragonForeTalons(0.45 * h, 0.82);
    const archSerpentGeo = getCachedGeo('dragon_bishop_serpent', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0.16, 0.0, 0),
          new THREE.Vector3(0.22, 0.14, 0.04),
          new THREE.Vector3(0.18, 0.30, -0.03),
          new THREE.Vector3(0.06, 0.42, 0)
        ],
        0.045,
        0.016,
        32,
        16
      )
    );
    for (const s of [-1, 1]) {
      const serp = new THREE.Mesh(archSerpentGeo, trimMat);
      serp.position.y = topY - 0.04;
      serp.scale.x = s;
      rig.add(serp);
    }

    const head = buildDragonHeadGroup(0.88, 3);
    head.position.set(0, topY + 0.02, 0.02);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });

    // Seated Ritual Pyre Chalice between the Twin Serpent Heads + Tall Roaring Dragonfire Pillar
    const chaliceCup = new THREE.Mesh(
      getCachedGeo('dragon_bishop_pyre_cup', () => new THREE.CylinderGeometry(0.085, 0.035, 0.06, 16)),
      trimMat
    );
    chaliceCup.position.set(0, topY + 0.34, 0);
    rig.add(chaliceCup);

    const ritualFire = buildDragonFirePlumeGroup(animParts, {
      scale: 0.96,
      tongueCount: 9,
      spreadRadius: 0.058,
      plumeHeight: 0.27
    });
    ritualFire.position.set(0, topY + 0.35, 0);
    rig.add(ritualFire);
  } else if (type === 'queen') {
    // Dragon Empress of the Five Flights: 4 Swept Wings + Rearing Fore-Talons + 5-Horned Head + Blazing 9-Tongue Dragonfire Diadem Crown
    addSculptedDragonWings(topY - 0.08, 1.12);
    addSculptedDragonWings(0.42 * h, 0.78);
    addRearingDragonForeTalons(0.48 * h, 0.96);

    const head = buildDragonHeadGroup(1.05, 5);
    head.position.set(0, topY + 0.06, 0.03);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });

    const queenFireCrown = buildDragonFirePlumeGroup(animParts, {
      scale: 1.08,
      tongueCount: 9,
      spreadRadius: 0.095,
      plumeHeight: 0.27,
      fanMode: true
    });
    queenFireCrown.position.set(0, 0.13, -0.04);
    head.add(queenFireCrown);
  } else if (type === 'king') {
    // Ancient Elder Dragon Sovereign: Grand 4-Wing Span, Rearing Draconic Fore-Talons,
    // Central 5-Horned Sovereign Dragon Head + Twin Flanking Wyvern Shoulder-Heads for a Triple-Maw Fire-Breath Inferno (NO DAGGER OR SWORD!)
    addSculptedDragonWings(topY - 0.04, 1.26);
    addSculptedDragonWings(0.45 * h, 0.88);
    addRearingDragonForeTalons(0.50 * h, 1.08);

    const head = buildDragonHeadGroup(1.15, 5);
    head.position.set(0, topY + 0.08, 0.03);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });

    // Seated Jagged Dragon-Scale Sovereign Crown directly on the Elder Dragon's Brow
    const sovereignCrown = new THREE.Mesh(
      getCachedGeo('dragon_king_crown_v2', () =>
        buildSculptedLathe(
          [
            [0.0, 0.0],
            [0.115, 0.0],
            [0.145, 0.10],
            [0.095, 0.10],
            [0.0, 0.06]
          ],
          {
            sampleCount: 28,
            radialSegments: 40,
            scallopCount: 8,
            scallopAmp: 0.042,
            scallopYMin: 0.04
          }
        )
      ),
      trimMat
    );
    sovereignCrown.position.set(0, 0.125, -0.02);
    head.add(sovereignCrown);

    // Colossal Sovereign Dragonfire Inferno Plume erupting from within the King's Crown
    const kingInfernoCrown = buildDragonFirePlumeGroup(animParts, {
      scale: 1.15,
      tongueCount: 10,
      spreadRadius: 0.075,
      plumeHeight: 0.29
    });
    kingInfernoCrown.position.set(0, 0.15, -0.02);
    head.add(kingInfernoCrown);

    // Twin Flanking Wyvern Shoulder-Heads (-X and +X) so the Dragon Sovereign unleashes a 3-Headed Hellfire Breath Torrent!
    const shoulderNeckGeo = getCachedGeo('dragon_king_shoulder_neck', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0, -0.02),
          new THREE.Vector3(0.11, 0.08, 0.02),
          new THREE.Vector3(0.19, 0.19, 0.06)
        ],
        0.068,
        0.042,
        20,
        14
      )
    );

    for (const s of [-1, 1]) {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(0, 0.54 * h, 0.0);
      rig.add(shoulderPivot);

      const sNeck = new THREE.Mesh(shoulderNeckGeo, primaryMat);
      sNeck.scale.x = s;
      shoulderPivot.add(sNeck);

      const flankWyvernHead = buildDragonHeadGroup(0.68, 2);
      flankWyvernHead.position.set(s * 0.20, 0.20, 0.07);
      flankWyvernHead.rotation.y = -s * 0.16;
      shoulderPivot.add(flankWyvernHead);
      animParts.push({ mesh: flankWyvernHead, kind: 'headNod' });
    }
  }
}

/**
 * Advances procedural idle, move, attack, and shatter animations on custom piece sets.
 */
export function updateProceduralPieceAnimation(piece, dt, elapsedTotal) {
  if (!piece || !piece.proceduralAnim) return;
  const state = piece.proceduralAnim;
  const rig = state.animRig;
  if (!rig) return;

  state.clipTime += dt;
  const phaseSeed = (piece.r * 5 + piece.c * 3) * 0.45;
  const mode = state.mode || 'idle';
  const arch = piece.archetype || state.archetype || 'classic_staunton';
  const pType = piece.type || state.pieceType || 'queen';
  const isAttacking = mode === 'attack';
  const atkIntensity = isAttacking ? Math.sin(Math.min(1, state.clipTime / 0.86) * Math.PI) : 0;

  // Update shared GLSL Dragonfire & Cyber-Laser shader time uniforms
  for (let i = 0; i < dragonFireUniformsList.length; i++) {
    dragonFireUniformsList[i].uTime.value = elapsedTotal;
  }

  // Also update any cloned showcase shader uniforms attached to the piece root
  if (Array.isArray(state.showcaseShaderUniforms)) {
    for (let i = 0; i < state.showcaseShaderUniforms.length; i++) {
      const uObj = state.showcaseShaderUniforms[i];
      if (uObj.uTime) uObj.uTime.value = elapsedTotal;
    }
  }

  // Animate sub-parts (roaring dragon fire plumes, jaw breath jets, articulated jaws, cyber laser cannons & multi-stage beams, telekinetic rings)
  for (const part of state.animParts) {
    if (part.kind === 'dragonFire') {
      const fireSurge = 1.0 + atkIntensity * 1.15;
      if (part.coreMesh) {
        const corePulse = (1.0 + Math.sin(elapsedTotal * 8.5 + phaseSeed) * 0.14) * fireSurge;
        part.coreMesh.scale.set(
          corePulse,
          (1.0 + Math.cos(elapsedTotal * 10.2 + phaseSeed) * 0.18) * fireSurge,
          corePulse
        );
        part.coreMesh.rotation.y = elapsedTotal * (2.4 + atkIntensity * 4.5) + phaseSeed;
      }
      if (part.tongues) {
        for (let i = 0; i < part.tongues.length; i++) {
          const t = part.tongues[i];
          const p = elapsedTotal * (7.8 + atkIntensity * 6.0) + t.phase + phaseSeed;
          const stretchY = t.baseSY * (1.0 + Math.sin(p) * 0.24 + Math.cos(p * 1.45) * 0.12) * fireSurge;
          const widthPulse = (1.0 + Math.cos(p * 0.9) * 0.15) * (1.0 + atkIntensity * 0.45);
          t.mesh.scale.set(widthPulse, stretchY, widthPulse);
          t.pivot.rotation.z = t.baseRotZ + Math.sin(p * 0.85) * (0.14 + atkIntensity * 0.12);
        }
      }
      if (part.sparks) {
        for (let i = 0; i < part.sparks.length; i++) {
          const sp = part.sparks[i];
          const progress = (elapsedTotal * sp.speed * (1 + atkIntensity * 1.4) + sp.phaseOffset + phaseSeed * 0.2) % 1.0;
          const angle = sp.angleOffset + elapsedTotal * 3.8 + progress * 2.5;
          const rad = sp.radius * (1.0 - progress * 0.55) * (1.0 + atkIntensity * 0.6);
          sp.mesh.position.set(
            Math.cos(angle) * rad,
            progress * sp.maxHeight * (1.0 + atkIntensity * 0.75),
            Math.sin(angle) * rad
          );
          const sparkScale = Math.sin(progress * Math.PI) * (1.15 + atkIntensity * 0.85);
          sp.mesh.scale.setScalar(Math.max(0.01, sparkScale));
        }
      }
    } else if (part.kind === 'dragonBreathJet') {
      // Sustained Roaring Dragon-Breath Flamethrower Stream when jaws unhinge during attack
      const inhaleWindow =
        isAttacking && state.clipTime < 0.24
          ? Math.sin((state.clipTime / 0.24) * (Math.PI * 0.5))
          : 0;
      const breathWindow =
        isAttacking && state.clipTime >= 0.22 && state.clipTime <= 0.92
          ? Math.sin(((state.clipTime - 0.22) / 0.70) * Math.PI)
          : 0;
      const breathSurge = 1.0 + breathWindow * 4.25;

      if (part.throatOrb) {
        const orbScale = 0.45 + inhaleWindow * 1.35 + breathWindow * 1.85 + Math.sin(elapsedTotal * 26.0) * 0.12;
        part.throatOrb.scale.setScalar(orbScale);
        part.throatOrb.rotation.y += dt * 14.0;
        part.throatOrb.rotation.z -= dt * 11.0;
      }

      if (part.innerStreamCone) {
        const cRadius = (0.28 + breathWindow * 2.25) * (0.9 + Math.sin(elapsedTotal * 22.0 + phaseSeed) * 0.16);
        const cLen = (0.34 + breathWindow * 4.15) * (0.92 + Math.cos(elapsedTotal * 26.0 + phaseSeed) * 0.15);
        part.innerStreamCone.scale.set(cRadius, cRadius, cLen);
        part.innerStreamCone.rotation.z = elapsedTotal * (7.5 + breathWindow * 18.0);
      }
      if (part.outerStreamCone) {
        const oRadius = (0.42 + breathWindow * 2.95) * (0.9 + Math.cos(elapsedTotal * 19.0 + phaseSeed) * 0.18);
        const oLen = (0.46 + breathWindow * 4.65) * (0.9 + Math.sin(elapsedTotal * 23.0 + phaseSeed) * 0.18);
        part.outerStreamCone.scale.set(oRadius, oRadius, oLen);
        part.outerStreamCone.rotation.z = -elapsedTotal * (6.2 + breathWindow * 16.0);
      }
      if (part.fireHelixA && part.fireHelixB) {
        const hRad = 0.20 + breathWindow * 2.35;
        const hLen = 0.22 + breathWindow * 3.95;
        part.fireHelixA.scale.set(hRad, hRad, hLen);
        part.fireHelixA.rotation.z = elapsedTotal * (10.0 + breathWindow * 24.0);
        part.fireHelixB.scale.set(hRad * 1.12, hRad * 1.12, hLen * 1.04);
        part.fireHelixB.rotation.z = -elapsedTotal * (12.0 + breathWindow * 26.0);
      }
      if (part.tongues) {
        for (let i = 0; i < part.tongues.length; i++) {
          const t = part.tongues[i];
          const p = elapsedTotal * (10.5 + breathWindow * 14.0) + t.phase + phaseSeed;
          const surge = t.baseScale * (0.85 + Math.sin(p) * 0.28 + Math.cos(p * 1.6) * 0.14) * breathSurge;
          t.mesh.scale.set(
            t.baseScale * (0.75 + breathWindow * 1.85),
            t.baseScale * (0.75 + breathWindow * 1.85),
            surge
          );
          t.pivot.rotation.y = t.baseRotY + Math.sin(p * 0.75) * (0.09 + breathWindow * 0.26);
        }
      }
      if (part.jawSparks) {
        for (let i = 0; i < part.jawSparks.length; i++) {
          const jsp = part.jawSparks[i];
          const prog = (elapsedTotal * jsp.speed * (1.0 + breathWindow * 2.8) + jsp.phaseOffset + phaseSeed * 0.17) % 1.0;
          const ang = jsp.angleOffset + elapsedTotal * 9.5 + prog * 4.8;
          const r = jsp.spreadR * (0.35 + prog * 1.65) * (0.55 + breathWindow * 2.95);
          const zDist = prog * jsp.reachZ * (0.45 + breathWindow * 4.35);
          jsp.mesh.position.set(
            Math.cos(ang) * r,
            Math.sin(ang) * r - prog * 0.08 * breathWindow,
            zDist
          );
          const s = Math.sin(prog * Math.PI) * (0.55 + breathWindow * 2.45);
          jsp.mesh.scale.setScalar(Math.max(0.01, s));
        }
      }
      if (part.impactFireball) {
        if (breathWindow > 0.05) {
          const fbScale = breathWindow * (3.2 + Math.sin(elapsedTotal * 32.0) * 0.65);
          part.impactFireball.scale.setScalar(fbScale);
          part.impactFireball.position.set(
            Math.sin(elapsedTotal * 18.0) * 0.05,
            -0.06 * breathWindow,
            0.35 + breathWindow * 0.92
          );
          part.impactFireball.rotation.y += dt * 16.0;
          part.impactFireball.rotation.x -= dt * 12.0;
        } else {
          part.impactFireball.scale.setScalar(0.001);
        }
      }
    } else if (part.kind === 'dragonLowerJaw') {
      // Unhinges the Dragon's lower fanged jaw wide open during the Fire-Breath phase!
      if (isAttacking) {
        const t = state.clipTime;
        let jawOpen = 0;
        if (t < 0.22) {
          jawOpen = 0.18 * (t / 0.22);
        } else if (t < 0.86) {
          const uBreath = (t - 0.22) / 0.64;
          jawOpen = 0.68 * Math.sin(Math.min(1, uBreath * 1.45) * Math.PI * 0.68) + Math.sin(t * 30.0) * 0.065;
        } else {
          jawOpen = 0.58 * Math.max(0, 1 - (t - 0.86) / 0.20);
        }
        part.mesh.rotation.x = jawOpen;
      } else {
        part.mesh.rotation.x = 0.04 + Math.sin(elapsedTotal * 2.8 + phaseSeed) * 0.035;
      }
    } else if (part.kind === 'dragonForeTalons') {
      // Dragon rears its clawed fore-limbs wide as it inhales and unleashes its fire breath!
      if (isAttacking) {
        const t = state.clipTime;
        const rear = Math.sin(Math.min(1, t / 0.88) * Math.PI);
        part.mesh.position.set(
          part.baseX + part.side * 0.045 * rear,
          part.baseY + 0.06 * rear,
          part.baseZ + 0.05 * rear
        );
        part.mesh.rotation.set(-0.15 - 0.42 * rear, part.side * (0.22 + 0.28 * rear), -part.side * 0.25 * rear);
      } else {
        const idleBreath = Math.sin(elapsedTotal * 2.4 + phaseSeed) * 0.04;
        part.mesh.position.set(part.baseX, part.baseY, part.baseZ);
        part.mesh.rotation.set(-0.15 + idleBreath, part.side * 0.22, 0);
      }
    } else if (part.kind === 'dragonHeartCore') {
      const surge = isAttacking ? 1.0 + Math.sin(Math.min(1, state.clipTime / 0.88) * Math.PI) * 0.85 : 1.0;
      const pulse = (1.0 + Math.sin(elapsedTotal * 6.5 + phaseSeed) * 0.12) * surge;
      if (part.gemMesh) {
        part.gemMesh.scale.set(0.85 * pulse, 1.25 * pulse, 0.55 * pulse);
      }
      part.mesh.rotation.z = Math.sin(elapsedTotal * 3.0) * 0.15;
    } else if (part.kind === 'stauntonTelekineticHalo') {
      // Classic Staunton Telekinetic Astrolabe Levitation Rings
      if (isAttacking) {
        const t = state.clipTime;
        const flare = Math.sin(Math.min(1, t / 0.88) * Math.PI);
        part.mesh.position.y = part.baseY - 0.18 * flare;
        const ringScale = 1.0 + flare * 0.95;
        part.mesh.scale.setScalar(ringScale);
        part.outerRing.rotation.z = elapsedTotal * 14.0;
        part.outerRing.rotation.x = Math.PI / 2 + Math.sin(t * 16.0) * 0.35;
        part.innerRing.rotation.z = -elapsedTotal * 18.0;
        part.innerRing.rotation.y = Math.cos(t * 16.0) * 0.42;
      } else {
        part.mesh.position.y = part.baseY;
        part.mesh.scale.setScalar(1.0);
        part.outerRing.rotation.set(Math.PI / 2, 0, elapsedTotal * 0.8);
        part.innerRing.rotation.set(Math.PI / 2, 0, -elapsedTotal * 0.8);
      }
    } else if (part.kind === 'cyberLaserCannon') {
      // Articulated Cyber-Mech Laser Cannon / Railgun Pod Target-Lock, Aiming & Hydraulic Barrel Recoil!
      if (isAttacking) {
        const t = state.clipTime;
        const sideSign = part.baseX >= 0 ? 1 : -1;
        if (t < 0.25) {
          // Stage 1: Target-Lock & Barrel Extension
          const u = t / 0.25;
          const ease = u * u * (3 - 2 * u);
          part.mesh.position.set(
            part.baseX + sideSign * 0.025 * ease,
            part.baseY + 0.04 * ease,
            part.baseZ + 0.06 * ease
          );
          // Slight inward convergence toward target center + downward pitch toward board
          part.mesh.rotation.set(
            part.baseRotX + 0.14 * ease,
            part.baseRotY - sideSign * 0.08 * ease,
            part.baseRotZ
          );
          if (part.barrelAssembly) {
            part.barrelAssembly.position.z = 0.08 + 0.055 * ease;
          }
          if (part.opticMount) {
            part.opticMount.rotation.z = elapsedTotal * 16.0;
            part.opticMount.scale.setScalar(1.0 + 0.55 * ease);
          }
        } else if (t < 0.85) {
          // Stage 2: High-Energy Laser Discharge, Precision Target Sweep & Hydraulic Barrel Recoil
          const u = (t - 0.25) / 0.60;
          const fireEnv = Math.sin(u * Math.PI);
          const sweepYaw = Math.sin(u * Math.PI * 2.5) * 0.11;
          const recoilKick = -0.065 * fireEnv - Math.abs(Math.sin(t * 55.0)) * 0.022 * fireEnv;

          part.mesh.position.set(
            part.baseX + sideSign * 0.025,
            part.baseY + 0.04,
            part.baseZ + 0.06 + recoilKick * 0.5
          );
          part.mesh.rotation.set(
            part.baseRotX + 0.14,
            part.baseRotY - sideSign * 0.08 + sweepYaw,
            part.baseRotZ
          );
          if (part.barrelAssembly) {
            part.barrelAssembly.position.z = 0.135 + recoilKick;
          }
          if (part.opticMount) {
            part.opticMount.rotation.z = elapsedTotal * 24.0;
            part.opticMount.scale.setScalar(1.55);
          }
        } else {
          // Stage 3: Barrel Venting & Smooth Return to Standby Mount
          const u = Math.min(1, (t - 0.85) / 0.20);
          const rem = 1 - u;
          part.mesh.position.set(
            part.baseX + sideSign * 0.025 * rem,
            part.baseY + 0.04 * rem,
            part.baseZ + 0.06 * rem
          );
          part.mesh.rotation.set(
            part.baseRotX + 0.14 * rem,
            part.baseRotY - sideSign * 0.08 * rem,
            part.baseRotZ
          );
          if (part.barrelAssembly) {
            part.barrelAssembly.position.z = 0.08 + 0.055 * rem;
          }
          if (part.opticMount) {
            part.opticMount.rotation.z = 0;
            part.opticMount.scale.setScalar(1.0 + 0.55 * rem);
          }
        }
      } else {
        part.mesh.position.set(part.baseX, part.baseY, part.baseZ);
        part.mesh.rotation.set(part.baseRotX, part.baseRotY, part.baseRotZ);
        if (part.barrelAssembly) {
          part.barrelAssembly.position.z = 0.08;
        }
        if (part.opticMount) {
          part.opticMount.rotation.z = elapsedTotal * 1.5;
          part.opticMount.scale.setScalar(1.0);
        }
      }
    } else if (part.kind === 'cyberLaserBeam') {
      // Multi-Stage 3D Laser Beam Emitter Choreography:
      // Stage 1 (0.00..0.24): Muzzle Capacitor Overcharge + 3 Holographic Hex Target-Lock Lenses Deploy
      // Stage 2 (0.24..0.86): Blinding Coherent Laser Core + Plasma Sheath + Helical Coils + Shockwave Rings + Target Impact Flare
      // Stage 3 (0.86..1.05): Beam Constriction & Afterglow
      if (isAttacking) {
        const t = state.clipTime;
        const chargePhase = t < 0.24 ? t / 0.24 : 1.0;
        const beamActive =
          t >= 0.22 && t <= 0.88
            ? Math.sin(Math.min(1, (t - 0.22) / 0.66) * Math.PI)
            : 0;
        const beamReach = part.beamLength || 1.38;

        // 1. Muzzle Capacitor Charge Orb
        if (part.chargeOrb) {
          const orbPulse =
            0.35 +
            Math.sin(chargePhase * Math.PI) * 1.35 +
            beamActive * (1.65 + Math.sin(elapsedTotal * 48.0) * 0.35);
          part.chargeOrb.scale.setScalar(orbPulse);
          part.chargeOrb.rotation.y += dt * 22.0;
          part.chargeOrb.rotation.z -= dt * 18.0;
        }

        // 2. 3 Staggered Holographic Hexagonal Target-Lock & Collimator Lenses
        if (part.reticleRings) {
          for (let r = 0; r < part.reticleRings.length; r++) {
            const rt = part.reticleRings[r];
            const delay = r * 0.05;
            const deploy = Math.max(0, Math.min(1, (t - delay) / 0.18)) * Math.max(0, 1 - Math.max(0, t - 0.84) / 0.18);
            const lensScale = deploy * (1.15 + r * 0.28 + beamActive * 0.45);
            rt.group.scale.setScalar(Math.max(0.001, lensScale));
            rt.group.position.z = rt.baseZ + deploy * (0.04 + r * 0.035);
            rt.group.rotation.z = elapsedTotal * (r % 2 === 0 ? 16.0 : -18.0) + r * 1.1;
          }
        }

        // 3. Coherent Inner Laser Core + Scrolling Plasma Outer Sheath + Helical Coils
        if (beamActive > 0.01) {
          const extendProgress = Math.min(1, (t - 0.22) / 0.08);
          const curLen = beamReach * extendProgress;
          const radialPulse = beamActive * (1.0 + Math.sin(elapsedTotal * 62.0) * 0.22);

          part.coreBeamMesh.scale.set(radialPulse * 1.25, radialPulse * 1.25, curLen);
          part.coreBeamMesh.rotation.z = elapsedTotal * 25.0;

          part.sheathBeamMesh.scale.set(radialPulse * 1.55, radialPulse * 1.55, curLen * 1.02);
          part.sheathBeamMesh.rotation.z = -elapsedTotal * 19.0;

          part.helixMeshA.scale.set(radialPulse * 1.35, radialPulse * 1.35, curLen);
          part.helixMeshA.rotation.z = elapsedTotal * 28.0;

          part.helixMeshB.scale.set(radialPulse * 1.35, radialPulse * 1.35, curLen);
          part.helixMeshB.rotation.z = -elapsedTotal * 30.0;

          // 4. Travelling Collimator Shockwave Rings racing along the laser beam
          if (part.pulseRings) {
            for (let p = 0; p < part.pulseRings.length; p++) {
              const pr = part.pulseRings[p];
              const ringU = (elapsedTotal * 4.2 + pr.phaseOffset) % 1.0;
              pr.mesh.position.z = ringU * curLen;
              const rScale = Math.sin(ringU * Math.PI) * radialPulse * 1.45;
              pr.mesh.scale.setScalar(Math.max(0.001, rScale));
            }
          }

          // 5. Target-End Impact Supernova Flare & Ricocheting Ion Sparks
          if (part.impactGroup) {
            part.impactGroup.position.z = curLen;
            part.impactGroup.scale.setScalar(radialPulse * (1.35 + Math.sin(elapsedTotal * 45.0) * 0.28));
            part.impactGroup.rotation.z = elapsedTotal * 20.0;
            if (part.impactHalo) {
              part.impactHalo.rotation.z = -elapsedTotal * 28.0;
            }
            if (part.ionSparks) {
              for (let s = 0; s < part.ionSparks.length; s++) {
                const sp = part.ionSparks[s];
                const spProg = (elapsedTotal * sp.speed + sp.phase) % 1.0;
                const spRad = spProg * 0.18;
                const ang = sp.angle + elapsedTotal * 6.0;
                sp.mesh.position.set(
                  Math.cos(ang) * spRad,
                  Math.sin(ang) * spRad,
                  (0.5 - spProg) * 0.14
                );
                sp.mesh.scale.setScalar(Math.max(0.01, Math.sin(spProg * Math.PI) * 1.65));
              }
            }
          }
        } else {
          part.coreBeamMesh.scale.set(0.001, 0.001, 0.001);
          part.sheathBeamMesh.scale.set(0.001, 0.001, 0.001);
          part.helixMeshA.scale.set(0.001, 0.001, 0.001);
          part.helixMeshB.scale.set(0.001, 0.001, 0.001);
          if (part.pulseRings) {
            for (let p = 0; p < part.pulseRings.length; p++) {
              part.pulseRings[p].mesh.scale.setScalar(0.001);
            }
          }
          if (part.impactGroup) {
            part.impactGroup.scale.setScalar(0.001);
          }
        }
      } else {
        // Idle standby state: subtle glowing pilot crystal at barrel tip, beam & lenses retracted
        if (part.chargeOrb) {
          part.chargeOrb.scale.setScalar(0.18 + Math.sin(elapsedTotal * 4.0 + phaseSeed) * 0.04);
        }
        if (part.reticleRings) {
          for (let r = 0; r < part.reticleRings.length; r++) {
            part.reticleRings[r].group.scale.setScalar(0.001);
          }
        }
        part.coreBeamMesh.scale.set(0.001, 0.001, 0.001);
        part.sheathBeamMesh.scale.set(0.001, 0.001, 0.001);
        part.helixMeshA.scale.set(0.001, 0.001, 0.001);
        part.helixMeshB.scale.set(0.001, 0.001, 0.001);
        if (part.pulseRings) {
          for (let p = 0; p < part.pulseRings.length; p++) {
            part.pulseRings[p].mesh.scale.setScalar(0.001);
          }
        }
        if (part.impactGroup) {
          part.impactGroup.scale.setScalar(0.001);
        }
      }
    } else if (part.kind === 'cyberShield') {
      // Cyber Shield projects forward to form an Aegis barrier while the Laser Carbine fires
      if (isAttacking) {
        const t = state.clipTime;
        const guard = Math.sin(Math.min(1, t / 0.85) * Math.PI);
        part.mesh.position.set(part.baseX + 0.04 * guard, part.baseY + 0.05 * guard, part.baseZ + 0.10 * guard);
        part.mesh.rotation.set(0, part.baseRotY + 0.24 * guard, 0.12 * guard);
      } else {
        part.mesh.position.set(part.baseX, part.baseY, part.baseZ);
        part.mesh.rotation.set(0, part.baseRotY, 0);
      }
    } else if (part.kind === 'cyberChestCannon') {
      // Overcharged Chest Laser Core extends & fires forward
      if (isAttacking) {
        const t = state.clipTime;
        const fire = Math.sin(Math.min(1, t / 0.86) * Math.PI);
        part.muzzleRing.scale.setScalar(0.45 + fire * 1.45);
        part.muzzleRing.position.z = 0.05 * fire;
        part.muzzleRing.rotation.z = elapsedTotal * 18.0;
        part.chestGem.scale.setScalar(1.0 + fire * 0.65);
      } else {
        part.muzzleRing.scale.setScalar(0.45);
        part.muzzleRing.position.z = 0;
        part.muzzleRing.rotation.z = elapsedTotal * 1.2;
        part.chestGem.scale.setScalar(1.0);
      }
    } else if (part.kind === 'cyberTurretPylon') {
      // Cyber Rook Obelisk Pylon rises & spins like a Tesla Laser Coil during attack
      if (isAttacking) {
        const t = state.clipTime;
        const charge = Math.sin(Math.min(1, t / 0.86) * Math.PI);
        part.mesh.position.y = part.baseY + 0.24 * charge;
        part.mesh.rotation.y = elapsedTotal * 22.0;
        part.mesh.scale.set(1 + charge * 0.45, 1 + charge * 0.55, 1 + charge * 0.45);
      } else {
        part.mesh.position.y = part.baseY;
        part.mesh.rotation.y = 0;
        part.mesh.scale.set(1, 1, 1);
      }
    } else if (part.kind === 'cyberHalo') {
      if (isAttacking) {
        const charge = Math.sin(Math.min(1, state.clipTime / 0.86) * Math.PI);
        part.mesh.rotation.z = elapsedTotal * 14.0;
        part.mesh.scale.setScalar(1.0 + charge * 0.42);
      } else {
        part.mesh.rotation.z = elapsedTotal * 0.6;
        part.mesh.scale.setScalar(1.0);
      }
    } else if (part.kind === 'spinFloat') {
      const overdrive = 1.0 + atkIntensity * 4.2;
      part.mesh.rotation.y += dt * (part.speed || 2.0) * overdrive;
      part.mesh.position.y = part.baseY + Math.sin(elapsedTotal * 3.2 + phaseSeed) * 0.03 + atkIntensity * 0.06;
    } else if (part.kind === 'orbitRing') {
      const overdrive = 1.0 + atkIntensity * 4.5;
      part.mesh.rotation.z += dt * (part.speed || 1.6) * overdrive;
      part.mesh.position.y = part.baseY + Math.cos(elapsedTotal * 2.6 + phaseSeed) * 0.02 + atkIntensity * 0.04;
    } else if (part.kind === 'gyroRing') {
      const overdrive = 1.0 + atkIntensity * 4.8;
      part.mesh.rotation.x += dt * 2.2 * overdrive;
      part.mesh.rotation.y += dt * 1.7 * overdrive;
    } else if (part.kind === 'wingPulse') {
      const flapFreq = isAttacking ? 20.0 : 3.6;
      const flapAmp = isAttacking ? 0.32 : 0.07;
      const flap = Math.sin(elapsedTotal * flapFreq + phaseSeed) * flapAmp + atkIntensity * 0.26;
      part.mesh.scale.set(1 + flap, 1 + atkIntensity * 0.18, 1 - flap * 0.35);
    } else if (part.kind === 'headNod') {
      if (isAttacking) {
        const t = state.clipTime;
        if (arch === 'dragon_elemental') {
          // Dragon Head Aiming & Side-to-Side Flamethrower Sweep (no headbutt!)
          if (t < 0.24) {
            const u = t / 0.24;
            part.mesh.rotation.set(-0.26 * u, 0, 0);
          } else if (t < 0.86) {
            const u = (t - 0.24) / 0.62;
            // Aim snout slightly down toward victim and sweep side-to-side like a living flamethrower
            const sweepY = Math.sin(u * Math.PI * 3.0) * 0.28;
            part.mesh.rotation.set(0.22 * Math.sin(u * Math.PI * 0.85), sweepY, -sweepY * 0.35);
          } else {
            const u = Math.min(1, (t - 0.86) / 0.18);
            part.mesh.rotation.set(0.12 * (1 - u), 0, 0);
          }
        } else if (arch === 'classic_staunton') {
          // Staunton Warhorse rears its head proudly upward during telekinetic levitation (never headbutts!)
          const rearUp = Math.sin(Math.min(1, t / 0.75) * Math.PI);
          part.mesh.rotation.set(-0.26 * rearUp, 0, 0);
        } else {
          // Cyber Pegasus / Warhorse optic horn target lock & horizontal laser sweep
          if (t < 0.24) {
            const u = t / 0.24;
            part.mesh.rotation.set(0.12 * u, 0, 0);
          } else if (t < 0.86) {
            const u = (t - 0.24) / 0.62;
            const sweep = Math.sin(u * Math.PI * 2.5) * 0.16;
            part.mesh.rotation.set(0.12, sweep, 0);
          } else {
            const u = Math.min(1, (t - 0.86) / 0.18);
            part.mesh.rotation.set(0.12 * (1 - u), 0, 0);
          }
        }
      } else {
        part.mesh.rotation.set(Math.sin(elapsedTotal * 2.4 + phaseSeed) * 0.055, 0, 0);
      }
    }
  }

  if (mode === 'idle') {
    const breath = 1.0 + Math.sin(elapsedTotal * 2.4 + phaseSeed) * 0.018;
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    rig.scale.set(1, breath, 1);
  } else if (mode === 'move') {
    if (arch === 'arcane_cyber') {
      // Zero-gravity cyber hover glide with slight forward pitch
      const hover = 0.07 + Math.sin(state.clipTime * 12.0) * 0.025;
      rig.position.set(0, hover, 0);
      rig.rotation.set(0.18, 0, Math.sin(state.clipTime * 6.0) * 0.06);
      rig.scale.set(1, 1, 1);
    } else if (arch === 'dragon_elemental') {
      // Winged bounding stride
      const swoop = Math.abs(Math.sin(state.clipTime * 9.0)) * 0.095;
      rig.position.set(0, swoop, 0);
      rig.rotation.set(0.20, Math.sin(state.clipTime * 9.0) * 0.08, 0);
      rig.scale.set(1, 1, 1);
    } else {
      const stride = Math.abs(Math.sin(state.clipTime * 10.0)) * 0.06;
      rig.position.set(0, stride, 0);
      rig.rotation.set(0.14, 0, 0);
      rig.scale.set(1, 1, 1);
    }
  } else if (mode === 'attack') {
    // ========================================================================
    // 3 DISTINCT NON-DEFAULT SET ATTACK PATTERNS (Zero Forward Headbutts!)
    // ========================================================================
    const t = state.clipTime;
    const isRoyal = pType === 'king' || pType === 'queen';
    const powerMul = isRoyal ? 1.22 : pType === 'rook' || pType === 'knight' ? 1.12 : 1.0;

    if (arch === 'classic_staunton') {
      // PATTERN 1 — CLASSIC STAUNTON:
      // "VERTICAL TELEKINETIC ASCENSION, 720° CROWN SPIN & STRAIGHT-DOWN ANVIL CRUSH"
      if (t < 0.36) {
        const u = t / 0.36;
        const ease = u * u * (3 - 2 * u);
        rig.position.set(0, 0.56 * powerMul * ease, 0.28 * powerMul * ease);
        rig.rotation.set(0, ease * Math.PI * 4.0, 0);
        rig.scale.set(1 + 0.08 * ease, 1 + 0.10 * ease, 1 + 0.08 * ease);
      } else if (t < 0.64) {
        const u = (t - 0.36) / 0.28;
        const dropProgress = Math.min(1, u / 0.52);
        const dropY = 0.56 * powerMul * (1 - Math.pow(dropProgress, 2.4));
        rig.position.set(0, Math.max(0, dropY), 0.28 * powerMul);
        rig.rotation.set(0, 0, 0);
        if (u >= 0.52) {
          const impactPhase = (u - 0.52) / 0.48;
          const squash = 1 - Math.sin(impactPhase * Math.PI) * 0.18;
          const widen = 1 / Math.sqrt(squash);
          rig.scale.set(widen, squash, widen);
        } else {
          rig.scale.set(0.95, 1.12, 0.95);
        }
      } else {
        const u = Math.min(1, (t - 0.64) / 0.36);
        const ease = u * u * (3 - 2 * u);
        rig.position.set(0, 0.06 * Math.sin(u * Math.PI), 0.28 * powerMul * (1 - ease));
        rig.rotation.set(0, 0, 0);
        rig.scale.set(1, 1, 1);
      }
    } else if (arch === 'arcane_cyber') {
      // PATTERN 2 — ARCANE RUNIC & CYBER-MECH:
      // "ZERO-G STABILIZED HOVER, TARGET-LOCK RETICLE DEPLOYMENT & SUSTAINED MULTI-BEAM LASER BARRAGE"
      // Mech hovers upright as a stabilized firing platform, deploys its articulated laser cannons &
      // holographic hex lenses, and fires a sustained multi-beam laser barrage with hydraulic recoil!
      if (t < 0.24) {
        // Phase 1: Thruster Hover Lift & Capacitor Overcharge Lock-On
        const u = t / 0.24;
        const ease = u * u * (3 - 2 * u);
        rig.position.set(0, 0.18 * powerMul * ease, -0.03 * ease);
        rig.rotation.set(-0.04 * ease, 0, 0);
        rig.scale.set(1 + 0.04 * ease, 1 + 0.05 * ease, 1 + 0.04 * ease);
      } else if (t < 0.86) {
        // Phase 2: Sustained High-Energy Laser Beam Discharge, Precision Target Sweep & Recoil Kickback
        const u = (t - 0.24) / 0.62;
        const fireEnv = Math.sin(u * Math.PI);
        const recoilZ = -0.03 - 0.075 * fireEnv - Math.sin(t * 60.0) * 0.012 * fireEnv;
        const targetSweepY = Math.sin(u * Math.PI * 2.5) * 0.14;
        rig.position.set(
          Math.sin(u * Math.PI * 2.5) * 0.025,
          0.18 * powerMul + Math.sin(u * Math.PI * 4.0) * 0.02,
          recoilZ
        );
        // Upright stabilized laser-firing posture (zero forward headbutt, zero sword swing!)
        rig.rotation.set(-0.04 * fireEnv, targetSweepY, -targetSweepY * 0.2);
        rig.scale.set(1.04, 1.03, 1.04);
      } else {
        // Phase 3: Barrel Cooldown & Thruster Touchdown
        const u = Math.min(1, (t - 0.86) / 0.20);
        const ease = u * u * (3 - 2 * u);
        rig.position.set(0, 0.18 * powerMul * (1 - ease), -0.03 * (1 - ease));
        rig.rotation.set(0, 0, 0);
        rig.scale.set(1, 1, 1);
      }
    } else if (arch === 'dragon_elemental') {
      // PATTERN 3 — DRAGON & ELEMENTAL GUARDIANS:
      // "MID-AIR WINGED HOVER, UNHINGED JAWS & SUSTAINED SWEEPING FIRE-BREATH TORRENT"
      // Dragon beats its wings to rise into a proud upright mid-air hover at standoff distance
      // (rig.rotation.x stays upright, NEVER diving/headbutting!), unhinges its fanged jaws wide open,
      // and hoses the enemy piece in a sweeping torrent of living dragonfire!
      if (t < 0.24) {
        // Phase 1: Winged Aerial Ascent & Deep Draconic Inhale
        const u = t / 0.24;
        const ease = u * u * (3 - 2 * u);
        rig.position.set(0, 0.38 * powerMul * ease, -0.10 * ease);
        rig.rotation.set(-0.18 * ease, 0, 0);
        rig.scale.set(1 + 0.08 * ease, 1 + 0.10 * ease, 1 + 0.08 * ease);
      } else if (t < 0.86) {
        // Phase 2: Sustained Mid-Air Hover + Sweeping Flamethrower Breath + Breath Recoil
        const u = (t - 0.24) / 0.62;
        const hoverBob = Math.sin(u * Math.PI * 3.0) * 0.035;
        const bodySweepY = Math.sin(u * Math.PI * 3.0) * 0.18;
        rig.position.set(
          Math.sin(u * Math.PI * 3.0) * 0.04,
          0.38 * powerMul + hoverBob,
          -0.10 - Math.sin(u * Math.PI) * 0.06
        );
        rig.rotation.set(-0.18 * (1 - Math.min(1, u * 3.0)) + 0.06, bodySweepY, -bodySweepY * 0.25);
        const chestSwell = 1.0 + Math.sin(u * Math.PI * 4.0) * 0.045;
        rig.scale.set(1.06 * chestSwell, 1.08, 1.06 * chestSwell);
      } else {
        // Phase 3: Graceful Winged Alight back onto the volcanic crag pedestal
        const u = Math.min(1, (t - 0.86) / 0.20);
        const ease = u * u * (3 - 2 * u);
        rig.position.set(0, 0.38 * powerMul * (1 - ease), -0.10 * (1 - ease));
        rig.rotation.set(0.06 * (1 - ease), 0, 0);
        rig.scale.set(1, 1, 1);
      }
    } else {
      // Fallback procedural attack
      if (t < 0.34) {
        const u = t / 0.34;
        rig.rotation.x = -0.38 * u;
        rig.position.y = 0.08 * u;
        rig.position.z = -0.06 * u;
      } else if (t < 0.68) {
        const u = (t - 0.34) / 0.34;
        const slam = Math.sin(u * Math.PI * 0.85);
        rig.rotation.x = -0.38 + 0.92 * slam;
        rig.rotation.y = Math.sin(u * Math.PI * 2) * 0.22;
        rig.position.y = 0.08 * (1 - u);
        rig.position.z = 0.18 * slam;
      } else {
        const u = Math.min(1, (t - 0.68) / 0.32);
        rig.rotation.x = 0.45 * (1 - u);
        rig.rotation.y = 0;
        rig.position.set(0, 0, 0.12 * (1 - u));
      }
    }
  } else if (mode === 'shatter') {
    const t = state.clipTime;
    rig.position.x = Math.sin(t * 55) * 0.04;
    rig.position.z = Math.cos(t * 48) * 0.04;
    rig.rotation.x = -0.22;
  }
}

/**
 * Rebuilds the 3D Board Perimeter Architecture (`boardArchGroup`) for the 5 Board Styles:
 * - 'gothic'
 * - 'wood_table'
 * - 'runic_pedestal'
 * - 'crystal_sanctum'
 * - 'lava_forge'
 */
export function rebuildBoardArchitectureGroup(boardArchGroup, boardSkin, BOARD_SQ_SIZE, BOARD_SURFACE_Y, boardBorderMat) {
  while (boardArchGroup.children.length > 0) {
    const ch = boardArchGroup.children.pop();
    if (ch) boardArchGroup.remove(ch);
  }
  boardArchGroup.userData.dynamicNodes = [];

  const archType = boardSkin?.archType || 'gothic';
  const halfB = 4.0 * BOARD_SQ_SIZE;
  const accentColor = new THREE.Color(boardSkin?.accentHex || '#ff9f1c');
  const borderColor = new THREE.Color(boardSkin?.borderHex || '#d4af37');

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: archType === 'wood_table' ? 0.15 : 0.85,
    roughness: 0.2,
    metalness: 0.75
  });

  const frameSecondaryMat = new THREE.MeshStandardMaterial({
    color: borderColor,
    roughness: archType === 'wood_table' ? 0.30 : 0.24,
    metalness: archType === 'wood_table' ? 0.12 : 0.65
  });

  if (archType === 'wood_table') {
    // Royal Tournament Wood Table: Wide Mahogany Frame + Deep Cabinet Apron + 4 Brass Medallions + 4 Turned Parlor Legs
    const rimW = 0.18;
    const rimH = 0.065;
    const horizGeo = new THREE.BoxGeometry(halfB * 2 + rimW * 2, rimH, rimW);
    const vertGeo = new THREE.BoxGeometry(rimW, rimH, halfB * 2);
    for (const s of [-1, 1]) {
      const hBar = new THREE.Mesh(horizGeo, frameSecondaryMat);
      hBar.position.set(0, BOARD_SURFACE_Y - rimH * 0.45, s * (halfB + rimW * 0.5));
      hBar.receiveShadow = true;
      boardArchGroup.add(hBar);

      const vBar = new THREE.Mesh(vertGeo, frameSecondaryMat);
      vBar.position.set(s * (halfB + rimW * 0.5), BOARD_SURFACE_Y - rimH * 0.45, 0);
      vBar.receiveShadow = true;
      boardArchGroup.add(vBar);
    }

    // Brass Corner Medallions & Turned Legs
    const legGeo = new THREE.CylinderGeometry(0.085, 0.055, BOARD_SURFACE_Y - 0.04, 28);
    const medallionGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.072, 28);
    const cornerOffset = halfB + rimW * 0.55;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const med = new THREE.Mesh(medallionGeo, accentMat);
        med.position.set(sx * cornerOffset, BOARD_SURFACE_Y - 0.025, sz * cornerOffset);
        boardArchGroup.add(med);

        const leg = new THREE.Mesh(legGeo, frameSecondaryMat);
        leg.position.set(sx * cornerOffset, (BOARD_SURFACE_Y - 0.04) * 0.5, sz * cornerOffset);
        leg.castShadow = true;
        boardArchGroup.add(leg);
      }
    }
  } else if (archType === 'runic_pedestal') {
    // Stepped Octagonal Runestone Dais + Glowing Mana Ring + 4 Levitating Corner Arcane Obelisks
    const rimW = 0.10;
    const rimH = 0.05;
    const horizGeo = new THREE.BoxGeometry(halfB * 2 + rimW * 2, rimH, rimW);
    const vertGeo = new THREE.BoxGeometry(rimW, rimH, halfB * 2);
    for (const s of [-1, 1]) {
      const hBar = new THREE.Mesh(horizGeo, boardBorderMat);
      hBar.position.set(0, BOARD_SURFACE_Y - rimH * 0.45, s * (halfB + rimW * 0.5));
      boardArchGroup.add(hBar);

      const vBar = new THREE.Mesh(vertGeo, boardBorderMat);
      vBar.position.set(s * (halfB + rimW * 0.5), BOARD_SURFACE_Y - rimH * 0.45, 0);
      boardArchGroup.add(vBar);
    }

    // Glowing Arcane Rune Circle surrounding the board
    const runeRing = new THREE.Mesh(new THREE.RingGeometry(halfB * 1.08, halfB * 1.14, 64), accentMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = BOARD_SURFACE_Y - 0.015;
    boardArchGroup.add(runeRing);

    const obeliskGeo = buildSmoothSplineLathe(
      [
        [0.0, -0.22],
        [0.075, -0.06],
        [0.055, 0.14],
        [0.0, 0.24]
      ],
      28,
      32
    );
    const cornerDist = halfB + 0.20;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const obGroup = new THREE.Group();
        const baseY = BOARD_SURFACE_Y + 0.22;
        obGroup.position.set(sx * cornerDist, baseY, sz * cornerDist);

        const obMesh = new THREE.Mesh(obeliskGeo, frameSecondaryMat);
        obGroup.add(obMesh);

        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 16, 36), accentMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = -0.06;
        obGroup.add(halo);

        boardArchGroup.add(obGroup);
        boardArchGroup.userData.dynamicNodes.push({
          mesh: obGroup,
          baseY,
          phase: sx * 1.2 + sz * 0.8
        });
      }
    }
  } else if (archType === 'crystal_sanctum') {
    // Prismatic Quartz Frame + 8 Hovering Sculpted Spires around the perimeter
    const rimW = 0.09;
    const rimH = 0.048;
    const horizGeo = new THREE.BoxGeometry(halfB * 2 + rimW * 2, rimH, rimW);
    const vertGeo = new THREE.BoxGeometry(rimW, rimH, halfB * 2);
    for (const s of [-1, 1]) {
      const hBar = new THREE.Mesh(horizGeo, accentMat);
      hBar.position.set(0, BOARD_SURFACE_Y - rimH * 0.45, s * (halfB + rimW * 0.5));
      boardArchGroup.add(hBar);

      const vBar = new THREE.Mesh(vertGeo, accentMat);
      vBar.position.set(s * (halfB + rimW * 0.5), BOARD_SURFACE_Y - rimH * 0.45, 0);
      boardArchGroup.add(vBar);
    }

    const shardGeo = buildSmoothSplineLathe(
      [
        [0.0, -0.20],
        [0.075, -0.04],
        [0.05, 0.12],
        [0.0, 0.22]
      ],
      28,
      28
    );
    const crystalCoords = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [0, -1.08], [0, 1.08], [-1.08, 0], [1.08, 0]
    ];
    crystalCoords.forEach(([cx, cz], idx) => {
      const shard = new THREE.Mesh(shardGeo, accentMat);
      const baseY = BOARD_SURFACE_Y + 0.16 + (idx % 2) * 0.06;
      shard.position.set(cx * (halfB + 0.18), baseY, cz * (halfB + 0.18));
      boardArchGroup.add(shard);
      boardArchGroup.userData.dynamicNodes.push({
        mesh: shard,
        baseY,
        phase: idx * 0.9
      });
    });
  } else if (archType === 'lava_forge') {
    // Heavy Basalt Anvil Frame + Recessed Glowing Molten Magma Channels + 4 Iron Forge Pylons
    const rimW = 0.15;
    const rimH = 0.058;
    const horizGeo = new THREE.BoxGeometry(halfB * 2 + rimW * 2, rimH, rimW);
    const vertGeo = new THREE.BoxGeometry(rimW, rimH, halfB * 2);
    const lavaStripH = new THREE.BoxGeometry(halfB * 2 + rimW * 1.4, rimH + 0.006, 0.038);
    const lavaStripV = new THREE.BoxGeometry(0.038, rimH + 0.006, halfB * 2);

    for (const s of [-1, 1]) {
      const hBar = new THREE.Mesh(horizGeo, frameSecondaryMat);
      hBar.position.set(0, BOARD_SURFACE_Y - rimH * 0.45, s * (halfB + rimW * 0.5));
      boardArchGroup.add(hBar);

      const hLava = new THREE.Mesh(lavaStripH, accentMat);
      hLava.position.set(0, BOARD_SURFACE_Y - rimH * 0.42, s * (halfB + rimW * 0.5));
      boardArchGroup.add(hLava);

      const vBar = new THREE.Mesh(vertGeo, frameSecondaryMat);
      vBar.position.set(s * (halfB + rimW * 0.5), BOARD_SURFACE_Y - rimH * 0.45, 0);
      boardArchGroup.add(vBar);

      const vLava = new THREE.Mesh(lavaStripV, accentMat);
      vLava.position.set(s * (halfB + rimW * 0.5), BOARD_SURFACE_Y - rimH * 0.42, 0);
      boardArchGroup.add(vLava);
    }

    const pylonGeo = new THREE.CylinderGeometry(0.065, 0.095, 0.28, 24);
    const emberOrbGeo = new THREE.TorusKnotGeometry(0.048, 0.015, 48, 12, 2, 3);
    const cornerOff = halfB + rimW * 0.65;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pylon = new THREE.Mesh(pylonGeo, frameSecondaryMat);
        pylon.position.set(sx * cornerOff, BOARD_SURFACE_Y + 0.08, sz * cornerOff);
        boardArchGroup.add(pylon);

        const ember = new THREE.Mesh(emberOrbGeo, accentMat);
        const baseY = BOARD_SURFACE_Y + 0.27;
        ember.position.set(sx * cornerOff, baseY, sz * cornerOff);
        boardArchGroup.add(ember);
        boardArchGroup.userData.dynamicNodes.push({
          mesh: ember,
          baseY,
          phase: sx + sz * 2
        });
      }
    }
  } else {
    // Default 'gothic' Sanctum Altar Golden Border Frame
    const rimW = 0.06;
    const rimH = 0.042;
    const horizGeo = new THREE.BoxGeometry(halfB * 2 + rimW * 2, rimH, rimW);
    const vertGeo = new THREE.BoxGeometry(rimW, rimH, halfB * 2);
    for (const s of [-1, 1]) {
      const hBar = new THREE.Mesh(horizGeo, boardBorderMat);
      hBar.position.set(0, BOARD_SURFACE_Y - rimH * 0.45, s * (halfB + rimW * 0.5));
      hBar.receiveShadow = true;
      boardArchGroup.add(hBar);

      const vBar = new THREE.Mesh(vertGeo, boardBorderMat);
      vBar.position.set(s * (halfB + rimW * 0.5), BOARD_SURFACE_Y - rimH * 0.45, 0);
      vBar.receiveShadow = true;
      boardArchGroup.add(vBar);
    }
  }
}
