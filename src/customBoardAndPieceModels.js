import * as THREE from 'three';

/**
 * Builds composite multi-part 3D chess piece models for:
 * - 'classic_staunton' (Lathe-turned tournament chessmen with collars, horse-head knights, mitres & crowns)
 * - 'arcane_cyber' (Cyber-Arcane sentinel mechs & runic obelisks with hovering energy rings & visors)
 * - 'dragon_elemental' (Mythic Dragon & Elemental guardians with swept wings, horns & crystal spires)
 *
 * All models are normalized in unscaled local coordinates (1 unit = 1 board square, matching the GLB pieces)
 * with bottom pivot at Y = 0 so `root.scale.setScalar(BOARD_SQ_SIZE)` produces exact board proportions.
 */

function makeStauntonLathePoints(profilePairs) {
  return profilePairs.map(([r, y]) => new THREE.Vector2(r, y));
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

function buildStauntonPiece(rig, type, primaryMat, trimMat, bladeMat, animParts) {
  const heightScale = {
    pawn: 0.95,
    rook: 1.08,
    knight: 1.15,
    bishop: 1.22,
    queen: 1.38,
    king: 1.52
  }[type] || 1.1;

  // 1. Turned Staunton Pedestal Base + Brass Collar Ring
  const basePts = makeStauntonLathePoints([
    [0.0, 0.0],
    [0.36, 0.0],
    [0.36, 0.06],
    [0.33, 0.10],
    [0.34, 0.14],
    [0.27, 0.19],
    [0.21, 0.25],
    [0.16, 0.58 * heightScale],
    [0.23, 0.63 * heightScale],
    [0.25, 0.66 * heightScale],
    [0.18, 0.70 * heightScale],
    [0.0, 0.70 * heightScale]
  ]);
  const bodyGeo = new THREE.LatheGeometry(basePts, 28);
  const bodyMesh = new THREE.Mesh(bodyGeo, primaryMat);
  rig.add(bodyMesh);

  // Brass pedestal ring & upper neck ring
  const lowerRing = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.018, 12, 28), trimMat);
  lowerRing.rotation.x = Math.PI / 2;
  lowerRing.position.y = 0.07;
  rig.add(lowerRing);

  const collarY = 0.65 * heightScale;
  const neckRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 12, 28), trimMat);
  neckRing.rotation.x = Math.PI / 2;
  neckRing.position.y = collarY;
  rig.add(neckRing);

  const topY = 0.70 * heightScale;

  if (type === 'pawn') {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.20, 24, 20), primaryMat);
    head.position.y = topY + 0.17;
    rig.add(head);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), trimMat);
    finial.position.y = topY + 0.37;
    rig.add(finial);
  } else if (type === 'rook') {
    // Castle turret drum + 6 sculpted battlements
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.26, 24), primaryMat);
    turret.position.y = topY + 0.12;
    rig.add(turret);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.018, 10, 24), trimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = topY + 0.24;
    rig.add(rim);

    const merlonGeo = new THREE.BoxGeometry(0.085, 0.11, 0.085);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const merlon = new THREE.Mesh(merlonGeo, primaryMat);
      merlon.position.set(Math.cos(ang) * 0.175, topY + 0.29, Math.sin(ang) * 0.175);
      merlon.rotation.y = -ang;
      rig.add(merlon);
    }
  } else if (type === 'knight') {
    // Sculpted Staunton Horse Neck, Crest Mane, Snout & Ears facing +Z (rotated by engine)
    const horseGroup = new THREE.Group();
    horseGroup.position.y = topY - 0.05;
    rig.add(horseGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.38, 18), primaryMat);
    neck.position.set(0, 0.18, 0.03);
    neck.rotation.x = 0.28;
    horseGroup.add(neck);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.165, 18, 16), primaryMat);
    skull.scale.set(0.85, 1.0, 1.25);
    skull.position.set(0, 0.36, 0.09);
    horseGroup.add(skull);

    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.13, 0.26, 16), primaryMat);
    snout.rotation.x = Math.PI * 0.38;
    snout.position.set(0, 0.31, 0.24);
    horseGroup.add(snout);

    // Bridle & Mane Ridge in Metallic Trim
    const bridle = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.016, 10, 20), trimMat);
    bridle.position.set(0, 0.32, 0.20);
    bridle.rotation.x = 0.4;
    horseGroup.add(bridle);

    for (let m = 0; m < 4; m++) {
      const manePlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.09), trimMat);
      manePlate.position.set(0, 0.14 + m * 0.08, -0.10 - m * 0.01);
      manePlate.rotation.x = 0.25;
      horseGroup.add(manePlate);
    }

    const earGeo = new THREE.ConeGeometry(0.045, 0.13, 10);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, primaryMat);
      ear.position.set(s * 0.075, 0.50, 0.04);
      ear.rotation.x = 0.15;
      horseGroup.add(ear);
    }
    animParts.push({ mesh: horseGroup, kind: 'headNod' });
  } else if (type === 'bishop') {
    const mitre = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 20), primaryMat);
    mitre.scale.set(0.92, 1.48, 0.92);
    mitre.position.y = topY + 0.22;
    rig.add(mitre);

    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 10, 24), trimMat);
    sash.rotation.x = Math.PI * 0.35;
    sash.position.y = topY + 0.25;
    rig.add(sash);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), trimMat);
    orb.position.y = topY + 0.53;
    rig.add(orb);
  } else if (type === 'queen') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 20), primaryMat);
    dome.position.y = topY + 0.16;
    rig.add(dome);

    const coronet = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.16, 20), trimMat);
    coronet.position.y = topY + 0.28;
    rig.add(coronet);

    const pearlGeo = new THREE.SphereGeometry(0.036, 12, 12);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const pearl = new THREE.Mesh(pearlGeo, bladeMat);
      pearl.position.set(Math.cos(ang) * 0.22, topY + 0.38, Math.sin(ang) * 0.22);
      rig.add(pearl);
    }

    const topOrb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), trimMat);
    topOrb.position.y = topY + 0.44;
    rig.add(topOrb);
  } else if (type === 'king') {
    const royalCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.24, 24), primaryMat);
    royalCrown.position.y = topY + 0.15;
    rig.add(royalCrown);

    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.024, 12, 24), trimMat);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.y = topY + 0.26;
    rig.add(crownBand);

    // Royal Cross Finial
    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.24, 0.065), trimMat);
    crossVert.position.y = topY + 0.42;
    rig.add(crossVert);

    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.065, 0.065), trimMat);
    crossHoriz.position.y = topY + 0.45;
    rig.add(crossHoriz);
  }
}

