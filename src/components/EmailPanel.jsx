import React, { useState, useEffect } from 'react';
import './EmailPanel.css';
import { generateEmails } from '../utils/mockDataGenerator';

const EmailPanel = ({ shipments = [], onNavigate = () => {} }) => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all');
  const [linkedShipments, setLinkedShipments] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchEmails = () => {
      const generatedEmails = generateEmails(3);

      // Deterministic carrier emails for shipments with EXCEPTION/DELAYED
      const statusEmails = (shipments || [])
        .filter(s => ['EXCEPTION', 'DELAYED'].includes(s.status))
        .map((s, i) => ({
          id: `status-${s.id}-${i}`,
          sender: `dispatch@${(s.carrier || 'carrier').toLowerCase()}.com`,
          sender_type: 'carrier',
          priority: s.status === 'EXCEPTION' ? 'HIGH' : 'MEDIUM',
          subject: s.status === 'EXCEPTION'
            ? `EXCEPTION: Issue on TRK${s.tracking_number.replace('TRK','')}`
            : `Delay Notice: Updated ETA for TRK${s.tracking_number.replace('TRK','')}`,
          body: s.status === 'EXCEPTION'
            ? `Carrier alert: Shipment ${s.tracking_number} encountered an exception. Last known location: ${s.origin.city} → ${s.destination.city}. Please advise next steps.`
            : `Carrier update: Shipment ${s.tracking_number} is delayed. New ETA ${new Date(s.eta).toLocaleString()}. Customer notification recommended.`,
          created_at: new Date().toISOString(),
          read: false,
          attachments: [],
          tags: ['carrier','urgent']
        }));

      // Deterministic customer complaint emails for shipments with EXCEPTION/DELAYED
      const customerEmails = (shipments || [])
        .filter(s => ['EXCEPTION', 'DELAYED'].includes(s.status))
        .map((s, i) => ({
          id: `customer-${s.id}-${i}`,
          sender: s.receiver_contact?.email || s.customer_email || 'customer@example.com',
          sender_type: 'customer',
          priority: s.status === 'EXCEPTION' ? 'HIGH' : 'MEDIUM',
          subject: s.status === 'EXCEPTION'
            ? `CUSTOMER: Where is my package? TRK${s.tracking_number.replace('TRK','')}`
            : `CUSTOMER: Delay on TRK${s.tracking_number.replace('TRK','')}`,
          body: s.status === 'EXCEPTION'
            ? `Hi, my package ${s.tracking_number} shows an exception. Can you explain and provide a new ETA?`
            : `Hello, tracking ${s.tracking_number} is delayed. When will it arrive? Please confirm the new ETA.`,
          created_at: new Date().toISOString(),
          read: false,
          attachments: [],
          tags: ['customer','follow-up']
        }));
      
      // Ensure all generated emails have sender_type
      const allGeneratedEmails = generatedEmails.map(email => ({
        ...email,
        sender_type: email.sender_type || 'internal'
      }));
      
      // Link emails to shipments based on keywords (cover all synthesized emails)
      const newLinkedShipments = {};
      const allNewEmails = [...statusEmails, ...customerEmails, ...allGeneratedEmails];
      allNewEmails.forEach(email => {
        const relatedShipment = findRelatedShipment(email);
        if (relatedShipment) {
          newLinkedShipments[email.id] = relatedShipment;
        }
      });
      
      // Set emails (replace instead of append)
      setEmails(prev => {
        // Merge with previous emails, preserving read state
        const prevEmailsMap = new Map(prev.map(e => [e.id, e]));
        const mergedEmails = allNewEmails.map(email => {
          const prevEmail = prevEmailsMap.get(email.id);
          return prevEmail ? { ...email, read: prevEmail.read } : email;
        });
        return mergedEmails;
      });
      
      // Update linked shipments
      setLinkedShipments(newLinkedShipments);
    };

    fetchEmails();
  }, [shipments]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const findRelatedShipment = (email) => {
    if (!shipments || shipments.length === 0) return null;
    
    // Try to find shipment by tracking number in email
    const trackingMatch = email.subject.match(/TRK\d+/);
    if (trackingMatch) {
      return shipments.find(s => s.tracking_number === trackingMatch[0]);
    }
    
    // Otherwise, assign random related shipment for context
    return shipments[Math.floor(Math.random() * shipments.length)];
  };

  const markAsRead = async (emailId) => {
    // In a real app, this would update the backend
    setEmails(prevEmails => prevEmails.map(email => 
      email.id === emailId ? { ...email, read: true } : email
    ));
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyText) return;
    
    const relatedShipment = linkedShipments[selectedEmail.id];
    console.log('Sending reply:', { 
      to: selectedEmail.sender, 
      text: replyText,
      relatedShipment: relatedShipment?.tracking_number 
    });
    setReplyText('');
    alert(`Reply sent to ${selectedEmail.sender}!`);
  };

  const handleLinkedShipmentClick = () => {
    const relatedShipment = linkedShipments[selectedEmail.id];
    if (!relatedShipment) {
      alert('No shipment linked to this email');
      return;
    }
    // Navigate to tracker with the selected shipment
    onNavigate('tracker', relatedShipment);
  };

  const handleRequestPOD = () => {
    const relatedShipment = linkedShipments[selectedEmail.id];
    if (!relatedShipment) {
      alert('No shipment linked to this email');
      return;
    }
    // Mark email as action taken
    setEmails(emails.map(e => e.id === selectedEmail.id ? { ...e, actionTaken: 'POD_REQUESTED' } : e));
    alert(`POD requested for ${relatedShipment.tracking_number}`);
  };

  const handleQuickReply = (template) => {
    const templates = {
      'on_the_way': 'Thank you for your inquiry. Your shipment is currently in transit and on schedule. Please refer to your tracking number for real-time updates.',
      'delay': 'We sincerely apologize for the delay. We are working with the carrier to expedite your delivery. We will provide an updated ETA shortly.',
      'confirm_delivery': 'Delivery has been confirmed and the package should be with you shortly. Thank you for your business!',
      'address_correction': 'Thank you for providing the correct address. We have updated our records and your shipment will be delivered to the corrected location.'
    };
    setReplyText(templates[template] || '');
  };

  const categorizeEmail = (subject) => {
    if (subject.includes('delay') || subject.includes('urgent')) return 'delay';
    if (subject.includes('ETA') || subject.includes('update')) return 'update';
    if (subject.includes('confirm') || subject.includes('confirmation')) return 'confirmation';
    return 'general';
  };

  const getFilteredEmails = () => {
    if (filter === 'unread') return emails.filter(e => !e.read);
    if (filter === 'carrier') return emails.filter(e => e.sender_type === 'carrier');
    if (filter === 'customer') return emails.filter(e => e.sender_type === 'customer');
    return emails;
  };

  const unreadCount = emails.filter(e => !e.read).length;
  const carrierCount = emails.filter(e => e.sender_type === 'carrier').length;
  const customerCount = emails.filter(e => e.sender_type === 'customer').length;
  const linkedCount = Object.keys(linkedShipments).length;
  const issueShipments = (shipments || []).filter(s => ['EXCEPTION', 'DELAYED'].includes(s.status)).length;

  // Pagination
  const filteredEmails = getFilteredEmails();
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, endIndex);

  return (
    <div className="email-panel">
      <div className="email-header-band">
        <div>
          <p className="eyebrow">Ops inbox</p>
          <h2>Carrier & Customer Updates</h2>
          <p className="subhead">Track incoming carrier alerts and customer inquiries.</p>
        </div>
        <div className="email-stats">
          {[{ label: 'Inbox', value: emails.length, color: '#1d4ed8' }, { label: 'Unread', value: unreadCount, color: '#f97316' }, { label: 'Carrier', value: carrierCount, color: '#0ea5e9' }, { label: 'Customer', value: customerCount, color: '#16a34a' }]
            .map(tile => (
              <div key={tile.label} className="stat-tile" style={{ borderColor: tile.color }}>
                <div className="stat-label">{tile.label}</div>
                <div className="stat-value" style={{ color: tile.color }}>{tile.value}</div>
              </div>
            ))}
          <div className="stat-tile" style={{ borderColor: '#dc2626' }}>
            <div className="stat-label">Exception/Delayed</div>
            <div className="stat-value" style={{ color: '#dc2626' }}>{issueShipments}</div>
          </div>
        </div>
      </div>

      <div className="email-sidebar">
        <div className="email-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Emails ({emails.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({emails.filter(e => !e.read).length})
          </button>
        </div>
        
        <div className="email-list-grid">
          {paginatedEmails.map(email => (
            <div 
              key={email.id} 
              className={`email-card ${!email.read ? 'unread' : ''} ${categorizeEmail(email.subject)}`}
              onClick={() => {
                setSelectedEmail(email);
                markAsRead(email.id);
              }}
            >
              <div className="email-card-header">
                <div className={`sender-badge-small ${email.sender_type}`}>
                  {email.sender_type === 'carrier' && '🚚'}
                  {email.sender_type === 'customer' && '👤'}
                  {email.sender_type === 'internal' && '⚙️'}
                </div>
                {!email.read && <div className="unread-dot"></div>}
              </div>
              <div className="email-card-sender">{email.sender}</div>
              <div className="email-card-subject">{email.subject}</div>
              <div className="email-card-preview">{email.body.substring(0, 50)}...</div>
              <div className="email-card-time">
                {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="email-pagination">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ← Previous
            </button>
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div className="email-modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="email-modal-header">
              <div className="email-title-section">
                <h3>{selectedEmail.subject}</h3>
                <div className={`priority-badge ${selectedEmail.priority?.toLowerCase()}`}>
                  {selectedEmail.priority}
                </div>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setSelectedEmail(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="email-modal-content">
              <div className="email-meta">
                <span>
                  From: {selectedEmail.sender}
                  {selectedEmail.sender_type === 'carrier' && ' 🚚 (Carrier)'}
                  {selectedEmail.sender_type === 'customer' && ' 👤 (Customer)'}
                  {selectedEmail.sender_type === 'internal' && ' ⚙️ (System Alert)'}
                </span>
                <span>Time: {new Date(selectedEmail.created_at).toLocaleString()}</span>
                {selectedEmail.attachments?.length > 0 && (
                  <span>Attachments: {selectedEmail.attachments.length}</span>
                )}
              </div>
              
              <div className="email-body">
                <p>{selectedEmail.body}</p>
                {selectedEmail.attachments?.length > 0 && (
                  <div className="attachments">
                    <h4>Attachments:</h4>
                    {selectedEmail.attachments.map(att => (
                      <div key={att.id} className="attachment-item">
                        <span>📎 {att.filename}</span> <span className="att-size">({att.size})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="email-actions">
                {linkedShipments[selectedEmail.id] && (
                  <div 
                    className="linked-shipment-info"
                    onClick={handleLinkedShipmentClick}
                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                    title="Click to view shipment details in Live Tracker"
                  >
                    <div className="shipment-badge">🔗 Linked Shipment (Click to view)</div>
                    <div className="shipment-details">
                      <p><strong>Tracking:</strong> {linkedShipments[selectedEmail.id].tracking_number}</p>
                      <p><strong>Status:</strong> {linkedShipments[selectedEmail.id].status}</p>
                      <p><strong>Carrier:</strong> {linkedShipments[selectedEmail.id].carrier}</p>
                      <p><strong>ETA:</strong> {new Date(linkedShipments[selectedEmail.id].eta).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                <div className="action-buttons">
                  <div className="template-section">
                    <button 
                      className="action-btn"
                      title="Show quick reply templates"
                    >
                      📝 Quick Templates
                    </button>
                    <div className="template-dropdown">
                      <button onClick={() => handleQuickReply('on_the_way')}>✓ On The Way</button>
                      <button onClick={() => handleQuickReply('delay')}>⚠️ Delay Apology</button>
                      <button onClick={() => handleQuickReply('confirm_delivery')}>📦 Delivery Confirmed</button>
                      <button onClick={() => handleQuickReply('address_correction')}>📍 Address Updated</button>
                    </div>
                  </div>
                </div>

                <div className="reply-section">
                  <h4>Your Reply:</h4>
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    rows="4"
                  />
                  <div className="reply-actions">
                    <button onClick={sendReply} className="send-btn" disabled={!replyText.trim()}>✉️ Send Reply</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailPanel;