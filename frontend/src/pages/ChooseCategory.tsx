import { useNavigate } from "react-router-dom";
import { motion, Variants } from "framer-motion";
import { ArrowLeft, Laptop, GraduationCap, Calendar, Building2 } from "lucide-react";
import { useState, useMemo } from "react";
import NavbarSpon from "../components/navbarsponhome.jsx";
import NavbarHome from "../components/navbarhome.jsx";
import Footer from "../components/footer";

interface Category {
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  colorClass: string;
  gradient: string;
  isActive: boolean;
}

const categories: Category[] = [
  {
    name: "Tech",
    desc: "From software to AI solutions, build the future with experts.",
    icon: Laptop,
    link: "/posttask-tech",
    colorClass: "text-blue-600 bg-blue-50 border-blue-100 group-hover:bg-blue-600 group-hover:text-white",
    gradient: "from-blue-500 to-indigo-600",
    isActive: true,
  },
  {
    name: "Education",
    desc: "Tutors, e-learning content, and academic support on demand.",
    icon: GraduationCap,
    link: "/posttask-education",
    colorClass: "text-purple-600 bg-purple-50 border-purple-100 group-hover:bg-purple-600 group-hover:text-white",
    gradient: "from-purple-500 to-fuchsia-600",
    isActive: true,
  },
  // {
  //   name: "Healthcare",
  //   desc: "Medical writers, telehealth assistants, and research support.",
  //   icon: Heart,
  //   link: "#",
  //   colorClass: "text-rose-600 bg-rose-50 border-rose-100 group-hover:bg-rose-600 group-hover:text-white",
  //   gradient: "from-rose-500 to-pink-600",
  //   isActive: false,
  // },
  {
    name: "Event Management",
    desc: "Organizers, planners, and designers to make your events shine.",
    icon: Calendar,
    link: "/posttask-event",
    colorClass: "text-amber-600 bg-amber-50 border-amber-100 group-hover:bg-amber-600 group-hover:text-white",
    gradient: "from-amber-500 to-orange-600",
    isActive: true,
  },
  {
    name: "Architecture",
    desc: "3D designs, CAD models, and urban planning tasks made simple.",
    icon: Building2,
    link: "/posttask-architecture",
    colorClass: "text-slate-600 bg-slate-50 border-slate-200 group-hover:bg-slate-800 group-hover:text-white",
    gradient: "from-slate-600 to-gray-700",
    isActive: true,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

export default function ChooseCategory() {
  const Nav = useMemo(() => {
    const last = sessionStorage.getItem("lastHomeRoute");
    return last === "/sponsorshiphome" ? NavbarSpon : NavbarHome;
  }, []);

  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleCategoryClick = (category: Category) => {
    if (category.isActive && category.link !== "#") {
      navigate(category.link);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <Nav />

      {/* Subtle background flair */}
      <div className="absolute top-0 left-0 right-0 h-[500px] -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-slate-50 pointer-events-none" />

      <main className="flex-1 relative z-10">
        {/* Header with Back Button */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-6 pt-8 pb-4 max-w-7xl mx-auto w-full"
        >
          <button
            onClick={() => navigate("/home")}
            className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:text-slate-900 hover:shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </button>
        </motion.header>

        {/* Hero Section */}
        <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 tracking-tight text-slate-900">
              Choose Your <span className="text-blue-600">Category</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Select the category that best matches your task. We'll connect you with the right experts faster.
            </p>
          </motion.div>
        </section>

        {/* Categories Grid */}
        <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 mb-6 max-w-4xl mx-auto"
          >
            {categories.slice(0, 2).map((category, index) => (
              <CategoryCard
                key={category.name}
                category={category}
                index={index}
                isHovered={hoveredIndex === index}
                onHover={setHoveredIndex}
                onClick={handleCategoryClick}
              />
            ))}
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto"
          >
            {categories.slice(2, 4).map((category, index) => (
              <CategoryCard
                key={category.name}
                category={category}
                index={index + 2}
                isHovered={hoveredIndex === index + 2}
                onHover={setHoveredIndex}
                onClick={handleCategoryClick}
              />
            ))}
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

interface CategoryCardProps {
  category: Category;
  index: number;
  isHovered: boolean;
  onHover: (index: number | null) => void;
  onClick: (category: Category) => void;
}

function CategoryCard({ category, index, isHovered, onHover, onClick }: CategoryCardProps) {
  const Icon = category.icon;

  return (
    <motion.article
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => onHover(index)}
      onHoverEnd={() => onHover(null)}
      onClick={() => onClick(category)}
      className={`group relative rounded-xl border p-8 flex flex-col items-center text-center cursor-pointer transition-all duration-300 bg-white shadow-sm ${category.isActive
        ? 'border-slate-200 hover:border-blue-200 hover:shadow-lg'
        : 'border-slate-100 opacity-60 cursor-not-allowed grayscale'
        }`}
      tabIndex={0}
      role="button"
      aria-disabled={!category.isActive}
    >

      {/* Icon Container */}
      <div
        className={`mb-6 p-4 rounded-full border transition-colors duration-300 ${category.colorClass}`}
      >
        <Icon className="w-8 h-8" />
      </div>

      {/* Text Content */}
      <h3 className="text-xl font-bold mb-3 text-slate-900 group-hover:text-blue-600 transition-colors">
        {category.name}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed max-w-xs">
        {category.desc}
      </p>

      {/* Status Badge */}
      {!category.isActive && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wide">
          Coming Soon
        </div>
      )}
    </motion.article>
  );
}
