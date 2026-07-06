import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ScanFace, KeyRound, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  isWebAuthnSupported,
  registerBiometric,
  hasBiometricCredential,
  removeBiometricCredential,
} from "@/hooks/useWebAuthn";

interface Props {
  onBack: () => void;
}

const PrivacySecuritySettings = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [faceIdEnabled, setFaceIdEnabled] = useState(() => hasBiometricCredential());
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setFullName(data.full_name || "");
        });
    }
  }, [user]);

  const toggleFaceId = async (val: boolean) => {
    if (!user) return;

    if (val) {
      if (!isWebAuthnSupported()) {
        toast.error(t("biometricsNotSupported") || "Biometric authentication is not supported on this device");
        return;
      }
      setFaceIdLoading(true);
      const success = await registerBiometric(user.id, user.email || "User");
      setFaceIdLoading(false);
      if (success) {
        setFaceIdEnabled(true);
        localStorage.setItem("librepass-faceid", "true");
        toast.success(t("faceIdEnabled"));
      } else {
        toast.error(t("biometricSetupFailed") || "Biometric setup was cancelled or failed");
      }
    } else {
      removeBiometricCredential();
      setFaceIdEnabled(false);
      toast.success(t("faceIdDisabled"));
    }
  };

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    if (error) {
      toast.error(t("failedUpdateName"));
    } else {
      toast.success(t("nameUpdated"));
      setEditingName(false);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t("passwordMin6"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordsDontMatch"));
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("passwordUpdated"));
      setChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const webAuthnSupported = isWebAuthnSupported();

  const items = [
    {
      icon: ScanFace,
      label: t("useFaceId"),
      subtitle: webAuthnSupported
        ? (faceIdEnabled ? (t("biometricActive") || "Biometric login active") : t("unlockBiometrics"))
        : (t("biometricsNotAvailable") || "Not available on this device"),
      toggle: true,
      value: faceIdEnabled,
      onToggle: toggleFaceId,
      disabled: !webAuthnSupported || faceIdLoading,
    },
    {
      icon: KeyRound,
      label: t("changePassword"),
      subtitle: "",
      action: () => setChangePasswordOpen(true),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="px-5 pt-[max(env(safe-area-inset-top),16px)] pb-6 flex items-center gap-3">
        <button onClick={onBack} className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-primary" />
        </button>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("privacySecurity")}</h1>
      </div>

      {/* Personal Data */}
      <div className="mx-4 mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          {t("personalData")}
        </p>
        <div className="bg-card rounded-2xl p-5 shadow-sm">
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">{t("email")}</p>
            <p className="text-sm font-semibold text-card-foreground">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("fullName")}</p>
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9 rounded-xl bg-secondary border-border text-sm flex-1"
                />
                <Button size="sm" onClick={saveName} disabled={saving} className="rounded-xl h-9 px-4">
                  {t("save")}
                </Button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-2">
                <span className="text-sm font-semibold text-card-foreground">{fullName || t("notSet")}</span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="mx-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          {t("security")}
        </p>
        <div className="bg-card rounded-2xl overflow-hidden shadow-sm">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-5 py-4 border-b border-border last:border-0"
            >
              <item.icon size={18} className="text-muted-foreground shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-card-foreground">{item.label}</p>
                {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
              </div>
              {item.toggle ? (
                <Switch
                  checked={item.value}
                  onCheckedChange={item.onToggle}
                  disabled={'disabled' in item ? item.disabled : false}
                />
              ) : (
                <button onClick={item.action}>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Delete account hint */}
      <div className="mx-4 mt-6">
        <button className="w-full flex items-center justify-center gap-2 bg-card rounded-2xl py-4 shadow-sm text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors">
          <Trash2 size={16} />
          {t("deleteAccount")}
        </button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="rounded-2xl mx-4">
          <DialogHeader>
            <DialogTitle>{t("changePassword")}</DialogTitle>
            <DialogDescription>{t("enterNewPasswordBelow")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="password"
              placeholder={t("newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder={t("confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="rounded-xl w-full">
              {changingPassword ? t("loading") : t("updatePassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivacySecuritySettings;
