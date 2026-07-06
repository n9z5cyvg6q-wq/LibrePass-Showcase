import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { OrbitControls, GLTFLoader } from "three-stdlib";
import {
  X,
  ScanLine,
  Car,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Camera as CameraIcon,
  Locate,
  Sliders,
  Save,
  Minus,
  Plus,
  List,
} from "lucide-react";
import { useParkingSpots, type ParkingSpot } from "@/hooks/useParkingSpots";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/external-supabase";
import { emitTwintConfirmation } from "@/lib/twintEvents";
import { useAuth } from "@/contexts/AuthContext";
import type { Parking } from "@/data/parkings";

const DEFAULT_GLB_URL =
  "https://xadoguorxapnmrzjewmb.supabase.co/storage/v1/object/public/infrastructure%20assets/Parkings%20assets.glb";

const ARUCO_CORNER_NAMES = ["Marker_0", "Marker_1", "Marker_2", "Marker_3"];
const ARUCO_REAL_DISTANCE_CM = 80;

const SOURCE_W = 800;
const SOURCE_H = 600;

// CALIBRATION BOUNDS
// Pixel coords come from the warped 800x600 image produced by the mapper
// engine (see vision/camera_nodes.py — corners are at 0,0 / 800,0 / 800,600
// / 0,600). Mapping the FULL warped rect to the marker quad in the 3D twin
// guarantees the live car can never travel further than the physical board.
const BOARD_PX_LEFT = 0;
const BOARD_PX_RIGHT = 800;
const BOARD_PX_TOP = 0;
const BOARD_PX_BOTTOM = 600;
// Manual calibration offset (in pixel space) applied to the live car coordinate
// before mapping onto the digital twin. Negative X nudges the car to the left.
const CAR_PX_OFFSET_X = -56;
// Default car starting position in warped pixel space (800x600).
// Placed at the bottom-center of the road, just past the zebra crossing —
// used until real telemetry arrives. Calibration offset is applied below.
const CAR_START_PX_X = 456;
const CAR_START_PX_Y = 540;

// ── Locked street-overlay layout (finalized 2026-05-26, no longer dev-tunable) ──
// Baked from exported snapshot: street-cal 2026-05-26T22:10:36Z.
const STREET_CAL_DEFAULTS = Object.freeze({
  widthMul: 0.59,
  lengthMul: 1.51,
  sideRatio: 0.175,
  zebraOffset: 0.35,
  zebraX: -0.01,
  zebraSpan: 0.32,
  tlOffsetX: 0.46,
  tlOffsetZ: 0.9,
  spotMarks: true,
  zebraStripes: 8,
  zebraStripeW: 0.33,
  zebraStripeGap: 0.43,
  zebraStopLine: false,
  zebraStopLineW: 0.12,
  zebraStopLineGap: 0.55,
  spotLineT: 0.06,
  spotPOffsetX: 0.32,
  signSize: 0.32,
  signPoleH: 1.2,
  planterL1Z:  0.01,
  planterL2Z:  0.24,
  planterR1Z: -0.11,
  planterR2Z:  0.18,
  benchSide: -1 as 1 | -1,
  benchZ:    -0.06,
  pedSignAZ: -0.255,
  pedSignBZ:  0.33,
  offsetX: 0,
  offsetZ: 0,
  rotDeg: 0,
  bikeOn: true,
  bikeWidth: 0.08,
});
type StreetCal = {
  widthMul: number; lengthMul: number; sideRatio: number;
  zebraOffset: number; zebraX: number; zebraSpan: number;
  tlOffsetX: number; tlOffsetZ: number; spotMarks: boolean;
  zebraStripes: number; zebraStripeW: number; zebraStripeGap: number;
  zebraStopLine: boolean; zebraStopLineW: number; zebraStopLineGap: number;
  spotLineT: number; spotPOffsetX: number;
  signSize: number; signPoleH: number;
  planterL1Z: number; planterL2Z: number; planterR1Z: number; planterR2Z: number;
  benchSide: 1 | -1; benchZ: number;
  pedSignAZ: number; pedSignBZ: number;
  offsetX: number; offsetZ: number; rotDeg: number;
  bikeOn: boolean; bikeWidth: number;
};
const CAR_PX_OFFSET_Y = 0;

const STATUS_COLOR: Record<string, number> = {
  AVAILABLE: 0x22c55e,
  SCANNING: 0xf97316,
  BILLED: 0x3b82f6,
  OCCUPIED: 0xef4444,
  EMPTY: 0x22c55e,
  "SESSION STARTED": 0xf97316,
  "IN PROGRESS": 0x3b82f6,
  "BILLED / RECEIPT SENT": 0x3b82f6,
  RESERVED: 0xf59e0b,
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  AVAILABLE: { bg: "bg-emerald-500", text: "text-white", label: "AVAILABLE" },
  SCANNING: { bg: "bg-orange-500", text: "text-white", label: "SCANNING" },
  BILLED: { bg: "bg-blue-600", text: "text-white", label: "BILLED" },
  OCCUPIED: { bg: "bg-red-500", text: "text-white", label: "OCCUPIED" },
  EMPTY: { bg: "bg-emerald-500", text: "text-white", label: "AVAILABLE" },
  "SESSION STARTED": { bg: "bg-orange-500", text: "text-white", label: "SESSION STARTED" },
  "IN PROGRESS": { bg: "bg-blue-600", text: "text-white", label: "BILLED" },
  "BILLED / RECEIPT SENT": { bg: "bg-blue-600", text: "text-white", label: "BILLED" },
  RESERVED: { bg: "bg-amber-500", text: "text-white", label: "RESERVED" },
};
const getStatusStyle = (s: string) =>
  STATUS_STYLE[(s || "").toUpperCase()] ??
  STATUS_STYLE[s] ?? { bg: "bg-muted", text: "text-foreground", label: s || "—" };

