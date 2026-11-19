import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  className = '',
  maxWidth = 'max-w-3xl',
  onClose,
  isOpen = true,
  ...props
}) {
  return (
    <DialogPrimitive.Portal forceMount>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Ambient Backdrop */}
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[1050] bg-[#0F172A]/40 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>

            {/* Dialog Container with strict spring physics from playbook: stiffness 400, damping 30 */}
            <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-6 overflow-y-auto pointer-events-none">
              <DialogPrimitive.Content asChild {...props}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                  className={cn(
                    "relative w-full bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-100 overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col font-sans",
                    maxWidth,
                    className
                  )}
                >
                  {children}

                  {/* Close button with subtle tactile hover */}
                  <DialogPrimitive.Close asChild>
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 flex items-center justify-center shadow-md backdrop-blur-md transition-all active:scale-95 cursor-pointer border border-slate-100"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </DialogPrimitive.Close>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </>
        )}
      </AnimatePresence>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className = '', ...props }) {
  return <div className={cn("px-6 pt-6 pb-2", className)} {...props} />;
}

export function DialogTitle({ className = '', ...props }) {
  return (
    <DialogPrimitive.Title
      className={cn("text-2xl font-bold tracking-tight text-[#0F172A]", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className = '', ...props }) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-slate-500", className)}
      {...props}
    />
  );
}
