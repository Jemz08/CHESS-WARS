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
  updateProceduralPieceAnimation,
  rebuildBoardArchitectureGroup
} from './customBoardAndPieceModels.js';
import {
  createUnitySlashRibbonShaderMaterial,
  createUnityFresnelDissolveSphereMaterial,
  createUnityMagicCircleShaderMaterial,
  createUnityFireBreathShaderMaterial,
  createUnityPlasmaBeamShaderMaterial,
  getUnityStarFlareTexture,
  getUnityFireFlameTexture
} from './soundAndVfxEngine.js';

interface SkinShowcaseCanvasProps {
  activeTab: 'types' | 'sceneries' | 'boards' | 'pieces';
  archetype: PieceArchetype;
  pieceSkin: PieceSkin;
  boardSkin: BoardSkin;
  scenery: WorldScenery;
  attackPreviewNonce?: number;
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

function sanitizeCrossContextMaterials(root: THREE.Object3D, _fallbackColorHex = 0xff6a00) {
  const shaderUniformList: Array<Record<string, any>> = [];
  root.traverse((child: any) => {
    if (!child.isMesh) return;
    if (child.geometry) {
      child.geometry = child.geometry.clone();
    }
    if (
      child.userData?.isDragonFire ||
      child.material?.isShaderMaterial ||
      child.material?.type === 'ShaderMaterial'
    ) {
      child.castShadow = false;
      child.receiveShadow = false;
      if (child.material && typeof child.material.clone === 'function') {
        const clonedShaderMat = child.material.clone();
        if (child.material.uniforms) {
          clonedShaderMat.uniforms = THREE.UniformsUtils.clone(child.material.uniforms);
          shaderUniformList.push(clonedShaderMat.uniforms);
        }
        child.material = clonedShaderMat;
      }
    } else {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  if (root.userData?.proceduralAnim) {
    root.userData.proceduralAnim.showcaseShaderUniforms = shaderUniformList;
  }
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
  scenery,
  attackPreviewNonce = 0
}: SkinShowcaseCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [previewColor, setPreviewColor] = useState<'w' | 'b'>('w');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isAttackingPreview, setIsAttackingPreview] = useState(false);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const stageRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    pedestalGroup: THREE.Group;
    subjectGroup: THREE.Group;
    vfxGroup: THREE.Group;
    baseMesh: THREE.Mesh;
    ringMesh: THREE.Mesh;
    rimLight: THREE.PointLight;
    lookTarget: THREE.Vector3;
    dynamicOrbitRings: THREE.Object3D[];
    floatingNodes: Array<{ mesh: THREE.Object3D; baseY: number; phase: number }>;
    weatherPoints: THREE.Points | null;
    weatherVelocities: Float32Array | null;
    heroPieceRoot: THREE.Object3D | null;
    heroProceduralAnim: any | null;
    heroMixer: THREE.AnimationMixer | null;
    heroActions: Record<string, THREE.AnimationAction>;
    activeVfxUpdaters: Array<(dt: number) => boolean>;
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

    const vfxGroup = new THREE.Group();
    pedestalGroup.add(vfxGroup);

    const state = {
      scene,
      camera,
      renderer,
      pedestalGroup,
      subjectGroup,
      vfxGroup,
      baseMesh,
      ringMesh,
      rimLight,
      lookTarget,
      dynamicOrbitRings: [] as THREE.Object3D[],
      floatingNodes: [] as Array<{ mesh: THREE.Object3D; baseY: number; phase: number }>,
      weatherPoints: null as THREE.Points | null,
      weatherVelocities: null as Float32Array | null,
      heroPieceRoot: null as THREE.Object3D | null,
      heroProceduralAnim: null as any | null,
      heroMixer: null as THREE.AnimationMixer | null,
      heroActions: {} as Record<string, THREE.AnimationAction>,
      activeVfxUpdaters: [] as Array<(dt: number) => boolean>
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

      if (state.heroMixer) {
        state.heroMixer.update(delta);
      }
      if (state.heroProceduralAnim) {
        updateProceduralPieceAnimation(
          {
            type: state.heroProceduralAnim.pieceType || 'king',
            archetype: state.heroProceduralAnim.archetype || 'classic_staunton',
            proceduralAnim: state.heroProceduralAnim
          },
          delta,
          elapsed
        );
      }

      for (let i = state.activeVfxUpdaters.length - 1; i >= 0; i--) {
        const alive = state.activeVfxUpdaters[i](delta);
        if (!alive) {
          state.activeVfxUpdaters.splice(i, 1);
        }
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
    while (st.vfxGroup.children.length > 0) {
      const child = st.vfxGroup.children[0];
      st.vfxGroup.remove(child);
      disposeHierarchy(child);
    }
    st.dynamicOrbitRings = [];
    st.floatingNodes = [];
    st.weatherPoints = null;
    st.weatherVelocities = null;
    st.heroPieceRoot = null;
    st.heroProceduralAnim = null;
    st.heroMixer = null;
    st.heroActions = {};
    st.activeVfxUpdaters = [];
    setIsAttackingPreview(false);
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
        if (built?.root) {
          built.root.userData.proceduralAnim = {
            animRig: built.animRig,
            animParts: built.animParts,
            archetype: fallbackArch,
            pieceType: 'king',
            mode: 'idle',
            clipTime: 0
          };
          pieceModel = built.root;
        }
      }
      if (!pieceModel) return null;

      sanitizeCrossContextMaterials(pieceModel, trimHex);

      const wrapper = new THREE.Group();
      wrapper.add(pieceModel);
      const hiddenForBounds: Array<{ obj: THREE.Object3D; vis: boolean }> = [];
      pieceModel.traverse((child: any) => {
        if (child.userData?.excludeFromBounds) {
          hiddenForBounds.push({ obj: child, vis: child.visible });
          child.visible = false;
        }
      });
      wrapper.updateMatrixWorld(true);
      const box = new THREE.Box3();
      pieceModel.traverse((child: any) => {
        if (!child.isMesh || !child.visible) return;
        let p: any = child;
        let excluded = false;
        while (p) {
          if (p.userData?.excludeFromBounds || p.visible === false) {
            excluded = true;
            break;
          }
          p = p.parent;
        }
        if (!excluded && child.geometry) {
          child.geometry.computeBoundingBox();
          if (child.geometry.boundingBox) {
            const childBox = child.geometry.boundingBox.clone();
            childBox.applyMatrix4(child.matrixWorld);
            box.union(childBox);
          }
        }
      });
      for (const item of hiddenForBounds) {
        item.obj.visible = item.vis;
      }
      if (box.isEmpty()) {
        box.setFromObject(pieceModel);
      }
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
      wrapper.userData.pieceModel = pieceModel;
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
        const innerModel = heroPiece.userData.pieceModel as THREE.Object3D | undefined;
        if (innerModel) {
          st.heroPieceRoot = innerModel;
          if (innerModel.userData?.proceduralAnim) {
            st.heroProceduralAnim = innerModel.userData.proceduralAnim;
          } else if (Array.isArray(innerModel.userData?.gltfAnimations) && innerModel.userData.gltfAnimations.length > 0) {
            const mixer = new THREE.AnimationMixer(innerModel);
            const actions: Record<string, THREE.AnimationAction> = {};
            for (const clip of innerModel.userData.gltfAnimations) {
              actions[clip.name] = mixer.clipAction(clip);
            }
            st.heroMixer = mixer;
            st.heroActions = actions;
            if (actions.Idle) {
              actions.Idle.reset().fadeIn(0.15).play();
            }
          }
        }
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

  // Trigger set-specific 3D Attack choreography + 3D VFX burst in the Showcase
  const triggerShowcaseAttackAndVfx = () => {
    const st = stageRef.current;
    if (!st) return;

    setIsAttackingPreview(true);
    if (typeof (window as any).wizardChess?.playShowcaseAttackSfx === 'function') {
      (window as any).wizardChess.playShowcaseAttackSfx(archetype.id, 'king');
    }

    // 1. Trigger 3D Piece Attack Animation
    if (st.heroProceduralAnim) {
      st.heroProceduralAnim.mode = 'attack';
      st.heroProceduralAnim.clipTime = 0;
      setTimeout(() => {
        if (st.heroProceduralAnim) {
          st.heroProceduralAnim.mode = 'idle';
          st.heroProceduralAnim.clipTime = 0;
        }
        setIsAttackingPreview(false);
      }, 1250);
    } else if (st.heroMixer && st.heroActions.Attack) {
      const atk = st.heroActions.Attack;
      if (st.heroActions.Idle) st.heroActions.Idle.fadeOut(0.08);
      atk.reset();
      atk.setLoop(THREE.LoopOnce, 1);
      atk.clampWhenFinished = true;
      atk.fadeIn(0.08).play();
      setTimeout(() => {
        if (st.heroActions.Idle) {
          atk.fadeOut(0.2);
          st.heroActions.Idle.reset().fadeIn(0.2).play();
        }
        setIsAttackingPreview(false);
      }, 1250);
    } else {
      setTimeout(() => setIsAttackingPreview(false), 1100);
    }

    // 2. Spawn Set-Specific 3D Weapon Contact & Signature Kill VFX on the Pedestal
    const vfxGroup = st.vfxGroup;
    while (vfxGroup.children.length > 0) {
      const c = vfxGroup.children[0];
      vfxGroup.remove(c);
      disposeHierarchy(c);
    }
    st.activeVfxUpdaters = [];

    const archId = archetype.id;
    const styleIdx =
      archId === 'classic_staunton' ? 1 : archId === 'arcane_cyber' ? 2 : archId === 'dragon_elemental' ? 3 : 0;
    const primaryHex =
      archId === 'classic_staunton'
        ? 0xffd166
        : archId === 'arcane_cyber'
          ? 0x00f5d4
          : archId === 'dragon_elemental'
            ? 0xff2a55
            : 0xff6b35;
    const secondaryHex =
      archId === 'classic_staunton'
        ? 0xe09f3e
        : archId === 'arcane_cyber'
          ? 0x9d4edd
          : archId === 'dragon_elemental'
            ? 0xff9e00
            : 0xd4af37;
    const coreHex = 0xffffff;

    // Shared Unity URP / ShaderGraph Shader VFX Layers on the Showcase Pedestal:
    // A. Unity Procedural Magic Circle / Voronoi Ground Crack Shader Decal
    const magicCircleMat = createUnityMagicCircleShaderMaterial(primaryHex, secondaryHex, coreHex, styleIdx);
    const magicCirclePlane = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.15), magicCircleMat);
    magicCirclePlane.rotation.x = -Math.PI / 2;
    magicCirclePlane.position.y = 0.024;
    vfxGroup.add(magicCirclePlane);

    // B. Unity URP Fresnel & Noise-Dissolve Energy Sphere
    const fresnelMat = createUnityFresnelDissolveSphereMaterial(primaryHex, secondaryHex, coreHex);
    const fresnelSphere = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 18), fresnelMat);
    fresnelSphere.position.y = 0.65;
    vfxGroup.add(fresnelSphere);

