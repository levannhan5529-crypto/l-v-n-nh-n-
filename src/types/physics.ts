export type ActiveTab = 
  | "home"
  | "ai-vision"
  | "virtual-lab"
  | "tutor"
  | "experiments"
  | "research-guide"
  | "about";

// AI Vision Lab Types
export type GradeLevel = 
  | "Tất cả"
  | "Cơ học"
  | "Dao động & Sóng"
  | "Nhiệt & Quang"
  | "Lớp 10"
  | "Lớp 11"
  | "Lớp 12"
  | "Video của tôi";

export type ExperimentType = 
  | "free-fall"
  | "simple-pendulum"
  | "incline-plane"
  | "horizontal-projectile"
  | "vertical-projectile"
  | "spring-oscillation"
  | "hooke-elastic"
  | "elastic-collision"
  | "inelastic-collision"
  | "friction-coefficient"
  | "newton-second-law"
  | "circular-motion"
  | "standing-wave"
  | "resonance-acoustic"
  | "water-wave-interference"
  | "young-interference"
  | "thin-lens-focus"
  | "emf-internal-resistance"
  | "capacitance-discharge"
  | "ampere-force"
  | "boyle-mariotte"
  | "charles-isobaric"
  | "ideal-gas-equation"
  | "sound-doppler"
  | "photoelectric-effect"
  | "latent-heat-fusion"
  | "damped-oscillation"
  | "heat-capacity"
  | string; // Allows any user-created custom experiment ID

export interface CalibrationScale {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  realDistanceMeters: number; // e.g. 1.0 meter
  pixelDistance: number;
  pixelsPerMeter: number;
  isCalibrated: boolean;
}

export interface TrackingPoint {
  frameIndex: number;
  timeSeconds: number;
  rawX: number; // pixels
  rawY: number; // pixels
  filteredX: number; // pixels
  filteredY: number; // pixels
  posX: number; // meters
  posY: number; // meters
  velocityX?: number; // m/s
  velocityY?: number; // m/s
  velocityTotal?: number; // m/s
  acceleration?: number; // m/s^2
  angleRad?: number;
  confidence: number;
}

export interface RegressionResult {
  equationText: string;
  coefficients: number[]; // e.g. [a, b, c] for a*t^2 + b*t + c
  rSquared: number;
  calculatedTheoreticalValue: {
    name: string;
    symbol: string;
    value: number;
    unit: string;
  };
  theoreticalValue: {
    name: string;
    symbol: string;
    value: number;
    unit: string;
  };
  absoluteError: number;
  relativeErrorPercent: number;
  physicsLaw: string;
  conclusion: string;
}

export interface VisionAnalysisState {
  currentExperiment: ExperimentType;
  videoSourceUrl: string | null;
  videoFileName: string;
  fps: number;
  totalFrames: number;
  currentFrame: number;
  isPlaying: boolean;
  trackingMode: "color-centroid" | "template" | "optical-flow";
  trackingColor: string; // hex
  selectedRoi: { x: number; y: number; width: number; height: number } | null;
  calibration: CalibrationScale;
  dataPoints: TrackingPoint[];
  regression: RegressionResult | null;
  pipelineStep: number; // 1 to 8
  filterType: "none" | "moving-average" | "savitzky-golay";
  isAnalyzing: boolean;
  aiScientificReview: {
    summary?: string;
    detailedExplanation?: string;
    errorAnalysis?: string[];
    scientificEvaluation?: string;
    researchImprovementTips?: string[];
  } | null;
}

// Virtual Lab Types
export type VirtualLabCategory = "mechanics" | "electricity" | "waves" | "thermodynamics";

export interface DataSample {
  id: string;
  timestamp: number;
  values: Record<string, number | string>;
}

// Tutor Types
export type AIEngineType = "gemini" | "chatgpt" | "hybrid";

export interface TutorMessage {
  id: string;
  sender: "ai" | "user";
  content: string;
  timestamp: number;
  topic?: string;
  suggestedFollowUps?: string[];
  modelEngine?: AIEngineType;
  modelName?: string;
  responseTimeMs?: number;
  accuracyScore?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    tab: ActiveTab;
    context?: any;
  };
}
