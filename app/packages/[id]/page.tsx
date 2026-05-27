import BookingButtons from '@/components/details/BokingButtons';
import CostBreakdown from '@/components/details/CostBreakdown';
import DestinationCost from '@/components/details/DestinationCost';
import DestinationHero from '@/components/details/DetailsHero';
import FeaturedHotel from '@/components/details/FeaturedHotel';
import Flight from '@/components/details/Flight';
import FlightTiming from '@/components/details/FlightTiming';
import HotelCard from '@/components/details/Hotel';
import Visa from '@/components/details/Visa';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DestinationDetailsPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mb-10 px-3 md:px-8">
      <DestinationHero id={id} />
      <div className="grid gap-7 md:grid-cols-12">
        <div className="flex flex-col gap-[17px] text-white md:col-span-8">
          <DestinationCost id={id} />
          <CostBreakdown id={id} />
          <div className="flex flex-col gap-4 md:flex-row">
            <Visa id={id} />
            <Flight id={id} />
          </div>
          <HotelCard id={id} />
        </div>
        <div className="flex flex-col gap-[17px] md:col-span-4">
          <FlightTiming id={id} />
          <FeaturedHotel id={id} />
          <BookingButtons id={id} />
        </div>
      </div>
    </div>
  );
}
