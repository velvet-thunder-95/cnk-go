import React from 'react';
import { Compass, Radio, LayoutGrid } from 'lucide-react';

const features = [
  {
    icon: <Compass size={20} className="text-blue" strokeWidth={1.8} />,
    title: 'DIRECT ACCESS TO 15+',
    subtitle: 'Optimized transit routes',
  },
  {
    icon: <Radio size={20} className="text-blue" strokeWidth={1.8} />,
    title: 'REAL-TIME COMPUTATION',
    subtitle: 'Sub-second itinerary generation',
  },
  {
    icon: <LayoutGrid size={20} className="text-blue" strokeWidth={1.8} />,
    title: 'COMPREHENSIVE COST FIX',
    subtitle: 'Zero variance fee structure',
  },
];

const Hero: React.FC = () => {
  return (
    <>
      <section className="border-white-secondary relative flex min-h-120 w-full flex-col items-center justify-center overflow-hidden border bg-white px-6 py-14 text-center md:px-10">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80')",
          }}
        />

        <div className="relative z-10 flex w-full max-w-300 flex-col items-center">
          <span className="bg-blue/25 text-blue border-white-secondary mb-5 inline-flex items-center gap-2 rounded-full border px-4.5 py-1.5 text-[13px] backdrop-blur-sm">
            <span className="text-blue">{'{}'}</span>
            Plan your perfect getaway
          </span>

          <h1 className="font-abril hero-title-size text-blue m-0 mb-1.5 w-full text-[70px] leading-none tracking-tight uppercase">
            YOUR DREAM HOLIDAY
          </h1>

          <h2 className="font-gochi hero-sub-size m-0 mb-7 w-full text-[64px] leading-[1.1] tracking-[1px] text-[#908D8D] uppercase">
            PLANNED IN MINUTES
          </h2>

          <p className="text-md text-gray mx-auto mb-11 max-w-130 leading-[1.65]">
            Analyze flight routes, accommodation metrics, and entry requirements. Direct access to
            data-driven travel itineraries with comprehensive cost indices.
          </p>

          <div className="hidden w-fit flex-wrap justify-center gap-5 md:flex">
            {features.map((feature, index) => (
              <div
                key={index}
                className="border-white-secondary flex max-w-75 flex-1 basis-55 items-center gap-3.5 border bg-white/83 px-5 py-4 text-center text-left whitespace-nowrap backdrop-blur-sm sm:max-w-full md:min-w-80"
              >
                <div className="bg-blue/10 flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg">
                  {feature.icon}
                </div>
                <div className="flex flex-col gap-0.75">
                  <span className="text-[14px] leading-[1.2] font-bold tracking-[0.4px] text-black/80 uppercase">
                    {feature.title}
                  </span>
                  <span className="text-gray text-[13px] leading-[1.3]">{feature.subtitle}</span>
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
