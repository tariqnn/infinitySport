import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  isLoading,
  leadingIcon,
  trailingIcon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl font-bold transition",
        "focus:outline-none focus:ring-3 focus:ring-brand-primaryBlue/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "border-2 border-[#0a1d45] bg-[#0b1f4f] text-white shadow-[0_6px_16px_rgba(11,31,79,0.25)] hover:bg-[#0f275f]",
        variant === "secondary" &&
          "border-2 border-ui-border bg-white text-ui-textPrimary shadow-sm hover:bg-[#f8fafc]",
        variant === "ghost" && "bg-transparent text-ui-textPrimary hover:bg-ui-softBg",
        variant === "destructive" && "border-2 border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]",
        size === "sm" && "px-4 py-2 text-sm",
        size === "md" && "px-5 py-3 text-base",
        size === "lg" && "px-7 py-3.5 text-lg",
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
}
