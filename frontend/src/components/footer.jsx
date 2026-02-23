// src/components/Footer.jsx
import React from "react";
import { Star } from "lucide-react"; // or use react-icons if you prefer
import { motion } from "framer-motion";

// Gradient text helper (optional, for brand name styling)
const GradientText = ({ children }) => (
  <span className="text-blue-600 font-bold tracking-tight">
    {children}
  </span>
);

export default function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="mx-auto mt-10 max-w-7xl px-6 pb-12 pt-10 text-sm text-gray-500"
    >
      <div className="grid gap-8 md:grid-cols-4">
        {/* Brand */}
        <div>
          <div className="text-lg font-semibold text-slate-900">
            <GradientText>Cyphire</GradientText>
          </div>
          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            The operating system for high-trust freelance work.
            Escrow-protected workflows, automated contracts, and
            instant payouts for the modern workforce.
          </p>
        </div>

        {/* Product */}
        <div>
          <div className="mb-2 font-medium text-slate-900">Product</div>
          <ul className="space-y-1">
            <li className="hover:text-blue-600 transition-colors cursor-pointer">How it works</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Pricing</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Escrow</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Templates</li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className="mb-2 font-medium text-slate-900">Company</div>
          <ul className="space-y-1">
            <li className="hover:text-blue-600 transition-colors cursor-pointer">About</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Careers</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Press Kit</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Contact</li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <div className="mb-2 font-medium text-slate-900">Legal</div>
          <ul className="space-y-1">
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Terms</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Privacy</li>
            <li className="hover:text-blue-600 transition-colors cursor-pointer">Security</li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-slate-200 pt-6">
        <div>© {new Date().getFullYear()} Cyphire. All rights reserved.</div>
        <div className="inline-flex items-center gap-2 text-slate-500">
          <Star className="h-4 w-4 text-blue-500" /> Built with care
        </div>
      </div>
    </motion.footer>
  );
}
