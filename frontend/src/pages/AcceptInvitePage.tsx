import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { usersApi, authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !email) {
      navigate('/login');
    }
  }, []);

  const handleSubmit = async () => {
    if (!fullName.trim()) { setError('Full name is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      const r = await usersApi.acceptInvite({ token, full_name: fullName, password });
      // Store token and user directly
      localStorage.setItem('patchops_token', r.data.access_token);
      localStorage.setItem('patchops_user', JSON.stringify(r.data.user));
      // Reload auth state
      await login(email, password);
      navigate('/dashboard');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex h-screen w-full items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      <div className="relative z-10 w-full max-w-sm px-4 animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center text-white font-black text-lg mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
              boxShadow: '0 0 32px rgba(99,102,241,0.4)',
              fontFamily: 'var(--font-display)',
            }}
          >
            PO
          </div>
          <h1 className="text-2xl font-bold text-[#E8EAF6] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Join PatchOps
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Set up your account for <span style={{ color: 'var(--text-secondary)' }}>{email}</span>
          </p>
        </div>

        <div
          className="rounded-[16px] p-6"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        >
          <h2 className="text-base font-bold mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
            Complete your profile
          </h2>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Kumar"
                className="w-full px-3 py-2.5 rounded-[8px] border outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 rounded-[8px] border outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3 py-2.5 rounded-[8px] border outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-[8px] bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-[8px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? <Spinner size={14} /> : null}
              {loading ? 'Setting up...' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}