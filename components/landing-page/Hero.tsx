import React from 'react';
import { Compass, Radio, LayoutGrid } from 'lucide-react';

const features = [
  {
    icon: <Compass size={20} className="text-(--color-blue)" strokeWidth={1.8} />,
    title: 'DIRECT ACCESS TO 15+',
    subtitle: 'Optimized transit routes',
  },
  {
    icon: <Radio size={20} className="text-(--color-blue)" strokeWidth={1.8} />,
    title: 'REAL-TIME COMPUTATION',
    subtitle: 'Sub-second itinerary generation',
  },
  {
    icon: <LayoutGrid size={20} className="text-(--color-blue)" strokeWidth={1.8} />,
    title: 'COMPREHENSIVE COST FIX',
    subtitle: 'Zero variance fee structure',
  },
];

const Hero: React.FC = () => {
  return (
    <>
      <section className="relative flex min-h-[480px] w-full flex-col items-center justify-center overflow-hidden border border-[#E5E7EB] bg-white px-6 py-14 text-center shadow-[0_4px_32px_rgba(0,0,0,0.08)] md:px-10">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80')",
          }}
        />

        <div className="relative z-10 flex w-full max-w-[1200px] flex-col items-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white/[0.83] px-[18px] py-[6px] text-[13px] text-[#3D3D3D] backdrop-blur-sm">
            <span className="font-semibold text-(--color-blue)">{'{}'}</span>
            Plan your perfect getaway
          </span>

          <h1 className="font-abril hero-title-size hero-underline m-0 mb-1.5 w-full text-[70px] leading-none tracking-tight text-(--color-blue) uppercase">
            YOUR DREAM HOLIDAY
          </h1>

          <h2 className="font-gochi hero-sub-size m-0 mb-7 w-full text-[64px] leading-[1.1] tracking-[1px] text-[#908D8D] uppercase">
            PLANNED IN MINUTES
          </h2>

          <p className="hero-desc-size mx-auto mb-11 max-w-[520px] leading-[1.65] text-[#6B7280]">
            Analyze flight routes, accommodation metrics, and entry requirements. Direct access to
            data-driven travel itineraries with comprehensive cost indices.
          </p>

          <div className="flex w-full flex-wrap justify-center gap-5">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex max-w-[280px] flex-1 basis-[220px] items-center gap-3.5 rounded-[10px] border border-[#E5E7EB] bg-white/[0.83] px-5 py-4 text-left backdrop-blur-sm sm:max-w-full"
              >
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-(--color-blue)/10">
                  {feature.icon}
                </div>
                <div className="flex flex-col gap-[3px]">
                  <span className="text-[14px] leading-[1.2] font-bold tracking-[0.4px] text-black uppercase">
                    {feature.title}
                  </span>
                  <span className="text-[13px] leading-[1.3] text-[#6B7280]">
                    {feature.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
