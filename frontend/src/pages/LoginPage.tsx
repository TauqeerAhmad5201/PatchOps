import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui';

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('sarah.chen@company.com');
  const [password, setPassword] = useState('secret');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex h-screen w-full items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm animate-fade-up"
        style={{ padding: '0 16px' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center text-white font-black text-lg mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
              boxShadow: '0 0 32px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
              fontFamily: 'var(--font-display)',
            }}
          >
            PO
          </div>
          <h1
            className="text-2xl font-bold text-[#E8EAF6] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            PatchOps
          </h1>
          <p className="text-sm text-[#454C75] mt-1">CR Management System</p>
        </div>

        {/* Form card */}
        <div
          className="rounded-[16px] p-6"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}
        >
          <h2
            className="text-base font-bold text-[#C4C8E8] mb-5"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sign in to continue
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#8B91BE] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-[8px] bg-[#090B18] border border-[#1C2038] text-[#E8EAF6] placeholder:text-[#454C75] outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8B91BE] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-[8px] bg-[#090B18] border border-[#1C2038] text-[#E8EAF6] placeholder:text-[#454C75] outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-[8px] bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-[8px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_0_0_rgba(99,102,241,0)] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? <Spinner size={14} /> : null}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 pt-4 border-t border-[#1C2038]">
            <p className="text-xs text-[#454C75] text-center">
              Demo: <span className="text-[#8B91BE]">sarah.chen@company.com</span> / <span className="text-[#8B91BE]">secret</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
