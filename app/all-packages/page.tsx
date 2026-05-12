import Navbar from '@/app/components/navbar/Navbar';
import AnnouncementBar from './components/Announcement';
import FilterSidebar from './components/SideBar';
import PackageGrid from './components/AllPackages';
export default function Home() {
  return (
    <>
      <AnnouncementBar
        badge="FLASH SALE"
        message="Get an extra $500 off all Asia packages this weekend only!"
        expiresInSeconds={45900}
      />
      <Navbar />
      <div className="grid md:grid-cols-6">
        <div className="col-span-1">
          <FilterSidebar />
        </div>
        <div className="col-span-5">
          <PackageGrid />
        </div>
      </div>
    </>
  );
}
