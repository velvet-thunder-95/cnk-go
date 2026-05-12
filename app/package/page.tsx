import FlightDetails from './components/flightDetails';
import Hero from './components/Hero';
import HotelAccommodation from './components/Hotels';
import SecNav from './components/SecNav';
import VisaRequirements from './components/visa';
import Inclusions, { Coffee, Car, GlassWater } from './components/Inclusions';
import Navbar from '@/app/components/navbar/Navbar';
import BookingCard from './components/BookingCard';

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <SecNav />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-9">
          <div className="flex flex-col gap-6 lg:col-span-6">
            <FlightDetails
              from="OAK"
              to="DXB"
              departureTime="10:30 AM"
              arrivalTime="8:45 PM"
              airline="Emirates"
              duration="22h 15m"
              nextDay={true}
            />
            <HotelAccommodation
              name="The St. Regis Bali Resort"
              image="https://your-image-url.jpg"
              stars={5}
              roomType="St. Regis Pool Suite"
              bedType="1 King Bed"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <VisaRequirements visaType="Tourist e-Visa (B211A)" processingTime="3-5 days" />
              <Inclusions
                items={[
                  { label: 'Daily Breakfast', icon: Coffee },
                  { label: 'Airport Transfers', icon: Car },
                  { label: 'Welcome Drinks', icon: GlassWater },
                ]}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="sticky top-6">
              <BookingCard originalPrice={1299} discountedPrice={899} date="Aug 12 – Aug 19" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
