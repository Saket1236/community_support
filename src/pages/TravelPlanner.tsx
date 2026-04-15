import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Hotel, 
  Plane, 
  Loader2, 
  Star, 
  Calendar, 
  ChevronRight, 
  ArrowRight,
  Map as MapIcon,
  Globe,
  Info
} from 'lucide-react';
import { styles } from '../theme';
import { searchTravelOptions, TravelOptions } from '../services/geminiService';

const TravelPlanner = () => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TravelOptions | null>(null);
  const [locating, setLocating] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
          const data = await response.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || '';
            const state = data.address.state || '';
            setSource(`${city}${city && state ? ', ' : ''}${state}`);
            toast.success("Current location captured!");
          }
        } catch (err) {
          console.error("Reverse geocoding failed", err);
          toast.error("Failed to fetch address details");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        toast.error("Permission denied. Please allow location access.");
        setLocating(false);
      }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination) {
      toast.error("Please enter both source and destination");
      return;
    }

    setLoading(true);
    try {
      const data = await searchTravelOptions(source, destination);
      setResults(data);
      toast.success("Travel options found!");
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error(err.message || "Failed to fetch travel options. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] pb-20">
      {/* Hero Section */}
      <div className="bg-[#5D5FEF] text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#4B4DCC] rounded-full opacity-50 blur-3xl"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Smart Travel Planner
          </motion.h1>
          <p className="text-xl opacity-80 mb-8">
            Find the best flights and hotels for your next adventure.
          </p>

          <div className="bg-white rounded-[32px] p-6 shadow-2xl max-w-3xl mx-auto">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 text-left ml-4">From</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Source City"
                    className={`${styles.input} pl-12 pr-12 text-gray-900`}
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                  <MapPin className="absolute left-4 top-3.5 text-[#5D5FEF]" size={20} />
                  <button 
                    type="button"
                    onClick={handleLocateMe}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-[#5D5FEF] transition-colors"
                    title="Use current location"
                  >
                    {locating ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 text-left ml-4">To</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Destination City"
                    className={`${styles.input} pl-12 text-gray-900`}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                  <Globe className="absolute left-4 top-3.5 text-[#5D5FEF]" size={20} />
                </div>
              </div>

              <div className="md:col-span-2 mt-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className={`${styles.buttonPrimary} w-full flex items-center justify-center gap-2 py-4 text-lg shadow-lg shadow-[#5D5FEF]/30`}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
                  {loading ? 'Searching...' : 'Plan My Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-6xl mx-auto px-4 mt-12">
        <AnimatePresence mode="wait">
          {results ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Flights Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Plane size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">Available Flights</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {results.flights.map((flight, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`${styles.card} hover:shadow-md transition-shadow group`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-[#5D5FEF]">{flight.airline}</h3>
                          <p className="text-sm text-gray-500">{flight.stops}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{flight.price}</p>
                          <p className="text-xs text-gray-400">per person</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-6">
                        <div className="text-center">
                          <p className="text-lg font-bold">{flight.departure}</p>
                          <p className="text-xs text-gray-400 uppercase font-bold">{source.split(',')[0]}</p>
                        </div>
                        <div className="flex-1 px-4 flex flex-col items-center">
                          <p className="text-xs text-gray-400 mb-1">{flight.duration}</p>
                          <div className="w-full h-[2px] bg-gray-200 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border border-gray-200">
                              <Plane size={12} className="text-gray-400" />
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">{flight.arrival}</p>
                          <p className="text-xs text-gray-400 uppercase font-bold">{destination.split(',')[0]}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => toast.info("Flight booking will be implemented soon!")}
                        className="w-full py-3 rounded-xl border-2 border-[#5D5FEF] text-[#5D5FEF] font-bold hover:bg-[#5D5FEF] hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        Book Flight
                        <ArrowRight size={18} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Hotels Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                    <Hotel size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">Recommended Stays</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.hotels.map((hotel, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`${styles.card} p-0 overflow-hidden hover:shadow-lg transition-shadow group`}
                    >
                      <div className="h-48 relative">
                        <img 
                          src={hotel.image_url} 
                          alt={hotel.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold">{hotel.rating}</span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold">{hotel.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{hotel.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-6">
                          {hotel.amenities.slice(0, 3).map((amenity, idx) => (
                            <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                              {amenity}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div>
                            <p className="text-2xl font-bold text-[#5D5FEF]">{hotel.price}</p>
                            <p className="text-xs text-gray-400">per night</p>
                          </div>
                          <button 
                            onClick={() => toast.info("Hotel booking will be implemented soon!")}
                            className="bg-[#5D5FEF] text-white p-3 rounded-xl hover:bg-[#4B4DCC] transition-all shadow-md shadow-[#5D5FEF]/20"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-white rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-6 text-4xl">
                🌍
              </div>
              <h3 className="text-2xl font-bold mb-2">Ready to explore?</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Enter your source and destination above to find the best travel options for your trip.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TravelPlanner;
