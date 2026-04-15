import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  orderBy,
  where
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import { styles } from '../theme';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Check, 
  X, 
  Trash2, 
  ExternalLink, 
  MapPin, 
  Clock, 
  Tag,
  Loader2,
  ChevronDown,
  Lock,
  Sparkles,
  AlertTriangle,
  Globe
} from 'lucide-react';

import { AlertCircle } from 'lucide-react';

const AdminDashboard = () => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [refreshKey, setRefreshKey] = useState(0);

  const isFirebaseConfigured = !!auth && !!db;

  useEffect(() => {
    console.log("AdminDashboard mounted. Firebase configured:", isFirebaseConfigured);
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribeData: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log("No user logged in, redirecting to login...");
        navigate('/admin/login');
        return;
      }

      console.log("User logged in:", user.email, "UID:", user.uid);

      // Only fetch data if user is logged in
      const q = query(
        collection(db, 'place_suggestions'), 
        orderBy('created_at', 'desc')
      );

      console.log("Setting up Firestore listener for 'place_suggestions'...");
      unsubscribeData = onSnapshot(q, (snapshot) => {
        console.log(`Successfully fetched ${snapshot.size} suggestions.`);
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData
          };
        });
        setSuggestions(data);
        setLoading(false);
        setIsAuthorized(true);
      }, (error) => {
        console.error("Firestore subscription error:", error);
        if (error.code === 'permission-denied') {
          console.warn("Access denied for user:", user.email);
          setIsAuthorized(false);
        } else {
          handleFirestoreError(error, OperationType.LIST, 'place_suggestions');
        }
        setLoading(false);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeData) unsubscribeData();
    };
  }, [navigate, isFirebaseConfigured, refreshKey]);

  const handleApprove = async (suggestion: any) => {
    try {
      // 1. Add to approved_places
      await addDoc(collection(db, 'approved_places'), {
        place_name: suggestion.place_name,
        category: suggestion.category,
        description: suggestion.description,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        city: suggestion.city,
        state: suggestion.state,
        country: suggestion.country,
        image_url: suggestion.image_url,
        approved_at: new Date().toISOString(),
        original_suggestion_id: suggestion.id
      });

      // 2. Update status in place_suggestions
      await updateDoc(doc(db, 'place_suggestions', suggestion.id), {
        status: 'approved'
      });

      toast.success(`${suggestion.place_name} approved!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'approved_places/place_suggestions');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'place_suggestions', id), {
        status: 'rejected'
      });
      toast.info("Suggestion rejected");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `place_suggestions/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'place_suggestions', id));
      toast.success("Suggestion deleted permanently");
    } catch (error) {
      console.error("Delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, `place_suggestions/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSuggestions = suggestions.filter(s => {
    const matchesStatus = filter === 'all' ? true : s.status === filter;
    const matchesCategory = categoryFilter === 'All' ? true : s.category === categoryFilter;
    const placeName = s.place_name || '';
    const city = s.city || '';
    const matchesSearch = placeName.toLowerCase().includes(search.toLowerCase()) || 
                         city.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  if (!isFirebaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-12 rounded-[32px] shadow-xl border border-orange-50">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Firebase Not Connected</h2>
          <p className="text-gray-600 text-lg mb-8">
            To use the admin dashboard, you must add your Firebase API keys to the environment variables.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-8">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Globe size={18} />
                For Netlify
              </h3>
              <ul className="text-sm text-blue-700 space-y-2 list-disc list-inside">
                <li>Go to <strong>Site settings</strong></li>
                <li>Go to <strong>Environment variables</strong></li>
                <li>Add all required keys</li>
                <li>Trigger a new deploy</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
              <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                <Sparkles size={18} />
                For AI Studio
              </h3>
              <ul className="text-sm text-purple-700 space-y-2 list-disc list-inside">
                <li>Open the <strong>Settings</strong> menu</li>
                <li>Go to <strong>Environment Variables</strong></li>
                <li>Add all required keys</li>
                <li>The preview will refresh</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#5D5FEF]" size={48} />
      </div>
    );
  }

  const bootstrapAdmin = async () => {
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', auth.currentUser!.uid), {
        email: auth.currentUser!.email,
        role: 'admin',
        created_at: Date.now()
      });
      toast.success("Admin profile bootstrapped! Reloading...");
      window.location.reload();
    } catch (error) {
      console.error("Bootstrap error:", error);
      toast.error("Failed to bootstrap admin profile. You might not have permission.");
    }
  };

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You are logged in as <span className="font-semibold">{auth.currentUser?.email}</span>, but you do not have administrator privileges.
          </p>
          
          <div className="bg-gray-50 p-4 rounded-xl text-left text-xs font-mono mb-6 overflow-auto">
            <p className="font-bold mb-1 text-gray-400 uppercase">Debug Info:</p>
            <p>UID: {auth.currentUser?.uid}</p>
            <p>Email: {auth.currentUser?.email}</p>
            <p>Verified: {auth.currentUser?.emailVerified ? 'Yes' : 'No'}</p>
            <p>Provider: {auth.currentUser?.providerData[0]?.providerId}</p>
          </div>

          <div className="flex flex-col gap-3">
            {auth.currentUser?.email === 'hemantpande406@gmail.com' && (
              <button 
                onClick={bootstrapAdmin}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                Bootstrap Admin Profile
              </button>
            )}
            <button 
              onClick={() => auth.signOut()}
              className="w-full bg-white border-2 border-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-50 transition-all"
            >
              Sign Out & Try Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Review and manage place suggestions</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button> */}
          <button 
            onClick={() => auth.signOut()}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex">
            {['pending', 'approved', 'rejected', 'all'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === s ? 'bg-[#5D5FEF] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-2 relative">
          <input 
            type="text" 
            placeholder="Search by name or city..." 
            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-[#5D5FEF] outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
        </div>
        
        <div className="relative">
          <select 
            className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 appearance-none focus:ring-2 focus:ring-[#5D5FEF] outline-none"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {["Temple", "Monument", "Restaurant", "Hotel", "Tourist Attraction", "Other"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={18} />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl py-3 px-4 flex items-center justify-between">
          <span className="text-gray-500 text-sm">Total Results:</span>
          <span className="font-bold text-[#5D5FEF]">{filteredSuggestions.length}</span>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((s) => (
              <motion.div 
                layout
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className={`flex flex-col md:flex-row ${!s.ai_verification?.is_real ? 'border-2 border-red-500 bg-red-50/30' : ''}`}>
                  <div className="md:w-64 h-64 md:h-auto overflow-hidden bg-gray-100 flex-shrink-0 relative group">
                    <img 
                      src={s.image_url || `https://picsum.photos/seed/${s.id}/600/400`} 
                      alt={s.place_name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.warn(`Image load failed for ${s.place_name}: ${s.image_url}. Using fallback.`);
                        e.currentTarget.src = `https://picsum.photos/seed/${s.id}_fallback/600/400`;
                      }}
                    />
                    {(!s.image_url || s.image_url === '') && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-white/90 px-4 py-3 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center gap-2">
                          <AlertTriangle size={24} className="text-orange-500" />
                          <div className="text-center">
                            <span className="block text-[10px] font-bold text-gray-800 uppercase tracking-widest">
                              No Image URL
                            </span>
                            <span className="text-[8px] text-gray-500">Placeholder Active</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {s.image_url && (
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                        <a 
                          href={s.image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-black/80 transition-colors"
                        >
                          <ExternalLink size={10} />
                          View Original
                        </a>
                        <div className="bg-black/60 backdrop-blur-md text-white text-[8px] px-2 py-1 rounded-lg break-all max-w-[200px]">
                          URL: {s.image_url.substring(0, 30)}...
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold">{s.place_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            s.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Tag size={14} className="text-[#5D5FEF]" />
                            {s.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={14} className="text-[#5D5FEF]" />
                            {s.city}, {s.state}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} className="text-[#5D5FEF]" />
                            {(() => {
                              if (!s.created_at) return 'N/A';
                              if (typeof s.created_at.toDate === 'function') return s.created_at.toDate().toLocaleDateString();
                              if (typeof s.created_at === 'number' || typeof s.created_at === 'string') return new Date(s.created_at).toLocaleDateString();
                              return 'Invalid Date';
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a 
                          href={s.location_link || `https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 text-[#5D5FEF] bg-blue-50 hover:bg-[#5D5FEF] hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
                          title="View on Maps"
                        >
                          <ExternalLink size={20} />
                        </a>
                        <button 
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className={`p-2 rounded-lg transition-all ${
                            deletingId === s.id 
                              ? 'bg-red-100 text-red-500' 
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title="Delete"
                        >
                          {deletingId === s.id ? (
                            <Loader2 size={20} className="animate-spin" />
                          ) : (
                            <Trash2 size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">{s.description || 'No description provided.'}</p>

                    {/* Debug Info (Only for admins to see) */}
                    {/* <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-mono text-gray-400 overflow-hidden">
                      <p className="font-bold mb-1 text-gray-500 uppercase">System Debug:</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <p>ID: {s.id}</p>
                        <p>Img: {s.image_url ? '✅ Present' : '❌ Missing'}</p>
                        <p className="col-span-2 truncate">URL: {s.image_url || 'None'}</p>
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(s, null, 2));
                          toast.success("Suggestion JSON copied to clipboard!");
                        }}
                        className="mt-2 text-[8px] bg-gray-200 hover:bg-gray-300 text-gray-600 px-2 py-0.5 rounded transition-colors"
                      >
                        Copy Raw JSON
                      </button>
                    </div> */}

                    {/* AI Verification Badge */}
                    {s.ai_verification && (
                      <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${
                        s.ai_verification.is_real 
                          ? 'bg-green-50 border-green-100 text-green-800' 
                          : 'bg-red-50 border-red-100 text-red-800'
                      }`}>
                        <div className={`p-2 rounded-xl ${s.ai_verification.is_real ? 'bg-green-100' : 'bg-red-100'}`}>
                          {s.ai_verification.is_real ? <Sparkles size={18} /> : <AlertTriangle size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">AI Smart Verification</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              s.ai_verification.is_real ? 'bg-green-100 text-green-700' : 'bg-red-600 text-white animate-pulse'
                            }`}>
                              {s.ai_verification.is_real ? `Confident ${s.ai_verification.confidence}%` : 'FAKE / UNVERIFIED'}
                            </span>
                          </div>
                          <p className="text-xs opacity-90 leading-relaxed">
                            {s.ai_verification.summary}
                            {s.ai_verification.suggested_category && s.ai_verification.suggested_category !== s.category && (
                              <span className="block mt-1 font-semibold">
                                Suggested Category: {s.ai_verification.suggested_category}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {s.status === 'pending' && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleApprove(s)}
                          className="flex-1 bg-green-500 text-white font-bold py-2 px-4 rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                        >
                          <Check size={18} />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(s.id)}
                          className="flex-1 bg-white text-red-500 border border-red-200 font-bold py-2 px-4 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                        >
                          <X size={18} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-300" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-400">No suggestions found</h3>
              <p className="text-gray-400">Try adjusting your filters or search terms</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminDashboard;
