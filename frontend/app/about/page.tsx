"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";

// --------------------------------------------------
// ANIMATION WRAPPERS
// --------------------------------------------------

const globalEase = [0.22, 1, 0.36, 1];

function FadeIn({
  children,
  delay = 0,
  duration = 0.8,
  y = 20,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration, delay, ease: globalEase }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Stagger({
  children,
  staggerDelay = 0.15,
  className = "",
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({
  children,
  y = 20,
  duration = 0.6,
}: {
  children: React.ReactNode;
  y?: number;
  duration?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, ease: globalEase },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// --------------------------------------------------
// PAGE COMPONENT
// --------------------------------------------------

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#eaeaea] selection:bg-[#eaeaea] selection:text-black font-sans">
      <main className="max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center">
        
        {/* 1. HERO SECTION */}
        <section className="min-h-[40vh] flex flex-col items-center justify-center text-center space-y-4 mb-32 w-full">
          <FadeIn delay={0.2} duration={0.8} y={15}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white">
              About Velvet Syndicate
            </h1>
            <p className="mt-4 text-lg md:text-xl text-[#9ca3af] tracking-wide font-light lowercase">
              minimal luxury line
            </p>
          </FadeIn>
        </section>

        {/* 2. STORY SECTION */}
        <section className="w-full max-w-2xl mx-auto mb-40 text-lg md:text-xl leading-relaxed text-[#eaeaea] space-y-8 font-light">
          <Stagger staggerDelay={0.15}>
            <StaggerItem>
              <p>
                Not everything starts with a plan. Some things start with a conversation.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p>
                It began casually, an idea originating from Soumojeet that hovered between ambition and possibility. It wasn't a rigid business blueprint, but rather a shared realization. During our discussions, a simple thought crystallized: we could actually build this.
              </p>
            </StaggerItem>
            <StaggerItem>
              <p>
                That realization marked the transition from an abstract idea to deliberate execution. What started as a dialogue has evolved into an active, ongoing pursuit. We are now building this together—focused on craftsmanship, control, and a singular vision for minimal luxury.
              </p>
            </StaggerItem>
          </Stagger>
        </section>

        {/* 3. FOUNDERS SECTION */}
        <section className="w-full max-w-5xl mx-auto mb-40">
          <Stagger staggerDelay={0.2} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Soumojeet Das */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.96 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.5, ease: globalEase },
                },
              }}
              whileHover={{ 
                y: -4, 
                boxShadow: "0px 20px 40px rgba(255,255,255,0.03)",
                transition: { duration: 0.25, ease: "easeOut" }
              }}
              className="group relative flex flex-col rounded-xl overflow-hidden bg-white/[0.01] border border-white/[0.04] p-6 transition-colors hover:bg-white/[0.03]"
            >
              <div className="relative w-full aspect-[4/5] mb-6 overflow-hidden rounded-lg bg-white/[0.02]">
                <motion.div 
                  className="absolute inset-0 w-full h-full"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Image 
                    src="/founders/soumojeet.png" 
                    alt="Soumojeet Das" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                </motion.div>
              </div>
              <div className="flex flex-col space-y-1">
                <h3 className="text-xl font-medium text-white tracking-wide">Soumojeet Das</h3>
                <p className="text-sm text-[#9ca3af] font-medium tracking-wider uppercase pb-2">
                  Founder & Creative Director
                </p>
                <p className="text-[#9ca3af] font-light leading-relaxed">
                  Originated the idea. Defines the brand identity and vision.
                </p>
                <p className="text-xs text-[#6b7280] mt-4 tracking-widest uppercase pt-2 border-t border-white/5">
                  245/2 Road, Raninagar, P.O. Gora, India
                </p>
              </div>
            </motion.div>

            {/* Mehefuz Alam Khan */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.96 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.5, ease: globalEase },
                },
              }}
              whileHover={{ 
                y: -4, 
                boxShadow: "0px 20px 40px rgba(255,255,255,0.03)",
                transition: { duration: 0.25, ease: "easeOut" }
              }}
              className="group relative flex flex-col rounded-xl overflow-hidden bg-white/[0.01] border border-white/[0.04] p-6 transition-colors hover:bg-white/[0.03]"
            >
              <div className="relative w-full aspect-[4/5] mb-6 overflow-hidden rounded-lg bg-white/[0.02]">
                <motion.div 
                  className="absolute inset-0 w-full h-full"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Image 
                    src="/founders/mehefuz.jpg" 
                    alt="Mehefuz Alam Khan" 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                </motion.div>
              </div>
              <div className="flex flex-col space-y-1">
                <h3 className="text-xl font-medium text-white tracking-wide">Mehefuz Alam Khan</h3>
                <p className="text-sm text-[#9ca3af] font-medium tracking-wider uppercase pb-2">
                  Technical Lead & Developer
                </p>
                <p className="text-[#9ca3af] font-light leading-relaxed">
                  Built the entire platform. Handles development, system, and UI execution.
                </p>
                <p className="text-xs text-[#6b7280] mt-4 tracking-widest uppercase pt-2 border-t border-white/5">
                  47R7+JR, Murshidabad, Talgachi, West Bengal 742149
                </p>
              </div>
            </motion.div>

          </Stagger>
        </section>

        {/* 4. CLOSING LINE */}
        <section className="w-full pb-24 text-center">
          <FadeIn delay={0.5} duration={1} y={10}>
            <div className="inline-block relative">
              <span className="text-sm text-[#9ca3af] font-light tracking-[0.2em] uppercase transition-all duration-700 hover:tracking-[0.3em] cursor-default">
                Velvet Syndicate
              </span>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-[#eaeaea]/30 transition-all duration-700 hover:w-full" />
            </div>
          </FadeIn>
        </section>

      </main>
    </div>
  );
}
