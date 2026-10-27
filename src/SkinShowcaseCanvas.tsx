import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  PieceArchetype,
  PieceSkin,
  BoardSkin,
  WorldScenery
} from './skinCatalog';
import {
  buildProceduralPieceGroup,
  rebuildBoardArchitectureGroup
} from './customBoardAndPieceModels.js';

interface SkinShowcaseCanvasProps {
  activeTab: 'types' | 'sceneries' | 'boards' | 'pieces';
  archetype: PieceArchetype;
  pieceSkin: PieceSkin;
  boardSkin: BoardSkin;
  scenery: WorldScenery;
}

/**
 * Generates an equirectangular sky & nebula canvas texture for the 360° Scenery Showcase Sky Dome
 */
function createScenerySkyDomeTexture(scenery: WorldScenery): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (scenery.id === 'celestial_observatory') {
      grad.addColorStop(0.0, '#04020d');
      grad.addColorStop(0.42, '#150b36');
      grad.addColorStop(0.75, '#1b2c5c');
      grad.addColorStop(1.0, '#070412');
    } else if (scenery.id === 'dragon_sky_citadel') {
      grad.addColorStop(0.0, '#130712');
      grad.addColorStop(0.38, '#4a1828');
      grad.addColorStop(0.7, '#b54d1f');
      grad.addColorStop(0.88, '#f5a642');
      grad.addColorStop(1.0, '#2a0f15');
    } else if (scenery.id === 'volcanic_titan_forge') {
      grad.addColorStop(0.0, '#070202');
      grad.addColorStop(0.45, '#290704');
      grad.addColorStop(0.78, '#7a1905');
      grad.addColorStop(0.92, '#d9480f');
      grad.addColorStop(1.0, '#1a0402');
    } else {
      grad.addColorStop(0.0, '#04060c');
      grad.addColorStop(0.45, '#10182b');
      grad.addColorStop(0.78, '#261d17');
      grad.addColorStop(1.0, '#06080f');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const starCount = scenery.id === 'celestial_observatory' ? 240 : 120;
    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * (canvas.height * 0.82);
      const r = 0.5 + Math.random() * 1.6;
      ctx.fillStyle =
        scenery.id === 'volcanic_titan_forge'
          ? `rgba(255, 165, 65, ${0.35 + Math.random() * 0.6})`
          : scenery.id === 'celestial_observatory'
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
    if (child.geometry) {
      child.geometry = child.geometry.clone();
    }
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

function disposeHierarchy(root: THREE.Object3D) {
  root.traverse((child: any) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.map && typeof m.map.dispose === 'function') m.map.dispose();
        if (typeof m.dispose === 'function') m.dispose();
      }
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
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const stageRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    pedestalGroup: THREE.Group;
    subjectGroup: THREE.Group;
    baseMesh: THREE.Mesh;
    ringMesh: THREE.Mesh;
    rimLight: THREE.PointLight;
    lookTarget: THREE.Vector3;
    dynamicOrbitRings: THREE.Object3D[];
    floatingNodes: Array<{ mesh: THREE.Object3D; baseY: number; phase: number }>;
    weatherPoints: THREE.Points | null;
    weatherVelocities: Float32Array | null;
  } | null>(null);

  // 1. Mount-only WebGLRenderer initialization (reused across all Armory clicks so we never exhaust WebGL contexts)
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

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'default'
    });
    if (renderer.debug) {
      renderer.debug.checkShaderErrors = false;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.HemisphereLight(0xf6efe2, 0x161925, 1.05);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff4d8, 2.5);
    keyLight.position.set(2.8, 4.8, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xd4af37, 2.2, 12);
    rimLight.position.set(-2.4, 2.2, -2.2);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x68a8ff, 1.15, 10);
    fillLight.position.set(2.2, 0.9, -2.0);
    scene.add(fillLight);

    const pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);

    const baseGeo = new THREE.CylinderGeometry(1.15, 1.28, 0.16, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x12151e,
      roughness: 0.28,
      metalness: 0.62
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.08;
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

    const subjectGroup = new THREE.Group();
    pedestalGroup.add(subjectGroup);

    const state = {
      scene,
      camera,
      renderer,
      pedestalGroup,
      subjectGroup,
      baseMesh,
      ringMesh,
      rimLight,
      lookTarget,
      dynamicOrbitRings: [] as THREE.Object3D[],
      floatingNodes: [] as Array<{ mesh: THREE.Object3D; baseY: number; phase: number }>,
      weatherPoints: null as THREE.Points | null,
      weatherVelocities: null as Float32Array | null
    };
    stageRef.current = state;

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
      pedestalGroup.rotation.x = Math.max(
        -0.35,
        Math.min(0.45, pedestalGroup.rotation.x + deltaY * 0.008)
      );
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = new THREE.Vector3().subVectors(camera.position, state.lookTarget);
      const dist = dir.length();
      const nextDist = Math.max(1.8, Math.min(5.2, dist + e.deltaY * 0.0025));
      dir.normalize().multiplyScalar(nextDist);
      camera.position.copy(state.lookTarget).add(dir);
      camera.lookAt(state.lookTarget);
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
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      if (autoRotateRef.current && !isDragging) {
        pedestalGroup.rotation.y += delta * 0.55;
      }

      for (let i = 0; i < state.dynamicOrbitRings.length; i++) {
        const ring = state.dynamicOrbitRings[i];
        ring.rotation.z += delta * (0.45 + i * 0.18);
        ring.rotation.x += delta * 0.22 * (i % 2 === 0 ? 1 : -1);
      }

      for (let i = 0; i < state.floatingNodes.length; i++) {
        const node = state.floatingNodes[i];
        node.mesh.position.y = node.baseY + Math.sin(elapsed * 2.4 + node.phase) * 0.055;
        node.mesh.rotation.y += delta * 0.9;
      }

      if (state.weatherPoints && state.weatherVelocities) {
        const posAttr = state.weatherPoints.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        for (let i = 0; i < state.weatherVelocities.length; i++) {
          let py = posAttr.getY(i) + state.weatherVelocities[i] * delta;
          if (py > 1.8) py = -0.6;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
      }

      camera.lookAt(state.lookTarget);
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 360;
      const h = mountRef.current.clientHeight || 250;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      camera.lookAt(state.lookTarget);
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
      disposeHierarchy(scene);
      renderer.dispose();
      stageRef.current = null;
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Rebuild only the showcase subject when selected skin/tab changes
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;

    const {
      scene,
      camera,
      pedestalGroup,
      subjectGroup,
      baseMesh,
      ringMesh,
      rimLight,
      lookTarget
    } = st;

    // Clear previous subject meshes cleanly
    while (subjectGroup.children.length > 0) {
      const child = subjectGroup.children[0];
      subjectGroup.remove(child);
      disposeHierarchy(child);
    }
    st.dynamicOrbitRings = [];
    st.floatingNodes = [];
    st.weatherPoints = null;
    st.weatherVelocities = null;
    pedestalGroup.rotation.x = 0;

    const isWhite = previewColor === 'w';
    const trimHex = parseInt(pieceSkin.trimHex.replace('#', ''), 16);
    const bladeHex = parseInt(pieceSkin.bladeHex.replace('#', ''), 16);

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

    const buildKingPiece = (archId: string, colorCode: 'w' | 'b', targetHeight: number) => {
      const cIsWhite = colorCode === 'w';
      const cMainHex = parseInt(
        (cIsWhite ? pieceSkin.whiteHex : pieceSkin.blackHex).replace('#', ''),
        16
      );
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
        pieceModel = (window as any).wizardChess.getShowcasePiece(
          archId,
          colorCode,
          'king',
          customMats
        );
      }
      if (!pieceModel) {
        const fallbackArch = archId === 'gothic_warriors' ? 'classic_staunton' : archId;
        const built = buildProceduralPieceGroup(fallbackArch, 'king', colorCode, customMats);
        pieceModel = built?.root || null;
      }
      if (!pieceModel) return null;

      sanitizeCrossContextMaterials(pieceModel, trimHex);

      const wrapper = new THREE.Group();
      wrapper.add(pieceModel);
      wrapper.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(pieceModel);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const rawHeight = Math.max(size.y, 0.25);
      const normScale = targetHeight / rawHeight;
      pieceModel.scale.setScalar(normScale);
      pieceModel.position.set(
        -center.x * normScale,
        -box.min.y * normScale,
        -center.z * normScale
      );
      return wrapper;
    };

    if (activeTab === 'types' || activeTab === 'pieces') {
      baseMesh.visible = true;
      ringMesh.visible = true;
      scene.background = new THREE.Color(0x07090f);
      rimLight.color.setHex(trimHex);

      const heroPiece = buildKingPiece(archetype.id, previewColor, 1.38);
      if (heroPiece) {
        heroPiece.position.set(0, 0.0, 0);
        subjectGroup.add(heroPiece);
      }

      camera.position.set(0, 1.22, 3.05);
      lookTarget.set(0, 0.66, 0);
      camera.lookAt(lookTarget);
    } else if (activeTab === 'boards') {
      baseMesh.visible = false;
      ringMesh.visible = false;
      scene.background = new THREE.Color(0x07090f);

      const boardPreviewGroup = new THREE.Group();
      const sqSize = 0.22;
      const surfaceY = 0.0;
      const lightHex = parseInt(boardSkin.lightSqHex.replace('#', ''), 16);
      const darkHex = parseInt(boardSkin.darkSqHex.replace('#', ''), 16);
      const borderHex = parseInt(boardSkin.borderHex.replace('#', ''), 16);
      rimLight.color.setHex(borderHex);

      const lightMat = new THREE.MeshStandardMaterial({
        color: lightHex,
        roughness: boardSkin.lightRoughness,
        metalness: boardSkin.lightMetalness
      });
      const darkMat = new THREE.MeshStandardMaterial({
        color: darkHex,
        roughness: boardSkin.darkRoughness,
        metalness: boardSkin.darkMetalness
      });
      const borderMat = new THREE.MeshStandardMaterial({
        color: borderHex,
        roughness: 0.25,
        metalness: 0.82
      });

      const sqGeo = new THREE.BoxGeometry(sqSize * 0.96, 0.036, sqSize * 0.96);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isLight = (r + c) % 2 === 0;
          const sq = new THREE.Mesh(sqGeo, isLight ? lightMat : darkMat);
          sq.position.set((c - 3.5) * sqSize, surfaceY + 0.018, (r - 3.5) * sqSize);
          boardPreviewGroup.add(sq);
        }
      }

      const archGroup = new THREE.Group();
      rebuildBoardArchitectureGroup(archGroup, boardSkin, sqSize, surfaceY, borderMat);
      boardPreviewGroup.add(archGroup);

      const whiteKing = buildKingPiece(archetype.id, 'w', 0.48);
      if (whiteKing) {
        whiteKing.position.set(-0.5 * sqSize, surfaceY + 0.036, 1.5 * sqSize);
        boardPreviewGroup.add(whiteKing);
      }

      const blackKing = buildKingPiece(archetype.id, 'b', 0.48);
      if (blackKing) {
        blackKing.position.set(0.5 * sqSize, surfaceY + 0.036, -1.5 * sqSize);
        blackKing.rotation.y = Math.PI;
        boardPreviewGroup.add(blackKing);
      }

      boardPreviewGroup.position.set(0, 0.12, 0);
      subjectGroup.add(boardPreviewGroup);

      camera.position.set(0, 1.72, 3.05);
      lookTarget.set(0, 0.16, 0);
      camera.lookAt(lookTarget);
    } else if (activeTab === 'sceneries') {
      baseMesh.visible = false;
      ringMesh.visible = false;

      const accentHex = parseInt((scenery.previewAccentHex || '#d4af37').replace('#', ''), 16);
      const fogHex = parseInt((scenery.fogHex || '#080b14').replace('#', ''), 16);
      scene.background = new THREE.Color(fogHex);
      rimLight.color.setHex(accentHex);

      // 1. Immersive 360° Sky & Nebula Dome
      const skyDomeTexture = createScenerySkyDomeTexture(scenery);
      const skyGeo = new THREE.SphereGeometry(9.5, 36, 24);
      const skyMat = new THREE.MeshBasicMaterial({
        map: skyDomeTexture,
        side: THREE.BackSide,
        depthWrite: false
      });
      const skyDome = new THREE.Mesh(skyGeo, skyMat);
      subjectGroup.add(skyDome);

      // 2. Sculpted Floating Sanctum Island & Mini Chessboard Altar at the Center
      const islandGroup = new THREE.Group();
      islandGroup.position.set(0, 0.18, 0);
      subjectGroup.add(islandGroup);

      const cragMat = new THREE.MeshStandardMaterial({
        color:
          scenery.id === 'volcanic_titan_forge'
            ? 0x1c0d0a
            : scenery.id === 'celestial_observatory'
              ? 0x15182e
              : scenery.id === 'dragon_sky_citadel'
                ? 0x2d2420
                : 0x181c26,
        roughness: 0.72,
        metalness: 0.25
      });
      const islandSpire = new THREE.Mesh(new THREE.ConeGeometry(1.18, 0.85, 8), cragMat);
      islandSpire.rotation.x = Math.PI;
      islandSpire.position.y = -0.45;
      islandGroup.add(islandSpire);

      const altarPlinth = new THREE.Mesh(
        new THREE.CylinderGeometry(1.12, 1.18, 0.12, 32),
        new THREE.MeshStandardMaterial({
          color: 0x10131c,
          roughness: 0.32,
          metalness: 0.65
        })
      );
      altarPlinth.position.y = -0.05;
      islandGroup.add(altarPlinth);

      const rimTorus = new THREE.Mesh(
        new THREE.TorusGeometry(1.14, 0.028, 16, 48),
        new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 0.65,
          roughness: 0.2,
          metalness: 0.88
        })
      );
      rimTorus.rotation.x = Math.PI / 2;
      rimTorus.position.y = 0.01;
      islandGroup.add(rimTorus);

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

      const altarKing = buildKingPiece(archetype.id, 'w', 0.42);
      if (altarKing) {
        altarKing.position.set(0, 0.025, 0);
        islandGroup.add(altarKing);
      }

      const accentGlowMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: accentHex,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8
      });

      if (scenery.id === 'celestial_observatory') {
        for (let i = 0; i < 3; i++) {
          const armillaryRing = new THREE.Mesh(
            new THREE.TorusGeometry(1.55 + i * 0.22, 0.022, 16, 64),
            accentGlowMat
          );
          armillaryRing.rotation.x = Math.PI * (0.25 + i * 0.22);
          armillaryRing.rotation.y = i * 0.6;
          armillaryRing.position.y = 0.25;
          subjectGroup.add(armillaryRing);
          st.dynamicOrbitRings.push(armillaryRing);
        }

        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const monolith = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), accentGlowMat);
          const baseY = 0.35 + (i % 2) * 0.18;
          monolith.position.set(Math.cos(ang) * 1.42, baseY, Math.sin(ang) * 1.42);
          subjectGroup.add(monolith);
          st.floatingNodes.push({ mesh: monolith, baseY, phase: i * 1.1 });
        }
      } else if (scenery.id === 'dragon_sky_citadel') {
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
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(0.24 + (i % 3) * 0.06, 16, 14),
            cloudMat
          );
          puff.scale.set(1.3, 0.55, 1.1);
          const baseY = -0.18 + (i % 2) * 0.08;
          puff.position.set(Math.cos(ang) * rad, baseY, Math.sin(ang) * rad);
          subjectGroup.add(puff);
          st.floatingNodes.push({ mesh: puff, baseY, phase: i * 0.7 });
        }

        const spireGeo = new THREE.ConeGeometry(0.11, 0.65, 6);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const spire = new THREE.Mesh(spireGeo, accentGlowMat);
            spire.position.set(sx * 0.78, 0.32, sz * 0.78);
            islandGroup.add(spire);
          }
        }
      } else if (scenery.id === 'volcanic_titan_forge') {
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
          st.floatingNodes.push({ mesh: emberTip, baseY, phase: i });
        }
      } else {
        const pillarGeo = new THREE.CylinderGeometry(0.065, 0.08, 0.72, 16);
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const pillar = new THREE.Mesh(pillarGeo, cragMat);
            pillar.position.set(sx * 0.78, 0.36, sz * 0.78);
            islandGroup.add(pillar);

            const brazierFlame = new THREE.Mesh(
              new THREE.OctahedronGeometry(0.085, 1),
              accentGlowMat
            );
            const baseY = 0.78;
            brazierFlame.position.set(sx * 0.78, baseY, sz * 0.78);
            islandGroup.add(brazierFlame);
            st.floatingNodes.push({ mesh: brazierFlame, baseY, phase: sx + sz * 2 });
          }
        }

        const roseHalo = new THREE.Mesh(
          new THREE.TorusGeometry(1.38, 0.025, 16, 48),
          accentGlowMat
        );
        roseHalo.position.set(0, 0.42, -0.95);
        islandGroup.add(roseHalo);
      }

      const pCount = 140;
      const positions = new Float32Array(pCount * 3);
      const velocities = new Float32Array(pCount);
      for (let i = 0; i < pCount; i++) {
        const r = 0.4 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(theta) * r;
        positions[i * 3 + 1] = -0.6 + Math.random() * 2.4;
        positions[i * 3 + 2] = Math.sin(theta) * r;
        velocities[i] = 0.18 + Math.random() * 0.35;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: accentHex,
        size: 0.055,
        transparent: true,
        opacity: 0.85
      });
      st.weatherPoints = new THREE.Points(pGeo, pMat);
      st.weatherVelocities = velocities;
      subjectGroup.add(st.weatherPoints);

      camera.position.set(0, 1.15, 3.45);
      lookTarget.set(0, 0.25, 0);
      camera.lookAt(lookTarget);
    }
  }, [activeTab, archetype, pieceSkin, boardSkin, scenery, previewColor]);

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
