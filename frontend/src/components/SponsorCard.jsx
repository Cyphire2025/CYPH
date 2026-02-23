import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiHeart, FiShare2, FiUser, FiMail, FiPhone, FiX } from "react-icons/fi";
import { Star } from "lucide-react";
import toast from "react-hot-toast";

const SponsorCard = ({ sponsor, onContact, onSave, onShare, onClick }) => {
    const { _id, title, description, metadata = {}, logo, price, category } = sponsor;
    const { budgetRange, eventTypes = [], tier, companySize, industry } = metadata;
    const [isSaved, setIsSaved] = useState(false);
    const [showContact, setShowContact] = useState(false);

    const categories = Array.isArray(category) ? category : [category];
    const normalizedCategories = categories.map((c) => String(c || "").toLowerCase());
    const isSponsorship = normalizedCategories.includes("sponsorship");
    const isEvent = normalizedCategories.includes("event") || (!isSponsorship && !!metadata.contactEmail);
    const detailsPath = isSponsorship ? `/sponsorship/${_id}` : `/task/${_id}`;

    const handleSave = () => {
        setIsSaved(!isSaved);
        toast.success(isSaved ? "Removed from favorites" : "Added to favorites");
        onSave?.(_id, !isSaved);
    };

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}${detailsPath}`);
        toast.success("Link copied to clipboard!");
        onShare?.(_id);
    };

    const isPremium = tier === "premium";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl h-full
        ${isPremium
                    ? (isEvent ? "border-purple-200 bg-gradient-to-br from-white to-purple-50/50 shadow-purple-100" : "border-blue-200 bg-gradient-to-br from-white to-blue-50/50 shadow-blue-100")
                    : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                }`}
        >
            {/* Header Image / Logo Area */}
            <div className={`relative h-40 flex items-center justify-center overflow-hidden flex-shrink-0
        ${isPremium
                    ? (isEvent ? "bg-gradient-to-r from-purple-600 to-fuchsia-600" : "bg-gradient-to-r from-blue-600 to-indigo-600")
                    : "bg-slate-100 mx-4 mt-4 rounded-xl border border-slate-100"}`}>

                {/* Action Buttons (Top Right) */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleSave(); }}
                        className={`p-2 rounded-full backdrop-blur-md transition-all ${isPremium ? "bg-white/20 text-white hover:bg-white/30" : "bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm"}`}
                    >
                        <FiHeart className={`w-4 h-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleShare(); }}
                        className={`p-2 rounded-full backdrop-blur-md transition-all ${isPremium ? "bg-white/20 text-white hover:bg-white/30" : "bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 shadow-sm"}`}
                    >
                        <FiShare2 className="w-4 h-4" />
                    </button>
                </div>

                {isPremium && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-md border border-white/20">
                        <Star className="h-3 w-3 text-yellow-300 fill-current" />
                        PREMIUM
                    </div>
                )}

                {logo?.url ? (
                    <img src={logo.url} alt={`${title} logo`} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                    <span className={`text-sm font-medium italic ${isPremium ? "text-white/70" : "text-slate-400"}`}>
                        {title ? title.substring(0, 2).toUpperCase() : "No Logo"}
                    </span>
                )}
            </div>

            <div className="flex-1 p-5 flex flex-col">
                <div className="mb-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className={`text-lg font-bold text-slate-900 transition-colors line-clamp-1 ${isEvent ? "group-hover:text-purple-600" : "group-hover:text-blue-600"}`} title={title}>
                                {title}
                            </h3>
                            {industry && (
                                <span className="text-xs font-medium text-slate-500">
                                    {industry}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{description}</p>

                <div className="space-y-2.5 text-sm mt-auto">
                    {budgetRange && (
                        <div className="flex items-center justify-between py-2 border-t border-slate-100">
                            <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Budget</span>
                            <span className="font-semibold text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-xs">{budgetRange}</span>
                        </div>
                    )}

                    {companySize && (
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500">Company Size</span>
                            <span className="text-slate-700 font-medium">{companySize}</span>
                        </div>
                    )}

                    {eventTypes.length > 0 && (
                        <div className="pt-2">
                            <div className="flex flex-wrap gap-1.5">
                                {eventTypes.slice(0, 3).map((et) => (
                                    <span key={et} className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${isEvent ? "text-purple-600 border-purple-200" : "text-blue-600 border-blue-200"}`}>
                                        {et}
                                    </span>
                                ))}
                                {eventTypes.length > 3 && (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-500 border border-slate-200">
                                        +{eventTypes.length - 3}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                    <button
                        onClick={() => onClick ? onClick(sponsor) : window.location.href = detailsPath}
                        className={`block w-full text-center rounded-xl py-2.5 px-4 text-sm font-semibold transition-all duration-200 
                        ${isPremium
                                ? (isEvent ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/20" : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20")
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900"}`}
                    >
                        View Details
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default React.memo(SponsorCard);
