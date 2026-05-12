import Image from 'next/image';
import NavigationBtn from './NavigationBtns';

export default function Hero() {
  return (
    <div className="min-h-[480px] w-full bg-[#f5f3ef]">
      <div className="relative min-h-[480px] w-full text-white">
        <Image
          src="https://images.unsplash.com/photo-1559305289-4c31700ba9cb?q=80&w=1373&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Bali Image"
          fill
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 flex flex-col items-center gap-5 pt-20 text-center md:gap-7 md:pt-28">
          <h1 className="px-4 text-3xl font-bold md:text-5xl">Where do you want to go next?</h1>
          <p className="px-4 text-sm text-white/80 md:text-base">
            All-inclusive packages — flights, hotel &amp; visa — no hidden costs.
          </p>
          <NavigationBtn />
        </div>
      </div>
    </div>
  );
}
