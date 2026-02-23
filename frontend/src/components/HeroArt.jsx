// src/components/HeroArt.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useAnimation } from "framer-motion";

import Test from "../assets/test.jpg";
import Test2 from "../assets/test2.jpg";
import Test3 from "../assets/test3.jpg";

const imgs = [Test, Test2, Test3];

const AUTO_SECONDS = 5;
const SLIDE_DURATION = 0.8; // faster but smooth
const EASE = [0.25, 1, 0.5, 1];
const DRAG_BUFFER = 60;

export const SwipeCarousel = () => {
  const [index, setIndex] = useState(0);
  const controls = useAnimation();
  const x = useMotionValue(0);

  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const slideRef = useRef(null);
  const intervalRef = useRef(null);

  const metricsRef = useRef({ step: 0 });

  // ✅ preload all images once
  useEffect(() => {
    imgs.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const computeMetrics = () => {
    if (!trackRef.current || !slideRef.current) return;
    const slideWidth = slideRef.current.clientWidth;
    const gap = parseFloat(getComputedStyle(trackRef.current).gap || "0");
    metricsRef.current.step = slideWidth + gap;
    controls.set({ x: -(metricsRef.current.step * index) });
    x.set(-(metricsRef.current.step * index));
  };

  useEffect(() => {
    computeMetrics();
    const ro = new ResizeObserver(computeMetrics);
    if (trackRef.current) ro.observe(trackRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    if (slideRef.current) ro.observe(slideRef.current);
    return () => ro.disconnect();
  }, []);

  const goTo = async (nextIdx) => {
    const { step } = metricsRef.current;
    const total = imgs.length;
    const safeIdx = ((nextIdx % total) + total) % total;
    setIndex(safeIdx);

    const targetX = -(step * safeIdx);
    await controls.start({
      x: targetX,
      transition: { duration: SLIDE_DURATION, ease: EASE },
    });
    x.set(targetX);
  };

  const startAuto = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        goTo(next);
        return next;
      });
    }, AUTO_SECONDS * 1000);
  };

  useEffect(() => {
    startAuto();
    return () => clearInterval(intervalRef.current);
  }, []);

  const onDragEnd = async () => {
    const { step } = metricsRef.current;
    const currentTarget = -(step * index);
    const delta = x.get() - currentTarget;

    if (delta <= -DRAG_BUFFER) {
      await goTo(index + 1);
    } else if (delta >= DRAG_BUFFER) {
      await goTo(index - 1);
    } else {
      await goTo(index);
    }
    startAuto();
  };

  const next = () => {
    goTo(index + 1);
    startAuto();
  };
  const prev = () => {
    goTo(index - 1);
    startAuto();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[380px] sm:h-[420px] md:h-[480px] lg:h-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md p-4 sm:p-5 md:p-6"
    >
      {/* glow backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -inset-24 mix-blend-screen">
          <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_25%,rgba(16,185,129,0.05),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_80%_75%,rgba(59,130,246,0.05),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(700px_circle_at_50%_50%,rgba(16,185,129,0.03),transparent_52%)]" />
        </div>
      </div>

      {/* track */}
      <motion.div
        ref={trackRef}
        className="flex h-full w-full gap-6 items-stretch will-change-transform"
        drag="x"
        dragConstraints={{ left: -9999, right: 9999 }}
        style={{ x }}
        animate={controls}
        onDragStart={() => clearInterval(intervalRef.current)}
        onDragEnd={onDragEnd}
      >
        {imgs.map((src, i) => (
          <div
            key={i}
            ref={i === 0 ? slideRef : null}
            className="basis-full shrink-0 h-full flex items-center justify-center"
          >
            <img
              src={src}
              alt=""
              className="aspect-square w-[95%] h-[95%] rounded-xl object-cover shadow-sm select-none border border-gray-100"
              draggable={false}
              loading="eager" // ✅ eager ensures no blank frame
            />
          </div>
        ))}
      </motion.div>

      {/* dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {imgs.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all ${i === index
                ? "bg-emerald-500 shadow-sm scale-110"
                : "bg-gray-200 hover:bg-gray-300"
              }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* arrows */}
      <button
        onClick={prev}
        className="group absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full border border-gray-100 bg-white/80 backdrop-blur-md hover:bg-white transition shadow-sm"
        aria-label="Previous image"
      >
        <svg className="h-4 w-4 text-gray-600 group-hover:text-emerald-600" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        onClick={next}
        className="group absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full border border-gray-100 bg-white/80 backdrop-blur-md hover:bg-white transition shadow-sm"
        aria-label="Next image"
      >
        <svg className="h-4 w-4 text-gray-600 group-hover:text-emerald-600" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* side fades */}
      <div className="pointer-events-none absolute top-0 left-0 bottom-0 w-16 bg-gradient-to-r from-white via-white/40 to-transparent" />
      <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-white via-white/40 to-transparent" />
    </div>
  );
};
