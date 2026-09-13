import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LockScreenProps {
  isSetupMode: boolean;
  onUnlock: (pin: string) => Promise<boolean>;
  onSetupPin: (pin: string) => Promise<void>;
  onSetupDeviceKey: () => Promise<void>;
  onLoadDemoData: () => Promise<void>;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  isSetupMode,
  onUnlock,
  onSetupPin,
  onSetupDeviceKey,
  onLoadDemoData,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const success = await onUnlock(pin);
      if (!success) {
        setErrorMsg('Incorrect passcode. Decryption failed.');
      }
    } catch {
      setErrorMsg('Could not decrypt data with this passcode.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setErrorMsg('Passcode must be at least 4 digits or characters.');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMsg('Passcodes do not match.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    try {
      await onSetupPin(pin);
    } catch (err) {
      setErrorMsg('Failed to initialize encryption. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-stone-850 rounded-2xl border border-stone-800 p-8 shadow-2xl backdrop-blur-sm">
        {/* Security Shield Icon Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif-heading font-semibold text-stone-100">
            {isSetupMode ? 'Private & Encrypted Health Vault' : 'Unlock Your Health Vault'}
          </h1>
          <p className="mt-2 text-sm text-stone-400 max-w-xs leading-relaxed">
            {isSetupMode
              ? 'Your cycle data and hormonal symptoms never leave this device. Encrypted client-side with AES-256 GCM.'
              : 'Enter your passcode to decrypt your private health logs and cycle history.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSetupMode ? (
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Create a Master Passcode / PIN
              </label>
              <div className="relative">
                <input
                  id="setup-pin-input"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. 4-6 digit PIN or phrase"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-200"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Confirm Passcode
              </label>
              <input
                id="setup-confirm-pin-input"
                type={showPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Re-enter your passcode"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm font-mono tracking-wider"
              />
            </div>

            <button
              id="btn-create-pin"
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isProcessing ? 'Deriving Encryption Key...' : 'Encrypt & Initialize Vault'}</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-stone-850 px-2 text-stone-500">Or get started faster</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                id="btn-device-key-mode"
                onClick={onSetupDeviceKey}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Auto-Key (Device-Only Encrypted, No PIN Required)</span>
              </button>

              <button
                type="button"
                id="btn-load-demo-data"
                onClick={onLoadDemoData}
                className="w-full py-2 px-3 rounded-xl bg-stone-800/50 hover:bg-stone-800 border border-stone-700/60 text-stone-300 text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Explore with Preloaded Sample Hormonal Data</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Vault Passcode
              </label>
              <div className="relative">
                <input
                  id="unlock-pin-input"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your passcode..."
                  autoFocus
                  required
                  className="w-full px-3.5 py-3 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-base font-mono tracking-widest text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-200"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-unlock-vault"
              type="submit"
              disabled={isProcessing || !pin}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isProcessing ? 'Decrypting Vault...' : 'Unlock Health Data'}</span>
            </button>
          </form>
        )}

        {/* Security Architecture Footnote */}
        <div className="mt-8 pt-6 border-t border-stone-800/80 text-center">
          <p className="text-[11px] text-stone-500 leading-normal">
            Zero cloud syncing • Zero trackers • PBKDF2 with 100,000 SHA-256 iterations & AES-256-GCM.
          </p>
        </div>
      </div>
    </div>
  );
};
