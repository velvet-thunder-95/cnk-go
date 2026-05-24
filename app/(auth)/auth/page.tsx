'use client';
import Credentials from '@/components/login-page/Credentials';

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  console.log(params);
  const defaultTab = params.tab === 'signup' ? 'signup' : 'signin';

  return (
    <div className="flex h-screen w-full">
      <div
        className="relative hidden w-1/2 flex-col justify-end bg-cover bg-center p-10 md:flex"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=626&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10">
          <h2 className="text-6xl leading-tight font-bold text-white">The journey starts</h2>
          <p className="font-semibo mt-1 text-4xl text-white/90">with a single click.</p>
        </div>
      </div>
      <Credentials defaultTab={defaultTab} />
    </div>
  );
}
