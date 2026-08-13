import type { ElementType, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export default function Card({ children, className = "", as: Component = "div" }: CardProps) {
  return (
    <Component className={`rounded-lg border border-zinc-200 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </Component>
  );
}
