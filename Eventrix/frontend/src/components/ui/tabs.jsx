import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className = '', children, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 p-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 select-none overflow-x-auto max-w-full scrollbar-none",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ value, activeValue, children, className = '', ...props }) {
  const isSelected = activeValue === value;

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "relative px-4 py-2 rounded-full text-xs font-semibold transition-colors duration-150 focus:outline-none cursor-pointer whitespace-nowrap z-10",
        isSelected ? "text-white" : "text-slate-600 hover:text-slate-900",
        className
      )}
      {...props}
    >
      {isSelected && (
        <motion.div
          layoutId="activeCategoryPill"
          transition={{ type: "spring", stiffness: 450, damping: 35 }}
          className="absolute inset-0 bg-[#075985] rounded-full shadow-md shadow-[#075985]/25 -z-10"
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className = '', ...props }) {
  return (
    <TabsPrimitive.Content
      className={cn("focus:outline-none focus:ring-0", className)}
      {...props}
    />
  );
}
