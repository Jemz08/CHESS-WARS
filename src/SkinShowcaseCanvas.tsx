import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { PieceArchetype, PieceSkin, BoardSkin, WorldScenery } from './skinCatalog';
import {
  buildProceduralPieceGroup,
  rebuildBoardArchitectureGroup
} from './customBoardAndPieceModels.js';

interface SkinShowcaseCanvasProps {
  activeTab: 'types' | 'boards' | 'sceneries' | 'pieces';
  archetype: PieceArchetype;
  pieceSkin: PieceSkin;
  boardSkin: BoardSkin;
  scenery: WorldScenery;
}

function createSkyDomeTexture(sceneryId: WorldScenery['id']): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    if (sceneryId === 'celestial_observatory') {
      grad.addColorStop(0.0, '#04020c');
      grad.addColorStop(0.35, '#1e0b45');
      grad.addColorStop(0.65, '#3b1578');
      grad.addColorStop(0.85, '#0b525b');
      grad.addColorStop(1.0, '#05020a');
    } else if (sceneryId === 'dragon_sky_citadel') {
      grad.addColorStop(0.0, '#0b1d3d');
      grad.addColorStop(0.38, '#1e4e8c');
      grad.addColorStop(0.66, '#d97724');
      grad.addColorStop(0.84, '#f6ad55');
      grad.addColorStop(1.0, '#1f2438');
    } else if (sceneryId === 'volcanic_titan_forge') {
      grad.addColorStop(0.0, '#090303');
      grad.addColorStop(0.38, '#260704');
      grad.addColorStop(0.68, '#7c1605');
      grad.addColorStop(0.88, '#ff4d00');
      grad.addColorStop(1.0, '#1c0502');
    } else {
      // gothic_cathedral
      grad.addColorStop(0.0, '#060913');
      grad.addColorStop(0.4, '#16233b');
      grad.addColorStop(0.72, '#2a3c5c');
      grad.addColorStop(1.0, '#090b10');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle atmospheric stars / embers on the dome
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 380;
      const r = Math.random() * 1.6 + 0.4;
      ctx.fillStyle =
        sceneryId === 'volcanic_titan_forge'
          ? `rgba(255, ${120 + Math.floor(Math.random() * 110)}, 40, ${0.25 + Math.random() * 0.55})`
          : sceneryId === 'celestial_observatory'
            ? `rgba(180, 255, 245, ${0.35 + Math.random() * 0.65})`
            : `rgba(255, 244, 214, ${0.2 + Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function sanitizeCrossContextMaterials(root: THREE.Object3D, fallbackColorHex = 0xff6a00) {
  root.traverse((child: any) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (
      child.userData?.isDragonFire ||
      child.material?.isShaderMaterial ||
      child.material?.type === 'ShaderMaterial'
    ) {
      child.material = new THREE.MeshBasicMaterial({
        color: fallbackColorHex,
        transparent: true,
        opacity: 0.92
      });
    }
  });
}

export default function SkinShowcaseCanvas({
  activeTab,
  archetype,
  pieceSkin,
  boardSkin,
  scenery
}: SkinShowcaseCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [previewColor, setPreviewColor] = useState<'w' | 'b'>('w');
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 250;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090f);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const lookTarget = new THREE.Vector3(0, 0.65, 0);
    camera.position.set(0, 1.35, 3.25);
    camera.lookAt(lookTarget);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    if (renderer.debug) {
      renderer.debug.checkShaderErrors = false;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting for the Reliquary Showcase
    const ambientLight = new THREE.AmbientLight(0xfff6e8, 0.95);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecc2, 2.5);
    keyLight.position.set(3, 5.5, 4.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6ee7b7, 1.25);
    rimLight.position.set(-3.5, 3.2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xf5d76e, 1.6, 12);
    fillLight.position.set(0, 0.8, 2.8);
    scene.add(fillLight);

    // Altar Showcase Pedestal
    const pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);

    const baseGeo = new THREE.CylinderGeometry(1.15, 1.32, 0.26, 40);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x141824,
      roughness: 0.5,
      metalness: 0.48
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.13;
    baseMesh.receiveShadow = true;
    pedestalGroup.add(baseMesh);

    const ringGeo = new THREE.TorusGeometry(1.17, 0.032, 16, 56);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.22,
      emissive: 0x5a4208,
      emissiveIntensity: 0.4
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.0;
    pedestalGroup.add(ringMesh);

    // Central showcase subject container
    const subjectGroup = new THREE.Group();
    pedestalGroup.add(subjectGroup);

    const isWhite = previewColor === 'w';
    const mainHex = parseInt((isWhite ? pieceSkin.whiteHex : pieceSkin.blackHex).replace('#', ''), 16);
    const trimHex = parseInt(pieceSkin.trimHex.replace('#', ''), 16);
    const bladeHex = parseInt(pieceSkin.bladeHex.replace('#', ''), 16);
    const emissiveHex = parseInt(
      (isWhite ? pieceSkin.whiteEmissiveHex : pieceSkin.blackEmissiveHex).replace('#', ''),
      16
    );
    const emissiveInt = isWhite
      ? pieceSkin.whiteEmissiveIntensity || 0.2
      : pieceSkin.blackEmissiveIntensity || 0.2;

    const primaryMat = new THREE.MeshStandardMaterial({
      color: mainHex,
      roughness: isWhite ? pieceSkin.whiteRoughness : pieceSkin.blackRoughness,
      metalness: isWhite ? pieceSkin.whiteMetalness : pieceSkin.blackMetalness,
      emissive: emissiveHex,
      emissiveIntensity: emissiveInt
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: trimHex,
      roughness: pieceSkin.trimRoughness,
      metalness: pieceSkin.trimMetalness
    });

    const bladeMat = new THREE.MeshStandardMaterial({
      color: bladeHex,
      roughness: pieceSkin.bladeRoughness,
      metalness: pieceSkin.bladeMetalness,
      emissive: parseInt(pieceSkin.bladeEmissiveHex.replace('#', ''), 16),
      emissiveIntensity: pieceSkin.bladeEmissiveIntensity || 0.3
    });

    const dynamicOrbitRings: THREE.Object3D[] = [];
    const floatingNodes: Array<{ mesh: THREE.Object3D; baseY: number; phase: number }> = [];
    let weatherPoints: THREE.Points | null = null;
    let weatherVelocities: Float32Array | null = null;
    let skyDomeTexture: THREE.Texture | null = null;

    const buildKingPiece = (archId: string, colorCode: 'w' | 'b', targetHeight: number) => {
      const cIsWhite = colorCode === 'w';
      const cMainHex = parseInt((cIsWhite ? pieceSkin.whiteHex : pieceSkin.blackHex).replace('#', ''), 16);
      const cEmissiveHex = parseInt(
        (cIsWhite ? pieceSkin.whiteEmissiveHex : pieceSkin.blackEmissiveHex).replace('#', ''),
        16
      );
      const cMat = new THREE.MeshStandardMaterial({
        color: cMainHex,
        roughness: cIsWhite ? pieceSkin.whiteRoughness : pieceSkin.blackRoughness,
        metalness: cIsWhite ? pieceSkin.whiteMetalness : pieceSkin.blackMetalness,
        emissive: cEmissiveHex,
        emissiveIntensity: cIsWhite
          ? pieceSkin.whiteEmissiveIntensity || 0.2
          : pieceSkin.blackEmissiveIntensity || 0.2
      });

      const customMats = {
        primaryMat: cMat,
        whitePieceMat: cMat,
        blackPieceMat: cMat,
        goldTrimMat: trimMat,
        forgedSteelMat: bladeMat
      };

      let pieceModel: THREE.Object3D | null = null;
      if (typeof (window as any).wizardChess?.getShowcasePiece === 'function') {
        pieceModel = (window as any).wizardChess.getShowcasePiece(archId, colorCode, 'king', customMats);
      }
      if (!pieceModel) {
        const fallbackArch = archId === 'gothic_warriors' ? 'classic_staunton' : archId;
        const built = buildProceduralPieceGroup(fallbackArch, 'king', colorCode, customMats);
        pieceModel = built?.root || null;
      }
      if (!pieceModel) return null;

      sanitizeCrossContextMaterials(pieceModel, archId === 'arcane_cyber' ? 0x00f5d4 : 0xff6a00);

      pieceModel.scale.setScalar(1);
      pieceModel.position.set(0, 0, 0);
      pieceModel.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(pieceModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 0.001) {
        const scaleFactor = targetHeight / size.y;
        pieceModel.scale.setScalar(scaleFactor);
        pieceModel.updateMatrixWorld(true);
      }

      const scaledBox = new THREE.Box3().setFromObject(pieceModel);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);
      pieceModel.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

      const wrapper = new THREE.Group();
      wrapper.add(pieceModel);
      return wrapper;
    };

    if (activeTab === 'types' || activeTab === 'pieces') {
      baseMesh.scale.set(0.82, 1, 0.82);
      ringMesh.scale.set(0.82, 0.82, 1);

      const kingWrapper = buildKingPiece(archetype.id, previewColor, 1.56);
      if (kingWrapper) {
        kingWrapper.position.set(0, 0.0, 0);
        subjectGroup.add(kingWrapper);
      }

      camera.position.set(0, 1.28, 3.15);
      lookTarget.set(0, 0.72, 0);
      camera.lookAt(lookTarget);
    } else if (activeTab === 'boards') {
      baseMesh.scale.set(1.18, 1, 1.18);
      ringMesh.scale.set(1.18, 1.18, 1);

      const sqSize = 0.22;
      const boardSurfaceY = 0.14;
      const boardGeo = new THREE.BoxGeometry(sqSize * 8 + 0.12, boardSurfaceY, sqSize * 8 + 0.12);
      const bColor = parseInt((boardSkin.borderHex || '#d4af37').replace('#', ''), 16);
      const borderMat = new THREE.MeshStandardMaterial({
        color: bColor,
        roughness: 0.32,
        metalness: 0.65
      });
      const boardBase = new THREE.Mesh(boardGeo, borderMat);
      boardBase.position.y = boardSurfaceY * 0.5;
      boardBase.receiveShadow = true;
      subjectGroup.add(boardBase);

      const lColor = parseInt((boardSkin.lightSqHex || '#e2d9c8').replace('#', ''), 16);
      const dColor = parseInt((boardSkin.darkSqHex || '#1e2430').replace('#', ''), 16);

      const lightMat = new THREE.MeshStandardMaterial({
        color: lColor,
        roughness: boardSkin.lightRoughness ?? 0.35,
        metalness: boardSkin.lightMetalness ?? 0.15
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: dColor,
        roughness: boardSkin.darkRoughness ?? 0.45,
        metalness: boardSkin.darkMetalness ?? 0.25
      });

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isLight = (r + c) % 2 === 0;
          const sq = new THREE.Mesh(
            new THREE.BoxGeometry(sqSize * 0.96, 0.025, sqSize * 0.96),
            isLight ? lightMat : darkMat
          );
          sq.position.set((c - 3.5) * sqSize, boardSurfaceY + 0.012, (r - 3.5) * sqSize);
          sq.receiveShadow = true;
          subjectGroup.add(sq);
        }
      }

      // Authentic 3D Board Perimeter Architecture from the game
      const archGroup = new THREE.Group();
      rebuildBoardArchitectureGroup(archGroup, boardSkin, sqSize, boardSurfaceY + 0.015, borderMat);
      subjectGroup.add(archGroup);
      if (Array.isArray(archGroup.userData?.dynamicNodes)) {
        for (const node of archGroup.userData.dynamicNodes) {
          floatingNodes.push(node);
        }
      }

      // Add two miniature Kings facing each other on the center squares for scale & context
      const whiteMiniKing = buildKingPiece(archetype.id, 'w', 0.48);
      if (whiteMiniKing) {
        whiteMiniKing.position.set(-sqSize * 0.5, boardSurfaceY + 0.02, sqSize * 0.5);
        subjectGroup.add(whiteMiniKing);
      }
      const blackMiniKing = buildKingPiece(archetype.id, 'b', 0.48);
      if (blackMiniKing) {
        blackMiniKing.position.set(sqSize * 0.5, boardSurfaceY + 0.02, -sqSize * 0.5);
        blackMiniKing.rotation.y = Math.PI;
        subjectGroup.add(blackMiniKing);
      }

      camera.position.set(0, 1.75, 2.75);
      lookTarget.set(0, 0.22, 0);
      camera.lookAt(lookTarget);
    } else {
      // SCENERIES TAB: Floating Altar inside an Immersive Sky Dome with Weather Particles
      baseMesh.visible = false;
      ringMesh.visible = false;

      const accentHex = parseInt((scenery.accentHex || '#d4af37').replace('#', ''), 16);
      keyLight.color.set(scenery.keyLightHex || '#fff0d6');
      rimLight.color.set(scenery.rimLightHex || '#90e0ef');
      fillLight.color.set(scenery.accentHex || '#d4af37');

      // 1. Immersive 360° Sky Dome
      skyDomeTexture = createSkyDomeTexture(scenery.id);
      const domeGeo = new THREE.SphereGeometry(14, 36, 24);
      const domeMat = new THREE.MeshBasicMaterial({
        map: skyDomeTexture,
        side: THREE.BackSide
      });
      const skyDome = new THREE.Mesh(domeGeo, domeMat);
      scene.add(skyDome);

      // 2. Floating Sanctum Altar Island in the center
      const islandGroup = new THREE.Group();
      subjectGroup.add(islandGroup);

      const cragMat = new THREE.MeshStandardMaterial({
        color: scenery.id === 'volcanic_titan_forge' ? 0x1b0d0c : scenery.id === 'dragon_sky_citadel' ? 0x2c3545 : 0x1a2030,
        roughness: 0.75,
        metalness: 0.25
      });
      const upperDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 0.92, 0.22, 8), cragMat);
      upperDeck.position.y = -0.11;
      upperDeck.receiveShadow = true;
      islandGroup.add(upperDeck);

      const lowerCrag = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.72, 7), cragMat);
      lowerCrag.rotation.x = Math.PI;
      lowerCrag.position.y = -0.56;
      islandGroup.add(lowerCrag);

      const altarTrimRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.12, 0.028, 14, 48),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 0.55,
          roughness: 0.2,
          metalness: 0.85
        })
      );
      altarTrimRing.rotation.x = Math.PI / 2;
      altarTrimRing.position.y = 0.0;
      islandGroup.add(altarTrimRing);

      // Miniature 8x8 Sanctum Board on the Floating Altar
      const miniSq = 0.14;
      const miniLightMat = new THREE.MeshStandardMaterial({ color: 0xe2d9c8, roughness: 0.3 });
      const miniDarkMat = new THREE.MeshStandardMaterial({ color: 0x181d28, roughness: 0.35 });
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const tile = new THREE.Mesh(
            new THREE.BoxGeometry(miniSq * 0.95, 0.02, miniSq * 0.95),
            (r + c) % 2 === 0 ? miniLightMat : miniDarkMat
          );
          tile.position.set((c - 3.5) * miniSq, 0.015, (r - 3.5) * miniSq);
          islandGroup.add(tile);
        }
      }

      // Centerpiece miniature King on the floating altar
      const altarKing = buildKingPiece(archetype.id, 'w', 0.42);
      if (altarKing) {
        altarKing.position.set(0, 0.025, 0);
        islandGroup.add(altarKing);
      }

      // 3. Realm-Specific Landmarks around the Floating Altar
      const accentGlowMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8
      });

      if (scenery.id === 'celestial_observatory') {
        // Giant Gyroscopic Armillary Rings + Levitating Star Monoliths + Ringed Planet
        for (let i = 0; i < 3; i++) {
          const armillaryRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.55 + i * 0.22, 0.022, 16, 64),
            accentGlowMat
          );
          armillaryRing.rotation.x = Math.PI * (0.25 + i * 0.22);
          armillaryRing.rotation.y = i * 0.6;
          armillaryRing.position.y = 0.25;
          subjectGroup.add(armillaryRing);
          dynamicOrbitRings.push(armillaryRing);
        }

        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const monolith = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), accentGlowMat);
          const baseY = 0.35 + (i % 2) * 0.18;
          monolith.position.set(Math.cos(ang) * 1.42, baseY, Math.sin(ang) * 1.42);
          subjectGroup.add(monolith);
          floatingNodes.push({ mesh: monolith, baseY, phase: i * 1.1 });
        }
      } else if (scenery.id === 'dragon_sky_citadel') {
        // Billowing Golden Cloud Sea Puffs + Dragon-Prow Citadel Spires + Sun Halo
        const cloudMat = new THREE.MeshStandardMaterial({
          color: 0xffe8c2,
          emissive: 0xd97724,
          emissiveIntensity: 0.22,
          roughness: 0.85,
          metalness: 0.05
        });
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2;
          const rad = 1.35 + (i % 2) * 0.25;
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.24 + (i % 3) * 0.06, 16, 14), cloudMat);
          puff.scale.set(1.3, 0.55, 1.1);
          const baseY = -0.18 + (i % 2) * 0.08;
          puff.position.set(Math.cos(ang) * rad, baseY, Math.sin(ang) * rad);
          subjectGroup.add(puff);
          floatingNodes.push({ mesh: puff, baseY, phase: i * 0.7 });
        }

        // 4 Citadel Corner Towers
        const spireGeo = new THREE.ConeGeometry(0.11, 0.65, 6);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const spire = new THREE.Mesh(spireGeo, accentGlowMat);
            spire.position.set(sx * 0.78, 0.32, sz * 0.78);
            islandGroup.add(spire);
          }
        }
      } else if (scenery.id === 'volcanic_titan_forge') {
        // Molten Caldera Lava Ring + Obsidian Spires + Glowing Lava Falls
        const lavaRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.48, 0.09, 16, 48),
          accentGlowMat
        );
        lavaRing.rotation.x = Math.PI / 2;
        lavaRing.position.y = -0.32;
        subjectGroup.add(lavaRing);

        const basaltSpireGeo = new THREE.ConeGeometry(0.16, 0.85, 5);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + 0.4;
          const spire = new THREE.Mesh(basaltSpireGeo, cragMat);
          spire.position.set(Math.cos(ang) * 1.48, 0.12, Math.sin(ang) * 1.48);
          subjectGroup.add(spire);

          const emberTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), accentGlowMat);
          const baseY = 0.65;
          emberTip.position.set(Math.cos(ang) * 1.48, baseY, Math.sin(ang) * 1.48);
          subjectGroup.add(emberTip);
          floatingNodes.push({ mesh: emberTip, baseY, phase: i });
        }
      } else {
        // gothic_cathedral: Vaulted Nave Pillars + Rose Window Halo + Twin Hearth Braziers
        const pillarGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.72, 16);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const pillar = new THREE.Mesh(pillarGeo, cragMat);
            pillar.position.set(sx * 0.78, 0.36, sz * 0.78);
            islandGroup.add(pillar);

            const brazierFlame = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 1), accentGlowMat);
            const baseY = 0.78;
            brazierFlame.position.set(sx * 0.78, baseY, sz * 0.78);
            islandGroup.add(brazierFlame);
            floatingNodes.push({ mesh: brazierFlame, baseY, phase: sx + sz * 2 });
          }
        }

        const roseHalo = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.025, 16, 48), accentGlowMat);
        roseHalo.position.set(0, 0.42, -0.95);
        islandGroup.add(roseHalo);
      }

      // 4. Atmospheric Weather Particles (140 drifting embers / stardust / sun motes)
      const pCount = 140;
      const positions = new Float32Array(pCount * 3);
      weatherVelocities = new Float32Array(pCount);
      for (let i = 0; i < pCount; i++) {
        const r = 0.4 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = -0.6 + Math.random() * 2.4;
        positions[i * 3 + 2] = Math.sin(theta) * r;
        weatherVelocities[i] = 0.18 + Math.random() * 0.35;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: accentHex,
        size: 0.055,
        transparent: true,
        opacity: 0.85
      });
      weatherPoints = new THREE.Points(pGeo, pMat);
      subjectGroup.add(weatherPoints);

      camera.position.set(0, 1.15, 3.45);
      lookTarget.set(0, 0.25, 0);
      camera.lookAt(lookTarget);
    }

    // Interactive Drag to Rotate & Scroll to Zoom
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      pedestalGroup.rotation.y += deltaX * 0.014;
      pedestalGroup.rotation.x = Math.max(-0.35, Math.min(0.45, pedestalGroup.rotation.x + deltaY * 0.008));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = new THREE.Vector3().subVectors(camera.position, lookTarget);
      const dist = dir.length();
      const nextDist = Math.max(1.8, Math.min(5.2, dist + e.deltaY * 0.0025));
      dir.normalize().multiplyScalar(nextDist);
      camera.position.copy(lookTarget).add(dir);
      camera.lookAt(lookTarget);
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (autoRotate && !isDragging) {
        pedestalGroup.rotation.y += delta * 0.55;
      }

      for (let i = 0; i < dynamicOrbitRings.length; i++) {
        const ring = dynamicOrbitRings[i];
        ring.rotation.z += delta * (0.45 + i * 0.18);
        ring.rotation.x += delta * 0.22 * (i % 2 === 0 ? 1 : -1);
      }

      for (let i = 0; i < floatingNodes.length; i++) {
        const node = floatingNodes[i];
        node.mesh.position.y = node.baseY + Math.sin(elapsed * 2.4 + node.phase) * 0.055;
        node.mesh.rotation.y += delta * 0.9;
      }

      if (weatherPoints && weatherVelocities) {
        const posAttr = weatherPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < weatherVelocities.length; i++) {
          let py = posAttr.getY(i) + weatherVelocities[i] * delta;
          if (py > 1.8) py = -0.6;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
      }

      camera.lookAt(lookTarget);
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 360;
      const h = mountRef.current.clientHeight || 250;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.lookAt(lookTarget);
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      if (skyDomeTexture) skyDomeTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeTab, archetype, pieceSkin, boardSkin, scenery, previewColor, autoRotate]);

  return (
    <div className="showcase-viewport-container">
      <div className="showcase-3d-mount" ref={mountRef}></div>

      {/* Overlay Showcase Controls */}
      <div className="showcase-overlay-bar">
        <div className="showcase-badge-title">
          <span className="showcase-pulse-dot" aria-hidden="true"></span>
          <span className="showcase-label-text">
            {activeTab === 'types'
              ? `PIECE SET · ${archetype.name}`
              : activeTab === 'boards'
                ? `ALTAR BOARD · ${boardSkin.name}`
                : activeTab === 'sceneries'
                  ? `WORLD SCENERY · ${scenery.name}`
                  : `FINISH · ${pieceSkin.name}`}
          </span>
        </div>

        <div className="showcase-btn-group">
          {(activeTab === 'types' || activeTab === 'pieces') && (
            <button
              type="button"
              className={`showcase-toggle-btn ${previewColor === 'w' ? 'active' : ''}`}
              onClick={() => setPreviewColor((prev) => (prev === 'w' ? 'b' : 'w'))}
              title="Toggle between White and Black variant of this set"
            >
              {previewColor === 'w' ? '♔ White' : '♚ Black'}
            </button>
          )}

          <button
            type="button"
            className={`showcase-toggle-btn ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate((prev) => !prev)}
            title="Toggle 360° showcase spin"
          >
            {autoRotate ? 'Spin: ON' : 'Spin: OFF'}
          </button>
        </div>
      </div>

      <div className="showcase-drag-hint">
        <span>Drag to orbit 360° · Scroll to zoom · Live 3D Showcase</span>
      </div>
    </div>
  );
}