    // C. Unity Shuriken Scrolling Noise Slash Ribbon Shader (only for melee Gothic Warriors)
    const slashRibbonMat = createUnitySlashRibbonShaderMaterial(primaryHex, secondaryHex, coreHex);
    const slashRibbonMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.85, 32, 2, -Math.PI * 0.55, Math.PI * 1.1),
      slashRibbonMat
    );
    slashRibbonMesh.position.set(0, 0.72, 0.35);
    slashRibbonMesh.rotation.set(0.38, 0, 0.32);
    slashRibbonMesh.visible = archId === 'gothic_warriors';
    vfxGroup.add(slashRibbonMesh);

    // D. Unity Soft-Particle Star-Flare Billboards
    const starTex = getUnityStarFlareTexture();
    const starSprites: Array<{ sprite: THREE.Sprite; mat: THREE.SpriteMaterial; ang: number; vy: number }> = [];
    for (let i = 0; i < 8; i++) {
      const spMat = new THREE.SpriteMaterial({
        map: starTex,
        color: i % 2 === 0 ? coreHex : primaryHex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sp = new THREE.Sprite(spMat);
      const ang = (i / 8) * Math.PI * 2;
      sp.position.set(Math.cos(ang) * 0.45, 0.25 + (i % 3) * 0.18, Math.sin(ang) * 0.45);
      sp.scale.setScalar(0.32);
      vfxGroup.add(sp);
      starSprites.push({ sprite: sp, mat: spMat, ang, vy: 0.65 + (i % 3) * 0.3 });
    }

    let uElapsed = 0;
    st.activeVfxUpdaters.push((dt) => {
      uElapsed += dt;
      const p = Math.min(1, uElapsed / 1.2);
      const ease = 1 - Math.pow(1 - p, 3);

      magicCircleMat.uniforms.uTime.value = uElapsed;
      magicCircleMat.uniforms.uProgress.value = p;
      magicCirclePlane.scale.setScalar(0.45 + ease * 0.75);
      magicCirclePlane.rotation.z += dt * 1.6;

      fresnelMat.uniforms.uTime.value = uElapsed;
      fresnelMat.uniforms.uDissolve.value = Math.min(1, p * 1.1);
      fresnelSphere.scale.setScalar(0.4 + ease * 0.85);
      fresnelSphere.rotation.y += dt * 3.0;

      slashRibbonMat.uniforms.uTime.value = uElapsed;
      slashRibbonMat.uniforms.uProgress.value = Math.min(1, p * 1.35);
      slashRibbonMesh.scale.setScalar(0.75 + ease * 0.65);
      slashRibbonMesh.rotation.z += dt * 9.5;

      for (const stSp of starSprites) {
        const rad = 0.45 + ease * 0.55;
        stSp.sprite.position.x = Math.cos(stSp.ang + uElapsed * 2.4) * rad;
        stSp.sprite.position.z = Math.sin(stSp.ang + uElapsed * 2.4) * rad;
        stSp.sprite.position.y += stSp.vy * dt;
        stSp.sprite.scale.setScalar(0.34 * Math.max(0.02, 1 - p));
        stSp.mat.opacity = 0.95 * (1 - p);
      }
      return p < 1;
    });

    if (archId === 'gothic_warriors') {
      // EDGEFLUX Triple Staggered GLSL Sword-Wave Slash Ribbons + Cathedral Rose Sigil + 28 Forged Anvil Sparks + Reliquary Crosses
      const slashWaves: Array<{ mesh: THREE.Mesh; mat: THREE.ShaderMaterial; speed: number; scaleMul: number }> = [];
      const waveCfgs = [
        { tiltX: 0.36, tiltZ: 0.48, scaleMul: 1.08, speed: 12.0, pHex: 0xff6b35, sHex: 0xffd166 },
        { tiltX: 0.36, tiltZ: -0.48, scaleMul: 1.0, speed: -13.0, pHex: 0xff2a55, sHex: 0xffb703 },
        { tiltX: 1.35, tiltZ: 0.0, scaleMul: 1.22, speed: 15.0, pHex: 0xffd166, sHex: 0xffffff }
      ];
      for (const wc of waveCfgs) {
        const wMat = createUnitySlashRibbonShaderMaterial(wc.pHex, wc.sHex, 0xffffff);
        const wMesh = new THREE.Mesh(
          new THREE.RingGeometry(0.42, 0.88, 32, 2, -Math.PI * 0.55, Math.PI * 1.1),
          wMat
        );
        wMesh.position.set(0, 0.72, 0.42);
        wMesh.rotation.set(wc.tiltX, 0, wc.tiltZ);
        vfxGroup.add(wMesh);
        slashWaves.push({ mesh: wMesh, mat: wMat, speed: wc.speed, scaleMul: wc.scaleMul });
      }

      const roseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 1.08, 12),
        new THREE.MeshBasicMaterial({
          color: 0xffb703,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      roseRing.rotation.x = -Math.PI / 2;
      roseRing.position.y = 0.03;
      vfxGroup.add(roseRing);

      // 28 High-Velocity Forged-Steel Anvil Sparks
      const anvilSparks: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number }> = [];
      const sparkGeo = new THREE.OctahedronGeometry(0.028, 0);
      sparkGeo.scale(0.6, 2.3, 0.6);
      const sparkMat = new THREE.MeshBasicMaterial({
        color: 0xffe8a3,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      for (let i = 0; i < 28; i++) {
        const sm = new THREE.Mesh(sparkGeo, sparkMat);
        sm.position.set(0, 0.72, 0.42);
        const ang = (i / 28) * Math.PI * 2;
        anvilSparks.push({
          mesh: sm,
          vx: Math.cos(ang) * (1.1 + Math.random() * 1.2),
          vy: 0.65 + Math.random() * 1.4,
          vz: Math.sin(ang) * (1.1 + Math.random() * 1.2) + 0.6
        });
        vfxGroup.add(sm);
      }

      const crosses: THREE.Group[] = [];
      for (let i = 0; i < 6; i++) {
        const cg = new THREE.Group();
        const cMat = new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xffea9f : 0xffb703,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending
        });
        cg.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.24, 0.04), cMat));
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), cMat);
        hBar.position.y = 0.04;
        cg.add(hBar);
        const ang = (i / 6) * Math.PI * 2;
        cg.position.set(Math.cos(ang) * 0.72, 0.22, Math.sin(ang) * 0.72);
        vfxGroup.add(cg);
        crosses.push(cg);
      }

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.15);
        for (const sw of slashWaves) {
          sw.mat.uniforms.uTime.value = t;
          sw.mat.uniforms.uProgress.value = Math.min(1, p * 1.25);
          sw.mesh.scale.setScalar((0.75 + p * 1.15) * sw.scaleMul);
          sw.mesh.rotation.z += dt * sw.speed;
        }
        roseRing.scale.setScalar(0.5 + p * 1.15);
        roseRing.rotation.z += dt * 1.8;
        (roseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.9);
        sparkMat.opacity = Math.max(0, (1 - p) * 0.98);
        for (const sp of anvilSparks) {
          sp.mesh.position.x += sp.vx * dt;
          sp.mesh.position.y += sp.vy * dt;
          sp.mesh.position.z += sp.vz * dt;
          sp.vy -= 4.8 * dt;
          sp.mesh.scale.setScalar(Math.max(0.02, 1 - p));
        }
        crosses.forEach((c, idx) => {
          c.position.y = 0.22 + p * 0.95;
          c.rotation.y += dt * (3.2 + idx * 0.4);
          c.scale.setScalar(Math.max(0.01, 1 - p * 0.75));
        });
        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    } else if (archId === 'classic_staunton') {
      // Grandmaster 6-Comet Telekinetic Barrage + 8-Point Compass Star + Gyroscopic Brass Astrolabe Rings
      const starGroup = new THREE.Group();
      starGroup.position.y = 0.03;
      const starMatA = new THREE.MeshBasicMaterial({
        color: 0xffe082,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const starMatB = new THREE.MeshBasicMaterial({
        color: 0xffb300,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sqA = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.98, 4), starMatA);
      sqA.rotation.x = -Math.PI / 2;
      const sqB = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.98, 4), starMatB);
      sqB.rotation.x = -Math.PI / 2;
      sqB.rotation.z = Math.PI / 4;
      starGroup.add(sqA, sqB);
      vfxGroup.add(starGroup);

      const chronoRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.025, 12, 48),
        new THREE.MeshBasicMaterial({
          color: 0xfff8e1,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending
        })
      );
      chronoRing.position.y = 0.65;
      vfxGroup.add(chronoRing);

      // 6 Streaking Golden Arcane Comet Projectiles diving onto the pedestal
      const comets: Array<{
        pivot: THREE.Group;
        mat: THREE.SpriteMaterial;
        startPos: THREE.Vector3;
        endPos: THREE.Vector3;
        delay: number;
      }> = [];
      const tailGeo = new THREE.ConeGeometry(0.065, 0.45, 8);
      tailGeo.translate(0, 0.225, 0);
      tailGeo.rotateX(-Math.PI / 2);

      for (let i = 0; i < 6; i++) {
        const cPivot = new THREE.Group();
        const cMat = new THREE.SpriteMaterial({
          map: starTex,
          color: i % 2 === 0 ? 0xffffff : 0xffd166,
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const headSp = new THREE.Sprite(cMat);
        headSp.scale.setScalar(0.38);
        cPivot.add(headSp);

        const tailM = new THREE.Mesh(tailGeo, i % 2 === 0 ? starMatA : starMatB);
        cPivot.add(tailM);

        const ang = (i / 6) * Math.PI * 2;
        const startPos = new THREE.Vector3(Math.cos(ang) * 0.85, 1.55 + (i % 2) * 0.25, Math.sin(ang) * 0.85);
        const endPos = new THREE.Vector3(Math.cos(ang + 0.6) * 0.35, 0.08, Math.sin(ang + 0.6) * 0.35 + 0.32);
        cPivot.position.copy(startPos);
        cPivot.lookAt(endPos);
        vfxGroup.add(cPivot);
        comets.push({ pivot: cPivot, mat: cMat, startPos, endPos, delay: i * 0.05 });
      }

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.2);
        starGroup.scale.setScalar(0.45 + p * 1.2);
        starGroup.rotation.y += dt * 2.5;
        starMatA.opacity = Math.max(0, (1 - p) * 0.92);
        starMatB.opacity = Math.max(0, (1 - p) * 0.88);
        chronoRing.rotation.x += dt * 4.2;
        chronoRing.rotation.y += dt * 3.1;
        (chronoRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.92);

        for (const cm of comets) {
          const localU = Math.max(0, Math.min(1, (p - cm.delay) / Math.max(0.25, 0.78 - cm.delay)));
          const ease = localU * localU * (3 - 2 * localU);
          cm.pivot.position.lerpVectors(cm.startPos, cm.endPos, ease);
          const s = Math.sin(localU * Math.PI) * 1.25;
          cm.pivot.scale.setScalar(Math.max(0.01, s));
          cm.mat.opacity = Math.sin(localU * Math.PI);
        }

        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    } else if (archId === 'arcane_cyber') {
      // Overcharged GLSL Plasma Cannon Beam + 4 Snapping 3D Lightning Arcs + Sky Orbital Laser + Hex Holo-Grids
      const plasmaCoreMat = createUnityPlasmaBeamShaderMaterial(0x00f5d4, 0x9d4edd, 0xffffff);
      const plasmaSheathMat = createUnityPlasmaBeamShaderMaterial(0x7209b7, 0x00bbf9, 0x00f5d4);

      const ionBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 2.6, 20, 8, true),
        plasmaSheathMat
      );
      ionBeam.position.y = 1.3;
      vfxGroup.add(ionBeam);

      const lanceBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.05, 1.45, 20, 10, true),
        plasmaCoreMat
      );
      lanceBeam.rotation.x = Math.PI / 2;
      lanceBeam.position.set(0, 0.74, 0.62);
      vfxGroup.add(lanceBeam);

      // 4 Snapping 3D Jagged Electric Lightning Bolts shooting forward from the Mech
      const lightningBolts: THREE.Mesh[] = [];
      for (let b = 0; b < 4; b++) {
        const pts: THREE.Vector3[] = [];
        for (let s = 0; s <= 12; s++) {
          const u = s / 12;
          const fade = Math.sin(u * Math.PI);
          pts.push(
            new THREE.Vector3(
              (Math.random() - 0.5) * 0.24 * fade,
              0.74 - u * 0.22 + (Math.random() - 0.5) * 0.22 * fade,
              0.12 + u * 1.15
            )
          );
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubeGeo = new THREE.TubeGeometry(curve, 24, b === 0 ? 0.022 : 0.014, 6, false);
        const boltMesh = new THREE.Mesh(
          tubeGeo,
          new THREE.MeshBasicMaterial({
            color: b % 2 === 0 ? 0xffffff : 0x00f5d4,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
          })
        );
        vfxGroup.add(boltMesh);
        lightningBolts.push(boltMesh);
      }

      const hexGrids: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const hex = new THREE.Mesh(
          new THREE.RingGeometry(0.32 + i * 0.14, 0.42 + i * 0.14, 6),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0x00f5d4 : 0x7209b7,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        hex.rotation.x = -Math.PI / 2;
        hex.position.y = 0.08 + i * 0.25;
        vfxGroup.add(hex);
        hexGrids.push(hex);
      }

      const empDome = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55, 1),
        new THREE.MeshBasicMaterial({
          color: 0x00f5d4,
          wireframe: true,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending
        })
      );
      empDome.position.y = 0.62;
      vfxGroup.add(empDome);

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.2);
        plasmaCoreMat.uniforms.uTime.value = t;
        plasmaCoreMat.uniforms.uProgress.value = p;
        plasmaSheathMat.uniforms.uTime.value = t;
        plasmaSheathMat.uniforms.uProgress.value = p;

        const beamScale = p < 0.2 ? p / 0.2 : Math.max(0.01, 1 - (p - 0.2) / 0.8);
        ionBeam.scale.set(beamScale * 1.35, 1, beamScale * 1.35);
        ionBeam.rotation.y += dt * 8.0;
        lanceBeam.scale.set(beamScale * 1.2, 1 + p * 0.45, beamScale * 1.2);
        lanceBeam.rotation.y -= dt * 14.0;

        lightningBolts.forEach((bm, idx) => {
          const flicker = 0.5 + 0.5 * Math.sin(t * 75.0 + idx * 1.9);
          bm.visible = p < 0.78 && flicker > 0.25;
          (bm.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p * 1.25) * flicker);
        });

        hexGrids.forEach((h, idx) => {
          h.position.y = 0.08 + idx * 0.24 + p * 0.85;
          h.rotation.z += dt * (idx % 2 === 0 ? 3.8 : -3.8);
          h.scale.setScalar(0.65 + p * 1.1);
          (h.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.92);
        });
        empDome.scale.setScalar(0.5 + p * 1.45);
        empDome.rotation.y += dt * 3.2;
        (empDome.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.75);
        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    } else {
      // DRAGON & ELEMENTAL GUARDIANS: Actual Roaring Volumetric Dragon Fire Breath Stream from the Jaws +
      // 44 Billowing PYROLUX Flame/Ember/Smoke Particles + Erupting Obsidian Crags
      const breathRig = new THREE.Group();
      // Anchor at the Dragon Sovereign's open jaws (y = 0.96, z = 0.14) and angle downward across the pedestal
      breathRig.position.set(0, 0.96, 0.14);
      breathRig.rotation.x = 0.44;
      vfxGroup.add(breathRig);

      const jetConeGeo = new THREE.ConeGeometry(0.46, 1.48, 28, 18, true);
      // Tip at origin (jaws), wide flame front extending along +Z
      jetConeGeo.translate(0, -0.74, 0);
      jetConeGeo.rotateX(-Math.PI / 2);

      const outerFireMat = createUnityFireBreathShaderMaterial(0xfff3b0, 0xff6d00, 0xd90429);
      const innerFireMat = createUnityFireBreathShaderMaterial(0xffffff, 0xffd166, 0xff5400);

      const outerBreathCone = new THREE.Mesh(jetConeGeo, outerFireMat);
      breathRig.add(outerBreathCone);

      const innerBreathCone = new THREE.Mesh(jetConeGeo, innerFireMat);
      innerBreathCone.scale.set(0.62, 0.62, 0.95);
      breathRig.add(innerBreathCone);

      // 44 Billowing Soft-Particle Flame, Ember & Smoke Billboards pouring out of the Dragon's Jaws
      const flameTex = getUnityFireFlameTexture();
      const flameParticles: Array<{
        sprite: THREE.Sprite;
        mat: THREE.SpriteMaterial;
        phase: number;
        speed: number;
        swirlAngle: number;
        swirlRadius: number;
        rotSpeed: number;
        baseScale: number;
      }> = [];
      for (let i = 0; i < 44; i++) {
        const fMat = new THREE.SpriteMaterial({
          map: flameTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          rotation: Math.random() * Math.PI * 2
        });
        const fSp = new THREE.Sprite(fMat);
        breathRig.add(fSp);
        flameParticles.push({
          sprite: fSp,
          mat: fMat,
          phase: i / 44,
          speed: 1.85 + (i % 5) * 0.28,
          swirlAngle: (i / 44) * Math.PI * 2 * 3.0,
          swirlRadius: 0.06 + (i % 7) * 0.048,
          rotSpeed: (i % 2 === 0 ? 1 : -1) * (2.4 + (i % 4) * 0.75),
          baseScale: 0.24 + (i % 4) * 0.095
        });
      }

      const crags: Array<{ mesh: THREE.Mesh; maxH: number }> = [];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rad = 0.55 + (i % 2) * 0.22;
        const maxH = 0.42 + (i % 3) * 0.14;
        const crag = new THREE.Mesh(
          new THREE.ConeGeometry(0.085, maxH, 5),
          new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0xff4d00 : 0xffbe0b,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
          })
        );
        crag.position.set(Math.cos(ang) * rad, 0.02, Math.sin(ang) * rad);
        crag.rotation.z = -Math.cos(ang) * 0.28;
        crag.rotation.x = Math.sin(ang) * 0.28;
        vfxGroup.add(crag);
        crags.push({ mesh: crag, maxH });
      }

      const cWhite = new THREE.Color(0xfff8d6);
      const cGold = new THREE.Color(0xffbe0b);
      const cOrange = new THREE.Color(0xff4d00);
      const cCrimson = new THREE.Color(0x9b0014);

      let t = 0;
      st.activeVfxUpdaters.push((dt) => {
        t += dt;
        const p = Math.min(1, t / 1.25);
        outerFireMat.uniforms.uTime.value = t;
        outerFireMat.uniforms.uProgress.value = p;
        innerFireMat.uniforms.uTime.value = t;
        innerFireMat.uniforms.uProgress.value = p;

        const swell = 0.75 + Math.sin(p * Math.PI) * 0.65;
        outerBreathCone.scale.set(swell, swell, 0.8 + Math.min(1, p * 1.8) * 0.45);
        outerBreathCone.rotation.z += dt * 9.5;
        innerBreathCone.scale.set(swell * 0.62, swell * 0.62, 0.78 + Math.min(1, p * 1.9) * 0.42);
        innerBreathCone.rotation.z -= dt * 13.5;

        const lifeFade = 1.0 - Math.pow(p, 1.45);
        for (const fp of flameParticles) {
          const prog = (t * fp.speed + fp.phase) % 1.0;
          const zDist = prog * 1.45;
          const spread = Math.pow(prog, 1.1) * fp.swirlRadius * (1.0 + p * 0.55);
          const swAng = fp.swirlAngle + t * 8.5 + prog * 3.8;
          const lift = Math.pow(prog, 1.7) * 0.22;
          fp.sprite.position.set(
            Math.cos(swAng) * spread,
            Math.sin(swAng) * spread + lift,
            zDist
          );
          const s = fp.baseScale * (0.35 + prog * 1.75) * (0.75 + 0.45 * Math.sin(p * Math.PI));
          fp.sprite.scale.setScalar(s);
          fp.mat.rotation += fp.rotSpeed * dt;

          if (prog < 0.28) {
            fp.mat.color.lerpColors(cWhite, cGold, prog / 0.28);
          } else if (prog < 0.68) {
            fp.mat.color.lerpColors(cGold, cOrange, (prog - 0.28) / 0.40);
          } else {
            fp.mat.color.lerpColors(cOrange, cCrimson, (prog - 0.68) / 0.32);
          }
          fp.mat.opacity = Math.max(0, Math.sin(prog * Math.PI) * lifeFade * 0.95);
        }

        const erupt = p < 0.35 ? p / 0.35 : Math.max(0, 1 - (p - 0.35) / 0.65);
        crags.forEach((c) => {
          c.mesh.scale.set(1, Math.max(0.01, erupt), 1);
          c.mesh.position.y = (c.maxH * erupt) * 0.45;
          (c.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p * 0.85) * 0.95);
        });
        if (p >= 1) {
          disposeHierarchy(vfxGroup);
          vfxGroup.clear();
          return false;
        }
        return true;
      });
    }
  };

  useEffect(() => {
    if (attackPreviewNonce > 0 && (activeTab === 'types' || activeTab === 'pieces')) {
      triggerShowcaseAttackAndVfx();
    }
  }, [attackPreviewNonce]);

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
            <>
              <button
                type="button"
                className={`showcase-toggle-btn ${isAttackingPreview ? 'active' : ''}`}
                onClick={triggerShowcaseAttackAndVfx}
                title={`Preview ${archetype.name} Unique Attack & 3D Effect`}
              >
                ⚔ Attack &amp; VFX
              </button>
              <button
                type="button"
                className={`showcase-toggle-btn ${previewColor === 'w' ? 'active' : ''}`}
                onClick={() => setPreviewColor((prev) => (prev === 'w' ? 'b' : 'w'))}
                title="Toggle between White and Black variant of this set"
              >
                {previewColor === 'w' ? '♔ White' : '♚ Black'}
              </button>
            </>
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
        <span>
          {activeTab === 'types'
            ? `${archetype.strikeStyle} · ${archetype.shatterStyle}`
            : 'Drag to orbit 360° · Scroll to zoom · Live 3D Showcase'}
        </span>
      </div>
    </div>
  );
}
