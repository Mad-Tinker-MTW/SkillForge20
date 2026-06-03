import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  locked?: boolean;
}

export function Card({ children, className = "", locked = false }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-zinc-700 bg-zinc-900 shadow-md ${locked ? "opacity-50 select-none" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-b border-zinc-700 px-5 py-3 ${className}`}>{children}</div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-t border-zinc-700 px-5 py-3 ${className}`}>{children}</div>
  );
}
