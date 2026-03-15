export type PortraitMood =
  | "neutral"
  | "focused"
  | "curious"
  | "concerned"
  | "annoyed"
  | "calm";

export type MorphRule = {
  names: string[];
  value: number;
};

export type CameraConfig = {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
};

export type BonePoseRule = {
  boneNames: string[];
  rotation?: [number, number, number]; // radians
  position?: [number, number, number];
};

export type MoodMotionSet = {
  modelVmdPaths?: string[];
  cameraVmdPath?: string;
};

export type PortraitCharacterConfig = {
  modelPath: string;
  baseY: number;
  rotationY?: number;
  scale?: number;

  // old optional fields are kept in case you still use them somewhere
  vmdPath?: string;
  modelVmdPaths?: string[];
  cameraVmdPath?: string;

  // new: mood-based motions
  moodMotions?: Partial<Record<PortraitMood, MoodMotionSet>>;

  mobileCamera: CameraConfig;
  desktopCamera: CameraConfig;

  background: {
    top: string;
    bottom: string;
    glow: string;
    glowCenterYMobile?: number;
    glowCenterYDesktop?: number;
    glowRadiusMobile?: number;
    glowRadiusDesktop?: number;
    glowStrengthMobile?: number;
    glowStrengthDesktop?: number;
    vignetteStrength?: number;
  };

  lighting: {
    ambientColor?: number;
    ambient: number;

    keyColor?: number;
    key: number;

    fillColor?: number;
    fill: number;

    faceColor?: number;
    face: number;

    rimColor?: number;
    rim: number;

    haloColor?: number;
    halo: number;
  };

  material?: {
    roughness?: number;
    metalness?: number;
    envMapIntensity?: number;
    alphaTest?: number;
    colorMultiply?: number;
    emissive?: [number, number, number];
  };

  motion?: {
    floatAmp?: number;
    floatSpeed?: number;
    swayAmp?: number;
    swaySpeed?: number;
    floatAmpWithVmd?: number;
    swayAmpWithVmd?: number;
    blinkSpeed?: number;
    blinkThreshold?: number;
  };

  moods: Record<PortraitMood, MorphRule[]>;
  poses?: Record<PortraitMood, BonePoseRule[]>;
  idlePose?: BonePoseRule[];
};

export const PORTRAIT_CONFIGS: Record<string, PortraitCharacterConfig> = {
  luuk: {
    modelPath: "/mmd/luuk/luuk.pmx",
    baseY: -3,
    rotationY: 0.06,
    scale: 1,
    mobileCamera: {
      position: [0, 16.6, 15.6],
      lookAt: [0, 15.7, 0],
      fov: 26,
    },
    desktopCamera: {
      position: [0, 17.0, 17.2],
      lookAt: [0, 16.0, 0],
      fov: 22,
    },
    background: {
      top: "#cadcf2",
      bottom: "#9fb4d3",
      glow: "#f9fcff",
      glowCenterYMobile: 0.56,
      glowCenterYDesktop: 0.66,
      glowRadiusMobile: 0.3,
      glowRadiusDesktop: 0.24,
      glowStrengthMobile: 1.0,
      glowStrengthDesktop: 0.9,
      vignetteStrength: 0.16,
    },
    lighting: {
      ambientColor: 0xf7f9ff,
      ambient: 0.62,
      keyColor: 0xfff3ea,
      key: 1.28,
      fillColor: 0xdeebff,
      fill: 0.52,
      faceColor: 0xfffcf8,
      face: 1.18,
      rimColor: 0xdbe7ff,
      rim: 0.5,
      haloColor: 0xffffff,
      halo: 0.58,
    },
    material: {
      roughness: 0.78,
      metalness: 0.0,
      envMapIntensity: 0.08,
      alphaTest: 0.03,
      colorMultiply: 1.04,
      emissive: [0.028, 0.028, 0.028],
    },
    motion: {
      floatAmp: 0.03,
      floatSpeed: 1.15,
      swayAmp: 0.018,
      swaySpeed: 0.5,
      blinkSpeed: 0.9,
      blinkThreshold: 0.985,
    },
    moods: {
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
    },
  },

  phrolova: {
    modelPath: "/mmd/phrolova/phrolova.pmx",
    baseY: -2,
    rotationY: 0.04,
    scale: 1,

    // only annoyed uses the current VMD bundle
    moodMotions: {
      annoyed: {
        modelVmdPaths: [
          "/mmd/rre.vmd",
          "/mmd/face.vmd",
          "/mmd/eye.vmd",
        ],
        // uncomment if you want the camera motion too
        cameraVmdPath: "/mmd/camera.vmd",
      },
      neutral: {
        modelVmdPaths: [
          "/mmd/motion1.vmd",
          

        ],
        // uncomment if you want the camera motion too
        // cameraVmdPath: "/mmd/camera.vmd",
      },
      focused: {
        modelVmdPaths: [
          "/mmd/iris.vmd",
          

        ],
        // uncomment if you want the camera motion too
        // cameraVmdPath: "/mmd/camera.vmd",
      },
    },

    mobileCamera: {
      position: [0, 16.4, 15.8],
      lookAt: [0, 15.5, 0],
      fov: 26,
    },
    desktopCamera: {
      position: [0, 16.8, 17.4],
      lookAt: [0, 15.8, 0],
      fov: 22,
    },
    background: {
      top: "#3a234c",
      bottom: "#120d1d",
      glow: "#c47dff",
      glowCenterYMobile: 0.58,
      glowCenterYDesktop: 0.64,
      glowRadiusMobile: 0.34,
      glowRadiusDesktop: 0.28,
      glowStrengthMobile: 0.85,
      glowStrengthDesktop: 0.75,
      vignetteStrength: 0.24,
    },
   lighting: {
  ambientColor: 0xbfa8ff,
  ambient: 0.22,

  keyColor: 0xd7a7ff,
  key: 0.55,

  fillColor: 0x6f82ff,
  fill: 0.18,

  faceColor: 0xf0d4ff,
  face: 0.35,

  rimColor: 0x8f63ff,
  rim: 0.30,

  haloColor: 0xb574ff,
  halo: 0.12,
},
    material: {
      roughness: 0.72,
      metalness: 0.02,
      envMapIntensity: 0.1,
      alphaTest: 0.03,
      colorMultiply: 1.02,
      emissive: [0.02, 0.01, 0.03],
    },
    motion: {
      floatAmp: 0.01,
      floatSpeed: 0.6,
      swayAmp: 0.004,
      swaySpeed: 0.25,
      floatAmpWithVmd: 0.006,
      swayAmpWithVmd: 0.002,
      blinkSpeed: 1.2,
      blinkThreshold: 0.995,
    },
    moods: {
      neutral: [],
      focused: [
       
      ],
      curious: [
       
      ],
      concerned: [
       
      ],
      annoyed: [
        
      ],
      calm: [
       
      ],
    },
    idlePose: [

    ],
    poses: {
      neutral: [
      
      ],

      focused: [
        
      ],

      curious: [
        
      ],

      concerned: [
       
      ],

      annoyed: [
        
      ],

      calm: [
        
      ],
    },
  },
};

export type PortraitCharacterKey = keyof typeof PORTRAIT_CONFIGS;