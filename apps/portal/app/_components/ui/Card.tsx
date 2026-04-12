import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border-2 border-ui-border bg-white shadow-[0_2px_6px_rgba(15,23,42,0.04)]",
        hover && "transition hover:-translate-y-[2px] hover:shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("border-b-2 border-ui-border px-6 py-5", className)}>{children}</div>;
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("p-6", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("border-t-2 border-ui-border px-6 py-5", className)}>{children}</div>;
}
