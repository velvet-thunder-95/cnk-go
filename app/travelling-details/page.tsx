import Navbar from '@/app/components/navbar/Navbar';
import TravellerDetails from './components/patravellerDetails';
import OrderSummary from './components/summary';

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 items-center md:grid-cols-5 xl:min-w-[1200px] 2xl:min-w-[1600px]">
        <div className="md:col-span-3">
          <TravellerDetails />
        </div>
        <div className="px-2 md:col-span-2">
          <OrderSummary
            image="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmFsaSUyMHJlc29ydHxlbnwwfDB8MHx8fDA%3D"
            date="Aug 12 – Aug 19, 2024"
            nights={7}
            travellers={2}
            hotel="The St. Regis Bali Resort"
            priceRows={[
              { label: 'Flight + Hotel', amount: 2598 },
              { label: 'Visa Fees', amount: 70 },
              { label: 'Taxes & Fees', amount: 230 },
              { label: 'Package Savings', amount: 800, isDiscount: true },
            ]}
            totalPrice={2098}
          />
        </div>
      </div>
    </>
  );
}
