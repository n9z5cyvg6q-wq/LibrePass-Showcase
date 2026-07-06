import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset="calc(env(safe-area-inset-top, 0px) + 64px)"
      expand
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto rounded-2xl border backdrop-blur-xl " +
            "group-[.toaster]:bg-card/95 group-[.toaster]:text-foreground " +
            "group-[.toaster]:border-border group-[.toaster]:shadow-2xl " +
            "group-[.toaster]:shadow-black/10 px-4 py-3",
          title: "text-sm font-semibold",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground rounded-lg",
          closeButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
