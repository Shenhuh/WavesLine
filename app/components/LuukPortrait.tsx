"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
// @ts-ignore
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";

type LuukPortraitProps = {
  className?: string;
  mood?: "neutral" | "focused" | "curious" | "concerned" | "annoyed" | "calm";
};

type MoodName = NonNullable<LuukPortraitProps["mood"]>;

const MOOD_MORPHS: Record<
  MoodName,
  Array<{ names: string[]; value: number }>
> = {
  neutral: [],

  focused: [
    { names: ["キリッ"], value: 0.45 },
    { names: ["ｷﾘｯ目"], value: 0.4 },
  ],

  curious: [
    { names: ["びっくり"], value: 0.42 },
    { names: ["にこり"], value: 0.12 },
  ],

  concerned: [
    { names: ["困る"], value: 0.5 },
    { names: ["悲しい目"], value: 0.4 },
  ],

  annoyed: [
    { names: ["怒り"], value: 0.55 },
    { names: ["怒り目"], value: 0.5 },
    { names: ["じと目"], value: 0.3 },
  ],

  calm: [
    { names: ["にこり"], value: 0.35 },
    { names: ["なごみ"], value: 0.28 },
    { names: ["笑い目"], value: 0.22 },
  ],
};
export default function LuukPortrait({
  className,
  mood = "neutral",
}: LuukPortraitProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const applyMoodRef = useRef<
    ((root: THREE.Object3D, mood: LuukPortraitProps["mood"]) => void) | null
  >(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let model: THREE.Object3D | null = null;
    let frameId = 0;
    let disposed = false;

    const blinkTargets: Array<{ influences: number[]; index: number }> = [];
    const clock = new THREE.Clock();
    const baseY = -3;

    const getSize = () => ({
      width: mount.clientWidth || 320,
      height: mount.clientHeight || 420,
    });

    const { width, height } = getSize();
    const isMobile = width < 500;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      isMobile ? 26 : 22,
      width / height,
      0.1,
      1000
    );

    const positionCamera = (mobileNow: boolean) => {
      if (!camera) return;

      if (mobileNow) {
        camera.position.set(0, 16.6, 15.6);
        camera.lookAt(0, 15.7, 0);
      } else {
        camera.position.set(0, 17.0, 17.2);
        camera.lookAt(0, 16.0, 0);
      }

      camera.updateProjectionMatrix();
    };

    positionCamera(isMobile);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isMobile ? 1.12 : 1.18;

    mount.appendChild(renderer.domElement);

    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColorTop: { value: new THREE.Color("#cadcf2") },
        uColorBottom: { value: new THREE.Color("#9fb4d3") },
        uGlowColor: { value: new THREE.Color("#f9fcff") },
        uGlowCenter: {
          value: new THREE.Vector2(0.5, isMobile ? 0.56 : 0.66),
        },
        uGlowRadius: { value: isMobile ? 0.3 : 0.24 },
        uGlowStrength: { value: isMobile ? 1.0 : 0.9 },
        uVignetteStrength: { value: 0.16 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorTop;
        uniform vec3 uColorBottom;
        uniform vec3 uGlowColor;
        uniform vec2 uGlowCenter;
        uniform float uGlowRadius;
        uniform float uGlowStrength;
        uniform float uVignetteStrength;
        varying vec2 vUv;

        void main() {
          vec3 base = mix(uColorBottom, uColorTop, smoothstep(0.0, 1.0, vUv.y));

          float d = distance(vUv, uGlowCenter);
          float glow = smoothstep(uGlowRadius, 0.0, d) * uGlowStrength;

          float edge = distance(vUv, vec2(0.5, 0.5));
          float vignette = smoothstep(0.45, 0.92, edge) * uVignetteStrength;

          vec3 color = base;
          color += uGlowColor * glow * 0.42;
          color -= vignette;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const bgPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(isMobile ? 18 : 24, isMobile ? 24 : 32),
      bgMaterial
    );
    bgPlane.position.set(0, isMobile ? 15.6 : 16, -8);
    scene.add(bgPlane);

    const ambient = new THREE.AmbientLight(0xf7f9ff, isMobile ? 0.7 : 0.62);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff3ea, isMobile ? 1.38 : 1.28);
    keyLight.position.set(4.5, 18, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdeebff, isMobile ? 0.6 : 0.52);
    fillLight.position.set(-6, 13, 8);
    scene.add(fillLight);

    const faceLight = new THREE.SpotLight(
      0xfffcf8,
      isMobile ? 1.28 : 1.18,
      50,
      Math.PI / 7,
      0.5,
      1.05
    );
    faceLight.position.set(0, 17.2, 10);
    faceLight.target.position.set(0, isMobile ? 15.4 : 15.8, 0);
    scene.add(faceLight);
    scene.add(faceLight.target);

    const rimLight = new THREE.DirectionalLight(0xdbe7ff, isMobile ? 0.58 : 0.5);
    rimLight.position.set(0, 14, -10);
    scene.add(rimLight);

    const haloLight = new THREE.PointLight(0xffffff, isMobile ? 0.68 : 0.58, 18);
    haloLight.position.set(0, isMobile ? 16.1 : 17, -5.8);
    scene.add(haloLight);

    const loader = new MMDLoader();
    const modelPath = "/mmd/luuk/luuk.pmx";

    const findMorphIndex = (mesh: THREE.Mesh, names: string[]) => {
      const dict = (mesh as any).morphTargetDictionary as
        | Record<string, number>
        | undefined;

      if (!dict) return -1;

      const entries = Object.entries(dict);

      for (const target of names) {
        const loweredTarget = target.toLowerCase();

        for (const [key, value] of entries) {
          if (key.toLowerCase().includes(loweredTarget)) {
            return value;
          }
        }
      }

      return -1;
    };

    const setMorph = (mesh: THREE.Mesh, names: string[], value: number) => {
      const influences = (mesh as any).morphTargetInfluences as number[] | undefined;
      if (!influences) return;

      const idx = findMorphIndex(mesh, names);
      if (idx >= 0) influences[idx] = value;
    };

    const resetAllMorphs = (root: THREE.Object3D) => {
      root.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        const influences = (mesh as any).morphTargetInfluences as number[] | undefined;
        if (!influences) return;

        for (let i = 0; i < influences.length; i++) {
          influences[i] = 0;
        }
      });
    };

    const applyMood = (
      root: THREE.Object3D,
      currentMood: LuukPortraitProps["mood"]
    ) => {
      resetAllMorphs(root);

      const morphs = MOOD_MORPHS[currentMood ?? "neutral"] ?? MOOD_MORPHS.neutral;

      root.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (!(mesh as any).morphTargetInfluences) return;

        for (const morph of morphs) {
          setMorph(mesh, morph.names, morph.value);
        }
      });
    };

    applyMoodRef.current = applyMood;

    loader.load(
      modelPath,
      (loadedModel: THREE.Object3D) => {
        if (disposed || !scene) return;

        model = loadedModel;
        modelRef.current = model;

        model.traverse((obj: THREE.Object3D) => {
          const mesh = obj as THREE.Mesh;
          const dict = (mesh as any).morphTargetDictionary as
            | Record<string, number>
            | undefined;

          if (dict) {
            console.log("[Luuk morphs]", mesh.name || "(unnamed)", Object.keys(dict));
          }
        });

        model.position.set(0, baseY, 0);
        model.rotation.y = 0.06;
        model.scale.setScalar(1);

        model.traverse((obj: THREE.Object3D) => {
          const mesh = obj as THREE.Mesh;

          if ((mesh as any).isMesh) {
            mesh.frustumCulled = false;
            mesh.castShadow = false;
            mesh.receiveShadow = false;

            const influences = (mesh as any).morphTargetInfluences as number[] | undefined;
            if (influences) {
              const blinkIdx = findMorphIndex(mesh, ["まばたき", "blink"]);
              if (blinkIdx >= 0) {
                blinkTargets.push({ influences, index: blinkIdx });
              }
            }

            const tuneMaterial = (mat: any) => {
              if (!mat) return;

              mat.transparent = true;
              mat.depthWrite = true;

              if ("roughness" in mat) mat.roughness = 0.78;
              if ("metalness" in mat) mat.metalness = 0.0;
              if ("envMapIntensity" in mat) mat.envMapIntensity = 0.08;
              if ("alphaTest" in mat) mat.alphaTest = 0.03;

              if (mat.color) {
                mat.color.multiplyScalar(isMobile ? 1.06 : 1.04);
              }

              if ("emissive" in mat && mat.emissive?.setRGB) {
                mat.emissive.setRGB(0.028, 0.028, 0.028);
              }

              mat.needsUpdate = true;
            };

            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(tuneMaterial);
            } else {
              tuneMaterial(mesh.material);
            }
          }
        });

        applyMood(model, mood);
        scene.add(model);
      },
      undefined,
      (error: unknown) => {
        console.error("Failed to load Luuk PMX:", error);
      }
    );

    const onResize = () => {
      if (!mount || !camera || !renderer) return;

      const w = mount.clientWidth || 320;
      const h = mount.clientHeight || 420;
      const mobileNow = w < 500;

      camera.aspect = w / h;
      camera.fov = mobileNow ? 26 : 22;
      positionCamera(mobileNow);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileNow ? 1 : 1.25));
      renderer.setSize(w, h);

      bgPlane.geometry.dispose();
      bgPlane.geometry = new THREE.PlaneGeometry(
        mobileNow ? 18 : 24,
        mobileNow ? 24 : 32
      );
      bgPlane.position.set(0, mobileNow ? 15.6 : 16, -8);

      bgMaterial.uniforms.uGlowCenter.value.set(0.5, mobileNow ? 0.56 : 0.66);
      bgMaterial.uniforms.uGlowRadius.value = mobileNow ? 0.3 : 0.24;
      bgMaterial.uniforms.uGlowStrength.value = mobileNow ? 1.0 : 0.9;

      if (model) {
        model.position.set(0, baseY, 0);
      }
    };

    window.addEventListener("resize", onResize);

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      if (model) {
        const t = clock.getElapsedTime();

        model.rotation.y = 0.06 + Math.sin(t * 0.5) * 0.018;
        model.position.y = baseY + Math.sin(t * 1.15) * 0.03;

        const blinkWave = Math.sin(t * 0.9);
        const blink = blinkWave > 0.985 ? 1 : 0;

        for (const target of blinkTargets) {
          target.influences[target.index] = blink;
        }
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);

      bgPlane.geometry.dispose();
      bgMaterial.dispose();

      if (scene) {
        scene.traverse((obj: THREE.Object3D) => {
          const mesh = obj as THREE.Mesh;
          if ((mesh as any).geometry) {
            (mesh as any).geometry.dispose?.();
          }

          const material = (mesh as any).material;
          if (Array.isArray(material)) {
            material.forEach((m) => m?.dispose?.());
          } else {
            material?.dispose?.();
          }
        });
      }

      renderer?.dispose();

      if (mount && renderer?.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (modelRef.current && applyMoodRef.current) {
      applyMoodRef.current(modelRef.current, mood);
    }
  }, [mood]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        background: "transparent",
        overflow: "hidden",
        borderRadius: "18px",
      }}
    />
  );
}