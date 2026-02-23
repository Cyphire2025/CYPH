import React from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

export default function PaymentModal({
    show,
    onClose,
    upiId,
    setUpiId,
    onProceed
}) {
    return (
        <AnimatePresence>
            {show && (
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                >
                    <Motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md overflow-hidden rounded-3xl bg-[#121212] border border-white/10 shadow-2xl"
                    >
                        <div className="relative p-6 text-center">
                            <button onClick={onClose} className="absolute right-4 top-4 p-2 text-white/30 hover:text-white transition">
                                <X className="h-5 w-5" />
                            </button>
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-fuchsia-500/20 to-purple-500/20 text-fuchsia-400 ring-1 ring-fuchsia-500/30">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Enter UPI ID</h3>
                            <p className="mt-2 text-sm text-white/50">To receive your payment effortlessly.</p>

                            <div className="mt-6 space-y-4">
                                <input
                                    type="text"
                                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition text-center"
                                    placeholder="username@upi"
                                    value={upiId}
                                    onChange={e => setUpiId(e.target.value)}
                                />
                                <button
                                    onClick={onProceed}
                                    className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/20 hover:scale-[1.02] transition"
                                >
                                    Verify & Submit
                                </button>
                                <button onClick={onClose} className="text-sm text-white/40 hover:text-white">Cancel</button>
                            </div>
                        </div>
                    </Motion.div>
                </Motion.div>
            )}
        </AnimatePresence>
    );
}
