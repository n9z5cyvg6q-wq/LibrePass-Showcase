import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls, GLTFLoader } from "three-stdlib";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Activity, Loader2, X, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GLB_URL =
  "https://xadoguorxapnmrzjewmb.supabase.co/storage/v1/object/public/infrastructure%20assets/Parkings%20assets.glb";

const COLOR = {
  EMPTY: new THREE.Color("#22C55E"),
  OCCUPIED: new THREE.Color("#EF4444"),
  RESERVED: new THREE.Color("#F59E0B"),
} as const;

type Status = "EMPTY" | "OCCUPIED" | "RESERVED";

interface Spot {
  id: string;
  name: string;
  status: Status;
  parking_id: string;
  occupied_plate: string | null;
  last_seen_at: string;
  updated_at: string;
}

interface FeedEntry {
  id: string;
  ts: number;
  name: string;
  status: Status;
}

interface HistoryEntry {
  ts: number;
  status: Status;
}

/** Try a few normalisations to map a GLB mesh name to a DB spot.name. */
const normaliseMeshName = (raw: string): string[] => {
  const out = new Set<string>();
  const variants = [
    raw,
    raw.replace(/^(Spot[_-]|spot[_-]|Parking[_-]|parking[_-]|Place[_-]|place[_-])/i, ""),
    raw.replace(/_/g, "-"),
    raw.replace(/-/g, "_"),
  ];
  variants.forEach((v) => {
    out.add(v);
    out.add(v.toUpperCase());
    out.add(v.toLowerCase());
  });
  return Array.from(out);
};

/** Build lookup table keyed by every normalised candidate → canonical DB name. */
const buildLookup = (dbNames: string[]) => {
  const map = new Map<string, string>();
  dbNames.forEach((n) => {
    normaliseMeshName(n).forEach((c) => map.set(c, n));
  });
  return map;
};

