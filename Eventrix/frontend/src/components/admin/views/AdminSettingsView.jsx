import React, { useState } from 'react';
import { 
  Settings, ShieldCheck, Mail, CreditCard, Sparkles, 
  Save, CheckCircle2, Lock, Globe, Bell
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

export function AdminSettingsView({ currentUser, showToast }) {
  const { t } = useLanguage();
  const [platformName, setPlatformName] = useState('Eventrix Hub');
  const [supportEmail, setSupportEmail] = useState('ravitech090@gmail.com');
  const [currency, setCurrency] = useState('INR (₹)');
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    if (showToast) showToast(t('admin.settings.savedSuccess', 'Platform settings saved successfully!'));
  };

  return (
    <div className="max-w-4xl space-y-6 font-sans animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
            {t('admin.settings.title', 'Platform Configuration & Settings')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('admin.settings.subtitle', 'Manage global platform variables, gateway integrations, and delivery systems')}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● {t('admin.settings.systemsOperational', 'All Systems Operational')}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* CARD 1: GENERAL SYSTEM SETTINGS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe size={16} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">{t('admin.settings.generalPlatformInfo', 'General Platform Information')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('admin.settings.platformName', 'Platform Name')}
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('admin.settings.supportEmail', 'Support & Contact Email')}
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: PAYMENT & GATEWAY CONFIGURATION */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard size={16} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">{t('admin.settings.paymentGatewayIntegrations', 'Payment Gateway Integrations')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{t('admin.settings.razorpayGateway', 'Razorpay Gateway')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {t('admin.settings.activeTestMode', 'Active (Test Mode)')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {t('admin.settings.keyId', 'Key ID')}: <span className="font-mono text-slate-800">rzp_test_...</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {t('admin.settings.defaultCurrency', 'Default Currency')}: <span className="font-bold text-slate-800">INR (₹)</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{t('admin.settings.loyaltyDiscountEngine', 'Loyalty Discount Engine')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  {t('admin.settings.enabled', 'Enabled')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {t('admin.settings.loyaltyDesc', 'Returning patrons receive automatic 10%–20% fee discounts calculated dynamically on checkout.')}
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: EMAIL BACKEND SETTINGS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Mail size={16} className="text-[#FF4F70]" />
            <h2 className="text-sm font-bold text-slate-900">{t('admin.settings.emailSmtpDelivery', 'Email SMTP Delivery')}</h2>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{t('admin.settings.gmailSmtpBackend', 'Gmail SMTP Backend')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {t('admin.settings.connected', 'Connected')}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-500 font-mono">
              <div>{t('admin.settings.host', 'Host')}: <strong className="text-slate-800">smtp.gmail.com</strong></div>
              <div>{t('admin.settings.port', 'Port')}: <strong className="text-slate-800">587 (TLS)</strong></div>
              <div>{t('admin.settings.user', 'User')}: <strong className="text-slate-800">ravitech090@gmail.com</strong></div>
            </div>
          </div>
        </div>

        {/* Sticky Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] shadow-md shadow-[#075985]/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save size={15} />
            <span>{t('admin.settings.saveConfiguration', 'Save Configuration')}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
