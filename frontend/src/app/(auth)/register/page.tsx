"use client";
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', { email, password });
      login(res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md p-8 sm:p-10 surface-primary relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
        
        <h1 className="text-3xl font-bold mb-8 text-center text-text-primary tracking-tight">Create an Account</h1>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6 p-3 rounded-lg text-center font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-premium"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-premium"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="w-full btn-primary mt-6">
            Register Now
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-text-tertiary relative z-10">
          Already have an account? <Link href="/login" className="text-accent-hover font-medium hover:underline transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
