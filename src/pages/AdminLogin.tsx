import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { toast } from 'sonner';
import { styles } from '../theme';
import { Lock, Mail, Loader2, Chrome, LogIn } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      toast.success('Logged in successfully');
      navigate('/admin');
    } catch (error: any) {
      console.error('Auth error', error);

      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        toast.error('Invalid email or password');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error(
          'Email sign-in is not enabled in Firebase Console'
        );
      } else {
        toast.error(error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);

      toast.success('Logged in with Google');
      navigate('/admin');
    } catch (error: any) {
      console.error('Google login error', error);

      if (error.code === 'auth/operation-not-allowed') {
        toast.error(
          'Google Sign-In is not enabled in Firebase Console'
        );
      } else {
        toast.error('Google login failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 bg-[#F8F9FD]">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#5D5FEF] text-white rounded-2xl flex items-center justify-center mx-auto mt-4 mb-4 shadow-lg">
            <Lock size={32} />
          </div>

          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-gray-500">
            Secure access for Trip Sutra administrators
          </p>
        </div>

        <div className={styles.card}>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className={styles.label}>Email Address</label>

              <div className="relative">
                <input
                  type="email"
                  required
                  className={`${styles.input} pl-11`}
                  placeholder="admin@tripsutra.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Mail
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={18}
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>Password</label>

              <div className="relative">
                <input
                  type="password"
                  required
                  className={`${styles.input} pl-11`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Lock
                  className="absolute left-4 top-3.5 text-gray-400"
                  size={18}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className={`${styles.buttonPrimary} w-full flex items-center justify-center gap-2`}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <LogIn size={20} />
              )}

              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>

            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full bg-white border-2 border-gray-100 text-gray-700 font-bold py-3 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            {googleLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Chrome size={20} />
            )}

            Sign in with Google
          </button>
        </div>

        <p className="text-center mt-8 text-sm text-gray-400">
          Authorized access only. All activities are logged.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;