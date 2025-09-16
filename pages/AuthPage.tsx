
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../services/firebase';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Signup only fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isLogin) {
      // Handle Login
      try {
        await auth.signInWithEmailAndPassword(email, password);
        // Navigation is handled by App.tsx's onAuthStateChanged
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      // Handle Signup
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
      try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        if (userCredential.user) {
          // Store additional user info in Realtime Database
          await db.ref('users/' + userCredential.user.uid).set({
            uid: userCredential.user.uid,
            firstName,
            lastName,
            email,
            phone,
          });
          // Navigation is handled by App.tsx
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  const inputStyles = "w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <h1 className="text-4xl font-logo text-indigo-400 text-center mb-2">
          markit
        </h1>
        <p className="text-center text-gray-400 mb-8">{isLogin ? 'Welcome back to your canvas' : 'Create your account'}</p>
        
        <form onSubmit={handleAuthAction} className="space-y-4">
          {!isLogin && (
            <>
              <div className="flex flex-col sm:flex-row gap-4">
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" required className={inputStyles} />
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" required className={inputStyles} />
              </div>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" required className={inputStyles} />
            </>
          )}
          
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required className={inputStyles} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className={inputStyles} />

          {!isLogin && (
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required className={inputStyles} />
          )}

          {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {loading ? (
                <div className="flex justify-center items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </div>
            ) : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>
        
        <p className="text-center mt-6 text-gray-400">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }} 
            className="text-indigo-400 hover:underline ml-2 font-semibold"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>

        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <Link to="/signin" className="text-indigo-400 hover:underline font-semibold">
                Public Attendance Sign-in
            </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
