'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (phone.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    if (!password)          { toast.error('Enter your password'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Welcome back, ${data.admin.name}!`);
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse 120% 120% at 50% -20%, rgba(99,102,241,0.20) 0%, #080c18 55%)',
    }}>

      {/* Background blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)', filter: 'blur(60px)', opacity: 0.5 }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)', filter: 'blur(60px)', opacity: 0.5 }} />
        {/* Subtle grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px' }} />
      </div>

      {/* Card */}
      <div className="fade-up" style={{ position: 'relative', zIndex: 10, width: 420, maxWidth: '92vw' }}>
        <div style={{
          borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)',
          overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.08)',
          background: 'rgba(11,16,32,0.88)', backdropFilter: 'blur(28px) saturate(180%)',
        }}>
          {/* Accent gradient bar */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent 0%, #6366f1 35%, #8b5cf6 65%, transparent 100%)' }} />

          <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* ── Logo — perfectly centred ── */}
            <div style={{
              width: 88, height: 88,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, overflow: 'hidden', flexShrink: 0,
            }}>
              <Image
                src="/cy-logo.png" alt="CY Logo"
                width={72} height={72}
                style={{ objectFit: 'contain', display: 'block' }}
                priority
              />
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#eef2ff', marginBottom: 4, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              CY Admin
            </h1>
            <p style={{ fontSize: 13, color: '#4b5675', marginBottom: 32 }}>
              Kristujayanti College — Admin Portal
            </p>

            {/* Phone */}
            <div style={{ width: '100%', marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4b5675', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Phone Number
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="glass-input" style={{
                  width: 62, padding: '11px 10px', textAlign: 'center',
                  fontWeight: 700, fontSize: 14, color: '#6366f1', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>+91</div>
                <input
                  id="login-phone" type="tel"
                  className="glass-input"
                  style={{ flex: 1, padding: '11px 14px', fontSize: 14 }}
                  placeholder="10-digit number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  maxLength={10} autoComplete="tel"
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ width: '100%', marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#4b5675', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="glass-input"
                  style={{ width: '100%', padding: '11px 44px 11px 14px', fontSize: 14 }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#3d4966', transition: 'color 0.15s', padding: 4,
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8892b0'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3d4966'; }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary-gradient"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', borderRadius: 12, fontSize: 15, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                : <Lock size={15} strokeWidth={2} />
              }
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <p style={{ fontSize: 11, color: '#252d45', marginTop: 20 }}>
              Forgot access? Contact your Super Admin.
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