function buildArcaneCyberPiece(rig, type, primaryMat, trimMat, bladeMat, animParts) {
  const heightMap = {
    pawn: 0.92,
    rook: 1.12,
    knight: 1.18,
    bishop: 1.26,
    queen: 1.42,
    king: 1.56
  };
  const h = heightMap[type] || 1.15;

  // 1. Hexagonal Armored Hover-Plinth
  const hexBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.12, 6), primaryMat);
  hexBase.position.y = 0.06;
  rig.add(hexBase);

  const trimHex = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 6), trimMat);
  trimHex.position.y = 0.13;
  rig.add(trimHex);

  // 2. Angular Cyber-Obelisk Core Pillar
  const corePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.56 * h, 6), primaryMat);
  corePillar.position.y = 0.14 + 0.28 * h;
  rig.add(corePillar);

  // Glowing Energy Core Crystal inside/above the pillar
  const energyCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), bladeMat);
  energyCore.position.y = 0.18 + 0.58 * h;
  rig.add(energyCore);
  animParts.push({ mesh: energyCore, kind: 'spinFloat', baseY: energyCore.position.y, speed: 2.4 });

  // Levitating Orbital Halo Ring
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 8, 6), trimMat);
  haloRing.rotation.x = Math.PI / 2;
  haloRing.position.y = 0.18 + 0.48 * h;
  rig.add(haloRing);
  animParts.push({ mesh: haloRing, kind: 'orbitRing', baseY: haloRing.position.y, speed: 1.8 });

  const topY = 0.18 + 0.62 * h;

  if (type === 'pawn') {
    // Sentinel Drone Head + Twin Plasma Fins
    const helm = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), primaryMat);
    helm.position.y = topY + 0.12;
    rig.add(helm);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.14), bladeMat);
    visor.position.set(0, topY + 0.13, 0.09);
    rig.add(visor);
  } else if (type === 'rook') {
    // 4 Floating Shield Pylons around a Reactor Tower
    const pylonGeo = new THREE.BoxGeometry(0.09, 0.42, 0.09);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const pylon = new THREE.Mesh(pylonGeo, primaryMat);
      pylon.position.set(Math.cos(ang) * 0.22, topY + 0.08, Math.sin(ang) * 0.22);
      rig.add(pylon);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.11), trimMat);
      cap.position.set(Math.cos(ang) * 0.22, topY + 0.30, Math.sin(ang) * 0.22);
      rig.add(cap);
    }
  } else if (type === 'knight') {
    // Cyber-Pegasus / Mecha-Steed Angular Blade Head + Twin Energy Lancets
    const headGroup = new THREE.Group();
    headGroup.position.y = topY;
    rig.add(headGroup);

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), primaryMat);
    crest.rotation.x = Math.PI * 0.32;
    crest.position.set(0, 0.16, 0.12);
    headGroup.add(crest);

    const maneBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.22), bladeMat);
    maneBlade.position.set(0, 0.22, -0.06);
    maneBlade.rotation.x = -0.25;
    headGroup.add(maneBlade);

    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.16), trimMat);
      wing.position.set(s * 0.20, 0.05, 0);
      wing.rotation.z = -s * 0.35;
      headGroup.add(wing);
    }
    animParts.push({ mesh: headGroup, kind: 'headNod' });
  } else if (type === 'bishop') {
    // Levitating Twin-Ring Arcane Conduit Spire
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.46, 6), primaryMat);
    spire.position.y = topY + 0.20;
    rig.add(spire);

    const outerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.016, 8, 24), bladeMat);
    outerHalo.position.y = topY + 0.24;
    rig.add(outerHalo);
    animParts.push({ mesh: outerHalo, kind: 'gyroRing', speed: 2.6 });
  } else if (type === 'queen') {
    // Archon Valiant Crown + 6 Floating Fin Blades
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.13, 0.32, 6), primaryMat);
    torso.position.y = topY + 0.12;
    rig.add(torso);

    const crownGroup = new THREE.Group();
    crownGroup.position.y = topY + 0.34;
    rig.add(crownGroup);

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), bladeMat);
      fin.position.set(Math.cos(ang) * 0.20, 0.04, Math.sin(ang) * 0.20);
      fin.rotation.z = -Math.cos(ang) * 0.35;
      fin.rotation.x = Math.sin(ang) * 0.35;
      crownGroup.add(fin);
    }
    animParts.push({ mesh: crownGroup, kind: 'orbitRing', baseY: crownGroup.position.y, speed: 1.5 });
  } else if (type === 'king') {
    // Prime Mech Sovereign: Armored Shoulders + Command Halo + Plasma Greatsword Finial
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.26), primaryMat);
    shoulders.position.y = topY + 0.06;
    rig.add(shoulders);

    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 6), primaryMat);
    helm.position.y = topY + 0.24;
    rig.add(helm);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.18), bladeMat);
    visor.position.set(0, topY + 0.25, 0.06);
    rig.add(visor);

    const swordSpire = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), trimMat);
    swordSpire.scale.set(0.7, 2.2, 0.7);
    swordSpire.position.y = topY + 0.48;
    rig.add(swordSpire);
  }
}

