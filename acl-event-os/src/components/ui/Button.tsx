"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-[3px] font-display font-bold uppercase tracking-[0.1em] transition-all duration-150 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acl-red-bright active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-acl-red text-white shadow-[0_6px_18px_-8px_rgba(225,16,33,0.9)] hover:bg-acl-red-bright border border-acl-red-bright/40",
        gold: "bg-gold text-black hover:bg-gold-bright border border-gold-bright/50",
        success: "bg-ok text-black hover:brightness-110 border border-ok/50",
        outline: "border border-hairline-strong bg-surface-2 text-ink hover:border-acl-red/60 hover:bg-surface-3",
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink border border-transparent",
        danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
      },
      size: {
        sm: "h-7 px-2.5 text-[10px]",
        md: "h-9 px-3.5 text-[11px]",
        lg: "h-11 px-5 text-xs",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
