import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:border-cyan-400/60 hover:text-white transition-colors text-xs font-medium cursor-pointer"
      >
        {isInstallable ? (
          <Download className="w-4 h-4 text-cyan-400" />
        ) : (
          <Smartphone className="w-4 h-4 text-cyan-400" />
        )}
        <span>{isInstallable ? 'Install App' : 'Android / APK'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apk-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111826] border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="apk-guide-title" className="font-display text-lg font-bold text-white">
                  {isIOS ? 'Install on iPhone / iPad' : 'Android App & APK Export'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Offline service worker and Capacitor Android project are bundled.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close guide"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Tap the <strong>Share</strong> icon in Safari.</li>
                <li>Select <strong>Add to Home Screen</strong> to play offline.</li>
              </ol>
            ) : (
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <div className="font-semibold text-cyan-300">Option 1: Instant Offline Install (Android Chrome)</div>
                  <p className="text-slate-400">
                    Open the Shared App URL in Chrome on Android and tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="font-semibold text-cyan-300">Option 2: Build Binary .APK Locally (Capacitor)</div>
                  <p className="text-slate-400">
                    Download the project and run inside a terminal with Android Studio / JDK installed:
                  </p>
                  <pre className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono-tabular text-[11px] text-slate-200 overflow-x-auto">
                    npm run build:android{'\n'}cd android && ./gradlew assembleDebug
                  </pre>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
