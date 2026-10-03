import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 text-center bg-white border-2 border-[var(--brand-950)] rounded-3xl shadow-[6px_6px_0px_#0A1F20]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] text-[var(--brand-700)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
          <Compass className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
          HTTP 404
        </span>
        <h1 className="text-2xl font-black text-[var(--brand-950)] mt-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Route Not Found
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
          The requested financial endpoint or journey URL is not registered on the FinFlow routing map.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button variant="brutal" size="sm" leftIcon={<Home className="w-4 h-4" />}>
              Return to Platform Hub
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
