"use client";
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useKitStore } from '@/store/kitStore';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import FileUpload from './FileUpload';

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuthStore();
  const { kits, fetchKits, loading: kitsLoading } = useKitStore();
  const router = useRouter();

  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchKits();
    }
  }, [user, authLoading, router, fetchKits]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError('');
    
    try {
      const res = await api.post('/kits', { jd, company_url: companyUrl, days });
      // The backend returns { status: 'processing', id } or similar, but the prompt says 
      // "Watch generation" -> the API might block or we poll. Our backend blocks until done.
      // So this will take ~30-60s to return the full kit.
      await fetchKits();
      router.push(`/kit/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  if (authLoading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-10 mt-4 surface-primary p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
        <h1 className="text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
        <button onClick={logout} className="btn-secondary text-sm">Log out</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Create Form */}
          <div className="surface-primary p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-2xl font-bold mb-6 text-text-primary flex items-center gap-2 relative z-10">
              <span className="w-1.5 h-6 bg-accent-base rounded-full inline-block"></span>
              Generate New Kit
            </h2>
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6 p-3 rounded-lg font-medium">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-5 relative z-10">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">Company URL</label>
                <input type="url" required value={companyUrl} onChange={e => setCompanyUrl(e.target.value)} className="input-premium" placeholder="https://stripe.com/careers" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">Job Description</label>
                <textarea required value={jd} onChange={e => setJd(e.target.value)} className="input-premium h-36 resize-none custom-scrollbar" placeholder="Paste the full job description here..." />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">Days Available to Study</label>
                <input type="number" min="1" max="60" required value={days} onChange={e => setDays(Number(e.target.value))} className="input-premium" />
              </div>
              <button disabled={isGenerating} type="submit" className="w-full btn-primary mt-4">
                {isGenerating ? 'Researching & Generating...' : 'Create Kit'}
              </button>
            </form>
          </div>

          <FileUpload />
        </div>

        {/* Kit List */}
        <div className="surface-primary p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
          <div className="absolute top-1/2 right-0 w-48 h-48 bg-accent-subtle rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="text-2xl font-bold mb-6 text-text-primary flex items-center gap-2 relative z-10">
            <span className="w-1.5 h-6 bg-accent-hover rounded-full inline-block"></span>
            Your Kits
          </h2>
          {kitsLoading ? <p className="text-text-secondary font-medium relative z-10">Loading your study kits...</p> : (
            <div className="space-y-4 relative z-10">
              {kits.length === 0 ? (
                <div className="border border-dashed border-border-active rounded-2xl p-8 text-center text-text-tertiary">
                  <p>No kits generated yet. Create one to get started.</p>
                </div>
              ) : kits.map((kit: any) => (
                <div key={kit.id} className="surface-secondary p-5 flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 group hover:border-accent-border transition-colors duration-300">
                  <div>
                    <h3 className="font-bold text-text-primary text-lg group-hover:text-accent-hover transition-colors">{kit.role?.title || 'Unknown Role'}</h3>
                    <p className="text-sm text-text-secondary font-medium flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {kit.source?.company}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => router.push(`/kit/${kit.id}`)} className="bg-accent-subtle text-accent-hover hover:bg-accent-border/50 text-sm font-medium px-4 py-2 rounded-lg border border-accent-border transition-colors w-full xl:w-auto">Builder</button>
                    <button onClick={() => router.push(`/practice/${kit.id}`)} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium px-4 py-2 rounded-lg border border-emerald-500/20 transition-colors w-full xl:w-auto">Practice</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
