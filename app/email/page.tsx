import Navbar from '@/app/components/navbar/Navbar';
import { EmailConfirmation } from './email';

export default function Home() {
  return (
    <>
      <Navbar />
      <EmailConfirmation
        image="https://plus.unsplash.com/premium_photo-1677829177642-30def98b0963?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YmFsaXxlbnwwfHwwfHx8MA%3D%3D"
        destination="Bali, Indonesia"
        checkIn="Aug 12, 2024"
        checkOut="Aug 19, 2024"
        travelers="2 Adults"
        hotel="The St. Regis Bali Resort"
        refNumber="#IH-2024-8821"
      />
    </>
  );
}
