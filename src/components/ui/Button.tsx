import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-moss-500 to-moss-600 text-white shadow-btn-primary hover:from-moss-500 hover:to-moss-700 active:to-moss-800",
  secondary:
    "bg-white text-ink-800 border border-ink-200/80 shadow-soft hover:bg-ink-50 hover:border-ink-300/70 active:bg-ink-100",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-100/80 hover:text-ink-900",
  subtle:
    "bg-moss-50 text-moss-700 border border-moss-200/60 hover:bg-moss-100 hover:border-moss-300/60",
  danger:
    "bg-white text-red-600 border border-red-200 shadow-soft hover:bg-red-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", fullWidth, ...props },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-xl font-medium tracking-tightish transition-all duration-200 ease-smooth focus-ring active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