function buildDragonElementalPiece(rig, type, primaryMat, trimMat, bladeMat, animParts) {
  const heightMap = {
    pawn: 0.94,
    rook: 1.12,
    knight: 1.22,
    bishop: 1.28,
    queen: 1.44,
    king: 1.58
  };
  const h = heightMap[type] || 1.15;

  // 1. Clawed Obsidian / Stone Pedestal with 4 Talon Spurs
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.37, 0.15, 16), primaryMat);
  base.position.y = 0.075;
  rig.add(base);

  const talonGeo = new THREE.ConeGeometry(0.05, 0.16, 6);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const talon = new THREE.Mesh(talonGeo, trimMat);
    talon.position.set(Math.cos(ang) * 0.33, 0.08, Math.sin(ang) * 0.33);
    talon.rotation.z = -Math.cos(ang) * 0.65;
    talon.rotation.x = Math.sin(ang) * 0.65;
    rig.add(talon);
  }

  // 2. Scaled Dragon Pillar Body
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.25, 0.54 * h, 12), primaryMat);
  column.position.y = 0.15 + 0.27 * h;
  rig.add(column);

  // Dorsal Spine Ridges along the back (-Z)
  for (let s = 0; s < 4; s++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 4), trimMat);
    spine.rotation.x = -Math.PI * 0.38;
    spine.position.set(0, 0.24 + s * 0.11 * h, -0.19);
    rig.add(spine);
  }

  const topY = 0.15 + 0.54 * h;

  // Helper to attach swept dragon wings
  const addDragonWings = (yPos, spanScale = 1.0) => {
    const wingGroup = new THREE.Group();
    wingGroup.position.y = yPos;
    rig.add(wingGroup);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        new THREE.ConeGeometry(0.14 * spanScale, 0.44 * spanScale, 4),
        side === 1 ? trimMat : primaryMat
      );
      wing.position.set(side * 0.22 * spanScale, 0.10, -0.06);
      wing.rotation.z = -side * 0.72;
      wing.rotation.x = -0.22;
      wingGroup.add(wing);

      const innerPinion = new THREE.Mesh(
        new THREE.ConeGeometry(0.09 * spanScale, 0.32 * spanScale, 4),
        bladeMat
      );
      innerPinion.position.set(side * 0.18 * spanScale, 0.02, -0.08);
      innerPinion.rotation.z = -side * 0.95;
      wingGroup.add(innerPinion);
    }
    animParts.push({ mesh: wingGroup, kind: 'wingPulse', baseY: yPos });
  };

  if (type === 'pawn') {
    // Hatchling Gargoyle / Elemental Imp with Horned Brow & Flame Core
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19, 0), primaryMat);
    head.position.y = topY + 0.12;
    rig.add(head);

    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.20, 8), trimMat);
      horn.position.set(s * 0.12, topY + 0.26, -0.04);
      horn.rotation.z = -s * 0.35;
      horn.rotation.x = -0.35;
      rig.add(horn);
    }
  } else if (type === 'rook') {
    // Coiled Wyvern Bastion Turret + Flame Brazier Top
    const fortress = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.20, 0.26, 8), primaryMat);
    fortress.position.y = topY + 0.12;
    rig.add(fortress);

    const flameCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), bladeMat);
    flameCore.position.y = topY + 0.34;
    rig.add(flameCore);
    animParts.push({ mesh: flameCore, kind: 'spinFloat', baseY: flameCore.position.y, speed: 3.0 });
  } else if (type === 'knight') {
    // Winged Drake Head with Curved Horns & Snout
    addDragonWings(topY - 0.06, 0.95);
    const drakeHead = new THREE.Group();
    drakeHead.position.y = topY + 0.06;
    rig.add(drakeHead);

    const skull = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 6), primaryMat);
    skull.rotation.x = Math.PI * 0.42;
    skull.position.set(0, 0.12, 0.12);
    drakeHead.add(skull);

    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.32, 8), trimMat);
      horn.position.set(s * 0.11, 0.24, -0.08);
      horn.rotation.x = -0.58;
      horn.rotation.z = -s * 0.28;
      drakeHead.add(horn);
    }
    animParts.push({ mesh: drakeHead, kind: 'headNod' });
  } else if (type === 'bishop') {
    // Elemental Archmage Spire with Floating Flame/Frost Crystal
    const archHood = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.38, 8), primaryMat);
    archHood.position.y = topY + 0.16;
    rig.add(archHood);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), bladeMat);
    crystal.scale.set(0.8, 1.65, 0.8);
    crystal.position.y = topY + 0.46;
    rig.add(crystal);
    animParts.push({ mesh: crystal, kind: 'spinFloat', baseY: crystal.position.y, speed: 2.5 });
  } else if (type === 'queen') {
    // Dragon Queen: Swept Wings + Coronet of 5 Dragon Horns + Elemental Orb
    addDragonWings(topY - 0.04, 1.12);
    const crownBase = new THREE.Mesh(new THREE.SphereGeometry(0.20, 18, 16), primaryMat);
    crownBase.position.y = topY + 0.14;
    rig.add(crownBase);

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 7), trimMat);
      horn.position.set(Math.cos(ang) * 0.16, topY + 0.32, Math.sin(ang) * 0.16);
      horn.rotation.z = -Math.cos(ang) * 0.32;
      horn.rotation.x = Math.sin(ang) * 0.32;
      rig.add(horn);
    }

    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), bladeMat);
    orb.position.y = topY + 0.44;
    rig.add(orb);
    animParts.push({ mesh: orb, kind: 'spinFloat', baseY: orb.position.y, speed: 2.8 });
  } else if (type === 'king') {
    // Elder Dragon Sovereign: Grand Wings + Twin Swept Great-Horns + Sovereign Crest
    addDragonWings(topY - 0.02, 1.25);
    const sovereignHead = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.26, 8), primaryMat);
    sovereignHead.position.y = topY + 0.14;
    rig.add(sovereignHead);

    for (const s of [-1, 1]) {
      const greatHorn = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.38, 8), trimMat);
      greatHorn.position.set(s * 0.16, topY + 0.38, -0.02);
      greatHorn.rotation.z = -s * 0.42;
      greatHorn.rotation.x = -0.25;
      rig.add(greatHorn);
    }

    const dragonCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), bladeMat);
    dragonCrest.scale.set(0.85, 1.75, 0.55);
    dragonCrest.position.y = topY + 0.46;
    rig.add(dragonCrest);
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

  // Animate sub-parts (hovering crystals, gyro rings, dragon wings)
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
      const flap = Math.sin(elapsedTotal * 3.6 + phaseSeed) * 0.06;
      part.mesh.scale.set(1 + flap, 1, 1);
    } else if (part.kind === 'headNod') {
      part.mesh.rotation.x = Math.sin(elapsedTotal * 2.4 + phaseSeed) * 0.05;
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
    const legGeo = new THREE.CylinderGeometry(0.085, 0.055, BOARD_SURFACE_Y - 0.04, 16);
    const medallionGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.072, 20);
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
    const runeRing = new THREE.Mesh(new THREE.RingGeometry(halfB * 1.08, halfB * 1.14, 48), accentMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = BOARD_SURFACE_Y - 0.015;
    boardArchGroup.add(runeRing);

    const obeliskGeo = new THREE.ConeGeometry(0.08, 0.42, 6);
    const cornerDist = halfB + 0.20;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const obGroup = new THREE.Group();
        const baseY = BOARD_SURFACE_Y + 0.22;
        obGroup.position.set(sx * cornerDist, baseY, sz * cornerDist);

        const obMesh = new THREE.Mesh(obeliskGeo, frameSecondaryMat);
        obGroup.add(obMesh);

        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 20), accentMat);
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
    // Prismatic Quartz Frame + 8 Hovering Crystal Spires around the perimeter
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

    const shardGeo = new THREE.OctahedronGeometry(0.095, 0);
    const crystalCoords = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [0, -1.08], [0, 1.08], [-1.08, 0], [1.08, 0]
    ];
    crystalCoords.forEach(([cx, cz], idx) => {
      const shard = new THREE.Mesh(shardGeo, accentMat);
      shard.scale.set(0.75, 2.2, 0.75);
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

    const pylonGeo = new THREE.CylinderGeometry(0.065, 0.095, 0.28, 8);
    const emberOrbGeo = new THREE.DodecahedronGeometry(0.065, 0);
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
