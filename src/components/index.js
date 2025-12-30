import React, { useState, useEffect } from 'react';
import { generateCalls, generatePriorityList, generateDailySummary, generateShipments } from '../utils/mockDataGenerator';

export { default as Dashboard } from './Dashboard';
export { default as EmailPanel } from './EmailPanel';
export { default as BatchProcessor } from './BatchProcessor';
export { default as DocumentManager } from './DocumentManager';

// Phone Panel Component
export const PhonePanel = ({ shipments: externalShipments = [], onNavigate = () => {} }) => {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (externalShipments && externalShipments.length > 0) {
      // Use real shipments from the app
      const generatedCalls = generateCalls(12);
      const callsWithRealShipments = generatedCalls.map((call, idx) => ({
        ...call,
        related_shipment: externalShipments[idx % externalShipments.length]
      }));

      // Add deterministic carrier calls for shipments with issues for realism
      const issueShipments = externalShipments.filter(s => ['EXCEPTION', 'DELAYED'].includes(s.status));
      const statusBasedCalls = issueShipments.map((s, i) => ({
        id: 1000 + i,
        phone_number: '+1-800-' + (s.carrier || 'CARRIER').toUpperCase(),
        caller_name: `${s.carrier || 'Carrier'} Dispatch`,
        caller_type: 'Carrier',
        reason: s.status === 'EXCEPTION' ? 'Exception Reported' : 'Carrier Delay',
        description: s.status === 'EXCEPTION'
          ? `Shipment ${s.tracking_number} encountered an exception en route. Investigating cause (address issue, damage, or failed scan).`
          : `Shipment ${s.tracking_number} is delayed due to network or weather disruption. Updated ETA: ${new Date(s.eta).toLocaleString()}.`,
        action_needed: s.status === 'EXCEPTION'
          ? 'Review tracker notes, contact carrier for resolution, notify consignee.'
          : 'Confirm updated ETA with carrier and inform customer.',
        call_status: s.status === 'EXCEPTION' ? 'COMPLAINT' : 'UPDATE',
        timestamp: new Date().toISOString(),
        duration: null,
        resolved: false,
        resolution_notes: '',
        related_shipment: s
      }));

      // Add deterministic customer complaint calls for realism with variations
      const customerVariations = [
        { reason: 'Wheres my package??', desc: `Hi, my tracking ${'{TRK}'} says exception. What does that even mean? When is it coming???`, status: 'COMPLAINT' },
        { reason: 'Package not arrived yet', desc: `Hello, I ordered something and its delayed (${'{TRK}'}). Can you check whats going on?`, status: 'COMPLAINT' },
        { reason: 'WHERE IS MY ORDER', desc: `This is ridiculous! Tracking ${'{TRK}'} shows exception. I need this ASAP!`, status: 'COMPLAINT' },
        { reason: 'Tracking shows delayed...', desc: `Hi, ${'{TRK}'} is showing as delayed. Any idea when it will actualy arrive?`, status: 'COMPLAINT' },
        { reason: 'Urgent - package missing?', desc: `My package ${'{TRK}'} status changed to exception. Is it lost??`, status: 'COMPLAINT' },
        { reason: 'Delivery delay complaint', desc: `Tracking ${'{TRK}'} delayed again. This is the 2nd time. Whats the real ETA?`, status: 'COMPLAINT' }
      ];
      
      const customerCalls = issueShipments.map((s, i) => {
        const variation = customerVariations[i % customerVariations.length];
        return {
          id: 2000 + i,
          phone_number: s.receiver_contact?.phone || s.customer_phone || '+1-555-CUSTOMER',
          caller_name: s.receiver_contact?.name || s.customer_name || 'Customer Recipient',
          caller_type: 'Customer',
          reason: variation.reason,
          description: variation.desc.replace('{TRK}', s.tracking_number),
          action_needed: s.status === 'EXCEPTION'
            ? 'Investigate exception with carrier, provide update, and next steps.'
            : 'Confirm updated ETA and notify customer.',
          call_status: variation.status,
          timestamp: new Date().toISOString(),
          duration: null,
          resolved: false,
          resolution_notes: '',
          related_shipment: s
        };
      });
      
      const combined = [...statusBasedCalls, ...customerCalls, ...callsWithRealShipments];
      setCalls(combined);
      if (combined.length > 0) {
        setSelectedCall(combined[0]);
      }
    }
  }, [externalShipments]);

  // Ensure current page stays within bounds when data changes
  useEffect(() => {
    const pending = calls.filter(c => !c.resolved);
    const totalPages = Math.max(1, Math.ceil(pending.length / itemsPerPage));
    setCurrentPage(prev => Math.min(prev, totalPages));
  }, [calls]);

  const getStatusColor = (status) => {
    const colors = {
      'COMPLAINT': '#f44336',
      'UPDATE': '#2196f3'
    };
    return colors[status] || '#999';
  };

  const handleResolveCall = (callId) => {
    if (!resolutionNotes.trim()) {
      alert('Please add resolution notes before marking as resolved.');
      return;
    }
    alert(`✅ Call #${callId} RESOLVED\n\nNotes: ${resolutionNotes}\n\nGreat work! Next caller waiting...`);
    setResolutionNotes('');
    setSelectedCall(null);
  };

  const pendingCalls = calls.filter(c => !c.resolved);
  const totalPages = Math.ceil(pendingCalls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPendingCalls = pendingCalls.slice(startIndex, endIndex);
  const resolvedCount = calls.length - pendingCalls.length;
  const complaintWaiting = pendingCalls.filter(c => c.call_status === 'COMPLAINT').length;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>📞 Incoming Calls Desk</h2>
          <div style={{ color: '#555', fontSize: '13px' }}>You are on the headset—open a call, resolve it, log the notes.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(110px, 1fr))', gap: '8px', minWidth: '320px' }}>
          {[{ label: 'Updates', value: pendingCalls.length, color: '#1976d2' }, { label: 'Complaints', value: complaintWaiting, color: '#f44336' }, { label: 'Resolved', value: resolvedCount, color: '#4caf50' }]
            .map(tile => (
              <div key={tile.label} style={{
                background: '#f8fafc',
                border: `1px solid ${tile.color}`,
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>{tile.label}</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: tile.color }}>{tile.value}</div>
              </div>
            ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
        <div style={{ borderRight: '1px solid #ddd', paddingRight: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ marginTop: 0 }}>Call Queue ({pendingCalls.length} waiting)</h3>
            {pendingCalls.length > 0 && (
              <div style={{ fontSize: '12px', color: '#555' }}>Page {currentPage} of {Math.max(1, totalPages)}</div>
            )}
          </div>
          {pendingCalls.length === 0 ? (
            <p style={{ color: '#999' }}>No pending calls. Great job!</p>
          ) : (
            paginatedPendingCalls.map(call => (
              <div 
                key={call.id}
                style={{
                  padding: '12px',
                  border: `2px solid ${getStatusColor(call.call_status)}`,
                  margin: '8px 0',
                  cursor: 'pointer',
                  background: selectedCall?.id === call.id ? '#f5f5f5' : 'white',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setSelectedCall(call);
                  setResolutionNotes('');
                }}
              >
                <div><strong>{call.reason}</strong></div>
                <div style={{ fontSize: '12px', color: '#666' }}>{call.caller_type}</div>
                <div style={{
                  fontSize: '11px',
                  backgroundColor: getStatusColor(call.call_status),
                  color: 'white',
                  padding: '3px 6px',
                  borderRadius: '3px',
                  display: 'inline-block',
                  marginTop: '4px'
                }}>
                  {call.call_status}
                </div>
              </div>
            ))
          )}

          {/* Pagination Controls */}
          {pendingCalls.length > itemsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === 1 ? '#ccc' : '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                ← Previous
              </button>
              <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
                {`${startIndex + 1} - ${Math.min(endIndex, pendingCalls.length)} of ${pendingCalls.length}`}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === totalPages ? '#ccc' : '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {selectedCall ? (
          <div style={{ border: '2px solid #1976d2', padding: '20px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <h3 style={{ marginTop: 0 }}>📲 Call: {selectedCall.reason}</h3>
            
            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
              <div style={{ marginBottom: '10px' }}>
                <strong>Caller:</strong> {selectedCall.caller_name} ({selectedCall.caller_type})
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Phone:</strong> {selectedCall.phone_number}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Message:</strong>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>"{selectedCall.description}"</p>
              </div>
              <div style={{ 
                backgroundColor: '#fff3e0',
                padding: '10px',
                borderRadius: '4px',
                borderLeft: '4px solid #ff9800'
              }}>
                <strong>Suggestion:</strong>
                <p style={{ margin: '5px 0', fontSize: '13px' }}>{selectedCall.action_needed}</p>
              </div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
              <h4 style={{ marginTop: 0 }}>📦 Related Shipment</h4>
              <div>
                <strong>Tracking:</strong>{' '}
                <span
                  onClick={() => onNavigate('tracker', selectedCall.related_shipment)}
                  style={{
                    color: '#1976d2',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: '500'
                  }}
                  title="Click to view in Live Tracker"
                >
                  {selectedCall.related_shipment.tracking_number}
                </span>
              </div>
              <div><strong>Status:</strong> {selectedCall.related_shipment.status}</div>
              <div><strong>From:</strong> {selectedCall.related_shipment.origin.city}, {selectedCall.related_shipment.origin.state}</div>
              <div><strong>To:</strong> {selectedCall.related_shipment.destination.city}, {selectedCall.related_shipment.destination.state}</div>
              <div><strong>ETA:</strong> {new Date(selectedCall.related_shipment.eta).toLocaleString()}</div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px' }}>
              <h4 style={{ marginTop: 0 }}>✅ How did you resolve this?</h4>
              <textarea
                placeholder="Describe the action you took (e.g., 'Called customer with new ETA. Confirmed address. Will deliver by 5pm')..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontFamily: 'Arial',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={() => handleResolveCall(selectedCall.id)}
                disabled={!resolutionNotes.trim()}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '12px',
                  backgroundColor: resolutionNotes.trim() ? '#4caf50' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: resolutionNotes.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                ✅ Mark Call as Resolved
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            <p style={{ fontSize: '48px' }}>📞</p>
            <p>Select a call from the queue to handle it</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Live Tracker Component
export const Tracker = ({ shipments: externalShipments, selectedShipment, onShipmentSelect, onNavigate = () => {}, collectedPODs = new Set(), collectedInvoices = new Set(), onRequestPOD = () => {}, onRequestInvoice = () => {} }) => {
  const [shipments, setShipments] = useState(externalShipments || []);
  const [showDocuments, setShowDocuments] = useState({});
  const [selected, setSelected] = useState(selectedShipment || null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (externalShipments && externalShipments.length > 0) {
      setShipments(externalShipments);
    } else {
      const fetchShipments = () => {
        const generatedShipments = generateShipments(20);
        setShipments(generatedShipments);
      };

      fetchShipments();
      const interval = setInterval(fetchShipments, 30000);
      return () => clearInterval(interval);
    }
  }, [externalShipments]);

  useEffect(() => {
    if (selectedShipment) {
      setSelected(selectedShipment);
    }
  }, [selectedShipment]);

  const getStatusColor = (status) => {
    const colors = {
      'DELIVERED': '#4caf50',
      'IN_TRANSIT': '#2196f3',
      'DELAYED': '#ff9800',
      'EXCEPTION': '#f44336',
      'PENDING': '#9e9e9e'
    };
    return colors[status] || '#999';
  };

  const handleShipmentClick = (shipment) => {
    setSelected(shipment);
    if (onShipmentSelect) {
      onShipmentSelect(shipment);
    }
  };

  const statusCounts = shipments.reduce((acc, ship) => {
    acc[ship.status] = (acc[ship.status] || 0) + 1;
    return acc;
  }, {});
  const pendingCount = statusCounts.PENDING || 0;
  const inTransitCount = statusCounts.IN_TRANSIT || 0;
  const exceptionCount = statusCounts.EXCEPTION || 0;
  const delayedCount = statusCounts.DELAYED || 0;
  const deliveredCount = statusCounts.DELIVERED || 0;

  // Pagination calculations
  const totalPages = Math.ceil(shipments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedShipments = shipments.slice(startIndex, endIndex);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '10px',
        alignItems: 'stretch',
        flexShrink: 0
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 12px 28px rgba(15,23,42,0.25)'
        }}>
          <p style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px', fontSize: '11px', opacity: 0.8 }}>Live view</p>
          <h2 style={{ margin: '4px 0 6px', fontSize: '24px' }}>Live Shipment Tracker</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>Monitor carrier movement, surface exceptions, and jump to documents.</p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px'
        }}>
          {[{ label: 'Pending', value: pendingCount, color: '#8b5cf6' }, { label: 'In Transit', value: inTransitCount, color: '#1d4ed8' }, { label: 'Delayed', value: delayedCount, color: '#ff9800' }, { label: 'Exceptions', value: exceptionCount, color: '#f44336' }, { label: 'Delivered', value: deliveredCount, color: '#10b981' }]
            .map(tile => (
              <div key={tile.label} style={{
                background: '#0b1324',
                border: `1px solid ${tile.color}`,
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'white'
              }}>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>{tile.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: tile.color }}>{tile.value}</div>
              </div>
            ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px', flex: 1, minHeight: 0 }}>
        {/* Shipments List */}
        <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 6px 18px rgba(15,23,42,0.12)', padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
            <h3 style={{ margin: 0 }}>Shipments ({shipments.length})</h3>
            <div style={{ fontSize: '12px', color: '#555' }}>Page {currentPage} of {totalPages}</div>
          </div>
          <div style={{ overflowX: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', flex: 1 }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 10 }}>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Tracking #</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>Priority</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>From</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>To</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd' }}>ETA</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShipments.map(ship => (
                  <tr 
                    key={ship.id} 
                    onClick={() => handleShipmentClick(ship)}
                    style={{ 
                      borderBottom: '1px solid #ddd',
                      backgroundColor: selected?.id === ship.id ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td style={{ padding: '10px' }}><strong>{ship.tracking_number}</strong></td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        backgroundColor: getStatusColor(ship.status),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {ship.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>{ship.priority}</td>
                    <td style={{ padding: '10px' }}>{ship.origin.city}, {ship.origin.state}</td>
                    <td style={{ padding: '10px' }}>{ship.destination.city}, {ship.destination.state}</td>
                    <td style={{ padding: '10px' }}>{new Date(ship.eta).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #ddd', flexShrink: 0 }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPage === 1 ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              ← Previous
            </button>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
              {totalPages === 0 ? 'No shipments' : `${startIndex + 1} - ${Math.min(endIndex, shipments.length)} of ${shipments.length}`}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: currentPage === totalPages || totalPages === 0 ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Detailed View now opens in a modal overlay */}
      </div>

      {/* Tracker Detail Modal */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              width: 'min(920px, 92vw)',
              maxHeight: '90vh',
              background: 'white',
              border: '2px solid #1976d2',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(15,23,42,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              background: 'linear-gradient(90deg, #0f172a, #1d4ed8)',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>📦 {selected.tracking_number}</h3>
              <button
                onClick={() => setSelected(null)}
                title="Close"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto' }}>
              {/* Basic Info */}
              <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Tracking</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8', wordBreak: 'break-word' }}>
                  <div><strong>Number:</strong> {selected.tracking_number}</div>
                  <div><strong>Carrier:</strong> {selected.carrier}</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span style={{
                      backgroundColor: getStatusColor(selected.status),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '12px'
                    }}>
                      {selected.status}
                    </span>
                  </div>
                  <div><strong>Priority:</strong> {selected.priority}</div>
                </div>
              </div>

              {/* Route Info */}
              <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Route</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8', wordBreak: 'break-word' }}>
                  <div>
                    <strong>Origin:</strong> {selected.origin.address}, {selected.origin.city}, {selected.origin.state} {selected.origin.zip}
                  </div>
                  <div>
                    <strong>Destination:</strong> {selected.destination.address}, {selected.destination.city}, {selected.destination.state} {selected.destination.zip}
                  </div>
                  <div><strong>Estimated Delivery:</strong> {new Date(selected.eta).toLocaleString()}</div>
                </div>
              </div>

              {/* Items */}
              <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>📦 Items ({selected.items.length})</h4>
                <div style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                  {selected.items.map((item, idx) => (
                    <div key={idx} style={{ paddingBottom: '6px', borderBottom: idx < selected.items.length - 1 ? '1px solid #eee' : 'none', marginBottom: '6px' }}>
                      <div><strong>{item.name}</strong></div>
                      <div style={{ color: '#666' }}>Qty: {item.quantity} | Weight: {item.weight}lbs</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>📄 Documents</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    onClick={() => onNavigate('documents', { tab: 'bods', tracking: selected.tracking_number })}
                    style={{
                      padding: '10px',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#388e3c'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#4caf50'}
                  >
                    📋 BOL
                  </button>
                  <button
                    onClick={() => onNavigate('documents', { tab: 'pods', tracking: selected.tracking_number })}
                    style={{
                      padding: '10px',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1565c0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                  >
                    ✓ POD
                  </button>
                  <button
                    onClick={() => onNavigate('documents', { tab: 'invoices', tracking: selected.tracking_number })}
                    style={{
                      padding: '10px',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e65100'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
                  >
                    💰 Invoice
                  </button>
                </div>

                {selected.status === 'DELIVERED' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
                      📥 Request POD:
                    </div>
                    <div>
                      {!collectedPODs.has(selected.tracking_number) ? (
                        <button
                          onClick={() => {
                            onRequestPOD(selected.tracking_number);
                            alert(`POD request sent for ${selected.tracking_number}\n\nThe carrier will provide the signed delivery document.`);
                          }}
                          style={{
                            padding: '8px',
                            backgroundColor: '#2196f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            width: '100%',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#1565c0'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#2196f3'}
                        >
                          🔔 Request POD
                        </button>
                      ) : (
                        <div style={{
                          padding: '8px',
                          backgroundColor: '#e8f5e9',
                          color: '#2e7d32',
                          border: '1px solid #4caf50',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          ✓ POD Collected
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selected.status !== 'PENDING' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
                      💰 Request Invoice:
                    </div>
                    <div>
                      {!collectedInvoices.has(selected.tracking_number) ? (
                        <button
                          onClick={() => {
                            onRequestInvoice(selected.tracking_number);
                            alert(`Invoice request sent for ${selected.tracking_number}\n\nThe carrier will provide the billing document.`);
                          }}
                          style={{
                            padding: '8px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            width: '100%',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#e65100'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#ff9800'}
                        >
                          🔔 Request Invoice
                        </button>
                      ) : (
                        <div style={{
                          padding: '8px',
                          backgroundColor: '#fff3e0',
                          color: '#e65100',
                          border: '1px solid #ff9800',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textAlign: 'center'
                        }}>
                          ✓ Invoice Collected
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  <p style={{ margin: '4px 0' }}>Click any button to open Document Manager</p>
                </div>
              </div>

              {/* Contacts */}
              <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>📇 Contacts</h4>
                <div style={{ fontSize: '13px', lineHeight: '1.8', display: 'grid', gridTemplateColumns: '1fr', gap: '12px', wordBreak: 'break-word' }}>
                  <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Shipper</div>
                    <div><strong>Name:</strong> {selected.sender_contact?.name}</div>
                    <div><strong>Email:</strong> {selected.sender_contact?.email}</div>
                    <div><strong>Phone:</strong> {selected.sender_contact?.phone}</div>
                  </div>
                  <div style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Consignee</div>
                    <div><strong>Name:</strong> {selected.receiver_contact?.name}</div>
                    <div><strong>Email:</strong> {selected.receiver_contact?.email}</div>
                    <div><strong>Phone:</strong> {selected.receiver_contact?.phone}</div>
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

// Priority List Component
export const PriorityList = ({ shipments = [], onNavigate = () => {} }) => {
  const [tasks, setTasks] = useState([]);
  
  // Initialize from localStorage
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('priorityQueue_completedTasks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      console.error('Error loading completed tasks:', error);
      return new Set();
    }
  });
  
  const [completedSubtasks, setCompletedSubtasks] = useState(() => {
    try {
      const saved = localStorage.getItem('priorityQueue_completedSubtasks');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('Error loading completed subtasks:', error);
      return {};
    }
  });
  
  const [linkedShipments, setLinkedShipments] = useState({});
  const [taskFilter, setTaskFilter] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  
  // Save completedTasks to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('priorityQueue_completedTasks', JSON.stringify([...completedTasks]));
    } catch (error) {
      console.error('Error saving completed tasks:', error);
    }
  }, [completedTasks]);
  
  // Save completedSubtasks to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('priorityQueue_completedSubtasks', JSON.stringify(completedSubtasks));
    } catch (error) {
      console.error('Error saving completed subtasks:', error);
    }
  }, [completedSubtasks]);

  useEffect(() => {
    const fetchTasks = () => {
      const issueShipments = (shipments || []).filter(s => ['EXCEPTION', 'DELAYED', 'PENDING'].includes(s.status));

      const liveTasks = issueShipments.map((s, idx) => ({
        id: `live-${s.id}-${idx}`,
        title: s.status === 'EXCEPTION' ? 'Resolve shipment exception' : s.status === 'DELAYED' ? 'Unblock delayed shipment' : 'Start pending shipment',
        priority: s.priority || 'HIGH',
        status: s.status === 'EXCEPTION' ? 'BLOCKED' : 'TODO',
        assigned_to: 'You (Logistics Coordinator)',
        due_date: s.eta,
        description: `${s.carrier || 'Carrier'} | ${s.tracking_number} | ${s.status === 'EXCEPTION' ? 'Investigate exception and update customer' : s.status === 'DELAYED' ? 'Confirm new ETA with carrier and notify customer' : 'Confirm pickup/induction and push to in-transit'}`,
        subtasks: [
          { id: 1, title: 'Open shipment in tracker', completed: false },
          { id: 2, title: s.status === 'EXCEPTION' ? 'Call carrier for root cause' : 'Call carrier for updated ETA', completed: false },
          { id: 3, title: 'Notify customer with plan', completed: false },
          { id: 4, title: 'Log note in tracker', completed: false }
        ]
      }));

      const fillerCount = Math.max(0, 15 - liveTasks.length);
      const generatedTasks = generatePriorityList(fillerCount).map((task, idx) => ({
        ...task,
        id: `gen-${idx}-${task.id}`
      }));
      const combinedTasks = [...liveTasks, ...generatedTasks];

      const newLinkedShipments = {};
      combinedTasks.forEach(task => {
        // If task is derived from a live shipment, attach directly
        if (task.id.startsWith('live-')) {
          const match = issueShipments.find(s => task.description.includes(s.tracking_number));
          if (match) {
            newLinkedShipments[task.id] = match;
            return;
          }
        }

        // For generated tasks, attempt regex match or fallback
        const trackingMatch = task.description.match(/TRK[0-9\-]+|TRK-\d{4}-\d{5}/i);
        if (trackingMatch && shipments && shipments.length > 0) {
          const relatedShipment = shipments.find(s =>
            s.tracking_number.toLowerCase() === trackingMatch[0].toLowerCase()
          ) || shipments[Math.floor(Math.random() * shipments.length)];
          newLinkedShipments[task.id] = relatedShipment;
        } else if (shipments && shipments.length > 0) {
          newLinkedShipments[task.id] = shipments[Math.floor(Math.random() * shipments.length)];
        }
      });

      setTasks(combinedTasks);
      setLinkedShipments(newLinkedShipments);
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [shipments]);

  const getPriorityColor = (priority) => {
    const colors = {
      'CRITICAL': '#f44336',
      'HIGH': '#ff9800',
      'MEDIUM': '#2196f3',
      'LOW': '#4caf50'
    };
    return colors[priority] || '#999';
  };

  const handleSubtaskToggle = (taskId, subtaskId) => {
    const key = `${taskId}-${subtaskId}`;
    setCompletedSubtasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTaskComplete = (taskId) => {
    setCompletedTasks(prev => new Set([...prev, taskId]));
    alert(`✅ Task #${taskId} marked as COMPLETED\n\nGreat work! This shipment is now fully processed.`);
  };

  const handleViewInTracker = (taskId) => {
    const relatedShipment = linkedShipments[taskId];
    if (!relatedShipment) {
      alert('No shipment linked to this task');
      return;
    }
    onNavigate('tracker', relatedShipment);
  };

  // Sort tasks by priority: CRITICAL > HIGH > MEDIUM > LOW
  const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  const sortedTasks = [...tasks].sort((a, b) => {
    return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
  });

  const activeTasks = sortedTasks.filter(t => !completedTasks.has(t.id));
  const completed = sortedTasks.filter(t => completedTasks.has(t.id));

  const priorityCounts = tasks.reduce((acc, task) => {
    const key = task.priority || 'UNASSIGNED';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: '26px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
        alignItems: 'stretch',
        marginBottom: '16px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 12px 30px rgba(15,23,42,0.25)'
        }}>
          <div style={{ fontSize: '13px', letterSpacing: '0.2px', opacity: 0.9 }}>Ops board</div>
          <h2 style={{ margin: '4px 0 6px', fontSize: '26px' }}>⚡ Priority Queue</h2>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>SLA-sensitive shipments surfaced to the top view.</div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))',
          gap: '10px',
          background: '#0b1324',
          borderRadius: '12px',
          padding: '10px',
          boxShadow: '0 10px 24px rgba(16,24,40,0.18)'
        }}>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
            <div key={level} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${getPriorityColor(level)}`,
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.3px' }}>{level}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: getPriorityColor(level), lineHeight: 1 }}>{priorityCounts[level] || 0}</div>
            </div>
          ))}
        </div>
      </div>

       <div style={{
         display: 'flex',
         gap: '10px',
         marginBottom: '20px',
         justifyContent: 'space-between',
         alignItems: 'center'
       }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setTaskFilter('active');
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: taskFilter === 'active' ? 'none' : '2px solid #ddd',
              backgroundColor: taskFilter === 'active' ? '#1976d2' : 'white',
              color: taskFilter === 'active' ? 'white' : '#333',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            Active ({activeTasks.length})
          </button>
          <button
            onClick={() => {
              setTaskFilter('completed');
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: taskFilter === 'completed' ? 'none' : '2px solid #ddd',
              backgroundColor: taskFilter === 'completed' ? '#4caf50' : 'white',
              color: taskFilter === 'completed' ? 'white' : '#333',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            Completed ({completed.length})
          </button>
        </div>
        {completed.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm(`Clear all ${completed.length} completed tasks? This cannot be undone.`)) {
                setCompletedTasks(new Set());
                setCompletedSubtasks({});
                localStorage.removeItem('priorityQueue_completedTasks');
                localStorage.removeItem('priorityQueue_completedSubtasks');
                alert('✅ All completed tasks have been cleared.');
                setTaskFilter('active');
              }
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: '2px solid #f44336',
              backgroundColor: 'white',
              color: '#f44336',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
            title="Clear all completed tasks from history"
          >
            🗑️ Clear Completed
          </button>
        )}
       </div>

       {taskFilter === 'active' ? (
        <>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {activeTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(task => {
            const completedCount = task.subtasks?.filter((sub, idx) => completedSubtasks[`${task.id}-${idx}`]).length || 0;
            const totalSubtasks = task.subtasks?.length || 0;
            const progressPercent = totalSubtasks > 0 ? (completedCount / totalSubtasks) * 100 : 0;

            return (
              <div key={task.id} style={{ 
                border: `2px solid ${getPriorityColor(task.priority)}`,
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                display: 'grid',
                gridTemplateRows: 'auto auto 1fr auto',
                gap: '8px',
                minHeight: '280px',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                  <h4 style={{ margin: 0, flex: 1, fontSize: '13px', lineHeight: '1.3' }}>{task.title}</h4>
                  <span style={{
                    backgroundColor: getPriorityColor(task.priority),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    marginLeft: '6px'
                  }}>
                    {task.priority}
                  </span>
                </div>

                <p style={{ fontSize: '11px', color: '#555', marginBottom: '8px', lineHeight: '1.3', margin: 0 }}>
                  {task.description}
                </p>

                <div style={{ 
                  fontSize: '10px',
                  color: '#666',
                  marginBottom: '6px',
                  padding: '8px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '6px',
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '4px'
                }}>
                  <div><strong>Status:</strong> {task.status}</div>
                  <div><strong>Due:</strong> {new Date(task.due_date).toLocaleDateString()}</div>
                </div>

                {task.subtasks?.length > 0 && (
                  <div style={{ marginTop: '6px', borderTop: '1px solid #ddd', paddingTop: '6px' }}>
                    <strong style={{ display: 'block', marginBottom: '4px', fontSize: '10px' }}>Items ({completedCount}/{totalSubtasks}):</strong>
                    <div style={{
                      height: '4px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '2px',
                      marginBottom: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: getPriorityColor(task.priority),
                        width: `${progressPercent}%`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: '9px' }}>
                      {task.subtasks.map((sub, idx) => (
                        <label key={sub.id} style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '9px',
                          marginBottom: '3px',
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '2px',
                          backgroundColor: completedSubtasks[`${task.id}-${idx}`] ? '#e8f5e9' : 'transparent'
                        }}>
                          <input 
                            type="checkbox"
                            checked={completedSubtasks[`${task.id}-${idx}`] || false}
                            onChange={() => handleSubtaskToggle(task.id, idx)}
                            style={{ marginRight: '4px', cursor: 'pointer', width: '12px', height: '12px' }}
                          />
                          <span style={{
                            textDecoration: completedSubtasks[`${task.id}-${idx}`] ? 'line-through' : 'none',
                            color: completedSubtasks[`${task.id}-${idx}`] ? '#999' : '#333'
                          }}>
                            {sub.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleTaskComplete(task.id)}
                  disabled={completedCount < totalSubtasks}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    padding: '6px',
                    backgroundColor: completedCount === totalSubtasks ? getPriorityColor(task.priority) : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: completedCount === totalSubtasks ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '10px'
                  }}
                >
                  ✅ Mark as Complete
                </button>
              </div>
            );
          })}
        </div>
        
        {Math.ceil(activeTasks.length / itemsPerPage) > 1 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: currentPage === 1 ? '#f0f0f0' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              ← Previous
            </button>
            {Array.from({ length: Math.ceil(activeTasks.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: currentPage === page ? 'none' : '1px solid #ddd',
                  backgroundColor: currentPage === page ? '#1976d2' : 'white',
                  color: currentPage === page ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: currentPage === page ? '600' : '400'
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(activeTasks.length / itemsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(activeTasks.length / itemsPerPage)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: currentPage === Math.ceil(activeTasks.length / itemsPerPage) ? '#f0f0f0' : 'white',
                cursor: currentPage === Math.ceil(activeTasks.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Next →
            </button>
          </div>
        )}
        </>
      ) : (
        <>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {completed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(task => (
            <div key={task.id} style={{
              border: '2px solid #4caf50',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#f1f8f4',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.08)',
              display: 'grid',
              gridTemplateRows: 'auto auto 1fr',
              gap: '8px',
              minHeight: '150px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                <h4 style={{ margin: 0, flex: 1, textDecoration: 'line-through', color: '#666', fontSize: '13px', lineHeight: '1.3' }}>{task.title}</h4>
                <span style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  marginLeft: '6px'
                }}>
                  {task.priority}
                </span>
              </div>

              <p style={{ fontSize: '11px', color: '#666', marginBottom: '8px', lineHeight: '1.3', margin: 0 }}>
                {task.description}
              </p>

              <div style={{
                fontSize: '10px',
                color: '#666',
                padding: '6px',
                backgroundColor: '#e8f5e9',
                borderRadius: '4px',
                borderLeft: '3px solid #4caf50'
              }}>
                <strong style={{ color: '#2e7d32' }}>✅ Completed</strong>
              </div>
            </div>
          ))}
        </div>

        {Math.ceil(completed.length / itemsPerPage) > 1 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: currentPage === 1 ? '#f0f0f0' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              ← Previous
            </button>
            {Array.from({ length: Math.ceil(completed.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: currentPage === page ? 'none' : '1px solid #ddd',
                  backgroundColor: currentPage === page ? '#4caf50' : 'white',
                  color: currentPage === page ? 'white' : '#333',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: currentPage === page ? '600' : '400'
                }}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(completed.length / itemsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(completed.length / itemsPerPage)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: currentPage === Math.ceil(completed.length / itemsPerPage) ? '#f0f0f0' : 'white',
                cursor: currentPage === Math.ceil(completed.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Next →
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
};

// Daily Summary Component
export const DailySummary = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchSummary = () => {
      const generatedSummary = generateDailySummary();
      setSummary(generatedSummary);
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '16px 18px' }}>
      <h2 style={{ margin: 0 }}>Daily Summary</h2>
      <p style={{ margin: '4px 0 12px', color: '#666', fontSize: '13px' }}>
        {summary?.date ? `Date: ${summary.date}` : 'Latest generated metrics'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        {[{ label: 'Total shipments', value: summary?.total_shipments || 0, color: '#1d4ed8' }, { label: 'Delivered today', value: summary?.delivered_today || 0, color: '#10b981' }, { label: 'Delayed', value: summary?.delayed || 0, color: '#f97316' }, { label: 'Exceptions', value: summary?.exceptions || 0, color: '#ef4444' }]
          .map(tile => (
            <div key={tile.label} style={{ background: 'white', border: `1px solid ${tile.color}`, borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#555' }}>{tile.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: tile.color }}>{tile.value}</div>
            </div>
          ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '12px' }}>
        {[{ label: 'Emails sent', value: summary?.emails_sent || 0, color: '#1d4ed8' }, { label: 'Calls made', value: summary?.calls_made || 0, color: '#1d4ed8' }, { label: 'Customer satisfaction', value: summary ? `${(parseFloat(summary.customer_satisfaction) * 100).toFixed(0)}%` : '—', color: '#10b981' }]
          .map(tile => (
            <div key={tile.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: '#555' }}>{tile.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: tile.color }}>{tile.value}</div>
            </div>
          ))}
      </div>

      {/* Mini visualization: relative bars for delivery outcomes */}
      {summary && (
        <div style={{ marginTop: '16px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '13px', color: '#444', marginBottom: '8px' }}>Delivery Outcomes</div>
          {(() => {
            const delivered = parseInt(summary.delivered_today || 0, 10);
            const delayed = parseInt(summary.delayed || 0, 10);
            const exceptions = parseInt(summary.exceptions || 0, 10);
            const maxVal = Math.max(delivered, delayed, exceptions, 1);
            const bar = (val, color) => ({ width: `${Math.round((val / maxVal) * 100)}%`, background: color, height: '10px', borderRadius: '6px' });
            const row = (label, val, color) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#666' }}>{label}</span>
                <div style={{ background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={bar(val, color)} />
                </div>
                <span style={{ fontSize: '12px', color: '#333', textAlign: 'right' }}>{val}</span>
              </div>
            );
            return (
              <div>
                {row('Delivered', delivered, '#10b981')}
                {row('Delayed', delayed, '#f59e0b')}
                {row('Exceptions', exceptions, '#ef4444')}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
