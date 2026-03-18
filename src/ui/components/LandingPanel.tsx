import { useDockingStore } from '../../store/dockingStore';
import { Atom, Layers, TestTube2, ArrowRight } from 'lucide-react';
import '../styles/LandingPanel.css';

export function LandingPanel() {
    const { setActiveTab } = useDockingStore();

    return (
        <div className="landing-overlay">
            {/* CSS Gradient Background (Stable Fallback) */}
            <div className="landing-bg-gradient" />

            {/* Foreground Content */}
            <div className="landing-content">

                {/* Header */}
                <div className="landing-header" style={{ pointerEvents: 'auto' }}>
                    <div className="logo-badge">
                        <Atom size={48} color="#00d2ff" />
                    </div>
                    <h1>VI DOCK <span className="pro-tag">Pro</span></h1>
                    <p className="subtitle">Advanced Browser-Based Molecular Docking System</p>
                </div>

                {/* Mode Selection Cards */}
                <div className="mode-grid" style={{ pointerEvents: 'auto' }}>

                    {/* Single Docking Card */}
                    <div className="mode-card single" onClick={() => setActiveTab('prep')}>
                        <div className="card-bg"></div>
                        <div className="card-icon">
                            <TestTube2 size={40} />
                        </div>
                        <div className="card-info">
                            <h3>Single Docking</h3>
                            <p>Interactive single-ligand screening with real-time visualization.</p>
                        </div>
                        <div className="card-arrow">
                            <ArrowRight size={20} />
                        </div>
                    </div>

                    {/* Batch Docking Card */}
                    <div className="mode-card batch" onClick={() => setActiveTab('batch')}>
                        <div className="card-bg"></div>
                        <div className="card-icon">
                            <Layers size={40} />
                        </div>
                        <div className="card-info">
                            <h3>Batch Docking</h3>
                            <p>High-throughput M × N screening for library validation.</p>
                        </div>
                        <div className="card-arrow">
                            <ArrowRight size={20} />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="landing-footer" style={{ pointerEvents: 'auto' }}>
                    <span className="version">v3.1.0</span>
                </div>

            </div>
        </div>
    );
}
