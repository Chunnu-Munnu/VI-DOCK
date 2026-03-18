import { useEffect } from 'react';
import { useDockingStore } from './store/dockingStore';
import { Sidebar } from './ui/components/Sidebar';
import { PrepPanel } from './ui/components/PrepPanel';
import { InputPanel } from './ui/components/InputPanel';
import { RunningPanel } from './ui/components/RunningPanel';
import { OutputPanel } from './ui/components/OutputPanel';
import { ProjectPanel } from './ui/components/ProjectPanel';
import { BatchPanel } from './ui/components/BatchPanel';
import { LandingPanel } from './ui/components/LandingPanel';
import { MoleculeViewer } from './ui/components/MoleculeViewer';
import { DraggablePanel } from './ui/components/DraggablePanel';
import BackgroundGrid from './ui/components/BackgroundGrid';
import { FloatingToolbar } from './ui/components/FloatingToolbar';
// gridboxCalculator imported on-demand if needed
import './App.css';

const TAB_TITLES: Record<string, string> = {
  prep: 'Molecule Import',
  input: 'Input Parameters',
  batch: 'Batch Mode',
  running: 'Running Docking',
  output: 'Output',
  projects: 'Mission Log'
};

function App() {
  const { activeTab, theme } = useDockingStore();

  // Sync theme to body class for global CSS variables
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);


  const renderActivePanel = () => {
    switch (activeTab) {
      case 'prep':
        return <PrepPanel />;
      case 'input':
        return <InputPanel />;
      case 'batch':
        return <BatchPanel />;
      case 'running':
        return <RunningPanel />;
      case 'output':
        return <OutputPanel />;
      case 'projects':
        return <ProjectPanel />;
      default:
        // For landing or undefined, we might show nothing in the panel side
        return (
          <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
            <h2>Select a tool</h2>
            <p>Choose a module from the sidebar to begin.</p>
          </div>
        );
    }
  };

  return (
    <div className="app spatial-mode" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <BackgroundGrid />

      {/* LAYER 1: CONTROL SIDEBAR (Left) */}
      <div className="control-sidebar" style={{
        zIndex: 10,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-divider)',
        position: 'relative'
      }}>
        {/* Navigation Strip */}
        <Sidebar />
      </div>

      {/* Draggable Content Panel */}
      {activeTab !== 'landing' && (
        <DraggablePanel
          title={TAB_TITLES[activeTab] || 'Panel'}
          initialX={90} // Moved slightly more right for better separation
          initialY={20}
          width="380px" // Slightly thinner so it takes up less space
          height="85vh" // Set to 85vh to allow scrolling within DraggablePanel
          className="active-feature-panel"
        >
          <div style={{ padding: '20px' }}>
            {renderActivePanel()}
          </div>
        </DraggablePanel>
      )}

      {/* LAYER 0: GLOBAL VIEWER (Right/Main) */}
      <div className="viewport-main" style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <MoleculeViewer />
        <FloatingToolbar />

        {/* Overlay for Landing if needed in center */}
        {activeTab === 'landing' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none' // Let clicks pass if landing is just visual, or auto if interactive
          }}>
            <div style={{ pointerEvents: 'auto' }}>
              <LandingPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
