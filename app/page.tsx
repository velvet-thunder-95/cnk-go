import Hero from './components/hero/Hero';
import Navbar from '@/app/components/navbar/Navbar';
import Bar from './components/DecisionBar/Bar';

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Bar />
    </>
  );
}
