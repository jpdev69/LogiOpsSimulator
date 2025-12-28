import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { generateShipments, generateEmails, generateCalls } from '../utils/mockDataGenerator';

const Dashboard = ({ onNavigate = () => {} }) => {
  const [metrics, setMetrics] = useState({
    pendingShipments: 0,
    highPriority: 0,
    unreadEmails: 0,
    pendingCalls: 0,
    delayedShipments: 0
  });
  const [shipments, setShipments] = useState([]);
  const [emails, setEmails] = useState([]);
  const [calls, setCalls] = useState([]);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    const generateData = () => {
      const newShipments = generateShipments(15);
      const newEmails = generateEmails(12);
      const newCalls = generateCalls(8);

      setShipments(newShipments);
      setEmails(newEmails);
      setCalls(newCalls);

      setMetrics({
        pendingShipments: newShipments.filter(s => s.status !== 'DELIVERED').length,
        highPriority: newShipments.filter(s => s.priority === 'HIGH' && s.status !== 'DELIVERED').length,
        unreadEmails: newEmails.filter(e => !e.read).length,
        pendingCalls: newCalls.filter(c => !c.resolved).length,
        delayedShipments: newShipments.filter(s => s.status === 'DELAYED').length
      });
    };

    generateData();
    const interval = setInterval(generateData, 30000);
    return () => clearInterval(interval);
  }, []);

  const workflowSteps = [
    {
      number: 1,
      title: 'Check Priorities',
      description: 'Review urgent tasks and high-priority shipments',
      action: 'Go to Priority Tasks',
      icon: '⚡',
      onClick: () => onNavigate('priority')
    },
    {
      number: 2,
      title: 'Review Communications',
      description: 'Read emails from carriers and respond to calls',
      action: 'Check Emails & Calls',
      icon: '📧',
      onClick: () => onNavigate('emails')
    },
    {
      number: 3,
      title: 'Process Updates',
      description: 'Batch process shipment status updates',
      action: 'Batch Processing',
      icon: '📦',
      onClick: () => onNavigate('batch')
    },
    {
      number: 4,
      title: 'Verify Deliveries',
      description: 'Track shipments and review delivery proofs',
      action: 'Live Tracker',
      icon: '🚚',
      onClick: () => onNavigate('tracker')
    },
    {
      number: 5,
      title: 'Manage Documents',
      description: 'Handle BOLs, PODs, and invoices',
      action: 'Documents',
      icon: '📋',
      onClick: () => onNavigate('documents')
    },
    {
      number: 6,
      title: 'Generate Reports',
      description: 'Create daily summary and metrics',
      action: 'Daily Summary',
      icon: '📈',
      onClick: () => onNavigate('summary')
    }
  ];

  return (
    <div className="dashboard">
      {/* Quick Metrics removed per request */}

      {/* Navigation Workflows */}
      <div className="workflow-section">
        <h2>🔗 Key Workflows</h2>
        <div className="workflow-grid">
          {workflowSteps.map((step, idx) => (
            <div key={idx} className="workflow-card">
              <div className="workflow-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <button className="workflow-btn" onClick={step.onClick}>{step.action}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      {emails.length > 0 && (
        <div className="alerts-section">
          <h2>🔔 Recent Activity</h2>
          <div className="alerts-list">
            {emails.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(email => (
              <div key={email.id} className={`alert-item ${email.priority.toLowerCase()}`}>
                <span className="alert-icon">
                  {email.tags?.includes('carrier') ? '🚚' : 
                   email.tags?.includes('urgent') ? '⚠️' : '📧'}
                </span>
                <div className="alert-content">
                  <h4>{email.subject}</h4>
                  <p>{email.body.substring(0, 80)}...</p>
                </div>
                <span className="alert-time">
                  {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;