// src/components/ui/NeonTooltip.jsx
import React from "react"
import { motion } from "framer-motion"

export default function NeonTooltip({ children, text }) {
  return (
    <div className="relative group w-full">
      {children}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileHover={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-50 
                   pointer-events-none whitespace-nowrap px-3 py-1.5 
                   rounded-lg text-xs font-semibold text-white 
                   bg-gray-900 shadow-lg"
      >
        {text}
      </motion.div>
    </div>
  )
}
