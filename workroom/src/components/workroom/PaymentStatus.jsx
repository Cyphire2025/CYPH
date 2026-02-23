import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function PaymentStatus({
    verifying,
    verified,
    onComplete
}) {
    return (
        <AnimatePresence>
            {(verifying || verified) && (
                <Motion.div
                    key="verifying-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
                >
                    {!verified ? (
                        <Motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center gap-6"
                        >
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full border-4 border-white/10 border-t-fuchsia-500 animate-spin" />
                            </div>
                            <p className="text-lg font-medium text-white/80 animate-pulse">Verifying UPI ID...</p>
                        </Motion.div>
                    ) : (
                        <Motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="text-center"
                        >
                            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/20">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Verification Complete</h3>
                            <p className="mt-2 text-white/60">Payout initiated successfully.</p>
                            <button
                                onClick={onComplete}
                                className="mt-8 rounded-full bg-white px-8 py-3 text-sm font-bold text-black hover:bg-gray-200 transition"
                            >
                                Return to Dashboard
                            </button>
                        </Motion.div>
                    )}
                </Motion.div>
            )}
        </AnimatePresence>
    );
}
