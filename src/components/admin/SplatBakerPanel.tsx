import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Box, Download, Upload, CheckCircle2, AlertTriangle, Loader2, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const DEFAULT_PLY_URL = "https://xadoguorxapnmrzjewmb.supabase.co/storage/v1/object/public/infrastructure%20assets/parking_map.ply";
const BUCKET = "splats";

type Stage = "idle" | "downloading" | "converting" | "uploading" | "done" | "error";

interface Props {
  parkingId: string;
  parkingName: string;
}

const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const SplatBakerPanel = ({ parkingId, parkingName }: Props) => {
  const targetPath = `${parkingId}.ksplat`;

  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [splatBytes, setSplatBytes] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [savingUrl, setSavingUrl] = useState(false);

  // Reset/refresh whenever the selected parking changes
  useEffect(() => {
    setStage("idle");
    setProgress(0);
    setErrorMsg(null);
    setSplatBytes(0);
    setDownloadedBytes(0);

    (async () => {
      setCheckingExisting(true);
      const [{ data: bucketList }, { data: parking }] = await Promise.all([
        supabase.storage.from(BUCKET).list("", { search: targetPath }),
        supabase.from("parkings").select("splat_source_url").eq("id", parkingId).maybeSingle(),
      ]);
      const found = bucketList?.find((f) => f.name === targetPath);
      if (found) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(targetPath);
        setExistingUrl(urlData.publicUrl);
      } else {
        setExistingUrl(null);
      }
      setSourceUrl(((parking as any)?.splat_source_url as string) ?? "");
      setCheckingExisting(false);
    })();
  }, [parkingId, targetPath]);

  const refreshExisting = async () => {
    const { data } = await supabase.storage.from(BUCKET).list("", { search: targetPath });
    const found = data?.find((f) => f.name === targetPath);
    if (found) {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(targetPath);
      setExistingUrl(urlData.publicUrl);
    } else {
      setExistingUrl(null);
    }
  };

  const handleSaveSourceUrl = async () => {
    setSavingUrl(true);
    const { error } = await supabase
      .from("parkings")
      .update({ splat_source_url: sourceUrl.trim() || null } as any)
      .eq("id", parkingId);
    setSavingUrl(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Source URL saved");
  };

  const handleBake = async () => {
    setErrorMsg(null);
    setProgress(0);
    setDownloadedBytes(0);
    setSplatBytes(0);

    const effectiveSource = (sourceUrl.trim() || DEFAULT_PLY_URL);

    try {
      // 1. Download .ply with progress
      setStage("downloading");
      const res = await fetch(effectiveSource);
      if (!res.ok) throw new Error(`Source fetch ${res.status}`);
      const total = Number(res.headers.get("Content-Length") ?? 0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream");
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          setDownloadedBytes(received);
          if (total) setProgress(Math.round((received / total) * 100));
        }
      }
      const plyBuf = new Uint8Array(received);
      let off = 0;
      for (const c of chunks) { plyBuf.set(c, off); off += c.length; }

      // 2. Convert in browser
      setStage("converting");
      setProgress(0);
      const mod: any = await import("@mkkellogg/gaussian-splats-3d");
      const PlyLoader = mod.PlyLoader;
      if (!PlyLoader) throw new Error("PlyLoader not exported by library");
      const splatBuffer: any = await PlyLoader.loadFromFileData(plyBuf.buffer, 5, 0, false, 0, 0, 0, 0);
      const ksplatBytes: ArrayBuffer = splatBuffer.bufferData;
      setSplatBytes(ksplatBytes.byteLength);

      // 3. Upload
      setStage("uploading");
      setProgress(0);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(targetPath, ksplatBytes, {
          contentType: "application/octet-stream",
          upsert: true,
          cacheControl: "31536000",
        });
      if (upErr) throw upErr;

      setStage("done");
      setProgress(100);
      toast.success(`Pre-baked ${targetPath} uploaded`);
      await refreshExisting();
    } catch (err: any) {
      console.error("[Bake] failed:", err);
      setErrorMsg(err?.message ?? "Conversion failed");
      setStage("error");
      toast.error(err?.message ?? "Bake failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete the pre-baked ${targetPath}? Users will fall back to client-side conversion.`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([targetPath]);
    if (error) { toast.error(error.message); return; }
    toast.success("Pre-baked file removed");
    await refreshExisting();
  };

  const stageLabel: Record<Stage, string> = {
    idle: "Ready",
    downloading: `Downloading source (${formatBytes(downloadedBytes)})`,
    converting: "Converting .ply → SplatBuffer in browser…",
    uploading: "Uploading .ksplat to storage…",
    done: "Pre-baked file is live",
    error: "Failed",
  };

  const busy = stage === "downloading" || stage === "converting" || stage === "uploading";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 border border-border shadow-sm"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Box size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground">3D Splat Pre-bake</h3>
          <p className="text-xs text-muted-foreground">
            Bake <span className="font-mono">.ply</span> → <span className="font-mono">{targetPath}</span> for <span className="font-semibold">{parkingName}</span>.
          </p>
        </div>
      </div>

      {/* Per-parking source URL */}
      <div className="mb-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
          <Link2 size={10} /> Source .ply URL (per parking)
        </label>
        <div className="flex gap-2">
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder={DEFAULT_PLY_URL}
            className="h-9 font-mono text-[11px] flex-1"
          />
          <Button onClick={handleSaveSourceUrl} disabled={savingUrl} size="sm" variant="outline">
            {savingUrl ? <Loader2 size={13} className="animate-spin" /> : "Save"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Leave empty to use the default scan.
        </p>
      </div>

      {/* Existing file status */}
      <div className="mb-3 rounded-xl bg-secondary p-3 text-xs">
        {checkingExisting ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Checking storage…
          </span>
        ) : existingUrl ? (
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">Pre-baked file present</p>
              <p className="font-mono text-[10px] text-muted-foreground truncate">{existingUrl}</p>
            </div>
            <button onClick={handleDelete} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md" title="Delete baked file">
              <Trash2 size={13} />
            </button>
          </div>
        ) : (
          <span className="flex items-center gap-2 text-amber-600">
            <AlertTriangle size={13} /> No pre-baked file for this parking — users convert client-side.
          </span>
        )}
      </div>

      {/* Progress */}
      {(busy || stage === "done" || stage === "error") && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">{stageLabel[stage]}</span>
            {splatBytes > 0 && stage !== "downloading" && (
              <span className="font-mono text-muted-foreground">{formatBytes(splatBytes)}</span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className={`h-full ${stage === "error" ? "bg-destructive" : stage === "done" ? "bg-emerald-500" : "bg-primary"}`}
              animate={{ width: `${stage === "converting" ? 60 : stage === "uploading" ? 90 : progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          {errorMsg && (
            <p className="mt-2 text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle size={12} /> {errorMsg}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleBake} disabled={busy} className="flex-1 gap-1.5" size="sm">
          {busy ? <Loader2 size={14} className="animate-spin" /> : existingUrl ? <Upload size={14} /> : <Download size={14} />}
          {busy ? "Working…" : existingUrl ? "Re-bake & overwrite" : "Bake & upload now"}
        </Button>
      </div>
    </motion.div>
  );
};

export default SplatBakerPanel;
