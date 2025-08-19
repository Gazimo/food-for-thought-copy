import { motion } from "framer-motion";
import { memo, ReactNode } from "react";

interface PhaseRendererProps {
  phaseKey: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export const PhaseRenderer = memo(function PhaseRenderer({
  phaseKey,
  title,
  children,
  className = "",
}: PhaseRendererProps) {
  return (
    <motion.div
      key={phaseKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col gap-4 ${className}`}
    >
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </motion.div>
  );
});