const LiveDashboard = () => {
  const navigate = useNavigate();
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshBySpotName = useRef<Map<string, THREE.Mesh[]>>(new Map());
  const originalMatRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const animIdRef = useRef<number>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [history, setHistory] = useState<Map<string, HistoryEntry[]>>(new Map());
  const [selected, setSelected] = useState<Spot | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);

  // ───────── Three.js scene setup ─────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f17);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 5000);
    camera.position.set(0, 80, 140);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(60, 120, 80);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.05;
    controlsRef.current = controls;

    // Click handling for spot pick
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Object3D[] = [];
      meshBySpotName.current.forEach((arr) => meshes.push(...arr));
      const hit = raycaster.intersectObjects(meshes, true)[0];
      if (!hit) return;
      // Walk up to find a mesh that's mapped
      let target: THREE.Object3D | null = hit.object;
      while (target) {
        const matchedName = [...meshBySpotName.current.entries()].find(([, arr]) =>
          arr.includes(target as THREE.Mesh)
        )?.[0];
        if (matchedName) {
          const spot = spotsRef.current.find((s) => s.name === matchedName);
          if (spot) setSelected(spot);
          break;
        }
        target = target.parent;
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      GLB_URL,
      (gltf) => {
        scene.add(gltf.scene);
        // Centre & frame camera
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const centre = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3()).length();
        controls.target.copy(centre);
        camera.position.copy(centre).add(new THREE.Vector3(size * 0.4, size * 0.45, size * 0.6));
        controls.update();
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("GLB load error", err);
        setLoadError("Failed to load 3D model");
        setLoading(false);
      }
    );

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Keep latest spots in a ref for click handler (avoids re-binding listener)
  const spotsRef = useRef<Spot[]>([]);
  useEffect(() => {
    spotsRef.current = spots;
  }, [spots]);

  // ───────── Initial fetch + Realtime subscription ─────────
  useEffect(() => {
    let cancelled = false;

    const apply = (rows: Spot[]) => {
      if (cancelled) return;
      setSpots(rows);
      // Seed history
      setHistory((prev) => {
        const next = new Map(prev);
        rows.forEach((r) => {
          if (!next.has(r.id)) next.set(r.id, [{ ts: Date.parse(r.updated_at), status: r.status }]);
        });
        return next;
      });
    };

    supabase
      .from("parking_spots")
      .select("id, name, status, parking_id, occupied_plate, last_seen_at, updated_at")
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        apply((data ?? []) as unknown as Spot[]);
      });

    const channel = supabase
      .channel("parking_spots:live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_spots" },
        (payload) => {
          console.log("[Realtime] parking_spots payload:", payload);
          const now = Date.now();
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Spot;
            setSpots((prev) => prev.filter((s) => s.id !== oldRow.id));
            return;
          }
          const next = payload.new as Spot;
          const prevRow =
            payload.eventType === "UPDATE" ? (payload.old as Spot) : undefined;

          console.log(
            `[Realtime] ${payload.eventType} → name="${next.name}" status=${next.status}`,
            prevRow ? `(was ${prevRow.status})` : ""
          );

          setSpots((prev) => {
            const idx = prev.findIndex((s) => s.id === next.id);
            if (idx === -1) return [...prev, next];
            const copy = prev.slice();
            copy[idx] = next;
            return copy;
          });

          // Append to history + feed only when status actually changes
          if (!prevRow || prevRow.status !== next.status) {
            setHistory((prev) => {
              const arr = prev.get(next.id) ?? [];
              const m = new Map(prev);
              m.set(next.id, [...arr, { ts: now, status: next.status }].slice(-30));
              return m;
            });
            setFeed((prev) =>
              [{ id: `${next.id}-${now}`, ts: now, name: next.name, status: next.status }, ...prev].slice(0, 40)
            );
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] subscription status:", status, err ?? "");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // ───────── Map GLB meshes to DB spots once loaded ─────────
  useEffect(() => {
    if (loading || !sceneRef.current || spots.length === 0) return;
    const scene = sceneRef.current;

    const lookup = buildLookup(spots.map((s) => s.name));
    const matched = new Map<string, THREE.Mesh[]>();
    const seenMeshNames: string[] = [];

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name) seenMeshNames.push(obj.name);
      const candidates = normaliseMeshName(obj.name);
      const hitDbName = candidates.map((c) => lookup.get(c)).find(Boolean);
      if (hitDbName) {
        if (!originalMatRef.current.has(obj)) {
          originalMatRef.current.set(obj, obj.material);
        }
        const arr = matched.get(hitDbName) ?? [];
        arr.push(obj);
        matched.set(hitDbName, arr);
      }
    });

    meshBySpotName.current = matched;
    const unmatchedNames = spots.map((s) => s.name).filter((n) => !matched.has(n));
    setUnmatched(unmatchedNames);
    console.log(
      `[LiveDashboard] Mesh mapping: ${matched.size}/${spots.length} DB spots matched. ` +
        `Sample GLB mesh names:`,
      seenMeshNames.slice(0, 30)
    );
    console.log("[LiveDashboard] DB spot names:", spots.map((s) => s.name));
    if (unmatchedNames.length) {
      console.warn("[LiveDashboard] Unmatched DB names:", unmatchedNames);
    }
  }, [loading, spots]);

  // ───────── Recolor meshes whenever statuses change ─────────
  useEffect(() => {
    let recoloured = 0;
    spots.forEach((s) => {
      const meshes = meshBySpotName.current.get(s.name);
      if (!meshes) return;
      recoloured += meshes.length;
      const baseColor = COLOR[s.status];
      meshes.forEach((m) => {
        const mat = new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: s.status === "OCCUPIED" ? baseColor : new THREE.Color(0x000000),
          emissiveIntensity: s.status === "OCCUPIED" ? 0.45 : 0,
          transparent: s.status === "EMPTY",
          opacity: s.status === "EMPTY" ? 0.55 : 1,
          roughness: 0.55,
          metalness: 0.05,
        });
        m.material = mat;
      });
    });
    if (recoloured > 0) console.log(`[LiveDashboard] Recoloured ${recoloured} mesh(es) for ${spots.length} spots`);
  }, [spots]);

  // ───────── Stats ─────────
  const stats = useMemo(() => {
    const occupied = spots.filter((s) => s.status === "OCCUPIED").length;
    const reserved = spots.filter((s) => s.status === "RESERVED").length;
    const total = spots.length;
    return { total, occupied, reserved, available: total - occupied - reserved };
  }, [spots]);

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur z-50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" size={18} /> Loading 3D scan…
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <p className="text-destructive font-semibold">{loadError}</p>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 flex items-center gap-3 bg-gradient-to-b from-background/90 to-transparent z-30">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-card/80 backdrop-blur border border-border hover:bg-card"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Activity size={18} className="text-primary" /> Live Dashboard
          </h1>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Realtime · {stats.total} spots
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="absolute top-[max(env(safe-area-inset-top),64px)] left-4 z-20">
        <div className="bg-card/85 backdrop-blur border border-border rounded-2xl p-3 shadow-xl flex gap-3">
          <Stat label="Total" value={stats.total} accent="text-foreground" />
          <Divider />
          <Stat label="Available" value={stats.available} accent="text-emerald-500" />
          <Divider />
          <Stat label="Occupied" value={stats.occupied} accent="text-red-500" />
        </div>
        {unmatched.length > 0 && (
          <p className="mt-2 text-[10px] text-amber-500 font-medium max-w-[240px]">
            {unmatched.length} DB spot{unmatched.length === 1 ? "" : "s"} have no GLB mesh
            ({unmatched.slice(0, 3).join(", ")}
            {unmatched.length > 3 ? "…" : ""}).
          </p>
        )}
      </div>

      {/* Live feed */}
      <div className="absolute top-[max(env(safe-area-inset-top),64px)] right-4 z-20 w-72 max-h-[55vh] flex flex-col bg-card/85 backdrop-blur border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <Radio size={13} className="text-primary" />
          <p className="text-[11px] font-bold uppercase tracking-wider">Live Feed</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {feed.length === 0 ? (
            <p className="p-3 text-[11px] text-muted-foreground">Waiting for status changes…</p>
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {feed.map((f) => (
                  <motion.li
                    key={f.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-1.5 text-[11px] flex items-center gap-2"
                  >
                    <span className="font-mono text-muted-foreground tabular-nums">{fmtTime(f.ts)}</span>
                    <span className="font-mono font-semibold">{f.name}</span>
                    <span
                      className="ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${COLOR[f.status].getHexString()}26`,
                        color: `#${COLOR[f.status].getHexString()}`,
                      }}
                    >
                      {f.status}
                    </span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      {/* Spot popup */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-[max(env(safe-area-inset-bottom),16px)] left-1/2 -translate-x-1/2 z-30 w-[min(380px,calc(100vw-32px))] bg-card/95 backdrop-blur border border-border rounded-2xl shadow-2xl"
          >
            <div className="flex items-start justify-between p-4 pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Spot</p>
                <p className="text-2xl font-mono font-bold">{selected.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all">{selected.id}</p>
              </div>
              <span
                className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: `${COLOR[selected.status].getHexString()}26`,
                  color: `#${COLOR[selected.status].getHexString()}`,
                }}
              >
                {selected.status}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="ml-2 p-1 rounded-md hover:bg-secondary"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-4 pb-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
                Status history
              </p>
              <div className="bg-secondary rounded-lg p-2 max-h-40 overflow-y-auto">
                {(history.get(selected.id) ?? []).slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="font-mono text-muted-foreground tabular-nums">{fmtTime(h.ts)}</span>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${COLOR[h.status].getHexString()}26`,
                        color: `#${COLOR[h.status].getHexString()}`,
                      }}
                    >
                      {h.status}
                    </span>
                  </div>
                ))}
                {(history.get(selected.id)?.length ?? 0) === 0 && (
                  <p className="text-[11px] text-muted-foreground">No history yet.</p>
                )}
              </div>
              {selected.occupied_plate && (
                <p className="mt-3 text-xs">
                  <span className="text-muted-foreground">Plate: </span>
                  <span className="font-mono font-bold">{selected.occupied_plate}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: number; accent: string }) => (
  <div className="text-center min-w-[60px]">
    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold tabular-nums ${accent}`}>{value}</p>
  </div>
);

const Divider = () => <div className="w-px bg-border" />;

export default LiveDashboard;
