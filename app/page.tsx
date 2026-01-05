import { TimezoneConverter } from "@/components/timezone-converter";
import { CurrentTime } from "@/components/current-time";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-start justify-start bg-[#eeeeee] p-4 relative overflow-hidden gap-12">
      <div className="relative z-10 w-full flex justify-center mt-16">
        <CurrentTime />
      </div>
      {/* <div className="relative z-10 w-full flex justify-center">
        <TimezoneConverter />
      </div> */}
    </main>
  );
}
