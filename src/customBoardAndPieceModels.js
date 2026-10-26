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
        const sy = Math.min(1, (y - scallopYMin) / 0.12);
        y += Math.pow(Math.max(0, Math.cos((ang * scallopCount) / 2)), 2) * scallopAmp * sy;
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
      child.castShadow = true;
      child.receiveShadow = true;
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
}

// ============================================================================
// 2. ARCANE RUNIC & CYBER-MECH (Sculpted Paladin Exoskeletons, Wings & Blades)
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

  // 1. Sculpted Fluted Runic Dais Pedestal + 4 Curved Claw Stabilizers
  const plinthGeo = getCachedGeo('cyber_plinth', () =>
    buildSculptedLathe(
      [
        [0.0, 0.0],
        [0.37, 0.0],
        [0.38, 0.04],
        [0.33, 0.08],
        [0.35, 0.12],
        [0.26, 0.17],
        [0.0, 0.17]
      ],
      {
        sampleCount: 36,
        radialSegments: 48,
        fluteCount: 12,
        fluteDepth: 0.01,
        fluteYMin: 0.02,
        fluteYMax: 0.15
      }
    )
  );
  rig.add(new THREE.Mesh(plinthGeo, primaryMat));

  const runeRing = new THREE.Mesh(
    getCachedGeo('cyber_base_rune_ring', () => new THREE.TorusGeometry(0.345, 0.014, 16, 48)),
    bladeMat
  );
  runeRing.rotation.x = Math.PI / 2;
  runeRing.position.y = 0.085;
  rig.add(runeRing);

  // 2. Sculpted Hourglass Paladin Cuirass & Armored Lower Greaves Column
  const torsoGeo = getCachedGeo(`cyber_torso_${type}`, () =>
    buildSculptedLathe(
      [
        [0.0, 0.15],
        [0.24, 0.16],
        [0.21, 0.28 * h],
        [0.145, 0.42 * h],
        [0.22, 0.56 * h],
        [0.25, 0.64 * h],
        [0.16, 0.70 * h],
        [0.0, 0.70 * h]
      ],
      {
        sampleCount: 56,
        radialSegments: 48,
        fluteCount: 8,
        fluteDepth: 0.009,
        fluteYMin: 0.18,
        fluteYMax: 0.62 * h
      }
    )
  );
  rig.add(new THREE.Mesh(torsoGeo, primaryMat));

  // Sculpted Layered Pauldrons (Curved Shoulder Armor Plates)
  const pauldronGeo = getCachedGeo('cyber_pauldron', () => {
    const g = new THREE.SphereGeometry(0.135, 24, 20, 0, Math.PI * 1.15, 0, Math.PI * 0.65);
    g.scale(1.15, 0.85, 0.95);
    return g;
  });
  for (const s of [-1, 1]) {
    const pauldron = new THREE.Mesh(pauldronGeo, trimMat);
    pauldron.position.set(s * 0.21, 0.62 * h, 0);
    pauldron.rotation.z = -s * 0.45;
    pauldron.rotation.y = s > 0 ? 0 : Math.PI;
    rig.add(pauldron);
  }

  // Spinning TorusKnot Arcane Core & Orbital Astrolabe Ring
  const coreKnot = new THREE.Mesh(
    getCachedGeo('cyber_core_knot', () => new THREE.TorusKnotGeometry(0.068, 0.018, 64, 14, 2, 3)),
    bladeMat
  );
  coreKnot.position.set(0, 0.50 * h, 0.14);
  rig.add(coreKnot);
  animParts.push({ mesh: coreKnot, kind: 'spinFloat', baseY: coreKnot.position.y, speed: 2.6 });

  const astrolabe = new THREE.Mesh(
    getCachedGeo('cyber_astrolabe_ring', () => new THREE.TorusGeometry(0.28, 0.012, 14, 48)),
    trimMat
  );
  astrolabe.rotation.x = Math.PI * 0.42;
  astrolabe.position.y = 0.54 * h;
  rig.add(astrolabe);
  animParts.push({ mesh: astrolabe, kind: 'orbitRing', baseY: astrolabe.position.y, speed: 1.9 });

  // Helper: Swept Feathered Valkyrie Energy Wings (smooth beveled feather blades)
  const addValkyrieWings = (yPos, wingScale = 1.0, featherCount = 6) => {
    const wingGroup = new THREE.Group();
    wingGroup.position.set(0, yPos, -0.10);
    rig.add(wingGroup);

    const featherGeo = getCachedGeo('cyber_valkyrie_feather', () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.bezierCurveTo(0.06, 0.08, 0.10, 0.28, 0.02, 0.46);
      s.bezierCurveTo(-0.02, 0.32, -0.03, 0.14, 0, 0);
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
        feather.scale.set(side * wingScale * (1.05 - u * 0.32), wingScale * (1.1 - u * 0.28), 1);
        feather.position.set(side * (0.12 + u * 0.14) * wingScale, 0.04 - u * 0.08, -0.02 - u * 0.02);
        feather.rotation.z = -side * (0.38 + u * 0.72);
        feather.rotation.y = -side * 0.24;
        wingGroup.add(feather);
      }
    }
    animParts.push({ mesh: wingGroup, kind: 'wingPulse', baseY: yPos });
  };

  // Helper: Sculpted Beveled Runic Greatsword / Halberd Blade
  const swordBladeGeo = getCachedGeo('cyber_runic_sword', () => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.26);
    s.lineTo(0.038, -0.18);
    s.lineTo(0.026, 0.22);
    s.lineTo(0, 0.30);
    s.lineTo(-0.026, 0.22);
    s.lineTo(-0.038, -0.18);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, {
      depth: 0.014,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.006,
      bevelThickness: 0.006
    });
  });

  const topY = 0.69 * h;

  if (type === 'pawn') {
    // Aegis Vanguard Paladin: Sculpted Great-Helm, Curved Visor, Kite Shield & Halberd
    const helmGeo = getCachedGeo('cyber_pawn_helm', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.14, 0.02],
          [0.175, 0.12],
          [0.165, 0.24],
          [0.11, 0.32],
          [0.0, 0.35]
        ],
        36,
        40
      )
    );
    const helm = new THREE.Mesh(helmGeo, primaryMat);
    helm.position.y = topY - 0.01;
    rig.add(helm);

    // Swept Glowing Visor Arc & Helmet Crest Fin
    const visor = new THREE.Mesh(
      getCachedGeo(
        'cyber_visor_arc',
        () => new THREE.CylinderGeometry(0.178, 0.172, 0.052, 32, 1, false, -Math.PI * 0.38, Math.PI * 0.76)
      ),
      bladeMat
    );
    visor.position.y = topY + 0.16;
    rig.add(visor);

    // Sculpted Curved Kite Shield on left side (-X) & Runic Blade on right (+X)
    const shieldGeo = getCachedGeo('cyber_kite_shield', () => {
      const s = new THREE.Shape();
      s.moveTo(0, -0.20);
      s.bezierCurveTo(0.11, -0.10, 0.14, 0.08, 0.11, 0.18);
      s.lineTo(-0.11, 0.18);
      s.bezierCurveTo(-0.14, 0.08, -0.11, -0.10, 0, -0.20);
      return new THREE.ExtrudeGeometry(s, {
        depth: 0.02,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.008,
        bevelThickness: 0.008
      });
    });
    const shield = new THREE.Mesh(shieldGeo, trimMat);
    shield.position.set(-0.22, 0.48 * h, 0.12);
    shield.rotation.y = -0.35;
    rig.add(shield);

    const spear = new THREE.Mesh(swordBladeGeo, bladeMat);
    spear.position.set(0.23, 0.56 * h, 0.10);
    spear.rotation.x = 0.22;
    rig.add(spear);
  } else if (type === 'rook') {
    // Aegis Citadel Bastion: 4 Curved Magnetic Containment Ribs & Multi-Ring Tesla Spire
    const ribGeo = getCachedGeo('cyber_rook_rib', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0.22, 0.0, 0),
          new THREE.Vector3(0.28, 0.16, 0),
          new THREE.Vector3(0.26, 0.34, 0),
          new THREE.Vector3(0.18, 0.44, 0)
        ],
        0.032,
        0.022,
        28,
        16
      )
    );
    for (let i = 0; i < 4; i++) {
      const rib = new THREE.Mesh(ribGeo, primaryMat);
      rib.position.y = topY - 0.04;
      rib.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4;
      rig.add(rib);

      const trimShield = new THREE.Mesh(
        getCachedGeo('cyber_rook_plate', () => new THREE.SphereGeometry(0.08, 20, 16)),
        trimMat
      );
      trimShield.scale.set(0.5, 2.2, 1.1);
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      trimShield.position.set(Math.cos(ang) * 0.26, topY + 0.18, Math.sin(ang) * 0.26);
      trimShield.rotation.y = -ang;
      rig.add(trimShield);
    }

    const teslaOrb = new THREE.Mesh(
      getCachedGeo('cyber_rook_orb', () => new THREE.IcosahedronGeometry(0.115, 3)),
      bladeMat
    );
    teslaOrb.position.y = topY + 0.24;
    rig.add(teslaOrb);
    animParts.push({ mesh: teslaOrb, kind: 'spinFloat', baseY: teslaOrb.position.y, speed: 3.0 });
  } else if (type === 'knight') {
    // Mecha-Pegasus Valkyrie Steed: Sculpted Armored Warhorse + Swept Valkyrie Energy Wings
    addValkyrieWings(topY - 0.06, 0.92, 6);

    const pegasusGroup = new THREE.Group();
    pegasusGroup.position.y = topY - 0.05;
    rig.add(pegasusGroup);

    const neckGeo = getCachedGeo('cyber_pegasus_neck', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0.0, -0.02),
          new THREE.Vector3(0, 0.18, -0.06),
          new THREE.Vector3(0, 0.36, 0.02),
          new THREE.Vector3(0, 0.32, 0.22)
        ],
        0.15,
        0.075,
        32,
        24
      )
    );
    pegasusGroup.add(new THREE.Mesh(neckGeo, primaryMat));

    // Curved Plasma Unicorn Horn & Crested Mane
    const hornGeo = getCachedGeo('cyber_pegasus_horn', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, 0.38, 0.08),
          new THREE.Vector3(0, 0.49, 0.20),
          new THREE.Vector3(0, 0.58, 0.32)
        ],
        0.032,
        0.004,
        20,
        16
      )
    );
    pegasusGroup.add(new THREE.Mesh(hornGeo, bladeMat));

    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(
        getCachedGeo('cyber_mane_fin', () => new THREE.ConeGeometry(0.032, 0.14, 16)),
        i % 2 === 0 ? trimMat : bladeMat
      );
      fin.position.set(0, 0.12 + i * 0.055, -0.13);
      fin.rotation.x = -0.65;
      pegasusGroup.add(fin);
    }
    animParts.push({ mesh: pegasusGroup, kind: 'headNod' });
  } else if (type === 'bishop') {
    // Chronomancer Archon: Sculpted Hooded Mantle, Twin Interlocking Gyro Astrolabes & Crescent Staff
    const hoodGeo = getCachedGeo('cyber_bishop_hood', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.18, 0.02],
          [0.20, 0.14],
          [0.16, 0.28],
          [0.09, 0.40],
          [0.0, 0.45]
        ],
        48,
        44
      )
    );
    const hood = new THREE.Mesh(hoodGeo, primaryMat);
    hood.position.y = topY - 0.02;
    rig.add(hood);

    const gyro1 = new THREE.Mesh(
      getCachedGeo('cyber_bishop_gyro1', () => new THREE.TorusGeometry(0.23, 0.013, 16, 48)),
      bladeMat
    );
    gyro1.position.y = topY + 0.22;
    rig.add(gyro1);
    animParts.push({ mesh: gyro1, kind: 'gyroRing', speed: 2.6 });

    const gyro2 = new THREE.Mesh(
      getCachedGeo('cyber_bishop_gyro2', () => new THREE.TorusGeometry(0.185, 0.012, 16, 48)),
      trimMat
    );
    gyro2.position.y = topY + 0.22;
    gyro2.rotation.y = Math.PI / 2;
    rig.add(gyro2);
    animParts.push({ mesh: gyro2, kind: 'orbitRing', baseY: gyro2.position.y, speed: 2.2 });
  } else if (type === 'queen') {
    // Valkyrie Seraph Empress: 6-Winged Feather Halo, Sculpted Empress Helm & Radiant Tiara
    addValkyrieWings(topY - 0.02, 1.12, 7);

    const headGeo = getCachedGeo('cyber_queen_head', () =>
      buildSmoothSplineLathe(
        [
          [0.0, 0.0],
          [0.15, 0.02],
          [0.18, 0.14],
          [0.15, 0.26],
          [0.0, 0.30]
        ],
        40,
        44
      )
    );
    const head = new THREE.Mesh(headGeo, primaryMat);
    head.position.y = topY - 0.01;
    rig.add(head);

    const tiaraGroup = new THREE.Group();
    tiaraGroup.position.y = topY + 0.26;
    rig.add(tiaraGroup);

    const spireGeo = getCachedGeo('cyber_queen_spire', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0.17, 0.0, 0),
          new THREE.Vector3(0.21, 0.10, 0),
          new THREE.Vector3(0.18, 0.21, 0)
        ],
        0.024,
        0.004,
        18,
        14
      )
    );
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Mesh(spireGeo, i % 2 === 0 ? bladeMat : trimMat);
      sp.rotation.y = (i / 8) * Math.PI * 2;
      tiaraGroup.add(sp);
    }
    animParts.push({ mesh: tiaraGroup, kind: 'orbitRing', baseY: tiaraGroup.position.y, speed: 1.5 });
  } else if (type === 'king') {
    // Sovereign Prime Imperator: Grand Wings, Crowned Great-Helm & Planted Runic Greatsword
    addValkyrieWings(topY, 1.22, 8);

    const helmGeo = getCachedGeo('cyber_king_helm', () =>
      buildSculptedLathe(
        [
          [0.0, 0.0],
          [0.17, 0.0],
          [0.21, 0.12],
          [0.23, 0.26],
          [0.16, 0.30],
          [0.0, 0.30]
        ],
        {
          sampleCount: 44,
          radialSegments: 48,
          scallopCount: 8,
          scallopAmp: 0.045,
          scallopYMin: 0.18
        }
      )
    );
    const helm = new THREE.Mesh(helmGeo, primaryMat);
    helm.position.y = topY - 0.01;
    rig.add(helm);

    const visor = new THREE.Mesh(
      getCachedGeo(
        'cyber_king_visor',
        () => new THREE.CylinderGeometry(0.215, 0.21, 0.055, 32, 1, false, -Math.PI * 0.35, Math.PI * 0.7)
      ),
      bladeMat
    );
    visor.position.y = topY + 0.14;
    rig.add(visor);

    // Planted Two-Handed Runic Greatsword in front (+Z) & Sovereign Halo Crest above
    const greatsword = new THREE.Mesh(swordBladeGeo, bladeMat);
    greatsword.scale.set(1.25, 1.35, 1.25);
    greatsword.position.set(0, 0.52 * h, 0.23);
    rig.add(greatsword);

    const crossguard = new THREE.Mesh(
      getCachedGeo('cyber_crossguard', () => new THREE.TorusGeometry(0.095, 0.016, 12, 28, Math.PI)),
      trimMat
    );
    crossguard.position.set(0, 0.78 * h, 0.235);
    crossguard.rotation.z = Math.PI;
    rig.add(crossguard);

    const crownStar = new THREE.Mesh(swordBladeGeo, trimMat);
    crownStar.scale.set(0.85, 0.72, 0.85);
    crownStar.position.set(0, topY + 0.44, 0);
    rig.add(crownStar);
  }
}

