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
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition",
        "focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/25",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" &&
          "border border-[#0a1d45] bg-[#0b1f4f] text-white shadow-[0_6px_16px_rgba(11,31,79,0.25)] hover:bg-[#0f275f]",
        variant === "secondary" &&
          "border border-ui-border bg-white text-ui-textPrimary shadow-sm hover:bg-[#f8fafc]",
        variant === "ghost" && "bg-transparent text-ui-textPrimary hover:bg-ui-softBg",
        variant === "destructive" && "border border-[#dc2626] bg-[#dc2626] text-white hover:bg-[#b91c1c]",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
