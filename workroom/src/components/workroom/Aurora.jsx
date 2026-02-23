import React from "react";

const Aurora = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50">
    <div className="absolute -left-20 -top-24 h-[26rem] w-[26rem] rounded-full bg-blue-300/30 blur-3xl" />
    <div className="absolute right-[-6rem] top-[20%] h-[24rem] w-[24rem] rounded-full bg-indigo-300/25 blur-3xl" />
    <div className="absolute bottom-[-8rem] left-[20%] h-[20rem] w-[28rem] rounded-full bg-cyan-200/35 blur-3xl" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.7),transparent_45%)]" />
  </div>
);

export default Aurora;
