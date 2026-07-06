import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, Eye, EyeOff, Globe, ScanFace } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Locale, localeLabels, localeFlagEmoji } from "@/i18n/translations";
import { hasBiometricCredential, authenticateWithBiometric, hasSavedCredentials, getSavedCredentials, saveCredentialsForBiometric, registerBiometric, isWebAuthnSupported } from "@/hooks/useWebAuthn";

type Mode = "login" | "signup";

const locales: Locale[] = ["en", "fr", "de", "it"];

const Auth = () => {
  const { t, locale, setLocale } = useLanguage();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const oauthTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (oauthLoading) {
      oauthTimeout.current = setTimeout(() => {
        setOauthLoading(null);
        toast.error(t("signInTakingLong"));
      }, 15000);
    }
    return () => clearTimeout(oauthTimeout.current);
  }, [oauthLoading, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success(t("checkEmailConfirm"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // After successful login, offer to save credentials for Face ID
        if (isWebAuthnSupported() && !hasBiometricCredential()) {
          // Auto-register biometric and save credentials
          try {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
              const registered = await registerBiometric(data.user.id, email);
              if (registered) {
                saveCredentialsForBiometric(email, password);
                toast.success(t("faceIdEnabledLogin"));
              }
            }
          } catch {
            // Silently fail — Face ID setup is optional
          }
        } else if (hasBiometricCredential()) {
          // Update saved credentials on every successful login
          saveCredentialsForBiometric(email, password);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      {/* Language toggle */}
      <div className="absolute top-20 right-4 z-50">
        <button
          onClick={() => setShowLangPicker(!showLangPicker)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-card border border-border text-xs font-semibold text-foreground shadow-sm"
        >
          <Globe size={14} />
          {localeFlagEmoji[locale]} {localeLabels[locale]}
        </button>
        <AnimatePresence>
          {showLangPicker && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px]"
            >
              {locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => { setLocale(loc); setShowLangPicker(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors ${locale === loc ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}
                >
                  <span>{localeFlagEmoji[loc]}</span>
                  {localeLabels[loc]}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* OAuth Loading Overlay */}
      <AnimatePresence>
        {oauthLoading && (
          <motion.div key="oauth-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center gap-6">
              <img src={logoImg} alt="LibrePass" className="w-20 h-20 rounded-2xl border-0 outline-none" style={{ border: 'none', outline: 'none' }} />
              <div className="text-center">
                <h1 className="text-primary-foreground text-2xl font-bold tracking-tight">LibrePass</h1>
                <p className="text-primary-foreground/70 text-sm mt-1 font-medium">
                  {t("signingInWith")} {oauthLoading === "google" ? "Google" : "Apple"}…
                </p>
              </div>
            </motion.div>
            <div className="absolute bottom-24 w-48">
              <div className="h-1 rounded-full bg-primary-foreground/20 overflow-hidden">
                <motion.div className="h-full w-1/4 rounded-full bg-primary-foreground" animate={{ x: ["-100%", "400%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="pt-28 pb-8 px-6 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="mb-4">
          <img src={logoImg} alt="LibrePass" className="w-16 h-16 rounded-2xl border-0 outline-none" style={{ border: 'none', outline: 'none' }} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-2xl font-bold text-foreground">LibrePass</motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-sm text-muted-foreground mt-1">
          {mode === "login" ? t("welcomeBack") : t("createAccount")}
        </motion.p>
      </div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex-1 px-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === "signup" && (
              <motion.div key="signup-fields" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-4 overflow-hidden">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-foreground">{t("fullName")}</Label>
                  <Input id="fullName" type="text" placeholder="Marco Rossi" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-2xl bg-card border-border text-base" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate" className="text-sm font-semibold text-foreground">
                    <span className="flex items-center gap-1.5"><Car size={14} className="text-muted-foreground" />{t("licensePlateOptional")}</span>
                  </Label>
                  <Input id="plate" type="text" placeholder="VD·452·831" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} className="h-12 rounded-2xl bg-card border-border text-base uppercase tracking-wider font-mono" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">{t("email")}</Label>
            <Input id="email" type="email" placeholder="your@email.ch" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-2xl bg-card border-border text-base" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">{t("password")}</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-2xl bg-card border-border text-base pr-12" required minLength={6} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <div className="flex justify-end">
              <button type="button" onClick={async () => {
                if (!email.trim()) { toast.error(t("enterEmailFirst")); return; }
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
                  if (error) throw error;
                  toast.success(t("resetLinkSent"));
                } catch (err: any) { toast.error(err.message || t("failedResetLink")); }
              }} className="text-xs text-primary font-semibold">{t("forgotPassword")}</button>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl text-base font-semibold">
            {loading ? (
              <motion.div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
            ) : mode === "login" ? t("signIn") : t("createAccountBtn")}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t("orContinueWith")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={async () => {
            setOauthLoading("google");
            const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
            if (error) { toast.error("Google sign-in failed"); setOauthLoading(null); }
          }} className="flex-1 h-12 rounded-2xl bg-card border border-border flex items-center justify-center gap-2 hover:bg-secondary/50 active:bg-secondary/80 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span className="text-sm font-semibold text-foreground">Google</span>
          </button>
          <button type="button" onClick={async () => {
            setOauthLoading("apple");
            const { error } = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
            if (error) { toast.error("Apple sign-in failed"); setOauthLoading(null); }
          }} className="flex-1 h-12 rounded-2xl bg-card border border-border flex items-center justify-center gap-2 hover:bg-secondary/50 active:bg-secondary/80 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-foreground"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            <span className="text-sm font-semibold text-foreground">Apple</span>
          </button>
        </div>

        {/* Biometric login for returning users */}
        {mode === "login" && hasBiometricCredential() && hasSavedCredentials() && (
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const result = await authenticateWithBiometric();
                if (result) {
                  const creds = getSavedCredentials();
                  if (creds) {
                    const { error } = await supabase.auth.signInWithPassword({
                      email: creds.email,
                      password: creds.password,
                    });
                    if (error) {
                      toast.error(t("biometricLoginFailed"));
                    } else {
                      toast.success(t("biometricSuccess"));
                    }
                  } else {
                    toast.error(t("biometricLoginFailed"));
                  }
                } else {
                  toast.error(t("biometricFailed"));
                }
              } catch {
                toast.error(t("biometricFailed"));
              } finally {
                setLoading(false);
              }
            }}
            className="mt-4 w-full h-12 rounded-2xl bg-card border border-border flex items-center justify-center gap-2 hover:bg-secondary/50 active:bg-secondary/80 transition-colors"
          >
            <ScanFace size={20} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">{t("signInFaceId")}</span>
          </button>
        )}

        <div className="mt-6 text-center">
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-sm text-muted-foreground">
            {mode === "login" ? (
              <>{t("dontHaveAccount")} <span className="text-primary font-semibold">{t("signUp")}</span></>
            ) : (
              <>{t("alreadyHaveAccount")} <span className="text-primary font-semibold">{t("signIn")}</span></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