// ============================================================================
// 3. MYTHIC DRAGON & ELEMENTAL (Organic Sinuous Dragons, Wings, Horns & Talons)
// ============================================================================
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

  // 2. Sinuous S-Curved Organic Dragon Neck / Torso with Ventral Scutes & Dorsal Spines
  const neckBodyGeo = getCachedGeo(`dragon_sinuous_body_${type}`, () =>
    buildTaperedCurveGeo(
      [
        new THREE.Vector3(0, 0.15, 0.0),
        new THREE.Vector3(0, 0.30 * h, -0.05),
        new THREE.Vector3(0, 0.48 * h, 0.04),
        new THREE.Vector3(0, 0.66 * h, -0.02)
      ],
      0.22,
      0.135,
      40,
      28
    )
  );
  rig.add(new THREE.Mesh(neckBodyGeo, primaryMat));

  // Overlapping Golden Ventral Scute Plates on the chest (+Z) & Curved Dorsal Spines (-Z)
  const scuteGeo = getCachedGeo('dragon_scute_plate', () => {
    const g = new THREE.SphereGeometry(0.09, 20, 14);
    g.scale(1.35, 0.42, 0.65);
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
  for (let i = 0; i < 6; i++) {
    const u = i / 5;
    const py = (0.22 + u * 0.40) * h;
    const pz = Math.sin(u * Math.PI * 1.5) * 0.03;

    const scute = new THREE.Mesh(scuteGeo, trimMat);
    scute.position.set(0, py, pz + 0.13 - u * 0.03);
    scute.rotation.x = 0.25;
    rig.add(scute);

    const spine = new THREE.Mesh(spineHornGeo, i % 2 === 0 ? trimMat : bladeMat);
    spine.position.set(0, py, pz - 0.12 + u * 0.02);
    rig.add(spine);
  }

  // Helper: Ribbed Bat-Membrane Dragon Wings (extruded scalloped wing membrane + curved bone struts)
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

  // Helper: Sculpted Fanged Dragon Head with Swept Spiral Horns & Glowing Breath Core
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

    // Lower Fanged Jaw
    const jawGeo = getCachedGeo('dragon_carved_jaw', () =>
      buildTaperedCurveGeo(
        [
          new THREE.Vector3(0, -0.03, -0.02),
          new THREE.Vector3(0, -0.06, 0.12),
          new THREE.Vector3(0, -0.04, 0.24)
        ],
        0.075,
        0.035,
        18,
        16
      )
    );
    head.add(new THREE.Mesh(jawGeo, primaryMat));

    // Glowing Elemental Breath Core inside the parted jaws
    const breathOrb = new THREE.Mesh(
      getCachedGeo('dragon_breath_orb', () => new THREE.SphereGeometry(0.042, 18, 18)),
      bladeMat
    );
    breathOrb.position.set(0, 0.0, 0.14);
    head.add(breathOrb);

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

      const eye = new THREE.Mesh(
        getCachedGeo('dragon_eye', () => new THREE.SphereGeometry(0.022, 14, 14)),
        bladeMat
      );
      eye.position.set(s * 0.082, 0.08, 0.08);
      head.add(eye);
    }

    if (hornCount > 2) {
      for (let c = 0; c < hornCount - 2; c++) {
        const ang = ((c - (hornCount - 3) / 2) * 0.38);
        const crestHorn = new THREE.Mesh(spineHornGeo, bladeMat);
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
    // Hatchling Drake Whelp with Sinuous Neck, Swept Horns & Folded Pinions
    addSculptedDragonWings(0.46 * h, 0.62);
    const head = buildDragonHeadGroup(0.82, 2);
    head.position.set(0, topY + 0.04, 0.02);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });
  } else if (type === 'rook') {
    // Wyvern-Wrapped Bastion Tower with Coiled Helical Dragon Body & Flame Brazier
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

    const flameKnot = new THREE.Mesh(
      getCachedGeo('dragon_rook_flame', () => new THREE.TorusKnotGeometry(0.085, 0.024, 56, 14, 3, 2)),
      bladeMat
    );
    flameKnot.position.y = topY + 0.28;
    rig.add(flameKnot);
    animParts.push({ mesh: flameKnot, kind: 'spinFloat', baseY: flameKnot.position.y, speed: 3.0 });
  } else if (type === 'knight') {
    // Winged Storm-Drake Charger with Unfurled Ribbed Wings & Fierce Horned Dragon Head
    addSculptedDragonWings(topY - 0.10, 0.98);
    const head = buildDragonHeadGroup(1.02, 3);
    head.position.set(0, topY + 0.05, 0.04);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });
  } else if (type === 'bishop') {
    // Elder Dragon-Priest with Twin-Serpent Caduceus Arch & Elemental Vortex Crystal
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

    const vortex = new THREE.Mesh(
      getCachedGeo('dragon_bishop_vortex', () => new THREE.TorusKnotGeometry(0.072, 0.018, 56, 14, 2, 5)),
      bladeMat
    );
    vortex.position.y = topY + 0.42;
    rig.add(vortex);
    animParts.push({ mesh: vortex, kind: 'spinFloat', baseY: vortex.position.y, speed: 2.7 });
  } else if (type === 'queen') {
    // Dragon Empress of the Five Flights: 4 Swept Wings + 5-Horned Crown + Elemental Heart
    addSculptedDragonWings(topY - 0.08, 1.12);
    addSculptedDragonWings(0.42 * h, 0.78);

    const head = buildDragonHeadGroup(1.05, 5);
    head.position.set(0, topY + 0.06, 0.03);
    rig.add(head);

    const crownHalo = new THREE.Mesh(
      getCachedGeo('dragon_queen_halo', () => new THREE.TorusGeometry(0.19, 0.014, 16, 44)),
      bladeMat
    );
    crownHalo.rotation.x = Math.PI * 0.42;
    crownHalo.position.set(0, topY + 0.34, -0.04);
    rig.add(crownHalo);
    animParts.push({ mesh: crownHalo, kind: 'orbitRing', baseY: crownHalo.position.y, speed: 2.2 });
  } else if (type === 'king') {
    // Ancient Elder Dragon Sovereign: Grand Wings, Crowned Dragon Head & Dragon-Claw Greatsword
    addSculptedDragonWings(topY - 0.04, 1.26);
    addSculptedDragonWings(0.45 * h, 0.88);

    const head = buildDragonHeadGroup(1.15, 5);
    head.position.set(0, topY + 0.08, 0.03);
    rig.add(head);
    animParts.push({ mesh: head, kind: 'headNod' });

    // Sovereign Crown Circlet & Dragon-Flame Greatsword Finial
    const sovereignCrown = new THREE.Mesh(
      getCachedGeo('dragon_king_crown', () =>
        buildSculptedLathe(
          [
            [0.0, 0.0],
            [0.14, 0.0],
            [0.18, 0.12],
            [0.12, 0.12],
            [0.0, 0.08]
          ],
          {
            sampleCount: 28,
            radialSegments: 40,
            scallopCount: 8,
            scallopAmp: 0.045,
            scallopYMin: 0.06
          }
        )
      ),
      trimMat
    );
    sovereignCrown.position.set(0, topY + 0.24, -0.02);
    rig.add(sovereignCrown);

    const flameBladeGeo = getCachedGeo('dragon_flame_blade', () => {
      const s = new THREE.Shape();
      s.moveTo(0, -0.22);
      s.bezierCurveTo(0.05, -0.10, 0.02, 0.02, 0.045, 0.12);
      s.bezierCurveTo(0.02, 0.20, 0.03, 0.26, 0, 0.34);
      s.bezierCurveTo(-0.03, 0.26, -0.02, 0.20, -0.045, 0.12);
      s.bezierCurveTo(-0.02, 0.02, -0.05, -0.10, 0, -0.22);
      return new THREE.ExtrudeGeometry(s, {
        depth: 0.016,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.006,
        bevelThickness: 0.006
      });
    });
    const dragonSword = new THREE.Mesh(flameBladeGeo, bladeMat);
    dragonSword.position.set(0, 0.52 * h, 0.22);
    rig.add(dragonSword);
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

  // Animate sub-parts (hovering crystals, gyro rings, dragon wings, horse/dragon heads)
  for (const part of state.animParts) {
    if (part.kind === 'spinFloat') {
      part.mesh.rotation.y += dt * (part.speed || 2.0);
      part.mesh.position.y = part.baseY + Math.sin(elapsedTotal * 3.2 + phaseSeed) * 0.03;
    } else if (part.kind === 'orbitRing') {
      part.mesh.rotation.z += dt * (part.speed || 1.6);
      part.mesh.position.y = part.baseY + Math.cos(elapsedTotal * 2.6 + phaseSeed) * 0.02;
    } else if (part.kind === 'gyroRing') {
      part.mesh.rotation.x += dt * 2.2;
      part.mesh.rotation.y += dt * 1.7;
    } else if (part.kind === 'wingPulse') {
      const flap = Math.sin(elapsedTotal * 3.6 + phaseSeed) * 0.07;
      part.mesh.scale.set(1 + flap, 1, 1 - flap * 0.4);
    } else if (part.kind === 'headNod') {
      part.mesh.rotation.x = Math.sin(elapsedTotal * 2.4 + phaseSeed) * 0.055;
    }
  }

  const mode = state.mode || 'idle';
  if (mode === 'idle') {
    const breath = 1.0 + Math.sin(elapsedTotal * 2.4 + phaseSeed) * 0.018;
    rig.position.set(0, 0, 0);
    rig.rotation.set(0, 0, 0);
    rig.scale.set(1, breath, 1);
  } else if (mode === 'move') {
    const stride = Math.abs(Math.sin(state.clipTime * 10.0)) * 0.06;
    rig.position.set(0, stride, 0);
    rig.rotation.set(0.14, 0, 0);
    rig.scale.set(1, 1, 1);
  } else if (mode === 'attack') {
    // Synchronized with ATTACK_SYNC_PROFILES (0.0 -> 0.35 windup, 0.35 -> 0.62 strike cleave, 0.62 -> 0.90 recovery)
    const t = state.clipTime;
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
