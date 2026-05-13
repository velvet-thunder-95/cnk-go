import Navbar from '@/app/components/navbar/Navbar';
import { HeroImage } from './HeroImage';
import SignIn from './form';

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="mb-20 grid md:grid-cols-2">
        <div className="col-span-1 hidden md:block">
          <HeroImage
            src="/images/bali.jpg"
            avatars={['/avatars/user1.jpg', '/avatars/user2.jpg', '/avatars/user3.jpg']}
          />
        </div>
        <div className="md:col-span-1">
          <SignIn />
        </div>
      </div>
    </>
  );
}
