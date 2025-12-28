import React, { useState, useEffect } from 'react';
import {
  Dashboard,
  EmailPanel,
  PhonePanel,
  Tracker,
  PriorityList,
  BatchProcessor,
  DailySummary,
  DocumentManager
} from './components';
import { generateShipments } from './utils/mockDataGenerator';
import './App.css';

function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [timeOnScreen, setTimeOnScreen] = useState(0);
  const [shiftTime, setShiftTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sharedShipments, setSharedShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [docTarget, setDocTarget] = useState(null); // carries tab + tracking info to Document Manager
  const [collectedPODs, setCollectedPODs] = useState(new Set()); // Track which PODs have been requested/collected
  const [collectedInvoices, setCollectedInvoices] = useState(new Set()); // Track which invoices have been collected
  const [collapsedSections, setCollapsedSections] = useState(new Set()); // Track which sections are collapsed

  // Generate shared shipments once on load - no auto-refresh
  useEffect(() => {
    const shipments = generateShipments(20);
    setSharedShipments(shipments);
  }, []);

  // Simulate shift timer
  useEffect(() => {
    const interval = setInterval(() => {
      setShiftTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track time on each screen
  useEffect(() => {
    const screenTimer = setInterval(() => {
      setTimeOnScreen(prev => prev + 1);
    }, 1000);
    return () => clearInterval(screenTimer);
  }, [activeScreen]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 60);
    const minutes = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleRequestPOD = (trackingNumber) => {
    setCollectedPODs(prev => new Set([...prev, trackingNumber]));
    alert(`✅ POD Requested for ${trackingNumber}\n\nThe carrier will provide the Proof of Delivery. Check Documents tab in a moment.`);
  };

  const handleRequestInvoice = (trackingNumber) => {
    setCollectedInvoices(prev => new Set([...prev, trackingNumber]));
    alert(`✅ Invoice Requested for ${trackingNumber}\n\nThe invoice will appear in Document Manager shortly.`);
  };

  const navSections = [
    {
      title: 'Start here',
      items: [
        { id: 'dashboard', label: '📊 Dashboard', icon: '📊', hint: 'Overview & Quick Start' }
      ]
    },
    {
      title: 'Incoming updates',
      items: [
        { id: 'emails', label: '📧 Emails', icon: '📧', hint: 'Carrier & Customer Updates' },
        { id: 'calls', label: '📞 Phone Calls', icon: '📞', hint: 'Customer Support' }
      ]
    },
    {
      title: 'Operations queue',
      items: [
        { id: 'priority', label: '⚡ Priority Tasks', icon: '⚡', hint: 'SLA-sensitive shipments surfaced to the top' },
        { id: 'tracker', label: '🚚 Live Tracker', icon: '🚚', hint: 'Shipment Status' },
        { id: 'batch', label: '📦 Batch Processing', icon: '📦', hint: 'Bulk Updates' }
      ]
    },
    {
      title: 'Documents & proofs',
      items: [
        { id: 'documents', label: '📋 Documents', icon: '📋', hint: 'BOD, POD, Invoices' }
      ]
    },
    {
      title: 'Reporting & recap',
      items: [
        { id: 'summary', label: '📈 Daily Summary', icon: '📈', hint: 'Performance Metrics' }
      ]
    }
  ];

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            ☰
          </button>
          <h1>Logistics Operations Simulator</h1>
        </div>
      </header>

      <div className="app-container">
        {/* Sidebar Navigation */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <button 
            className="sidebar-toggle-edge"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div className="sidebar-content">
            {navSections.map((section, idx) => (
              <div key={idx} className="nav-section">
                <button 
                  className="section-title-btn"
                  onClick={() => {
                    const newCollapsed = new Set(collapsedSections);
                    if (newCollapsed.has(idx)) {
                      newCollapsed.delete(idx);
                    } else {
                      newCollapsed.add(idx);
                    }
                    setCollapsedSections(newCollapsed);
                  }}
                >
                  <span className="section-title">{section.title}</span>
                  <span className="section-toggle">{collapsedSections.has(idx) ? '▼' : '▲'}</span>
                </button>
                {!collapsedSections.has(idx) && (
                  <nav className="section-nav">
                    {section.items.map(item => (
                      <button
                        key={item.id}
                        className={`nav-item ${activeScreen === item.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveScreen(item.id);
                          setTimeOnScreen(0);
                          // Reset cross-screen selection state to avoid auto-open modals
                          setSelectedShipment(null);
                          setDocTarget(null);
                        }}
                        title={sidebarOpen ? '' : item.hint}
                      >
                        {sidebarOpen && (
                          <>
                            <span className="nav-label">{item.label}</span>
                            <span className="nav-hint">{item.hint}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="screen-wrapper">
            {activeScreen === 'dashboard' && <Dashboard onNavigate={(screen) => { setActiveScreen(screen); setTimeOnScreen(0); }} />}
            {activeScreen === 'emails' && <EmailPanel shipments={sharedShipments} onNavigate={(screen, payload) => { setActiveScreen(screen); setSelectedShipment(payload); setDocTarget(null); setTimeOnScreen(0); }} />}
            {activeScreen === 'calls' && <PhonePanel shipments={sharedShipments} onNavigate={(screen, payload) => { setActiveScreen(screen); setSelectedShipment(payload); setTimeOnScreen(0); }} />}
            {activeScreen === 'tracker' && <Tracker shipments={sharedShipments} selectedShipment={selectedShipment} onShipmentSelect={setSelectedShipment} onRequestPOD={handleRequestPOD} onRequestInvoice={handleRequestInvoice} collectedPODs={collectedPODs} collectedInvoices={collectedInvoices} onNavigate={(screen, payload) => { setActiveScreen(screen); setTimeOnScreen(0); setSelectedShipment(null); setDocTarget(payload || null); }} />}
            {activeScreen === 'priority' && <PriorityList shipments={sharedShipments} onNavigate={(screen, payload) => { setActiveScreen(screen); setSelectedShipment(payload); setDocTarget(null); setTimeOnScreen(0); }} />}
            {activeScreen === 'batch' && <BatchProcessor shipments={sharedShipments} />}
            {activeScreen === 'documents' && <DocumentManager shipments={sharedShipments} docTarget={docTarget} collectedPODs={collectedPODs} collectedInvoices={collectedInvoices} onNavigate={(screen, payload) => { setActiveScreen(screen); setSelectedShipment(payload); setDocTarget(null); setTimeOnScreen(0); }} />}
            {activeScreen === 'summary' && <DailySummary />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;