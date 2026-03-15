"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
// @ts-ignore
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
// @ts-ignore
import { MMDPose } from "three/examples/jsm/animation/MMDAnimationHelper.js";

type LuukPortraitProps = {
  className?: string;
  mood?: "neutral" | "focused" | "curious" | "concerned" | "annoyed" | "calm";
  onUserMessage?: boolean;
  onBlockWarning?: boolean;
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

type Gesture = "none" | "nod" | "shake";

export default function LuukPortrait({
  className,
  mood = "neutral",
  onUserMessage = false,
  onBlockWarning = false,
}: LuukPortraitProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const applyMoodRef = useRef<
    ((root: THREE.Object3D, mood: LuukPortraitProps["mood"]) => void) | null
  >(null);

  const currentMoodRef = useRef<MoodName>("neutral");
  const targetMoodRef = useRef<MoodName>(mood);
  const blendFactorRef = useRef(1.0);
  const blinkSpeedRef = useRef(1.0);
  const gestureQueue = useRef<Array<{ type: Gesture; duration: number; startTime: number }>>([]);
  const headBoneRef = useRef<THREE.Object3D | null>(null);
  const armBones = useRef<{
    left: { upper: THREE.Object3D | null; lower: THREE.Object3D | null; hand: THREE.Object3D | null };
    right: { upper: THREE.Object3D | null; lower: THREE.Object3D | null; hand: THREE.Object3D | null };
  }>({
    left: { upper: null, lower: null, hand: null },
    right: { upper: null, lower: null, hand: null }
  });
  const shoulderRefs = useRef({
    left: { bone: null as THREE.Object3D | null, baseY: 0, currentY: 0 },
    right: { bone: null as THREE.Object3D | null, baseY: 0, currentY: 0 }
  });
  const chestBones = useRef<THREE.Object3D[]>([]);
  const hairBones = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    targetMoodRef.current = mood;
    if (currentMoodRef.current !== targetMoodRef.current) {
      blendFactorRef.current = 0;
    }
  }, [mood]);

  useEffect(() => {
    if (onUserMessage) {
      const startTime = performance.now() / 1000;
      gestureQueue.current.push({ type: "nod", duration: 0.3, startTime });
      blinkSpeedRef.current = 2.0;
      setTimeout(() => { blinkSpeedRef.current = 1.0; }, 1000);
    }
  }, [onUserMessage]);

  useEffect(() => {
    if (onBlockWarning) {
      const startTime = performance.now() / 1000;
      gestureQueue.current.push({ type: "shake", duration: 0.2, startTime });
    }
  }, [onBlockWarning]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let model: THREE.Object3D | null = null;
    let frameId = 0;
    let disposed = false;
    let mixer: THREE.AnimationMixer | null = null;

    const blinkTargets: Array<{ influences: number[]; index: number }> = [];
    const clock = new THREE.Clock();
    const baseY = -3;
    const baseZ = 0;

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

    // Background (keeping your exact same background)
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

    // Lights (keeping your exact same lights)
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

    // Function to apply a natural resting pose to the arms
    const applyRestingPose = (root: THREE.Object3D) => {
      // Find all arm bones
      root.traverse((obj: THREE.Object3D) => {
        const name = obj.name.toLowerCase();
        
        // Left arm
        if (name.includes("左肩") || (name.includes("肩") && name.includes("左")) || name.includes("l_shoulder")) {
          armBones.current.left.upper = obj;
        }
        if (name.includes("左腕") || name.includes("左ひじ") || (name.includes("腕") && name.includes("左")) || name.includes("l_arm") || name.includes("l_elbow")) {
          armBones.current.left.lower = obj;
        }
        if (name.includes("左手") || (name.includes("手") && name.includes("左")) || name.includes("l_hand")) {
          armBones.current.left.hand = obj;
        }
        
        // Right arm
        if (name.includes("右肩") || (name.includes("肩") && name.includes("右")) || name.includes("r_shoulder")) {
          armBones.current.right.upper = obj;
        }
        if (name.includes("右腕") || name.includes("右ひじ") || (name.includes("腕") && name.includes("右")) || name.includes("r_arm") || name.includes("r_elbow")) {
          armBones.current.right.lower = obj;
        }
        if (name.includes("右手") || (name.includes("手") && name.includes("右")) || name.includes("r_hand")) {
          armBones.current.right.hand = obj;
        }
        
        // Head
        if (name.includes("頭") || name.includes("head")) {
          headBoneRef.current = obj;
        }
        
        // Shoulders for posture
        if (name.includes("肩") || name.includes("shoulder")) {
          if (name.includes("左") || name.includes("l_")) {
            shoulderRefs.current.left.bone = obj;
            shoulderRefs.current.left.baseY = obj.position.y;
          } else if (name.includes("右") || name.includes("r_")) {
            shoulderRefs.current.right.bone = obj;
            shoulderRefs.current.right.baseY = obj.position.y;
          }
        }
        
        // Chest for breathing
        if (name.includes("胸") || name.includes("chest")) {
          chestBones.current.push(obj);
        }
        
        // Hair for movement
        if (name.includes("髪") || name.includes("hair")) {
          hairBones.current.push(obj);
        }
      });

      // Apply natural arm positions (slightly bent, relaxed)
      if (armBones.current.left.upper) {
        armBones.current.left.upper.rotation.z = -0.1; // Slight forward
        armBones.current.left.upper.rotation.y = 0.15; // Slightly outward
      }
      if (armBones.current.left.lower) {
        armBones.current.left.lower.rotation.x = 0.3; // Bent at elbow
      }
      if (armBones.current.left.hand) {
        armBones.current.left.hand.rotation.x = 0.1;
        armBones.current.left.hand.rotation.y = -0.1;
      }
      
      if (armBones.current.right.upper) {
        armBones.current.right.upper.rotation.z = 0.1;
        armBones.current.right.upper.rotation.y = -0.15;
      }
      if (armBones.current.right.lower) {
        armBones.current.right.lower.rotation.x = 0.3;
      }
      if (armBones.current.right.hand) {
        armBones.current.right.hand.rotation.x = 0.1;
        armBones.current.right.hand.rotation.y = 0.1;
      }
    };

    loader.load(
      modelPath,
      (loadedModel: THREE.Object3D) => {
        if (disposed || !scene) return;

        model = loadedModel;
        modelRef.current = model;

        // Apply resting pose immediately after load
        applyRestingPose(model);

        model.position.set(0, baseY, baseZ);
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
        model.position.set(0, baseY, baseZ);
      }
    };

    window.addEventListener("resize", onResize);

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      if (model) {
        const t = clock.getElapsedTime();
        const now = performance.now() / 1000;
        
        // Gesture system
        if (gestureQueue.current.length > 0) {
          const currentGesture = gestureQueue.current[0];
          const progress = (now - currentGesture.startTime) / currentGesture.duration;
          
          if (progress >= 1.0) {
            gestureQueue.current.shift();
          } else {
            switch(currentGesture.type) {
              case "nod":
                if (headBoneRef.current) {
                  headBoneRef.current.rotation.x = Math.sin(progress * Math.PI * 2) * 0.15;
                }
                break;
              case "shake":
                if (headBoneRef.current) {
                  headBoneRef.current.rotation.y = Math.sin(progress * Math.PI * 4) * 0.1;
                }
                break;
            }
          }
        }
        
        // Blend moods smoothly
        if (currentMoodRef.current !== targetMoodRef.current) {
          blendFactorRef.current = Math.min(1.0, blendFactorRef.current + 0.02);
          
          if (blendFactorRef.current >= 1.0) {
            currentMoodRef.current = targetMoodRef.current;
          } else {
            const fromMorphs = MOOD_MORPHS[currentMoodRef.current];
            const toMorphs = MOOD_MORPHS[targetMoodRef.current];
            
            model.traverse((obj: THREE.Object3D) => {
              const mesh = obj as THREE.Mesh;
              if (!(mesh as any).morphTargetInfluences) return;
              
              for (let i = 0; i < fromMorphs.length; i++) {
                const from = fromMorphs[i];
                const to = toMorphs[i] || from;
                const blendedValue = from.value * (1 - blendFactorRef.current) + to.value * blendFactorRef.current;
                setMorph(mesh, from.names, blendedValue);
              }
            });
          }
        }

        // Idle animations
        model.rotation.y = 0.06 + Math.sin(t * 0.4) * 0.012;
        model.rotation.x = Math.sin(t * 0.3) * 0.008;
        
        model.position.y = baseY + Math.sin(t * 1.15) * 0.03;
        
        // Breathing - subtle chest movement
        chestBones.current.forEach(bone => {
          bone.scale.y = 1 + Math.sin(t * 2.5) * 0.004;
        });
        
        // Head movement
        if (headBoneRef.current) {
          headBoneRef.current.rotation.x += Math.sin(t * 0.3) * 0.005;
          headBoneRef.current.rotation.y += Math.sin(t * 0.5) * 0.008;
          headBoneRef.current.rotation.z += Math.sin(t * 0.4) * 0.003;
        }
        
        // Shoulder posture
        const updateShoulder = (shoulder: typeof shoulderRefs.current.left) => {
          if (!shoulder.bone) return;
          
          switch(targetMoodRef.current) {
            case "concerned":
            case "annoyed":
              shoulder.currentY = shoulder.baseY - 0.2;
              break;
            default:
              shoulder.currentY = shoulder.baseY;
          }
          
          shoulder.bone.position.y += (shoulder.currentY - shoulder.bone.position.y) * 0.1;
        };
        
        updateShoulder(shoulderRefs.current.left);
        updateShoulder(shoulderRefs.current.right);
        
        // Subtle arm sway
        if (armBones.current.left.lower) {
          armBones.current.left.lower.rotation.x = 0.3 + Math.sin(t * 0.8) * 0.02;
        }
        if (armBones.current.right.lower) {
          armBones.current.right.lower.rotation.x = 0.3 + Math.cos(t * 0.8) * 0.02;
        }
        
        // Hair movement
        hairBones.current.forEach(bone => {
          bone.rotation.x += Math.sin(t * 2 + bone.position.x) * 0.002;
          bone.rotation.z += Math.cos(t * 1.8 + bone.position.y) * 0.002;
        });
        
        // Blinking
        const blinkWave = Math.sin(t * 0.9 * blinkSpeedRef.current);
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