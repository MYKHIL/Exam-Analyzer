import React from 'react';
import { signInWithGoogle } from '../firebase';
import { GraduationCap, LogIn } from 'lucide-react';

export default function AuthView() {
  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-3xl">
          <GraduationCap className="w-10 h-10 text-indigo-600" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Exam Analyzer</h1>
          <p className="text-gray-500">Multi-School Examination Management System</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signInWithGoogle()}
            className="w-full py-4 bg-white border-2 border-gray-100 hover:border-indigo-100 hover:bg-indigo-50 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
          
          <p className="text-xs text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
