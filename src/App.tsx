import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, LayoutDashboard, LogOut, Menu, X, ChevronRight, Navigation } from 'lucide-react';
import SuggestPlace from './pages/SuggestPlace';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import TravelPlanner from './pages/TravelPlanner';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const LocationPrompt = ({ onAllow, onDecline }: { onAllow: () => void, onDecline: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-gray-100"
      >
        <div className="w-16 h-16 bg-[#5D5FEF]/10 text-[#5D5FEF] rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <Navigation size={32} />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Enable Location?</h2>
        <p className="text-gray-500 text-center mb-8">
          TripSutra uses your location to show heritage sites and hidden gems near you.
        </p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={onAllow}
            className="w-full bg-[#5D5FEF] text-white py-4 rounded-2xl font-bold hover:bg-[#4B4DCC] transition-all shadow-lg shadow-[#5D5FEF]/20"
          >
            Allow Location
          </button>
          <button 
            onClick={onDecline}
            className="w-full bg-gray-50 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all"
          >
            Not Now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-[#5D5FEF] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight">
              Trip<span className="text-[#FFD700] italic font-serif">Sutra</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/suggest-place" 
              className={`flex items-center space-x-1 hover:text-[#FFD700] transition-colors ${isActive('/suggest-place') ? 'text-[#FFD700]' : ''}`}
            >
              <Plus size={18} />
              <span>Suggest a Place</span>
            </Link>
            <Link 
              to="/admin" 
              className={`flex items-center space-x-1 hover:text-[#FFD700] transition-colors ${isActive('/admin') ? 'text-[#FFD700]' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Admin</span>
            </Link>
            {user && (
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-1 hover:text-red-300 transition-colors"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#4B4DCC] border-t border-[#6B6DFF]"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link 
                to="/suggest-place" 
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#5D5FEF]"
              >
                Suggest a Place
              </Link>
              <Link 
                to="/admin" 
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-[#5D5FEF]"
              >
                Admin Dashboard
              </Link>
              {user && (
                <button 
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-[#5D5FEF]"
                >
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Home = () => (
  <div className="min-h-[calc(100-4rem)] bg-[#F8F9FD]">
    <div className="bg-[#5D5FEF] text-white py-20 px-4 text-center relative overflow-hidden">
      {/* Decorative circles from screenshot */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-[#4B4DCC] rounded-full opacity-50 blur-3xl"></div>
      <div className="absolute bottom-[-20px] left-[-20px] w-48 h-48 bg-[#6B6DFF] rounded-full opacity-30 blur-2xl"></div>
      <div className="absolute top-10 right-20 w-8 h-8 bg-[#FF5E5E] rounded-full"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        <p className="text-lg mb-2 opacity-90">Welcome,</p>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
          Plan your trip<br />
          with <span className="text-[#FFD700] italic font-serif">TripSutra</span>
        </h1>
        <p className="text-xl opacity-80 mb-10 max-w-xl mx-auto">
          Discover hidden local stops, heritage & stays around you. Help us grow by suggesting new places!
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/suggest-place" 
            className="bg-white text-[#5D5FEF] px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
          >
            <Plus size={20} />
            Suggest a New Place
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/admin" 
            className="bg-[#4B4DCC] text-white border border-[#6B6DFF] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-[#5D5FEF] transition-all"
          >
            Admin Dashboard
          </Link>
        </div>
      </motion.div>
    </div>

    <div className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <div className="w-1 h-6 bg-[#5D5FEF] rounded-full"></div>
        Trip Tools
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Nearby Attractions', subtitle: 'Heritage & Gems', icon: '🏛️', color: 'bg-purple-50' },
          { title: 'Nearby Hotels', subtitle: 'Find your stay', icon: '🏨', color: 'bg-blue-50' },
          { title: 'Local Food', subtitle: 'Taste the culture', icon: '🍲', color: 'bg-orange-50' },
          { title: 'Events', subtitle: 'What\'s happening', icon: '📅', color: 'bg-green-50' },
        ].map((tool, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className={`p-6 rounded-[24px] ${tool.color} border border-white shadow-sm flex flex-col items-start gap-4 cursor-pointer`}
          >
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">
              {tool.icon}
            </div>
            <div>
              <h3 className="font-bold text-lg">{tool.title}</h3>
              <p className="text-gray-500 text-sm">{tool.subtitle}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default function App() {
  console.log("App component rendering...");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  useEffect(() => {
    const testWrite = async () => {
      try {
        const { collection, addDoc } = await import('firebase/firestore');
        const { db } = await import('./firebase');
        await addDoc(collection(db, '_test_writes'), { 
          timestamp: Date.now(),
          message: 'App initialized'
        });
        console.log("✅ Test write to Firestore successful");
      } catch (e) {
        console.error("❌ Test write to Firestore failed:", e);
      }
    };
    testWrite();
  }, []);

  useEffect(() => {
    const hasPrompted = localStorage.getItem('locationPrompted');
    if (!hasPrompted) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowLocationPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllowLocation = () => {
    localStorage.setItem('locationPrompted', 'true');
    localStorage.setItem('locationPermission', 'granted');
    setShowLocationPrompt(false);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => toast.success("Location access granted!"),
        () => toast.error("Could not access location. Please check browser settings."),
        { enableHighAccuracy: true }
      );
    }
  };

  const handleDeclineLocation = () => {
    localStorage.setItem('locationPrompted', 'true');
    localStorage.setItem('locationPermission', 'denied');
    setShowLocationPrompt(false);
    toast.info("Location access declined. You can still use the app manually.");
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#F8F9FD] font-sans text-[#1A1A1A]">
        <AnimatePresence>
          {showLocationPrompt && (
            <LocationPrompt 
              onAllow={handleAllowLocation} 
              onDecline={handleDeclineLocation} 
            />
          )}
        </AnimatePresence>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/suggest-place" element={<SuggestPlace onShowPrompt={() => setShowLocationPrompt(true)} />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/travel-planner" element={<TravelPlanner />} />
          </Routes>
        </main>
        <Toaster position="top-right" richColors closeButton />
      </div>
    </Router>
  );
}
