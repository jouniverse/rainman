import Navbar from '../components/layout/Navbar';

export default function VideoPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 pt-16">
        <div className="max-w-4xl mx-auto p-8">
          <h1 className="text-3xl font-bold text-white mb-8">App Walkthrough</h1>
          <div className="aspect-w-16 aspect-h-9">
            <iframe
              src="https://www.youtube.com/embed/your-video-id"
              title="Rainman App Walkthrough"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </div>
        </div>
      </div>
    </>
  );
} 