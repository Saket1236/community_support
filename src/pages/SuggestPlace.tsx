import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { compressImage, uploadToCloudinary } from '../lib/imageUtils';
import { styles } from '../theme';
import { MapPin, CheckCircle2, Loader2, Plus, Navigation, Link as LinkIcon, Globe, Map as MapIcon, Sparkles, Image as ImageIcon, X, AlertCircle, LogIn, AlertTriangle, Upload } from 'lucide-react';
import { verifyPlaceWithAI } from '../services/geminiService';

const categories = ["Temple", "Monument", "Restaurant", "Hotel", "Tourist Attraction", "Other"];

const SuggestPlace = ({ onShowPrompt }: { onShowPrompt: () => void }) => {
  const [formData, setFormData] = useState({
    place_name: '',
    category: '',
    description: '',
    latitude: 0,
    longitude: 0,
    city: '',
    state: '',
    country: '',
    image_url: '',
    location_link: '',
  });
  const [imageMethod, setImageMethod] = useState<'upload' | 'url'>('upload');
  const [loading, setLoading] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMethod, setLocationMethod] = useState<'current' | 'link' | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);

  console.log("SuggestPlace component rendering", { loading, aiVerifying, submitted });

  const isFirebaseConfigured = !!auth && !!db;

  useEffect(() => {
    console.log("SuggestPlace mounted. Firebase configured:", isFirebaseConfigured);
    console.log("Initial auth state:", auth?.currentUser?.email || 'Not logged in');
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((u: any) => {
        setUser(u);
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    console.log("Loading state changed:", loading);
  }, [loading]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in successfully!");
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error("Google Sign-In is not enabled in Firebase Console. Please enable it in the Authentication > Sign-in method tab.", {
          duration: 10000,
        });
      } else {
        toast.error("Login failed. Please try again.");
      }
    }
  };

  const parseGoogleMapsLink = (link: string) => {
    try {
      // Handle short links (requires fetching, but we can't easily do that here without a proxy)
      // So we'll focus on improving regex for full links
      
      // Pattern for @lat,lng (common in modern links)
      // Matches @12.345,67.890 or @12.345,67.890,17z
      const atMatch = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
      }

      // Pattern for place/Name/@lat,lng
      const placeAtMatch = link.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (placeAtMatch) {
        return { lat: parseFloat(placeAtMatch[1]), lng: parseFloat(placeAtMatch[2]) };
      }

      // Pattern for q=lat,lng
      const qMatch = link.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
      }

      // Pattern for ll=lat,lng
      const llMatch = link.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (llMatch) {
        return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
      }

      // Pattern for search/lat,lng
      const searchMatch = link.match(/\/search\/(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (searchMatch) {
        return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  const updateAddressFromCoords = async (lat: number, lng: number) => {
    const toastId = toast.loading("Fetching address details...");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
      const data = await response.json();
      
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county || '';
        const state = data.address.state || '';
        const country = data.address.country || '';
        
        setFormData(prev => ({ 
          ...prev, 
          city: city || prev.city, 
          state: state || prev.state, 
          country: country || prev.country 
        }));
        toast.success("Address details updated!", { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
      toast.error("Failed to fetch address details", { id: toastId });
    }
  };

  const handleLinkChange = async (link: string) => {
    setFormData(prev => ({ ...prev, location_link: link }));
    const coords = parseGoogleMapsLink(link);
    if (coords) {
      setFormData(prev => ({ 
        ...prev, 
        latitude: coords.lat, 
        longitude: coords.lng 
      }));
      toast.success("Coordinates extracted from link!");
      await updateAddressFromCoords(coords.lat, coords.lng);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      
      // Clean up previous preview URL if it exists
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }

      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      console.log("Image preview set:", objectUrl);

      // Start background upload immediately
      if (imageMethod === 'upload') {
        startBackgroundUpload(file);
      }
    }
  };

  const startBackgroundUpload = async (file: File) => {
    setUploadingImage(true);
    setUploadedImageUrl(null);
    const toastId = toast.loading("Uploading image in background...");

    try {
      let uploadData: Blob | File = file;
      if (file.size > 200 * 1024) {
        uploadData = await compressImage(file, 800, 0.5);
      }

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dfadnkpfd';
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gcm3qxnr';

      let url = '';
      if (cloudName && uploadPreset && cloudName !== 'YOUR_CLOUD_NAME') {
        url = await uploadToCloudinary(uploadData, cloudName, uploadPreset, (progress) => {
          toast.loading(`Uploading image: ${progress}%`, { id: toastId });
        });
      } else {
        const storageRef = ref(storage, `place_suggestions/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, uploadData);
        url = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              toast.loading(`Uploading image: ${Math.round(progress)}%`, { id: toastId });
            },
            reject,
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
          );
        }) as string;
      }

      setUploadedImageUrl(url);
      toast.success("Image ready!", { id: toastId });
    } catch (err: any) {
      console.error("Background upload failed:", err);
      toast.error("Image upload failed. You can try again.", { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    const permission = localStorage.getItem('locationPermission');
    if (permission === 'denied') {
      toast.warning("Location access was previously declined. Please enable it to use this feature.");
      onShowPrompt();
      return;
    }

    setLocating(true);
    setLocationMethod('current');
    
    // Force a fresh, high-accuracy reading
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`Location captured with accuracy: ${accuracy} meters`);
        
        localStorage.setItem('locationPermission', 'granted');
        setFormData(prev => ({ ...prev, latitude, longitude }));
        toast.success(`Location captured! (Accuracy: ${Math.round(accuracy)}m)`);
        
        await updateAddressFromCoords(latitude, longitude);
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error", error);
        let msg = "Could not get your location.";
        if (error.code === 1) {
          msg = "Permission denied. Please allow location access.";
          localStorage.setItem('locationPermission', 'denied');
          onShowPrompt();
        }
        if (error.code === 3) msg = "Location request timed out. Try again.";
        toast.error(msg);
        setLocating(false);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 handleSubmit triggered");
    
    if (!isFirebaseConfigured) {
      toast.error("Firebase is not configured.");
      return;
    }

    if (!formData.place_name || !formData.category) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Instant feedback
    setLoading(true);
    setAiVerifying(true);
    setError(null);
    const toastId = toast.loading("Submitting your suggestion...");

    // Image Validation
    if (imageMethod === 'upload' && !imageFile && !uploadedImageUrl) {
      toast.error("Please select an image.");
      setLoading(false);
      setAiVerifying(false);
      toast.dismiss(toastId);
      return;
    }

    if (uploadingImage) {
      toast.loading("Waiting for image upload to finish...", { id: toastId });
      // Wait for background upload if still in progress
      let attempts = 0;
      while (uploadingImage && attempts < 60) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      if (uploadingImage) {
        toast.error("Image upload timed out. Please try again.", { id: toastId });
        setLoading(false);
        setAiVerifying(false);
        return;
      }
    }

    const finalImageUrl = imageMethod === 'url' ? formData.image_url : uploadedImageUrl;
    if (!finalImageUrl) {
      toast.error("Image URL is missing. Please re-upload.", { id: toastId });
      setLoading(false);
      setAiVerifying(false);
      return;
    }

    try {
      // Parallel AI and DB Write
      console.log("Starting Parallel AI and DB Write");
      
      const aiPromise = verifyPlaceWithAI(
        formData.place_name,
        formData.category,
        formData.description,
        formData.city,
        formData.state
      ).catch(err => {
        console.warn("AI verification failed, using fallback", err);
        return { 
          isReal: true, 
          confidenceScore: 0, 
          summary: "Verification skipped due to error: " + (err instanceof Error ? err.message : String(err)),
          verified_at: new Date().toISOString()
        };
      });

      // We need the AI result to satisfy security rules, so we wait for it.
      // But it's already running in parallel with any other prep work.
      const aiResultData = await aiPromise;
      setAiResult(aiResultData);

      const docData = {
        place_name: formData.place_name.trim(),
        category: formData.category,
        description: formData.description?.trim() || '',
        latitude: isNaN(Number(formData.latitude)) ? 0 : Number(formData.latitude),
        longitude: isNaN(Number(formData.longitude)) ? 0 : Number(formData.longitude),
        city: formData.city?.trim() || '',
        state: formData.state?.trim() || '',
        country: formData.country?.trim() || '',
        image_url: finalImageUrl,
        location_link: formData.location_link?.trim() || '',
        status: 'pending',
        created_at: serverTimestamp(),
        submitted_by: auth.currentUser?.uid || null,
        ai_verification: {
          is_real: !!aiResultData.isReal,
          confidence: Number(aiResultData.confidenceScore) || 0,
          summary: aiResultData.summary || 'No summary provided',
          verified_at: aiResultData.verified_at || new Date().toISOString()
        }
      };

      console.log("Saving to Firestore with data:", docData);
      const docRef = await addDoc(collection(db, 'place_suggestions'), docData);

      console.log("✅ Firestore save successful! Document ID:", docRef.id);
      
      setSubmitted(true);
      toast.success("Submitted successfully!", { id: toastId });

    } catch (error: any) {
      console.error("Submission error:", error);
      const technicalError = error.message || String(error);
      toast.error(`Failed to submit: ${technicalError}`, { id: toastId });
      setError(`Submission failed: ${technicalError}`);
    } finally {
      setLoading(false);
      setAiVerifying(false);
    }
  };

  const resetForm = () => {
    setFormData({
      place_name: '',
      category: '',
      description: '',
      latitude: 0,
      longitude: 0,
      city: '',
      state: '',
      country: '',
      image_url: '',
      location_link: '',
    });
    setImageFile(null);
    setImagePreview(null);
    setSubmitted(false);
    setAiResult(null);
    setLocationMethod(null);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-12 rounded-[32px] shadow-xl border border-orange-50">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Firebase Not Connected</h2>
          <p className="text-gray-600 text-lg mb-8">
            To use the suggestion feature and image uploads, you must add your Firebase API keys to the environment variables.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-8">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <Globe size={18} />
                For Netlify
              </h3>
              <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                <li>Go to <strong>Site settings</strong></li>
                <li>Go to <strong>Environment variables</strong></li>
                <li>Add all required keys listed below</li>
                <li>Trigger a new deploy</li>
              </ol>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
              <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                <Sparkles size={18} />
                For AI Studio
              </h3>
              <ol className="text-sm text-purple-700 space-y-2 list-decimal list-inside">
                <li>Open the <strong>Settings</strong> menu</li>
                <li>Go to <strong>Environment Variables</strong></li>
                <li>Add all required keys listed below</li>
                <li>The preview will refresh</li>
              </ol>
            </div>
          </div>

          <div className="text-left bg-gray-50 p-6 rounded-2xl font-mono text-sm">
            <p className="mb-2 font-bold text-gray-700">Required Variables:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <code className="bg-white px-2 py-1 rounded border text-gray-500">VITE_FIREBASE_API_KEY</code>
              <code className="bg-white px-2 py-1 rounded border text-gray-500">VITE_FIREBASE_AUTH_DOMAIN</code>
              <code className="bg-white px-2 py-1 rounded border text-gray-500">VITE_FIREBASE_PROJECT_ID</code>
              <code className="bg-white px-2 py-1 rounded border text-gray-500">VITE_FIREBASE_STORAGE_BUCKET</code>
              <code className="bg-white px-2 py-1 rounded border text-gray-500">VITE_FIREBASE_APP_ID</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[32px] shadow-xl border border-green-50"
        >
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-4">Submission Successful!</h2>
          
          {aiResult && (
            <div className={`mb-8 p-6 rounded-2xl border flex flex-col items-center gap-4 ${
              aiResult.isReal 
                ? 'bg-green-50 border-green-100 text-green-800' 
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              <div className={`p-4 rounded-full ${aiResult.isReal ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {aiResult.isReal ? <Sparkles size={32} /> : <AlertTriangle size={32} />}
              </div>
              <div>
                <div className="flex flex-col items-center gap-1 mb-2">
                  <span className="font-bold text-xl">AI Smart Verification</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                    aiResult.isReal ? 'bg-green-200 text-green-800' : 'bg-red-600 text-white shadow-lg animate-pulse'
                  }`}>
                    {aiResult.isReal ? `Authentic (${aiResult.confidenceScore}%)` : 'FAKE / UNVERIFIED'}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed max-w-md mx-auto ${!aiResult.isReal ? 'text-red-600 font-medium' : 'opacity-90'}`}>
                  {aiResult.isReal 
                    ? aiResult.summary 
                    : (aiResult.confidenceScore === 0 
                        ? "Error: Invalid or nonsensical input detected. Please provide real information." 
                        : "This suggestion could not be automatically verified. Our admin team will check the details.")
                  }
                </p>
              </div>
            </div>
          )}

          <p className="text-gray-600 text-lg mb-8">
            Your suggestion for <span className="font-bold text-[#5D5FEF]">{formData.place_name}</span> has been submitted for approval! 
            Our admin team will review it shortly.
          </p>
          <button 
            onClick={resetForm}
            className={styles.buttonPrimary}
          >
            Suggest Another Place
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 relative">
      {/* AI Verification Overlay */}
      <AnimatePresence>
        {(loading || aiVerifying) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/80 backdrop-blur-md"
          >
            <div className="text-center max-w-md">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-[#5D5FEF]/20 rounded-full animate-ping"></div>
                <div className="absolute inset-0 bg-[#5D5FEF]/10 rounded-full animate-pulse"></div>
                <div className="relative flex items-center justify-center w-full h-full bg-white rounded-full shadow-xl border border-[#5D5FEF]/20">
                  <Sparkles size={40} className="text-[#5D5FEF] animate-bounce" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900">
                {aiVerifying ? "AI is analyzing your suggestion..." : "Saving your suggestion..."}
              </h2>
              <p className="text-gray-600 mb-6">
                {aiVerifying 
                  ? "Our AI is analyzing your suggestion to ensure authenticity and accuracy..." 
                  : "Finalizing your suggestion and saving it to our heritage database..."}
              </p>
              <div className="flex items-center justify-center gap-2 text-[#5D5FEF] font-medium">
                <Loader2 size={20} className="animate-spin" />
                <span>Please wait a moment...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Suggest a Place</h1>
        <p className="text-gray-500">Help us discover hidden gems and heritage sites.</p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col gap-3 text-red-700 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="flex-shrink-0 text-red-500" />
            <h3 className="font-bold text-lg">Submission Error</h3>
            <button 
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="bg-white/50 p-4 rounded-xl border border-red-100 font-mono text-sm break-all">
            {error}
          </div>
          <p className="text-xs opacity-80">
            Please check your internet connection and ensure all fields are valid. If you're using an image, wait for the "Image ready!" message.
          </p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className={styles.card}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus size={20} className="text-[#5D5FEF]" />
              Basic Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className={styles.label}>Place Name *</label>
                <input 
                  type="text" 
                  required
                  className={styles.input}
                  placeholder="e.g. Trimbakeshwar Temple"
                  value={formData.place_name}
                  onChange={e => setFormData({ ...formData, place_name: e.target.value })}
                />
              </div>

              <div>
                <label className={styles.label}>Category *</label>
                <select 
                  required
                  className={styles.input}
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.label}>Description</label>
                <textarea 
                  className={`${styles.input} h-32 resize-none`}
                  placeholder="Tell us more about this place..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* <div className={styles.card}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-orange-500" />
              Free Image Storage Alternative
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Firebase Storage is free up to 5GB, but if you want a truly unlimited alternative, you can use <strong>Cloudinary</strong>.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                <p className="text-xs font-bold text-orange-800 mb-1">How to set up Cloudinary:</p>
                <ol className="text-[11px] text-orange-700 space-y-1 list-decimal list-inside">
                  <li>Create a free account at <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="underline font-bold">cloudinary.com</a></li>
                  <li>Go to <strong>Settings</strong> &gt; <strong>Upload</strong> &gt; <strong>Add Upload Preset</strong></li>
                  <li>Set "Signing Mode" to <strong>Unsigned</strong> and save it</li>
                  <li>Add your <strong>Cloud Name</strong> and <strong>Preset Name</strong> to the app settings</li>
                </ol>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                <AlertTriangle size={14} />
                <span>If not configured, the app will use Firebase Storage by default.</span>
              </div>
            </div>
          </div> */}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={styles.label}>Place Image *</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setImageMethod('upload')}
                      className={`px-3 py-1 rounded-md transition-all ${imageMethod === 'upload' ? 'bg-white text-[#5D5FEF] shadow-sm' : 'text-gray-500'}`}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMethod('url')}
                      className={`px-3 py-1 rounded-md transition-all ${imageMethod === 'url' ? 'bg-white text-[#5D5FEF] shadow-sm' : 'text-gray-500'}`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {imageMethod === 'upload' ? (
                    <motion.div 
                      key="upload"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-50 min-h-[200px] ${
                        imagePreview ? 'border-[#5D5FEF] bg-[#5D5FEF]/5' : 'border-gray-200'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                      
                      {imagePreview ? (
                        <div className="relative w-full max-w-md aspect-video rounded-xl overflow-hidden shadow-lg border border-white/20">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white font-bold text-sm bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                              Click to Change
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageFile(null);
                              if (imagePreview.startsWith('blob:')) {
                                URL.revokeObjectURL(imagePreview);
                              }
                              setImagePreview(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                            <Upload size={32} />
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-gray-700">Click to upload image</p>
                            <p className="text-sm text-gray-400">PNG, JPG or WEBP (max. 5MB)</p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="url"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="relative">
                        <input 
                          type="url" 
                          className={`${styles.input} ${
                            formData.image_url && !formData.image_url.match(/\.(jpeg|jpg|gif|png|webp)$|picsum\.photos|cloudinary\.com|firebasestorage\.googleapis\.com/i) 
                              ? 'border-orange-300 bg-orange-50' 
                              : ''
                          }`}
                          placeholder="https://images.unsplash.com/photo-..."
                          value={formData.image_url}
                          onChange={e => {
                            setFormData({ ...formData, image_url: e.target.value });
                            setImagePreview(e.target.value);
                          }}
                        />
                        <ImageIcon className="absolute right-4 top-3.5 text-gray-400" size={18} />
                      </div>
                      {formData.image_url && !formData.image_url.match(/\.(jpeg|jpg|gif|png|webp)$|picsum\.photos|cloudinary\.com|firebasestorage\.googleapis\.com/i) && (
                        <div className="flex items-start gap-2 text-orange-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                          <p className="text-xs">
                            This link might not be a direct image. Share links (like Google Photos or Drive) often don't work. 
                            Try to use a direct link ending in .jpg or .png.
                          </p>
                        </div>
                      )}
                      {imagePreview && (
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-gray-200">
                          <img 
                            src={imagePreview} 
                            alt="URL Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={() => toast.error("Could not load image from URL")}
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-400">
                        Paste a direct link to an image. Note: Some websites block direct image linking (CORS).
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

        <div className="space-y-6">
          <div className={styles.card}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <MapPin size={20} className="text-[#5D5FEF]" />
              Location Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={handleLocateMe}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${
                  locationMethod === 'current' 
                    ? 'border-[#5D5FEF] bg-[#5D5FEF]/5 text-[#5D5FEF]' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  locationMethod === 'current' ? 'bg-[#5D5FEF] text-white' : 'bg-gray-100'
                }`}>
                  {locating ? <Loader2 className="animate-spin" size={24} /> : <Navigation size={24} />}
                </div>
                <div className="text-center">
                  <span className="block font-bold">Current Location</span>
                  <span className="text-xs opacity-70">Use your device GPS</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLocationMethod('link')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all gap-3 ${
                  locationMethod === 'link' 
                    ? 'border-[#5D5FEF] bg-[#5D5FEF]/5 text-[#5D5FEF]' 
                    : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  locationMethod === 'link' ? 'bg-[#5D5FEF] text-white' : 'bg-gray-100'
                }`}>
                  <LinkIcon size={24} />
                </div>
                <div className="text-center">
                  <span className="block font-bold">Paste Link</span>
                  <span className="text-xs opacity-70">Google Maps URL</span>
                </div>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {locationMethod === 'link' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <label className={styles.label}>Google Maps Link</label>
                  <div className="relative">
                    <input 
                      type="url" 
                      className={styles.input}
                      placeholder="https://www.google.com/maps/place/..."
                      value={formData.location_link}
                      onChange={e => handleLinkChange(e.target.value)}
                    />
                    <Globe className="absolute right-4 top-3.5 text-gray-400" size={18} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Paste the full URL from Google Maps. We'll try to extract the coordinates automatically.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className={styles.label}>Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  className={styles.input} 
                  value={formData.latitude || ''} 
                  onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  placeholder="0.000000"
                />
              </div>
              <div>
                <label className={styles.label}>Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  className={styles.input} 
                  value={formData.longitude || ''} 
                  onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  placeholder="0.000000"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={styles.label}>City</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  value={formData.city} 
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Nashik"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={styles.label}>State</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={formData.state} 
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                  />
                </div>
                <div>
                  <label className={styles.label}>Country</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={formData.country} 
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="e.g. India"
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || aiVerifying}
            className={`${styles.buttonPrimary} w-full flex items-center justify-center gap-3 py-5 text-xl shadow-xl shadow-[#5D5FEF]/20 hover:scale-[1.02] active:scale-[0.98] transition-all`}
          >
            {loading || aiVerifying ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Sparkles size={24} />
                <span>Submit Suggestion</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SuggestPlace;
