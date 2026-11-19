import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center border border-slate-200 shadow-xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Dashboard Render Notice</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {this.state.error?.message || 'A transient UI state occurred while loading this view.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#075985] hover:bg-[#0369A1] transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw size={14} />
                <span>Reload Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => { window.location.hash = ''; window.location.reload(); }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Home size={14} />
                <span>Explore Events</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