const getPlate = (s: any): string | null => s?.current_vehicle ?? s?.occupied_plate ?? null;
const normalizePlate = (plate: string | null | undefined) =>
  String(plate ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

interface Props {
  parking: Parking;
  onClose: () => void;
}

const ParkingInspector3D = ({ parking, onClose }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const spotMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const splatViewerRef = useRef<any>(null);
  const streetEnvRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>();
  const droneViewRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  const carGroupRef = useRef<THREE.Group | null>(null);
  const carCurrentPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const carTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const carWorldRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // EMA-smoothed raw pixel coordinate (kills YOLO jitter without dropping frames).
  const smoothedPixelRef = useRef<{ x: number; y: number } | null>(null);
  // Parking lock-on animation
  const scanRingRef = useRef<THREE.Mesh | null>(null);
  const parkedSpotIdRef = useRef<string | null>(null);
  const parkAnimStartRef = useRef<number>(0);
  const pulsingSpotRef = useRef<{ id: string; start: number } | null>(null);
  const lastMoveAtRef = useRef<number>(0);
  const hudParkedRef = useRef<HTMLDivElement>(null);
  const parkedHideTimerRef = useRef<number | null>(null);
  // Front + rear license plate decals on the 3D car (updated when plate changes).
  const plateMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const plateTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastParkedFiredRef = useRef<string | null>(null);
  // Candidate spot the car is currently sitting inside, plus when it became stationary there.
  const candidateSpotRef = useRef<{ id: string; stationarySince: number } | null>(null);
  // Sticky session id so we can match the eventual BILLED transition to ONE receipt.
  const sessionIdRef = useRef<string | null>(null);
  const billingFiredRef = useRef<Set<string>>(new Set());
  // Smooth "snap-to-center" of the parking spot once locked. Overrides
  // the YOLO-tracked target with the spot's exact center for a clean,
  // navigation-app-style settle animation.
  const snapToSpotRef = useRef<{ x: number; z: number; until: number } | null>(null);
  const [parkedSpotName, setParkedSpotName] = useState<string | null>(null);
  // Sticky session pill (timer that stays until backend ends session).
  const [activeSessionPill, setActiveSessionPill] = useState<{
    spotId: string;
    spotName: string;
    plate: string;
    ownerName: string | null;
    isGuest: boolean;
    startedAt: number;
  } | null>(null);
  const [, setSessionTick] = useState(0);

  const [liveCar, setLiveCar] = useState<{ id: string; x: number; y: number } | null>(null);
  const [splatLoading, setSplatLoading] = useState(true);
  const [splatError, setSplatError] = useState<string | null>(null);
  const [showSpots, setShowSpots] = useState(true);
  const showSpotsRef = useRef(true);
  useEffect(() => { showSpotsRef.current = showSpots; }, [showSpots]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [showTuner, setShowTuner] = useState(false);
  // Street layout is locked to STREET_CAL_DEFAULTS — no dev tuner.
  const streetCal = STREET_CAL_DEFAULTS as StreetCal;


  const [showRoster, setShowRoster] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  const { spots: allSpots, isSimulation } = useParkingSpots(parking.id);

  // ── Recognised driver lookup ──
  // Fetch the signed-in user's display name + saved vehicle plates so that
  // when YOLO recognises the plate on the live car we can either greet them
  // by name ("Welcome, Denys") or fall back to a guest session.
  const { user } = useAuth();
  const myPlatesRef = useRef<Set<string>>(new Set());
  const ownerNameRef = useRef<string>("Guest");
  const [, setOwnerResolveTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        myPlatesRef.current = new Set();
        ownerNameRef.current = "Guest";
        setOwnerResolveTick((t) => t + 1);
        return;
      }
      const [{ data: profile }, { data: vehicles }] = await Promise.all([
        supabase.from("profiles").select("full_name, plate_number").eq("id", user.id).maybeSingle(),
        supabase.from("vehicles").select("plate_number").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const plates = new Set<string>();
      vehicles?.forEach((v: any) => {
        const plate = normalizePlate(v?.plate_number);
        if (plate) plates.add(plate);
      });
      const profilePlate = normalizePlate(profile?.plate_number);
      if (profilePlate) plates.add(profilePlate);
      myPlatesRef.current = plates;
      const friendly =
        (profile?.full_name && profile.full_name.trim().split(/\s+/)[0]) ||
        (user.user_metadata as any)?.full_name?.split?.(" ")?.[0] ||
        user.email?.split("@")[0] ||
        "Driver";
      ownerNameRef.current = friendly;
      setOwnerResolveTick((t) => t + 1);
    })();
    return () => { cancelled = true; };
  }, [user]);

  /** Returns `{ name, isOwner }` for a recognised plate. */
  const resolveDriver = useCallback((rawPlate: string): { name: string; isOwner: boolean } => {
    const norm = normalizePlate(rawPlate);
    if (norm && myPlatesRef.current.has(norm)) {
      return { name: ownerNameRef.current, isOwner: true };
    }
    return { name: "Guest", isOwner: false };
  }, []);


  const [boardFrame, setBoardFrame] = useState<{
    origin: THREE.Vector3;
    xAxis: THREE.Vector3;
    zAxis: THREE.Vector3;
    topY: number;
    corners?: THREE.Vector3[]; // [m0,m1,m2,m3] for bilinear homography
  } | null>(null);

  // Smoothed heading direction for the car (XZ plane unit vector). Avoids
  // snap-rotation on YOLO jitter and keeps the car nose-forward like a real vehicle.
  const carHeadingRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 0, 0));

  const fallbackBoardFrame = useMemo(
    () => ({
      origin: new THREE.Vector3(0, 0, 0),
      xAxis: new THREE.Vector3(8, 0, 0),
      zAxis: new THREE.Vector3(0, 0, 6),
      topY: 0,
      corners: undefined as THREE.Vector3[] | undefined,
    }),
    [],
  );
  const activeBoardFrame = boardFrame ?? fallbackBoardFrame;

  const DEFAULT_LAYOUT = useMemo(
    () => [
      { u: 0.22, v: -0.22, wFrac: 0.16, dFrac: 0.19, markDx: 0, markDz: 0, markWMul: 1, markDMul: 1, markOn: true },
      { u: 0.22, v: 0.0,  wFrac: 0.16, dFrac: 0.19, markDx: 0, markDz: 0, markWMul: 1, markDMul: 1, markOn: true },
      { u: 0.22, v: 0.22, wFrac: 0.16, dFrac: 0.19, markDx: 0, markDz: 0, markWMul: 1, markDMul: 1, markOn: true },
    ],
    [],
  );
  // Back-fill marking fields on layouts loaded from storage that predate them
  const normalizeLayoutEntry = (p: any) => ({
    markDx: 0, markDz: 0, markWMul: 1, markDMul: 1, markOn: true,
    ...p,
  });
  const LAYOUT_STORAGE_KEY = "padLayout:v1";
  const LAYOUT_SETTINGS_KEY = "pad_layout_v1";
  const [SPOT_LAYOUT, setSpotLayout] = useState(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 3) return parsed.map(normalizeLayoutEntry);
      }
    } catch {}
    return DEFAULT_LAYOUT;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(SPOT_LAYOUT));
    } catch {}
  }, [SPOT_LAYOUT]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings" as any)
          .select("value")
          .eq("key", LAYOUT_SETTINGS_KEY)
          .maybeSingle();
        const value = (data as any)?.value;
        if (!cancelled && Array.isArray(value) && value.length === 3) {
          setSpotLayout(value.map(normalizeLayoutEntry));
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const updateLayout = (i: number, key: string, value: number | boolean) => {
    setSpotLayout((prev: any) => prev.map((p: any, idx: number) => (idx === i ? { ...p, [key]: value } : p)));
  };
  const resetLayout = () => setSpotLayout(DEFAULT_LAYOUT);

  // Named snapshot system — save/restore arbitrary layout states
  const SNAPSHOTS_KEY = "padLayout:snapshots:v1";
  type Snapshot = { id: string; name: string; createdAt: number; layout: any[] };
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  useEffect(() => {
    try { localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots)); } catch {}
  }, [snapshots]);
  const saveSnapshot = () => {
    const defaultName = `Snapshot ${new Date().toLocaleString()}`;
    const name = (typeof window !== "undefined" ? window.prompt("Snapshot name", defaultName) : defaultName) || defaultName;
    const snap: Snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || defaultName,
      createdAt: Date.now(),
      layout: JSON.parse(JSON.stringify(SPOT_LAYOUT)),
    };
    setSnapshots((s) => [snap, ...s].slice(0, 20));
    toast.success(`Saved "${snap.name}"`);
  };
  const restoreSnapshot = (id: string) => {
    const snap = snapshots.find((s) => s.id === id);
    if (!snap) return;
    setSpotLayout(snap.layout.map(normalizeLayoutEntry));
    toast.success(`Restored "${snap.name}"`);
  };
  const deleteSnapshot = (id: string) => {
    setSnapshots((s) => s.filter((x) => x.id !== id));
  };

  const spots = useMemo(() => {
    const { origin, xAxis, zAxis, topY } = activeBoardFrame;
    const boardW = xAxis.length();
    const boardD = zAxis.length();
    return allSpots.slice(0, 3).map((s, i) => {
      const L = SPOT_LAYOUT[i];
      const pos = origin.clone().addScaledVector(xAxis, L.u).addScaledVector(zAxis, L.v);
      return {
        ...s,
        position_x: pos.x,
        position_z: pos.z,
        size_x: L.wFrac * boardW,
        size_z: L.dFrac * boardD,
        position_y: topY,
        size_y: 0.02,
        rotation_y: Math.atan2(xAxis.x, xAxis.z),
      };
    });
  }, [allSpots, activeBoardFrame, SPOT_LAYOUT]);

  const spotsRef = useRef<ParkingSpot[]>(spots);

  useEffect(() => {
    spotsRef.current = spots;
  }, [spots]);

  useEffect(() => {
    if (!selectedSpot || (selectedSpot.status || "").toUpperCase() !== "BILLED") {
      setActiveSession(null);
      return;
    }

    const fetchSession = async () => {
      try {
        const { data } = await externalSupabase
          .from("sessions")
          .select("*")
          .eq("spot_name", selectedSpot.name)
          .is("end_time", null)
          .single();

        if (data) setActiveSession(data);
      } catch (err) {
        console.error("Session fetch failed", err);
      }
    };

    fetchSession();
  }, [selectedSpot]);

  // 1Hz ticker for the sticky session timer pill.
  useEffect(() => {
    if (!activeSessionPill) return;
    const i = setInterval(() => setSessionTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [activeSessionPill]);

  // Watch the backend status of the spot the car parked in. When it flips
  // to BILLED (blue) we treat that as "car has left" → fire the TWINT
  // billing splash + receipt exactly ONCE for this session.
  useEffect(() => {
    if (!activeSessionPill) return;
    const spot = allSpots.find((s) => s.id === activeSessionPill.spotId);
    if (!spot) return;
    const status = (spot.status || "").toUpperCase();
    const isBilledOrEmpty =
      status === "BILLED" ||
      status === "BILLED / RECEIPT SENT" ||
      status === "EMPTY" ||
      status === "AVAILABLE";
    if (!isBilledOrEmpty) return;
    const sid = sessionIdRef.current || `twin-${activeSessionPill.spotId}-${activeSessionPill.startedAt}`;
    if (billingFiredRef.current.has(sid)) return;
    billingFiredRef.current.add(sid);

    // Show a short "Session ended" toast, then smoothly hand off to the
    // TWINT splash + receipt flow.
    const pillSnapshot = activeSessionPill;
    const driver = resolveDriver(pillSnapshot.plate);
    const farewell = driver.isOwner ? `Goodbye, ${driver.name}` : "Guest session ended";
    toast(farewell, {
      id: `twin-ended-${pillSnapshot.spotId}`,
      description: `Spot ${pillSnapshot.spotName} · ${pillSnapshot.plate}`,
      icon: <BadgeCheck className="text-emerald-500" size={18} />,
      duration: 1200,
    });
    // Dismiss the sticky timer pill first so the user sees a clean transition.
    setActiveSessionPill(null);
    sessionIdRef.current = null;

    const elapsedHours = Math.max(1 / 60, (Date.now() - pillSnapshot.startedAt) / 3_600_000);
    const total = Math.round(Math.max(elapsedHours * 2.5, 1.25) * 100) / 100;
    window.setTimeout(() => {
      emitTwintConfirmation({
        sessionId: sid,
        parkingName: parking.name,
        plate: pillSnapshot.plate,
        totalPrice: total,
        endTime: new Date().toISOString(),
        ownerName: driver.isOwner ? driver.name : null,
        isGuest: !driver.isOwner,
      });
    }, 900);
  }, [allSpots, activeSessionPill, parking.name, resolveDriver]);



  // Repaint the car's license-plate texture. Always shows a designed plate
  // (Swiss "VD 123 456" by default) so the car looks real even before the
  // backend recognises a plate. Once parked, mirrors the actual backend plate.
  const DEFAULT_PLATE_DESIGN = "VD·123·456";
  useEffect(() => {
    const tex = plateTextureRef.current as any;
    if (!tex) return;
    const canvas = tex.__canvas as HTMLCanvasElement | undefined;
    const draw = canvas && (canvas as any).__draw;
    if (!draw) return;
    const parkedSpot = allSpots.find((s) => s.id === parkedSpotIdRef.current);
    const backendPlate = parkedSpot ? getPlate(parkedSpot) : null;
    const raw = backendPlate || activeSessionPill?.plate || DEFAULT_PLATE_DESIGN;
    // Pretty-print: "VD123456" → "VD 123 456"
    const pretty = raw.replace(/\s+/g, "").replace(/^([A-Z]{2})(\d+)$/i, "$1 $2").toUpperCase();
    draw(pretty);
    tex.needsUpdate = true;
  }, [liveCar?.id, activeBoardFrame, allSpots, activeSessionPill?.plate, parkedSpotName]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const BG_COLOR = 0x010912;
    scene.background = new THREE.Color(BG_COLOR);
    scene.fog = new THREE.FogExp2(0x001a14, 0.09);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    camera.position.set(2, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(10, 20, 10);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0x00ccff, 0.35);
    rim.position.set(-8, 6, -8);
    scene.add(rim);

    const gridSize = 60;
    const gridDivisions = 60;
    const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x00ff9c, 0x006644);
    const gMat = grid.material as THREE.Material | THREE.Material[];
    const applyGridMat = (m: THREE.Material) => {
      m.transparent = true;
      (m as any).opacity = 0.35;
      (m as any).depthWrite = false;
      (m as any).fog = true;
    };
    if (Array.isArray(gMat)) gMat.forEach(applyGridMat);
    else applyGridMat(gMat);
    grid.position.y = 0;
    scene.add(grid);
    (sceneRef.current as any)._matrixGrid = grid;

    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d")!;
    const grd = sctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grd.addColorStop(0, "rgba(0,0,0,0.55)");
    grd.addColorStop(0.6, "rgba(0,0,0,0.18)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grd;
    sctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.visible = false;
    scene.add(shadowMesh);
    (sceneRef.current as any)._contactShadow = shadowMesh;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.1;
    controls.maxDistance = 100;
    controls.target.set(0, 0, 0);
    controls.update();
    controlsRef.current = controls;

    droneViewRef.current = {
      pos: camera.position.clone(),
      target: controls.target.clone(),
    };

    const onResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth,
        h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      controls.update();
      const grid = (sceneRef.current as any)?._matrixGrid as THREE.GridHelper | undefined;
      if (grid) {
        const t = performance.now() * 0.001;
        const pulse = 0.22 + Math.sin(t * 2.2) * 0.12;
        const gm = grid.material as THREE.Material | THREE.Material[];
        if (Array.isArray(gm)) gm.forEach((m) => ((m as any).opacity = pulse));
        else (gm as any).opacity = pulse;
      }

      const car = carGroupRef.current;
      if (car) {
        const target = carTargetPosRef.current;
        if (target) {
          const distanceToTarget = carCurrentPosRef.current.distanceTo(target);
          const DEADZONE = 0.018; // world units — below this we don't chase

          // Only update heading when there's meaningful motion (kills jitter spin).
          if (distanceToTarget > 0.05) {
            const dir = target.clone().sub(carCurrentPosRef.current);
            dir.y = 0;
            if (dir.lengthSq() > 1e-6) {
              dir.normalize();
              // Smooth the heading vector itself so the car turns gradually,
              // like a real vehicle steering through a curve.
              carHeadingRef.current.lerp(dir, 0.14).normalize();

              const h = carHeadingRef.current;
              const angle = Math.atan2(-h.z, h.x);
              const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                angle,
              );
              // Slower slerp + easing for a more realistic steering feel
              car.quaternion.slerp(targetQuaternion, 0.14);
            }
          }

          // If we're currently snapping the car into a parked spot center,
          // override the YOLO target with a smooth ease toward the spot center.
          // Longer duration + cubic ease-out for a navigation-app style glide.
          const snap = snapToSpotRef.current;
          const SNAP_MS = 1800;
          if (snap && performance.now() < snap.until) {
            const sx = snap.x - carCurrentPosRef.current.x;
            const sz = snap.z - carCurrentPosRef.current.z;
            const remaining = (snap.until - performance.now()) / SNAP_MS;
            const t = 1 - Math.max(0, Math.min(1, remaining));
            // ease-out quintic — strong initial pull, very gentle settle.
            const eased = 1 - Math.pow(1 - t, 5);
            const alpha = 0.06 + eased * 0.28;
            carCurrentPosRef.current.x += sx * alpha;
            carCurrentPosRef.current.z += sz * alpha;
          } else if (parkedSpotIdRef.current) {
            // Locked-in: hold the car perfectly centered on the spot so YOLO
            // jitter can't drift it back out of frame.
            const lockSpot = spotsRef.current.find((s) => s.id === parkedSpotIdRef.current);
            if (lockSpot) {
              carCurrentPosRef.current.x += (lockSpot.position_x - carCurrentPosRef.current.x) * 0.35;
              carCurrentPosRef.current.z += (lockSpot.position_z - carCurrentPosRef.current.z) * 0.35;
            }
          } else if (distanceToTarget > DEADZONE) {
            // Adaptive easing — gentler when close to target for a smooth arrival.
            const ease = distanceToTarget > 0.4 ? 0.07 : 0.045;
            carCurrentPosRef.current.lerp(target, ease);
            lastMoveAtRef.current = performance.now();
          }
          car.position.copy(carCurrentPosRef.current);

          // ── Proximity reveal: only show spot overlays the car is near. ──
          // Radius is scaled per-spot so the threshold matches the scene scale
          // regardless of how large the board frame is in world units.
          if (showSpotsRef.current) {
            const carX = carCurrentPosRef.current.x;
            const carZ = carCurrentPosRef.current.z;
            spotMeshesRef.current.forEach((m) => {
              const dx = m.position.x - carX;
              const dz = m.position.z - carZ;
              const dist = Math.hypot(dx, dz);
              // Use the spot's own footprint as the scale reference.
              const spotSize = Math.max(m.scale.x, m.scale.z);
              const NEAR = spotSize * 0.9;   // fully visible while overlapping
              const FAR  = spotSize * 1.6;   // fully hidden just past the edge
              const t =
                dist <= NEAR ? 1 :
                dist >= FAR ? 0 :
                1 - (dist - NEAR) / (FAR - NEAR);
              const isPulsing = pulsingSpotRef.current?.id === (m.userData as any).spotId;
              if (!isPulsing) {
                const mat = m.material as THREE.MeshStandardMaterial;
                const targetOp = t * 0.4;
                mat.opacity += (targetOp - mat.opacity) * 0.25;
                const edges = m.children[0] as THREE.LineSegments | undefined;
                if (edges) {
                  const em = edges.material as THREE.LineBasicMaterial;
                  const targetEdge = t * 0.9;
                  em.opacity += (targetEdge - em.opacity) * 0.25;
                }
              }
              m.visible = (m.material as THREE.MeshStandardMaterial).opacity > 0.01;
            });
          } else {
            // Hide button is off — keep them fully hidden.
            spotMeshesRef.current.forEach((m) => { m.visible = false; });
          }



          // Suspension-style settle pulse on the car right after lock-on.
          const settleElapsed = performance.now() - parkAnimStartRef.current;
          const SETTLE_MS = 1200;
          if (parkAnimStartRef.current && settleElapsed < SETTLE_MS) {
            const t = settleElapsed / SETTLE_MS;
            const pulse = 1 + Math.sin(t * Math.PI) * 0.045 - Math.sin(t * Math.PI * 2) * 0.012;
            car.scale.set(pulse, pulse, pulse);
          } else {
            car.scale.set(1, 1, 1);
          }


          // ── Parking lock-on detection with hysteresis + 2s stationary delay ──
          // Find which spot (if any) the car is currently inside. Only commit
          // the lock once the car has been continuously stationary inside the
          // same spot for 2 seconds — otherwise we just track it as a candidate.
          const cp = carCurrentPosRef.current;
          let insideId: string | null = null;
          for (const s of spotsRef.current) {
            const dx = cp.x - s.position_x;
            const dz = cp.z - s.position_z;
            const c = Math.cos(-s.rotation_y);
            const sn = Math.sin(-s.rotation_y);
            const lx = dx * c - dz * sn;
            const lz = dx * sn + dz * c;
            const ax = Math.abs(lx);
            const az = Math.abs(lz);
            const bound = parkedSpotIdRef.current === s.id ? 0.55 : 0.45;
            if (ax <= s.size_x * bound && az <= s.size_z * bound) {
              insideId = s.id;
              break;
            }
          }

          const now = performance.now();
          const STATIONARY_MS = 2000;
          const stationary = now - lastMoveAtRef.current > 120; // stopped moving in this frame range

          // Candidate tracking — must remain in same spot AND stationary for 2s.
          if (insideId && parkedSpotIdRef.current !== insideId) {
            const cand = candidateSpotRef.current;
            if (!cand || cand.id !== insideId) {
              candidateSpotRef.current = { id: insideId, stationarySince: stationary ? now : 0 };
            } else if (!stationary) {
              cand.stationarySince = 0;
            } else if (cand.stationarySince === 0) {
              cand.stationarySince = now;
            }
          } else if (!insideId) {
            candidateSpotRef.current = null;
          }

          // Commit: candidate has been stationary for >= 2s.
          const commitId =
            candidateSpotRef.current &&
            candidateSpotRef.current.stationarySince > 0 &&
            now - candidateSpotRef.current.stationarySince >= STATIONARY_MS
              ? candidateSpotRef.current.id
              : null;

          // Release: car left the parked spot entirely.
          if (parkedSpotIdRef.current && insideId !== parkedSpotIdRef.current) {
            parkedSpotIdRef.current = null;
            setParkedSpotName(null);
            lastParkedFiredRef.current = null;
          }

          if (commitId && parkedSpotIdRef.current !== commitId) {
            parkedSpotIdRef.current = commitId;
            candidateSpotRef.current = null;
            parkAnimStartRef.current = performance.now();
            pulsingSpotRef.current = { id: commitId, start: performance.now() };
            const sp = spotsRef.current.find((x) => x.id === commitId);
            setParkedSpotName(sp?.name ?? null);

            // Snap-to-center: glide the car to the exact spot center over 700ms
            // for a clean, navigation-app-style settle.
            if (sp) {
              snapToSpotRef.current = {
                x: sp.position_x,
                z: sp.position_z,
                until: performance.now() + 1800,
              };
            }

            // Show parked / congratulation card briefly, then auto-hide after 2s
            if (hudParkedRef.current) {
              hudParkedRef.current.style.opacity = "1";
              hudParkedRef.current.style.transform = "translateY(0) scale(1)";
            }
            if (parkedHideTimerRef.current) window.clearTimeout(parkedHideTimerRef.current);
            parkedHideTimerRef.current = window.setTimeout(() => {
              if (hudParkedRef.current) {
                hudParkedRef.current.style.opacity = "0";
                hudParkedRef.current.style.transform = "translateY(-4px) scale(0.94)";
              }
            }, 2000);

            // Fire ONE session-start toast + open a sticky timer pill.
            // Billing is deferred to when the backend flips the spot to BILLED.
            if (sp && lastParkedFiredRef.current !== commitId) {
              lastParkedFiredRef.current = commitId;
              const backendPlate = sp ? getPlate(sp) : null;
              const plate = (backendPlate || liveCar?.id || "VD123456").toUpperCase().replace(/\s+/g, "");
              const driver = resolveDriver(plate);
              const greeting = driver.isOwner ? `Welcome, ${driver.name}` : "Guest session started";
              toast(greeting, {
                id: `twin-session-${commitId}`,
                description: `Plate ${plate} · Spot ${sp.name}`,
                icon: <BadgeCheck className={driver.isOwner ? "text-emerald-500" : "text-amber-500"} size={18} />,
                duration: 1600,
              });

              sessionIdRef.current =
                (typeof crypto !== "undefined" && (crypto as any).randomUUID?.()) ||
                `twin-${commitId}-${Date.now()}`;
              setActiveSessionPill({
                spotId: commitId,
                spotName: sp.name,
                plate,
                ownerName: driver.isOwner ? driver.name : null,
                isGuest: !driver.isOwner,
                startedAt: Date.now(),
              });
            }
          }
        }



        // Animate the scan ring outward + fade for 2.4s after parking.
        const ring = scanRingRef.current;
        if (ring) {
          const elapsed = performance.now() - parkAnimStartRef.current;
          const DUR = 2400;
          if (parkAnimStartRef.current && elapsed < DUR) {
            const t = elapsed / DUR;
            const eased = 1 - Math.pow(1 - t, 3);
            ring.visible = true;
            const scale = 1 + eased * 4.2;
            ring.scale.set(scale, scale, 1);
            (ring.material as THREE.MeshBasicMaterial).opacity = (1 - eased) * 0.95;
          } else if (ring.visible) {
            ring.visible = false;
          }
        }

        // Pulse the spot pad emissive when the car locks into it.
        const ps = pulsingSpotRef.current;
        if (ps) {
          const e = performance.now() - ps.start;
          const DUR = 1800;
          const mesh = spotMeshesRef.current.get(ps.id);
          if (mesh && e < DUR) {
            const t = e / DUR;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.35 + Math.sin(t * Math.PI * 3) * 0.55 * (1 - t);
            mat.opacity = 0.4 + (1 - t) * 0.35;
          } else if (mesh) {
            (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35;
            (mesh.material as THREE.MeshStandardMaterial).opacity = 0.4;
            pulsingSpotRef.current = null;
          }
        }

        // HUD positioning — only the parked card is rendered (visibility is
        // toggled in the park-detection block above).
        const hud = hudRef.current;
        if (hud && cameraRef.current && rendererRef.current) {
          carWorldRef.current.copy(car.position);
          carWorldRef.current.y += 0.35;
          const v = carWorldRef.current.clone().project(cameraRef.current);
          const rect = rendererRef.current.domElement.getBoundingClientRect();
          const sx = (v.x * 0.5 + 0.5) * rect.width;
          const sy = (-v.y * 0.5 + 0.5) * rect.height;
          const visible = v.z < 1;
          hud.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy}px)`;
          hud.style.opacity = visible ? "1" : "0";
        }
      }

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();


    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(spotMeshesRef.current.values());
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length) {
        const id = (hits[0].object.userData as any).spotId;
        const found = spotsRef.current.find((s) => s.id === id);
        setSelectedSpot(found ?? null);
      } else {
        setSelectedSpot(null);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("click", onClick);

    setSplatLoading(true);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const overrideUrl = parking.splat_source_url?.trim() || "";
    const glbUrl = overrideUrl && /\.glb($|\?)/i.test(overrideUrl) ? overrideUrl : DEFAULT_GLB_URL;

    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        try {
          const root = gltf.scene;
          const allNames: string[] = [];
          root.traverse((o) => {
            if (o.name) allNames.push(o.name);
          });
          const markerCandidates = allNames.filter((n) => /mark|aruco/i.test(n));

          const resolveMarkers = (): string[] => {
            const exact = ARUCO_CORNER_NAMES.filter((n) => allNames.includes(n));
            if (exact.length >= 2) return exact;
            return markerCandidates.slice(0, 4);
          };
          const markerNames = resolveMarkers();
          const foundMarkers: { name: string; pos: THREE.Vector3 }[] = [];
          for (const name of markerNames) {
            const obj = root.getObjectByName(name);
            if (obj) {
              const p = new THREE.Vector3();
              obj.getWorldPosition(p);
              foundMarkers.push({ name, pos: p });
            }
          }

          if (foundMarkers.length >= 2) {
            const [m0, m1] = foundMarkers;
            const measured = m0.pos.distanceTo(m1.pos);
            if (measured > 1e-6) {
              const factor = ARUCO_REAL_DISTANCE_CM / measured;
              root.scale.multiplyScalar(factor);
            }
          }

          const preBox = new THREE.Box3().setFromObject(root);
          const preCenter = preBox.getCenter(new THREE.Vector3());
          root.position.sub(preCenter);

          scene.add(root);
          splatViewerRef.current = root;

          const cornerPoints: THREE.Vector3[] = [];
          for (const name of markerNames) {
            const obj = root.getObjectByName(name);
            if (obj) {
              const p = new THREE.Vector3();
              obj.getWorldPosition(p);
              cornerPoints.push(p);
            }
          }

          const box = new THREE.Box3().setFromObject(root);
          if (!box.isEmpty() && isFinite(box.min.x)) {
            let origin: THREE.Vector3;
            let xAxis: THREE.Vector3;
            let zAxis: THREE.Vector3;
            if (cornerPoints.length === 4) {
              origin = new THREE.Vector3();
              cornerPoints.forEach((p) => origin.add(p));
              origin.multiplyScalar(1 / 4);
              xAxis = cornerPoints[1].clone().sub(cornerPoints[0]);
              zAxis = cornerPoints[3].clone().sub(cornerPoints[0]);
              xAxis.y = 0;
              zAxis.y = 0;
            } else {
              origin = box.getCenter(new THREE.Vector3());
              const size = box.getSize(new THREE.Vector3());
              xAxis = new THREE.Vector3(size.x, 0, 0);
              zAxis = new THREE.Vector3(0, 0, size.z);
            }
            setBoardFrame({
              origin,
              xAxis,
              zAxis,
              topY: box.max.y,
              corners: cornerPoints.length === 4 ? cornerPoints : undefined,
            });
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const fov = (camera.fov * Math.PI) / 180;
            const dist = maxDim / 2 / Math.tan(fov / 2) / 0.7;
            const dirVec = new THREE.Vector3(2, 5, 5).normalize();
            const newPos = dirVec.multiplyScalar(dist);
            camera.position.copy(newPos);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.maxDistance = Math.max(100, maxDim * 4);
            controls.update();
            droneViewRef.current = { pos: newPos.clone(), target: new THREE.Vector3(0, 0, 0) };

            const shadow = (sceneRef.current as any)?._contactShadow as THREE.Mesh | undefined;
            if (shadow) {
              const radius = Math.max(size.x, size.z) * 1.4;
              shadow.scale.set(radius, radius, 1);
              shadow.position.set(0, box.min.y + 0.005, 0);
              shadow.visible = true;
            }
            const grid = (sceneRef.current as any)?._matrixGrid as THREE.GridHelper | undefined;
            if (grid) {
              grid.position.y = box.min.y - 0.01;
              const gridScale = Math.max(maxDim / 60, 1);
              grid.scale.set(gridScale, 1, gridScale);
            }
          }

          setSplatLoading(false);
        } catch (err: any) {
          setSplatError(err?.message ?? "Mesh setup failed");
          setSplatLoading(false);
        }
      },
      undefined,
      (err: any) => {
        setSplatError(err?.message ?? "Failed to load 3D mesh");
        setSplatLoading(false);
      },
    );

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      try {
        controlsRef.current?.dispose();
      } catch {}
      try {
        const root = splatViewerRef.current as THREE.Object3D | null;
        if (root) {
          scene.remove(root);
          root.traverse((o: any) => {
            o.geometry?.dispose?.();
            const mat = o.material;
            if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose?.());
            else mat?.dispose?.();
          });
        }
      } catch {}
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  const handleRecenter = useCallback(() => {
    const cam = cameraRef.current;
    const ctrls = controlsRef.current;
    const drone = droneViewRef.current;
    if (!cam || !ctrls || !drone) return;
    cam.position.copy(drone.pos);
    ctrls.target.copy(drone.target);
    ctrls.update();
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const visibleSpots = spots;
    const PAD_HEIGHT = 0.02;
    const PAD_Y_OFFSET = 0.01;

    const existingIds = new Set(spotMeshesRef.current.keys());
    const nextIds = new Set(visibleSpots.map((s) => s.id));

    existingIds.forEach((id) => {
      if (!nextIds.has(id)) {
        const m = spotMeshesRef.current.get(id);
        if (m) {
          scene.remove(m);
          (m.geometry as THREE.BufferGeometry).dispose();
          (m.material as THREE.Material).dispose();
        }
        spotMeshesRef.current.delete(id);
      }
    });

    visibleSpots.forEach((spot) => {
      const color = STATUS_COLOR[(spot.status || "").toUpperCase()] ?? STATUS_COLOR[spot.status] ?? 0x6b7280;
      let mesh = spotMeshesRef.current.get(spot.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(1, PAD_HEIGHT, 1);
        const mat = new THREE.MeshStandardMaterial({
          color,
          transparent: true,
          opacity: 0.4,
          emissive: color,
          emissiveIntensity: 0.35,
          depthWrite: false,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.userData.spotId = spot.id;
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }),
        );
        mesh.add(edges);
        scene.add(mesh);
        spotMeshesRef.current.set(spot.id, mesh);
      } else {
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
        (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(color);
        const edges = mesh.children[0] as THREE.LineSegments | undefined;
        if (edges) (edges.material as THREE.LineBasicMaterial).color.setHex(color);
      }
      mesh.position.set(spot.position_x, spot.position_y + PAD_Y_OFFSET, spot.position_z);
      mesh.rotation.y = spot.rotation_y;
      mesh.scale.set(Math.max(0.001, spot.size_x), 1, Math.max(0.001, spot.size_z));
      // Spots start hidden — the per-frame proximity reveal in the animate
      // loop will fade them in only when the car drives near them.
      mesh.visible = false;
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0;
      const edges0 = mesh.children[0] as THREE.LineSegments | undefined;
      if (edges0) (edges0.material as THREE.LineBasicMaterial).opacity = 0;
    });
    // Hide button hides ONLY the spots + street 3D projection.
    // The digital twin (GLB scan) and car always remain visible.
    if (streetEnvRef.current) streetEnvRef.current.visible = showSpots;
    const matrixGrid = (sceneRef.current as any)?._matrixGrid as THREE.Object3D | undefined;
    if (matrixGrid) matrixGrid.visible = showSpots;
  }, [spots, showSpots]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (carGroupRef.current) return;

    const NEON = 0x39ff7a;
    const group = new THREE.Group();
    const boardW = activeBoardFrame.xAxis.length();

    // Modern Tesla / Porsche-nav style top-down silhouette.
    // Built from an extruded rounded/tapered 2D shape for the body
    // plus a smaller extruded glass canopy — looks much closer to the
    // sleek vehicle avatars used in Tesla & Porsche navigation UIs.
    const carLen = boardW * 0.092955 * 1.10;
    const carWid = boardW * 0.046475 * 1.10;
    const carHei = carWid * 0.34; // even lower, sportier stance

    const PORSCHE_RED = 0xd5001c;
    const GLASS = 0x0a0a0a;

    // ── Body silhouette (top-down): rounded rectangle with a tapered nose ──
    const buildCarShape = (length: number, width: number, noseTaper = 0.78, tailTaper = 0.92) => {
      const hl = length / 2;
      const hw = width / 2;
      const noseHW = hw * noseTaper;
      const tailHW = hw * tailTaper;
      const corner = Math.min(length, width) * 0.18;
      const s = new THREE.Shape();
      // Start at tail-left, sweep clockwise (top view, +X = forward/nose).
      s.moveTo(-hl + corner, -tailHW);
      s.lineTo(hl - corner * 1.4, -noseHW);
      s.quadraticCurveTo(hl, -noseHW * 0.6, hl, 0);
      s.quadraticCurveTo(hl, noseHW * 0.6, hl - corner * 1.4, noseHW);
      s.lineTo(-hl + corner, tailHW);
      s.quadraticCurveTo(-hl, tailHW, -hl, tailHW - corner);
      s.lineTo(-hl, -tailHW + corner);
      s.quadraticCurveTo(-hl, -tailHW, -hl + corner, -tailHW);
      return s;
    };

    // Standard car silhouette: gentle nose taper, slightly narrower tail
    const bodyShape = buildCarShape(carLen, carWid, 0.9, 0.94);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: carHei,
      bevelEnabled: true,
      bevelThickness: carHei * 0.4,
      bevelSize: carWid * 0.07,
      bevelSegments: 5,
      curveSegments: 20,
    });
    bodyGeo.rotateX(-Math.PI / 2); // extrusion was along +Z, lay flat on XZ
    const body = new THREE.Mesh(
      bodyGeo,
      new THREE.MeshStandardMaterial({
        color: PORSCHE_RED,
        emissive: PORSCHE_RED,
        emissiveIntensity: 0.14,
        metalness: 0.78,
        roughness: 0.25,
      }),
    );
    body.position.y = 0;
    group.add(body);

    // ── Glass canopy / greenhouse, sits rearward like a sports coupe ──
    const cabinShape = buildCarShape(carLen * 0.52, carWid * 0.76, 0.7, 0.86);
    const cabinHei = carHei * 0.58;
    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: cabinHei,
      bevelEnabled: true,
      bevelThickness: cabinHei * 0.55,
      bevelSize: carWid * 0.045,
      bevelSegments: 5,
      curveSegments: 16,
    });
    cabinGeo.rotateX(-Math.PI / 2);
    const cabin = new THREE.Mesh(
      cabinGeo,
      new THREE.MeshStandardMaterial({
        color: GLASS,
        metalness: 0.9,
        roughness: 0.08,
        transparent: true,
        opacity: 0.82,
      }),
    );
    cabin.position.set(-carLen * 0.1, carHei + cabinHei * 0.05, 0);
    group.add(cabin);

    // Thin chrome belt-line just below the glass for a premium silhouette
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(carLen * 0.78, carHei * 0.04, carWid * 1.005),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.95, roughness: 0.2 }),
    );
    belt.position.set(-carLen * 0.02, carHei * 0.92, 0);
    group.add(belt);

    // ── Headlights: split LED clusters (left + right), inset on the nose ──
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff4d8,
      emissiveIntensity: 1.4,
      polygonOffset: true,
      polygonOffsetFactor: -6,
    });
    const headlightGeo = new THREE.BoxGeometry(carLen * 0.022, carHei * 0.11, carWid * 0.16);
    for (const side of [-1, 1]) {
      const h = new THREE.Mesh(headlightGeo, headlightMat);
      h.position.set(carLen * 0.508, carHei * 0.66, side * carWid * 0.32);
      h.renderOrder = 25;
      group.add(h);
    }

    // ── Rear lights: outer red clusters + central LED light-bar ──
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff1f1f,
      emissive: 0xff0a0a,
      emissiveIntensity: 1.3,
      polygonOffset: true,
      polygonOffsetFactor: -6,
    });
    const tailGeo = new THREE.BoxGeometry(carLen * 0.032, carHei * 0.22, carWid * 0.3);
    for (const side of [-1, 1]) {
      const t = new THREE.Mesh(tailGeo, tailMat);
      t.position.set(-carLen * 0.515, carHei * 0.62, side * carWid * 0.32);
      t.renderOrder = 25;
      group.add(t);
    }
    // Full-width LED brake bar (Porsche/Audi style)
    const lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(carLen * 0.024, carHei * 0.07, carWid * 0.82),
      new THREE.MeshStandardMaterial({
        color: 0xff3030,
        emissive: 0xff0a0a,
        emissiveIntensity: 1.8,
        polygonOffset: true,
        polygonOffsetFactor: -6,
      }),
    );
    lightBar.position.set(-carLen * 0.518, carHei * 0.66, 0);
    lightBar.renderOrder = 25;
    group.add(lightBar);

    // Dark rear diffuser strip below the lights
    const diffuser = new THREE.Mesh(
      new THREE.BoxGeometry(carLen * 0.04, carHei * 0.18, carWid * 0.86),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.6, roughness: 0.5 }),
    );
    diffuser.position.set(-carLen * 0.49, carHei * 0.22, 0);
    group.add(diffuser);

    // ── Side mirrors ──
    const mirrorGeo = new THREE.BoxGeometry(carLen * 0.04, carHei * 0.18, carWid * 0.08);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: PORSCHE_RED,
      metalness: 0.78,
      roughness: 0.25,
    });
    for (const side of [-1, 1]) {
      const m = new THREE.Mesh(mirrorGeo, mirrorMat);
      m.position.set(carLen * 0.08, carHei * 0.95, side * (carWid * 0.5 + carWid * 0.04));
      group.add(m);
    }



    // ── License plate decals (front + rear) ──
    // A shared canvas texture renders the recognised plate string; both the
    // front and rear plate planes reuse the same texture so a plate change
    // updates both with a single texture.needsUpdate flip.
    const plateCanvas = document.createElement("canvas");
    plateCanvas.width = 512;
    plateCanvas.height = 128;
    const drawPlate = (_text?: string) => {
      const ctx = plateCanvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, 512, 128);
      // Rounded white plate background — design-only, no text
      const r = 22;
      ctx.fillStyle = "#f5f5f0";
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(512 - r, 0);
      ctx.quadraticCurveTo(512, 0, 512, r);
      ctx.lineTo(512, 128 - r);
      ctx.quadraticCurveTo(512, 128, 512 - r, 128);
      ctx.lineTo(r, 128);
      ctx.quadraticCurveTo(0, 128, 0, 128 - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();
      // Subtle dark border
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 4;
      ctx.stroke();
      // Small left blue strip (Swiss/EU style) for design flavor
      ctx.fillStyle = "#0a3a8a";
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(56, 0);
      ctx.lineTo(56, 128);
      ctx.lineTo(r, 128);
      ctx.quadraticCurveTo(0, 128, 0, 128 - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();
    };
    drawPlate();
    const plateTex = new THREE.CanvasTexture(plateCanvas);
    plateTex.anisotropy = 4;
    plateTextureRef.current = plateTex;

    // Compact plate sized to suit the car body
    const plateW = carWid * 0.42;
    const plateH = plateW * 0.26;
    const plateGeo = new THREE.PlaneGeometry(plateW, plateH);
    // Mount low on the bumper so headlights stay visible
    const plateY = carHei * 0.18;

    const buildPlate = (x: number, facing: 1 | -1) => {
      const mount = new THREE.Mesh(
        new THREE.PlaneGeometry(plateW * 1.08, plateH * 1.16),
        new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }),
      );
      mount.position.set(x - facing * 0.002, plateY, 0);
      mount.rotation.y = facing === 1 ? Math.PI / 2 : -Math.PI / 2;
      mount.renderOrder = 30;
      group.add(mount);

      const mat = new THREE.MeshBasicMaterial({
        map: plateTex,
        transparent: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -8,
      });
      const mesh = new THREE.Mesh(plateGeo.clone(), mat);
      mesh.position.set(x, plateY, 0);
      mesh.rotation.y = facing === 1 ? Math.PI / 2 : -Math.PI / 2;
      mesh.renderOrder = 40;
      group.add(mesh);
      return mat;
    };

    const frontPlateMat = buildPlate(carLen * 0.535, 1);
    const rearPlateMat = buildPlate(-carLen * 0.535, -1);

    plateMaterialsRef.current = [frontPlateMat, rearPlateMat];

    // Expose the draw function on the canvas so the live-plate effect below
    // can repaint without re-running this expensive car-build effect.
    (plateCanvas as any).__draw = drawPlate;
    (plateTex as any).__canvas = plateCanvas;


    // ── Tighter halo (smaller ring closer to the body) ──
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(carLen * 0.34, carLen * 0.42, 48),
      new THREE.MeshBasicMaterial({
        color: PORSCHE_RED,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    // Bevelled extrusion extends ~carHei*0.4 below local 0; sit just under it.
    halo.position.y = -carHei * 0.4 + 0.003;
    group.add(halo);

    // ── Lock-on scan ring (hidden by default, pulses outward when parking) ──
    const scanRing = new THREE.Mesh(
      new THREE.RingGeometry(carLen * 0.45, carLen * 0.55, 64),
      new THREE.MeshBasicMaterial({
        color: 0x39ff7a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    scanRing.rotation.x = -Math.PI / 2;
    scanRing.position.y = -carHei * 0.4 + 0.005;
    scanRing.visible = false;
    group.add(scanRing);
    scanRingRef.current = scanRing;

    // Default starting position: bottom of the road, just past the zebra
    // crossing. Held until real telemetry arrives and overrides the target.
    const initial =
      pixelToWorld(CAR_START_PX_X, CAR_START_PX_Y) ?? activeBoardFrame.origin.clone();
    initial.y = activeBoardFrame.topY + 0.02;
    group.position.copy(initial);
    carCurrentPosRef.current.copy(initial);
    carTargetPosRef.current = initial.clone();
    // Rotate +90° so the car points along the road (toward the zebra crossing)
    // instead of sitting sideways across it.
    group.rotation.y = Math.atan2(activeBoardFrame.xAxis.x, activeBoardFrame.xAxis.z) + Math.PI / 2;

    scene.add(group);
    carGroupRef.current = group;

    return () => {
      scene.remove(group);
      group.traverse((o: any) => {
        o.geometry?.dispose?.();
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose?.());
        else mat?.dispose?.();
      });
      carGroupRef.current = null;
    };
  }, [activeBoardFrame]);

  // ── Street environment: road + sidewalks + trees + traffic lights + crossing ──
  // Built once per board frame, sits on the same ground plane (y≈0) as the
  // parking spots so the spots feel embedded in a real street block.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !activeBoardFrame) return;

    const { origin, xAxis, zAxis, topY } = activeBoardFrame;
    const boardW = xAxis.length();
    const boardD = zAxis.length();

    // Car-relative scale only used for street furniture sizes (trees, lights, dashes).
    const carLen = boardW * 0.092955 * 1.10;
    const carWid = boardW * 0.046475 * 1.10;

    const env = new THREE.Group();
    streetEnvRef.current = env;
    const groundY = topY - 0.002;

    // Street footprint = calibrated board × dev-tunable multipliers so we can
    // perfectly overlay the scan beneath at runtime.
    const blockW = boardW * streetCal.widthMul;
    const blockD = boardD * streetCal.lengthMul;
    const sideW  = blockW * streetCal.sideRatio;
    const bikeW  = streetCal.bikeOn ? blockW * streetCal.bikeWidth : 0;
    const roadW  = blockW - sideW * 2 - bikeW;

    // Swiss palette: clean neutral concrete grays, precise white markings, SBB red accents.
    const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x3b3f47, roughness: 0.92, metalness: 0.0 });
    const matSidewalk = new THREE.MeshStandardMaterial({ color: 0xb8b8b3, roughness: 0.95 });
    const matLineW = new THREE.MeshBasicMaterial({ color: 0xfafafa, transparent: true, opacity: 0.95, depthWrite: false });
    const matLineY = new THREE.MeshBasicMaterial({ color: 0xf5c518, transparent: true, opacity: 0.95, depthWrite: false });
    const matCurb = new THREE.MeshStandardMaterial({ color: 0x8a8a85, roughness: 0.85 });

    const addPlane = (w: number, d: number, mat: THREE.Material, x: number, z: number, y = 0, renderOrder = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.renderOrder = renderOrder;
      env.add(m);
      return m;
    };

    // Lane geometry: bike lane sits on -X side (opposite the parked column on +X).
    // Centers: leftSidewalk | bikeLane | road | rightSidewalk
    const roadCenterX = bikeW / 2;
    const leftSideX = -blockW / 2 + sideW / 2;
    const rightSideX = blockW / 2 - sideW / 2;
    const bikeCenterX = -blockW / 2 + sideW + bikeW / 2;

    // Asphalt road
    addPlane(roadW, blockD, matAsphalt, roadCenterX, 0, 0, 0);
    // Sidewalks
    addPlane(sideW, blockD, matSidewalk, leftSideX, 0, 0.012, 0);
    addPlane(sideW, blockD, matSidewalk, rightSideX, 0, 0.012, 0);

    // Bike lane (mint-green tint) + dashed white divider
    if (streetCal.bikeOn && bikeW > 0) {
      const matBike = new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 0.9 });
      addPlane(bikeW, blockD, matBike, bikeCenterX, 0, 0.004, 0);
      // bike symbols every ~3 cars
      const symGeo = new THREE.PlaneGeometry(bikeW * 0.5, bikeW * 0.5);
      const symMat = new THREE.MeshBasicMaterial({ color: 0xb8ffd0, transparent: true, opacity: 0.75, depthWrite: false });
      const symCount = Math.max(2, Math.floor(blockD / (carLen * 3)));
      for (let i = 0; i < symCount; i++) {
        const z = -blockD / 2 + blockD * ((i + 0.5) / symCount);
        const sym = new THREE.Mesh(symGeo, symMat);
        sym.rotation.x = -Math.PI / 2;
        sym.position.set(bikeCenterX, 0.008, z);
        env.add(sym);
      }
    }

    // Curbs (frame the asphalt only)
    const curbT = carWid * 0.08, curbH = carWid * 0.05;
    const roadLeftEdge = roadCenterX - roadW / 2;
    const roadRightEdge = roadCenterX + roadW / 2;
    for (const edge of [roadLeftEdge, roadRightEdge]) {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(curbT, curbH, blockD),
        matCurb,
      );
      curb.position.set(edge + (edge < 0 ? -curbT / 2 : curbT / 2), curbH / 2, 0);
      env.add(curb);
    }

    // (Swiss style: no central lane dashes — keep the road clean.)


    // Pedestrian crossing (zebra) — fully dev-tunable
    const zebraStripes = Math.max(2, Math.round(streetCal.zebraStripes));
    const zebraSpanD = roadW * Math.max(0.2, Math.min(1, streetCal.zebraSpan));
    const zebraW = carWid * streetCal.zebraStripeW;
    const zebraGap = carWid * streetCal.zebraStripeGap;
    const zebraTotal = zebraStripes * zebraW + (zebraStripes - 1) * zebraGap;
    const zebraZ = blockD / 2 - boardD * streetCal.zebraOffset;
    const zebraCenterX = roadCenterX + streetCal.zebraX * roadW;
    // Stop line on the approach side (drivers coming from -Z)
    if (streetCal.zebraStopLine) {
      addPlane(roadW * 0.95, carWid * streetCal.zebraStopLineW, matLineW, roadCenterX, zebraZ - carLen * streetCal.zebraStopLineGap, 0.007, 1);
    }
    for (let i = 0; i < zebraStripes; i++) {
      const x = zebraCenterX - zebraTotal / 2 + zebraW / 2 + i * (zebraW + zebraGap);
      addPlane(zebraW, zebraSpanD, matLineY, x, zebraZ, 0.007, 1);
    }

    // Parking-spot indications: white painted box outline + "P" sign on sidewalk
    if (streetCal.spotMarks) {
      const lineT = carWid * streetCal.spotLineT;
      SPOT_LAYOUT.forEach((Lraw: any, i: number) => {
        const L = normalizeLayoutEntry(Lraw);
        if (L.markOn === false) return;
        // Markings are offset & scaled INDEPENDENTLY from the 3D spot projection
        const sx = L.u * boardW + (L.markDx ?? 0) * boardW;
        const sz = L.v * boardD + (L.markDz ?? 0) * boardD;
        const sw = L.wFrac * boardW * (L.markWMul ?? 1);
        const sd = L.dFrac * boardD * (L.markDMul ?? 1);
        // 4 white border strips
        addPlane(sw + lineT, lineT, matLineW, sx, sz - sd / 2, 0.005, 1); // bottom
        addPlane(sw + lineT, lineT, matLineW, sx, sz + sd / 2, 0.005, 1); // top
        addPlane(lineT, sd, matLineW, sx - sw / 2, sz, 0.005, 1);         // left
        addPlane(lineT, sd, matLineW, sx + sw / 2, sz, 0.005, 1);         // right
        // (Swiss style: no painted P-disc / number dot inside the spot — keep box clean.)


        // "P" sign post on sidewalk just outside the spot column
        const signX = rightSideX;
        const poleH = carWid * streetCal.signPoleH;
        const poleMatS = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.6, roughness: 0.4 });
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(carWid * 0.022, carWid * 0.025, poleH, 8),
          poleMatS,
        );
        pole.position.set(signX, poleH / 2, sz);
        env.add(pole);
        const signSize = carWid * streetCal.signSize;
        const signGeo = new THREE.PlaneGeometry(signSize, signSize);
        const signBlue = new THREE.MeshBasicMaterial({ color: 0x1956c8, side: THREE.DoubleSide });
        const sign = new THREE.Mesh(signGeo, signBlue);
        sign.position.set(signX, poleH - signSize * 0.4, sz);
        env.add(sign);
        const pLetter = new THREE.Mesh(
          new THREE.CircleGeometry(signSize * 0.32, 24),
          new THREE.MeshBasicMaterial({ color: 0xffffff }),
        );
        pLetter.position.set(signX, poleH - signSize * 0.4, sz + 0.001);
        env.add(pLetter);
        const pHole = new THREE.Mesh(
          new THREE.CircleGeometry(signSize * 0.12, 16),
          new THREE.MeshBasicMaterial({ color: 0x1956c8 }),
        );
        pHole.position.set(signX + signSize * 0.04, poleH - signSize * 0.4, sz + 0.002);
        env.add(pHole);
      });
    }


    // Trees along both sidewalks — randomised positions and sizes
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x1f7a3a, roughness: 0.8, emissive: 0x0a2a14, emissiveIntensity: 0.25 });
    const rand = (() => { let s = 1337; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const treeRows = 4;
    for (let i = 0; i < treeRows; i++) {
      const baseZ = -blockD / 2 + blockD * ((i + 0.5) / treeRows);
      for (const sideX of [leftSideX, rightSideX]) {
        const z = baseZ + (rand() - 0.5) * blockD * 0.12;
        if (Math.abs(z - zebraZ) < carLen * 1.4) continue;
        // skip trees that would collide with parking spots on the right sidewalk
        if (streetCal.spotMarks && sideX === rightSideX) {
          const collides = SPOT_LAYOUT.some((L: any) => Math.abs(z - L.v * boardD) < L.dFrac * boardD * 0.7);
          if (collides) continue;
        }
        const tx = sideX + (rand() - 0.5) * sideW * 0.5;
        const trunkH = carWid * (1.1 + rand() * 0.7);
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(carWid * 0.08, carWid * 0.11, trunkH, 10),
          trunkMat,
        );
        trunk.position.set(tx, trunkH / 2, z);
        env.add(trunk);
        const leafR = carWid * (0.5 + rand() * 0.35);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(leafR, 14, 10), leafMat);
        leaves.position.set(tx, trunkH + leafR * 0.55, z);
        env.add(leaves);
      }
    }

    // Trashcans scattered on BOTH sidewalks (random Z positions, avoiding the zebra)
    const canMat = new THREE.MeshStandardMaterial({ color: 0x2c3540, metalness: 0.5, roughness: 0.6 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x1a1f27, metalness: 0.5, roughness: 0.5 });
    const trashTargets: Array<{ side: number; count: number }> = [
      { side: leftSideX, count: 3 },
      { side: rightSideX, count: 2 },
    ];
    for (const t of trashTargets) {
      let placed = 0, guard = 0;
      while (placed < t.count && guard++ < 30) {
        const z = -blockD / 2 + blockD * (0.08 + rand() * 0.84);
        if (Math.abs(z - zebraZ) < carLen * 1.6) continue;
        // avoid colliding with parking spots on right sidewalk
        if (t.side === rightSideX) {
          const collides = SPOT_LAYOUT.some((L: any) => Math.abs(z - L.v * boardD) < L.dFrac * boardD * 0.6);
          if (collides) continue;
        }
        const cx = t.side + (rand() - 0.5) * sideW * 0.4;
        const canH = carWid * (0.5 + rand() * 0.18), canR = carWid * 0.16;
        const can = new THREE.Mesh(new THREE.CylinderGeometry(canR, canR * 0.85, canH, 14), canMat);
        can.position.set(cx, canH / 2, z);
        env.add(can);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(canR * 1.05, canR * 1.05, canH * 0.08, 14), lidMat);
        lid.position.set(cx, canH + canH * 0.04, z);
        env.add(lid);
        placed++;
      }
    }

    // ── Liven up the crossing: bollards, planters, a bench, and a Swiss pedestrian sign ──
    const bollardMat = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 0.2, roughness: 0.5 });
    const bollardTopMat = new THREE.MeshStandardMaterial({ color: 0xeb0000, metalness: 0.1, roughness: 0.5 });
    const buildBollard = (x: number, z: number) => {
      const h = carWid * 0.35, r = carWid * 0.04;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), bollardMat);
      b.position.set(x, h / 2, z);
      env.add(b);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.1, h * 0.08, 12), bollardTopMat);
      cap.position.set(x, h + h * 0.04, z);
      env.add(cap);
    };
    // Crossing corner anchors (also reused by traffic lights below).
    const cornerXL = roadLeftEdge - sideW * streetCal.tlOffsetX;
    const cornerXR = roadRightEdge + sideW * streetCal.tlOffsetX;
    const crossZNear = zebraZ - carLen * streetCal.tlOffsetZ;
    const crossZFar  = zebraZ + carLen * streetCal.tlOffsetZ;
    // A short row of 3 bollards per corner, lining the sidewalk edge along the crossing.
    const bollardEdgeOffset = sideW * 0.18;
    for (const sign of [-1, 1]) {
      const baseX = sign < 0 ? roadLeftEdge - bollardEdgeOffset : roadRightEdge + bollardEdgeOffset;
      for (const zSide of [crossZNear, crossZFar]) {
        const step = carLen * 0.45;
        const dir = zSide < zebraZ ? -1 : 1;
        for (let k = 1; k <= 3; k++) {
          buildBollard(baseX, zSide + dir * step * k);
        }
      }
    }

    // Clamp helper: keep any prop strictly inside the projection block.
    const zHalf = blockD / 2;
    const zMargin = carLen * 0.6;
    const clampZ = (z: number) => Math.max(-zHalf + zMargin, Math.min(zHalf - zMargin, z));
    const fracToZ = (f: number) => clampZ(f * blockD);

    // Planters (concrete boxes with green tops) — independently placed on each sidewalk.
    const planterBoxMat = new THREE.MeshStandardMaterial({ color: 0xcfcfc8, roughness: 0.95 });
    const planterTopMat = new THREE.MeshStandardMaterial({ color: 0x2e7a3a, roughness: 0.8, emissive: 0x0a2a14, emissiveIntensity: 0.2 });
    const buildPlanter = (x: number, z: number) => {
      const pw = carWid * 0.55, pd = carWid * 0.55, ph = carWid * 0.28;
      const box = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, pd), planterBoxMat);
      box.position.set(x, ph / 2, z);
      env.add(box);
      const top = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.92, ph * 0.18, pd * 0.92), planterTopMat);
      top.position.set(x, ph + ph * 0.07, z);
      env.add(top);
      const bushR = carWid * 0.18;
      const bush = new THREE.Mesh(new THREE.SphereGeometry(bushR, 12, 10), planterTopMat);
      bush.position.set(x, ph + bushR * 0.7, z);
      env.add(bush);
    };
    buildPlanter(leftSideX,  fracToZ(streetCal.planterL1Z));
    buildPlanter(leftSideX,  fracToZ(streetCal.planterL2Z));
    buildPlanter(rightSideX, fracToZ(streetCal.planterR1Z));
    buildPlanter(rightSideX, fracToZ(streetCal.planterR2Z));

    // Wooden bench — independent side + Z, clamped inside the block.
    const benchSeatMat = new THREE.MeshStandardMaterial({ color: 0x7a4a25, roughness: 0.8 });
    const benchLegMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.6, roughness: 0.4 });
    const buildBench = (x: number, z: number, rotY = 0) => {
      const bw = carWid * 1.1, bd = carWid * 0.28, bh = carWid * 0.06;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), benchSeatMat);
      seat.position.set(x, carWid * 0.28, z);
      seat.rotation.y = rotY;
      env.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(bw, carWid * 0.32, bh), benchSeatMat);
      back.position.set(
        x + Math.sin(rotY + Math.PI / 2) * bd * 0.45,
        carWid * 0.46,
        z + Math.cos(rotY + Math.PI / 2) * bd * 0.45,
      );
      back.rotation.y = rotY;
      env.add(back);
      for (const lx of [-bw * 0.4, bw * 0.4]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(bh, carWid * 0.25, bd), benchLegMat);
        const cs = Math.cos(rotY), sn = Math.sin(rotY);
        leg.position.set(x + lx * cs, carWid * 0.125, z - lx * sn);
        leg.rotation.y = rotY;
        env.add(leg);
      }
    };
    const benchX = streetCal.benchSide < 0 ? leftSideX : rightSideX;
    const benchFacing = streetCal.benchSide < 0 ? Math.PI / 2 : -Math.PI / 2;
    buildBench(benchX, fracToZ(streetCal.benchZ), benchFacing);

    // Swiss pedestrian-crossing signs — independent Z positions, clamped inside the block.
    const buildPedSign = (x: number, z: number, facing: number) => {
      const poleH = carWid * 1.15;
      const poleM = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, metalness: 0.6, roughness: 0.4 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(carWid * 0.022, carWid * 0.025, poleH, 8), poleM);
      pole.position.set(x, poleH / 2, z);
      env.add(pole);
      const sz = carWid * 0.34;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(sz, sz),
        new THREE.MeshBasicMaterial({ color: 0x1956c8, side: THREE.DoubleSide }),
      );
      board.position.set(x, poleH - sz * 0.4, z);
      board.rotation.y = facing;
      env.add(board);
      const fig = new THREE.Mesh(
        new THREE.CircleGeometry(sz * 0.18, 18),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      const off = 0.002;
      fig.position.set(x + Math.sin(facing) * off, poleH - sz * 0.4, z + Math.cos(facing) * off);
      fig.rotation.y = facing;
      env.add(fig);
    };
    buildPedSign(leftSideX  + sideW * 0.15, fracToZ(streetCal.pedSignAZ),  Math.PI / 2);
    buildPedSign(rightSideX - sideW * 0.15, fracToZ(streetCal.pedSignBZ), -Math.PI / 2);



    // Traffic lights at the 4 corners of the pedestrian crossing
    const buildTrafficLight = (x: number, z: number, facing: number) => {
      const poleH = carWid * 1.25;
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x14181f, metalness: 0.7, roughness: 0.4 });
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(carWid * 0.028, carWid * 0.035, poleH, 8),
        poleMat,
      );
      pole.position.set(x, poleH / 2, z);
      env.add(pole);
      const headW = carWid * 0.14, headH = carWid * 0.36, headD = carWid * 0.12;
      const head = new THREE.Mesh(new THREE.BoxGeometry(headW, headH, headD), poleMat);
      head.position.set(x, poleH - headH / 2, z);
      head.rotation.y = facing;
      env.add(head);
      const colors = [0xff2a2a, 0xffd02a, 0x2aff6a];
      const lampGeo = new THREE.CircleGeometry(carWid * 0.04, 14);
      for (let i = 0; i < 3; i++) {
        const isOn = i === 0;
        const lamp = new THREE.Mesh(
          lampGeo,
          new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: isOn ? 1 : 0.35 }),
        );
        const ly = poleH - headH * (0.25 + i * 0.25);
        const off = headD / 2 + 0.002;
        lamp.position.set(x + Math.sin(facing) * off, ly, z + Math.cos(facing) * off);
        lamp.rotation.y = facing;
        env.add(lamp);
      }
    };
    buildTrafficLight(cornerXL, crossZNear, Math.PI / 2);
    buildTrafficLight(cornerXR, crossZNear, -Math.PI / 2);
    buildTrafficLight(cornerXL, crossZFar,  Math.PI / 2);
    buildTrafficLight(cornerXR, crossZFar, -Math.PI / 2);

    // Anchor to board center, with dev-tunable XZ nudge & yaw.
    const baseYaw = Math.atan2(xAxis.x, xAxis.z);
    const yaw = baseYaw + (streetCal.rotDeg * Math.PI) / 180;
    const cos = Math.cos(baseYaw), sin = Math.sin(baseYaw);
    const dx = streetCal.offsetX * cos + streetCal.offsetZ * sin;
    const dz = -streetCal.offsetX * sin + streetCal.offsetZ * cos;
    env.position.set(origin.x + dx, groundY, origin.z + dz);
    env.rotation.y = yaw;

    scene.add(env);

    return () => {
      scene.remove(env);
      streetEnvRef.current = null;
      env.traverse((o: any) => {
        o.geometry?.dispose?.();
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach((m: any) => m.dispose?.());
        else mat?.dispose?.();
      });
    };
  }, [activeBoardFrame, streetCal, SPOT_LAYOUT]);

  // Map a raw warped-pixel coordinate (800x600) to a world position on the board.
  const pixelToWorld = useCallback(
    (px: number, py: number): THREE.Vector3 | null => {
      if (!activeBoardFrame) return null;
      const calibratedX = px + CAR_PX_OFFSET_X;
      const calibratedY = py + CAR_PX_OFFSET_Y;
      const percentX = (calibratedX - BOARD_PX_LEFT) / (BOARD_PX_RIGHT - BOARD_PX_LEFT);
      const percentY = (calibratedY - BOARD_PX_TOP) / (BOARD_PX_BOTTOM - BOARD_PX_TOP);

      let target: THREE.Vector3;
      const corners = activeBoardFrame.corners;
      if (corners && corners.length === 4) {
        const u = THREE.MathUtils.clamp(percentY, 0, 1);
        const v = THREE.MathUtils.clamp(1 - percentX, 0, 1);
        const w00 = (1 - u) * (1 - v);
        const w10 = u * (1 - v);
        const w11 = u * v;
        const w01 = (1 - u) * v;
        target = new THREE.Vector3()
          .addScaledVector(corners[0], w00)
          .addScaledVector(corners[1], w10)
          .addScaledVector(corners[2], w11)
          .addScaledVector(corners[3], w01);
      } else {
        const cx = THREE.MathUtils.clamp(percentX, 0, 1);
        const cy = THREE.MathUtils.clamp(percentY, 0, 1);
        const u = cy - 0.5;
        const v = -(cx - 0.5);
        target = activeBoardFrame.origin.clone();
        target.addScaledVector(activeBoardFrame.xAxis, u);
        target.addScaledVector(activeBoardFrame.zAxis, v);
      }
      target.y = activeBoardFrame.topY + 0.02;
      return target;
    },
    [activeBoardFrame],
  );

  useEffect(() => {
    if (!liveCar || !activeBoardFrame) return;
    const target = pixelToWorld(liveCar.x, liveCar.y);
    if (target) carTargetPosRef.current = target;
  }, [liveCar, activeBoardFrame, pixelToWorld]);

  useEffect(() => {
    const channel = externalSupabase.channel("digital-twin");
    channel
      .on("broadcast", { event: "car_movement" }, (msg) => {
        const p = (msg as any).payload ?? {};
        const x = Number(p.x);
        const y = Number(p.y);

        if (Number.isFinite(x) && Number.isFinite(y)) {
          // EMA smoothing on raw pixel coords. Heavier weight on the previous
          // sample makes the rendered car glide instead of snap, while still
          // honoring real motion. No deadzone — every frame contributes.
          const prev = smoothedPixelRef.current;
          const alpha = 0.32; // 0 = max smooth, 1 = raw
          const sx = prev ? prev.x + (x - prev.x) * alpha : x;
          const sy = prev ? prev.y + (y - prev.y) * alpha : y;
          smoothedPixelRef.current = { x: sx, y: sy };
          setLiveCar({ id: String(p.car_id ?? "live_car"), x: sx, y: sy });
        }
      })
      .subscribe();
    return () => {
      externalSupabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const norm = (s: ParkingSpot) => (s.status || "").toUpperCase();
    const free = spots.filter((s) => ["AVAILABLE", "EMPTY"].includes(norm(s))).length;
    const active = spots.filter((s) => ["SCANNING", "SESSION STARTED"].includes(norm(s))).length;
    const billed = spots.filter((s) =>
      ["BILLED", "IN PROGRESS", "BILLED / RECEIPT SENT", "OCCUPIED"].includes(norm(s)),
    ).length;
    return { total: spots.length, free, active, billed };
  }, [spots]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background"
    >
      <div ref={mountRef} className="absolute inset-0" />

      <div
        ref={hudRef}
        className="absolute top-0 left-0 pointer-events-none z-20 will-change-transform"
        style={{ opacity: 0, transition: "opacity 200ms ease-out" }}
      >
        <div className="relative flex flex-col items-center gap-1">
          {/* Parked / nav-arrival card — auto-hides 2s after the car parks */}
          <div
            ref={hudParkedRef}
            className="left-1/2 -translate-x-1/2"
            style={{ transition: "opacity 240ms ease-out, transform 240ms ease-out", opacity: 0, transform: "translateY(-4px) scale(0.94)", transformOrigin: "center bottom" }}
          >
            <div className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-700/70 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] backdrop-blur-xl whitespace-nowrap">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.55)]">
                <ShieldCheck size={11} className="text-white" strokeWidth={3} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                  Arrived
                </span>
                <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  {parkedSpotName ? `Spot ${parkedSpotName}` : "Parked"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky session timer pill — stays mounted until backend ends session */}
      <AnimatePresence>
        {activeSessionPill && (() => {
          const elapsed = Math.floor((Date.now() - activeSessionPill.startedAt) / 1000);
          const pad = (n: number) => n.toString().padStart(2, "0");
          return (
            <motion.div
              key="twin-session-pill"
              initial={{ y: -24, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className="fixed inset-x-0 z-[260] pointer-events-none flex justify-center"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)" }}

            >
              <div className="flex items-center gap-2.5 rounded-full pl-2.5 pr-3 py-1.5 shadow-lg shadow-red-900/30 bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-400/40 backdrop-blur-xl">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck size={12} className="text-white" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/90">
                  Spot {activeSessionPill.spotName}
                </span>
                <span className="font-mono font-bold text-white tracking-wider text-[12px] truncate max-w-[110px]">
                  {activeSessionPill.isGuest ? activeSessionPill.plate : activeSessionPill.ownerName}
                </span>
                <span className="w-px h-4 bg-white/25" />
                <p className="text-sm font-bold text-white font-mono tabular-nums tracking-wider">
                  {pad(Math.floor(elapsed / 60))}:{pad(elapsed % 60)}
                </p>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>





      <AnimatePresence>
        {splatLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none"
          >
            <div className="flex flex-col items-center gap-3 text-foreground">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-medium">Loading 3D twin…</p>
              <p className="text-xs text-muted-foreground">Streaming high-fidelity GLB mesh</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {splatError && !splatLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 text-xs font-medium backdrop-blur-md">
          3D scan unavailable — showing spot overlay only
        </div>
      )}

      <div className="absolute top-0 left-0 right-0 p-3 pt-[max(env(safe-area-inset-top),12px)] flex items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-card/80 backdrop-blur-xl rounded-2xl px-3 py-2 border border-border shadow-lg max-w-[55%]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-0.5">Live 3D Twin</p>
          <h2 className="text-sm font-bold text-foreground truncate">{parking.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${isSimulation ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isSimulation ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}
              />
              {isSimulation ? "SIM" : "LIVE"}
            </span>
            <span className="text-[9px] text-muted-foreground">drag to orbit · pinch to zoom</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={handleRecenter}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            aria-label="Recenter view"
            title="Recenter view"
          >
            <Locate size={16} />
          </button>
          <button
            onClick={() => setShowSpots((v) => !v)}
            className="w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            aria-label="Toggle spot overlay"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => setShowTuner((v) => !v)}
            className={`w-10 h-10 rounded-full backdrop-blur-xl border border-border flex items-center justify-center shadow-lg active:scale-95 transition-transform ${showTuner ? "bg-primary text-primary-foreground" : "bg-card/80"}`}
            aria-label="Toggle pad tuner"
            title="Tune pad alignment (dev)"
          >
            <Sliders size={16} />
          </button>

          <button
            onClick={() => setShowRoster((v) => !v)}
            className={`w-10 h-10 rounded-full backdrop-blur-xl border border-border flex items-center justify-center shadow-lg active:scale-95 transition-transform ${showRoster ? "bg-primary text-primary-foreground" : "bg-card/80"}`}
            aria-label="Toggle occupancy list"
            title="Occupancy list"
          >
            <List size={16} />
          </button>
          <button
            onClick={onClose}
            className="mt-1 w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            aria-label="Close inspector"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showRoster && (
        <div className="absolute top-[calc(env(safe-area-inset-top,0px)+260px)] right-3 w-[240px] max-w-[55vw] max-h-[55vh] pointer-events-none">
          <div className="pointer-events-auto h-full rounded-2xl bg-card/85 backdrop-blur-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
            <div className="grid grid-cols-2 border-b border-border">
              <div className="p-2 text-center border-r border-border">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500">Free</p>
                <p className="text-base font-bold text-foreground">{stats.free}</p>
              </div>
              <div className="p-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-500">Occupied</p>
                <p className="text-base font-bold text-foreground">{stats.active + stats.billed}</p>
              </div>
            </div>

            {selectedSpot ? (
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spot</p>
                    <p className="text-2xl font-bold text-foreground font-mono">{selectedSpot.name}</p>
                  </div>
                  {(() => {
                    const st = getStatusStyle(selectedSpot.status);
                    return (
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                    );
                  })()}
                </div>

                {(() => {
                  const plate = getPlate(selectedSpot);
                  const isBilled = (selectedSpot.status || "").toUpperCase() === "BILLED";
                  if (!plate) return null;
                  return (
                    <div
                      className={`rounded-xl p-3 mb-3 ${isBilled ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-secondary"}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Car size={13} className={isBilled ? "text-white/80" : "text-muted-foreground"} />
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wider ${isBilled ? "text-white/80" : "text-muted-foreground"}`}
                        >
                          {isBilled ? "Active Billing Session" : "License Plate"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-lg font-bold font-mono ${isBilled ? "text-white tracking-wider" : "text-foreground"}`}
                        >
                          {plate}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isBilled ? "bg-white/20 text-white" : "text-emerald-600 bg-emerald-500/15"}`}
                        >
                          <ShieldCheck size={11} /> {isBilled ? "BILLING" : "VERIFIED"}
                        </span>
                      </div>
                      {isBilled && activeSession && (
                        <p className="text-[11px] text-blue-200 mt-2 font-mono border-t border-blue-400/50 pt-2">
                          Started: {new Date(activeSession.start_time).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Position</p>
                    <p className="font-mono text-foreground">
                      {selectedSpot.position_x.toFixed(1)}, {selectedSpot.position_z.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2">
                    <p className="text-[9px] font-semibold uppercase text-muted-foreground">Last seen</p>
                    <p className="font-mono text-foreground">
                      {new Date(selectedSpot.last_seen_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSpot(null)}
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground py-2"
                >
                  Clear selection
                </button>
              </div>
            ) : (
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <ScanLine size={14} className="text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Spot Roster</p>
                </div>
                <div className="space-y-1.5">
                  {spots.map((s) => {
                    const st = getStatusStyle(s.status);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSpot(s)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-transform active:scale-[0.98] text-left ${st.bg} ${st.text} shadow-sm`}
                      >
                        <span className="font-mono text-xs font-semibold w-12">{s.name}</span>
                        <span className="flex-1 text-[11px] truncate font-mono opacity-90">{getPlate(s) ?? "—"}</span>
                        <span className="text-[9px] uppercase font-bold tracking-wider">{st.label}</span>
                      </button>
                    );
                  })}
                  {spots.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No spots configured. Use Admin → Spot Editor to add them.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="px-4 py-2 border-t border-border bg-card/50">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <CameraIcon size={10} /> Drone view · auto-orbit · click a box to inspect
              </p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showTuner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute left-3 bottom-3 w-[280px] max-w-[80vw] rounded-2xl bg-card/90 backdrop-blur-2xl border border-border shadow-2xl p-3 z-10"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sliders size={11} /> Pad Tuner (dev)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    try {
                      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(SPOT_LAYOUT));
                    } catch {}
                    const { error } = await supabase
                      .from("app_settings" as any)
                      .upsert(
                        { key: LAYOUT_SETTINGS_KEY, value: SPOT_LAYOUT, updated_at: new Date().toISOString() },
                        { onConflict: "key" },
                      );
                    if (error) {
                      toast.error(`Could not sync layout: ${error.message}`);
                    } else {
                      toast.success("Pad layout saved");
                    }
                  }}
                  className="text-[10px] font-semibold text-primary-foreground bg-primary px-2 py-0.5 rounded-md flex items-center gap-1 active:scale-95"
                >
                  <Save size={10} /> Save
                </button>
                <button
                  onClick={resetLayout}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-secondary"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-2 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Snapshots</p>
                <button
                  onClick={saveSnapshot}
                  className="text-[10px] font-semibold text-primary-foreground bg-primary px-2 py-0.5 rounded-md flex items-center gap-1 active:scale-95"
                >
                  <Save size={10} /> Save snapshot
                </button>
              </div>
              {snapshots.length === 0 ? (
                <p className="text-[9px] text-muted-foreground">No snapshots yet. Save the current layout to restore later.</p>
              ) : (
                <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                  {snapshots.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5 rounded-md bg-card/60 border border-border px-1.5 py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-foreground truncate">{s.name}</p>
                        <p className="text-[8px] text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => restoreSnapshot(s.id)}
                        className="text-[9px] font-semibold text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => deleteSnapshot(s.id)}
                        className="text-[9px] font-semibold text-destructive hover:bg-destructive/10 px-1 py-0.5 rounded"
                        aria-label="Delete snapshot"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {SPOT_LAYOUT.map((pad: any, i: number) => (
                <div key={i} className="rounded-lg border border-border p-2 bg-secondary/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-foreground">Spot {i + 1}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">size</span>
                      <button
                        onClick={() => {
                          updateLayout(i, "wFrac", Math.max(0.01, pad.wFrac - 0.01));
                          updateLayout(i, "dFrac", Math.max(0.01, pad.dFrac - 0.01));
                        }}
                        className="w-5 h-5 rounded-md bg-secondary hover:bg-border flex items-center justify-center"
                        aria-label="Shrink pad"
                      >
                        <Minus size={10} />
                      </button>
                      <button
                        onClick={() => {
                          updateLayout(i, "wFrac", Math.min(0.5, pad.wFrac + 0.01));
                          updateLayout(i, "dFrac", Math.min(0.5, pad.dFrac + 0.01));
                        }}
                        className="w-5 h-5 rounded-md bg-secondary hover:bg-border flex items-center justify-center"
                        aria-label="Grow pad"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                  {(["u", "v", "wFrac", "dFrac"] as const).map((k) => {
                    const isPos = k === "u" || k === "v";
                    const min = isPos ? -0.5 : 0.01;
                    const max = isPos ? 0.5 : 0.5;
                    return (
                      <div key={k} className="flex items-center gap-2 mb-1">
                        <label className="text-[10px] font-mono text-muted-foreground w-12">{k}</label>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={0.005}
                          value={pad[k]}
                          onChange={(e) => updateLayout(i, k, parseFloat(e.target.value))}
                          className="flex-1 accent-primary h-1"
                        />
                        <span className="text-[10px] font-mono text-foreground w-12 text-right">
                          {pad[k].toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground mt-2">Changes auto-save locally.</p>
          </motion.div>
        )}
      </AnimatePresence>


    </motion.div>
  );
};

export default ParkingInspector3D;
