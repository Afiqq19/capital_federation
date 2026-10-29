import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Mencegah satu halaman yang error membuat seluruh portal menjadi layar kosong. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card card-pad max-w-xl mx-auto mt-10 text-center">
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl grid place-items-center" style={{ background: 'rgba(251,113,133,.14)', color: 'var(--rose)' }}>
          <AlertTriangle size={22} />
        </div>
        <h3 className="card-title">Halaman gagal ditampilkan</h3>
        <p className="card-sub mb-4">{String(this.state.error.message || this.state.error)}</p>
        <button className="btn btn-sky" onClick={() => this.setState({ error: null })}>
          <RefreshCw size={14} /> Coba lagi
        </button>
      </div>
    );
  }
}
