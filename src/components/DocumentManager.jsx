import React, { useState, useEffect } from 'react';
import { generateBODs, generatePODs, generateInvoices } from '../utils/mockDataGenerator';
import './DocumentManager.css';

const DocumentManager = ({ shipments = [], onNavigate = () => {}, docTarget = null, collectedPODs = new Set(), collectedInvoices = new Set() }) => {
  const [activeTab, setActiveTab] = useState('bods');
  const [bods, setBODs] = useState([]);
  const [pods, setPODs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedDocumentTab, setSelectedDocumentTab] = useState(null); // Track which tab the selection is from
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [linkedShipments, setLinkedShipments] = useState({});

  // Load documents once on mount and when collection state changes
  useEffect(() => {
    loadDocuments();
  }, [collectedPODs, collectedInvoices]);

  // Apply incoming target (tab + tracking) when provided or when docs refresh
  useEffect(() => {
    if (!docTarget) return;
    if (docTarget.tab) setActiveTab(docTarget.tab);

    // attempt selection after docs are loaded
    const trySelect = () => {
      const tracking = docTarget.tracking;
      if (!tracking) return;
      if (docTarget.tab === 'pods') {
        const match = pods.find(p => p.tracking_number === tracking);
        if (match) { setSelectedDocument({ ...match }); setSelectedDocumentTab('pods'); }
      } else if (docTarget.tab === 'invoices') {
        const match = invoices.find(inv => inv.tracking_number === tracking);
        if (match) { setSelectedDocument({ ...match }); setSelectedDocumentTab('invoices'); }
      } else if (docTarget.tab === 'bods') {
        // Best-effort: match by bol_number prefix
        const match = bods.find(b => tracking && b.tracking_number ? b.tracking_number === tracking : false);
        if (match) { setSelectedDocument({ ...match }); setSelectedDocumentTab('bods'); }
      }
    };

    trySelect();
  }, [docTarget, bods, pods, invoices]);

  const loadDocuments = () => {
    const docCount = shipments && shipments.length > 0 ? shipments.length : 15;
    let newBODs = generateBODs(docCount);
    let newPODs = generatePODs(docCount);
    let newInvoices = generateInvoices(docCount);

    // If real shipments exist, align documents to shipment tracking numbers for consistent linking
    if (shipments && shipments.length > 0) {
      // Filter to only delivered shipments for PODs
      const deliveredShipments = shipments.filter(s => s.status === 'DELIVERED');
      
      newBODs = newBODs.map((bod, idx) => {
        const shipment = shipments[idx % shipments.length];
        // BOL is signed at pickup - only PENDING means not picked up yet
        const bolSigned = shipment.status !== 'PENDING';
        // Map shipment items to BOL line items for consistency with Live Tracker
        const mappedLineItems = (shipment.items || []).map((it, iIdx) => ({
          id: iIdx + 1,
          description: it.name || it.description || `Item ${iIdx + 1}`,
          quantity: it.quantity || 1,
          unit: 'EA',
          weight: `${it.weight || 1} lbs`,
          dimensions: {
            length: `${Math.floor(Math.random() * 20) + 10} in`,
            width: `${Math.floor(Math.random() * 15) + 8} in`,
            height: `${Math.floor(Math.random() * 15) + 8} in`
          },
          freight_class: '85',
          hazmat: false,
          hazmat_class: null
        }));
        return {
          ...bod,
          tracking_number: shipment.tracking_number,
          carrier: shipment.carrier,
          signed: bolSigned,
          pickup_date: shipment.created_at || bod.pickup_date,
          line_items: mappedLineItems.length > 0 ? mappedLineItems : bod.line_items,
          shipper: {
            name: shipment.sender_contact?.name || bod.shipper.name,
            email: shipment.sender_contact?.email || bod.shipper.email,
            phone: shipment.sender_contact?.phone || bod.shipper.phone,
            address: shipment.origin || bod.shipper.address
          },
          consignee: {
            name: shipment.receiver_contact?.name || bod.consignee.name,
            email: shipment.receiver_contact?.email || bod.consignee.email,
            phone: shipment.receiver_contact?.phone || bod.consignee.phone,
            address: shipment.destination || bod.consignee.address
          }
        };
      });

      // Only create PODs for delivered shipments that have been collected/requested
      newPODs = deliveredShipments
        .filter(shipment => collectedPODs.has(shipment.tracking_number))
        .map((shipment, idx) => {
          const basePod = newPODs[idx] || generatePODs(1)[0];
          return {
            ...basePod,
            tracking_number: shipment.tracking_number,
            carrier: shipment.carrier,
            delivery_status: 'DELIVERED',
            recipient: {
              name: shipment.receiver_contact?.name || basePod.recipient?.name,
              email: shipment.receiver_contact?.email || basePod.recipient?.email,
              phone: shipment.receiver_contact?.phone || basePod.recipient?.phone,
              signature_required: basePod.recipient?.signature_required || true,
              signature_captured: true
            },
            recipient_location: shipment.destination || basePod.recipient_location,
            delivery_date: shipment.eta || basePod.delivery_date
          };
        });

      // Only show invoices for shipments after pickup that have been collected
      newInvoices = shipments
        .filter(shipment => shipment.status !== 'PENDING' && collectedInvoices.has(shipment.tracking_number))
        .map((shipment, idx) => {
          const baseInv = newInvoices[idx] || generateInvoices(1)[0];
          
          // Payment status logic based on shipment status
          let payment_status;
          if (shipment.status === 'DELIVERED') {
            // Only check for overdue if delivered
            const isOverdue = new Date(baseInv.due_date) < new Date();
            payment_status = isOverdue ? 'OVERDUE' : 'PAID';
          } else if (shipment.status === 'IN_TRANSIT') {
            payment_status = 'PENDING'; // Invoice issued but payment not due until delivery
          } else if (shipment.status === 'DELAYED' || shipment.status === 'EXCEPTION') {
            payment_status = 'PENDING'; // Payment held due to delivery issues
          } else {
            payment_status = baseInv.payment_status;
          }
          
          return {
            ...baseInv,
            tracking_number: shipment.tracking_number,
            payment_status: payment_status,
            bill_to: {
              name: shipment.sender_contact?.name || baseInv.bill_to.name,
              email: shipment.sender_contact?.email || baseInv.bill_to.email,
              phone: shipment.sender_contact?.phone || baseInv.bill_to.phone,
              address: shipment.origin || baseInv.bill_to.address
            },
            ship_to: {
              name: shipment.receiver_contact?.name || baseInv.ship_to.name,
              email: shipment.receiver_contact?.email || baseInv.ship_to.email,
              address: shipment.destination || baseInv.ship_to.address
            },
            // Align linked documents to actual BOL/POD for this shipment
            linked_documents: (() => {
              const docs = [];
              const bodMatch = newBODs.find(b => b.tracking_number === shipment.tracking_number);
              const podMatch = newPODs.find(p => p.tracking_number === shipment.tracking_number);
              if (bodMatch) {
                docs.push({ id: `bod-${bodMatch.id}` , document_type: 'BOL', document_number: bodMatch.bol_number, link_date: new Date().toISOString(), status: 'LINKED' });
              }
              if (podMatch) {
                docs.push({ id: `pod-${podMatch.id}` , document_type: 'POD', document_number: podMatch.pod_number, link_date: new Date().toISOString(), status: 'LINKED' });
              }
              // Fall back to base invoice linked docs if none could be aligned
              return docs.length > 0 ? docs : (baseInv.linked_documents || []);
            })()
          };
        });
    }
    
    setBODs(newBODs);
    setPODs(newPODs);
    setInvoices(newInvoices);
    
    // Link documents to shipments if available
    if (shipments && shipments.length > 0) {
      const newLinks = {};
      
      newBODs.forEach(bod => {
        const shipment = shipments.find(s => s.tracking_number === bod.tracking_number);
        if (shipment) newLinks[`bod-${bod.id}`] = shipment;
      });
      
      newPODs.forEach(pod => {
        const shipment = shipments.find(s => s.tracking_number === pod.tracking_number);
        if (shipment) newLinks[`pod-${pod.id}`] = shipment;
      });
      
      newInvoices.forEach(inv => {
        const shipment = shipments.find(s => s.tracking_number === inv.tracking_number);
        if (shipment) newLinks[`inv-${inv.id}`] = shipment;
      });
      
      setLinkedShipments(newLinks);
    }
    
    setSelectedDocument(null); // Clear selection on refresh
    setSelectedDocumentTab(null);
    setLastRefresh(new Date());
  };

  // Handle document selection - store the document independently
  const handleSelectDocument = (doc, tab) => {
    setSelectedDocument({ ...doc }); // Create independent copy
    setSelectedDocumentTab(tab);
  };

  // Navigate when clicking a linked document tile
  const handleLinkedDocClick = (linked) => {
    if (!linked) return;
    if (linked.document_type === 'BOL') {
      const match = bods.find(b => b.bol_number === linked.document_number);
      if (match) {
        setActiveTab('bods');
        setSelectedDocument({ ...match });
        setSelectedDocumentTab('bods');
        return;
      }
    }
    if (linked.document_type === 'POD') {
      const match = pods.find(p => p.pod_number === linked.document_number);
      if (match) {
        setActiveTab('pods');
        setSelectedDocument({ ...match });
        setSelectedDocumentTab('pods');
        return;
      }
    }
    // If not found, best-effort by tracking number if present on invoice
    if (selectedDocument && selectedDocumentTab === 'invoices') {
      const trk = selectedDocument.tracking_number;
      if (linked.document_type === 'BOL') {
        const byTrk = bods.find(b => b.tracking_number === trk);
        if (byTrk) { setActiveTab('bods'); setSelectedDocument({ ...byTrk }); setSelectedDocumentTab('bods'); return; }
      }
      if (linked.document_type === 'POD') {
        const byTrk = pods.find(p => p.tracking_number === trk);
        if (byTrk) { setActiveTab('pods'); setSelectedDocument({ ...byTrk }); setSelectedDocumentTab('pods'); return; }
      }
    }
    alert('Linked document not available to open.');
  };

  // Download document as CSV
  const handleDownload = (doc, docType) => {
    let filename = `${docType}-${doc.id}.csv`;
    let csvContent = `${docType} - Generated on ${new Date().toLocaleDateString()}\n\n`;
    
    if (docType === 'BOD') {
      filename = `BOL-${doc.bol_number}.csv`;
      csvContent = `BILL OF LADING\n`;
      csvContent += `BOL Number: ${doc.bol_number}\n`;
      csvContent += `Carrier: ${doc.carrier}\n`;
      csvContent += `Shipper: ${doc.shipper.name}\n`;
      csvContent += `Consignee: ${doc.consignee.name}\n`;
      csvContent += `Total Weight: ${doc.total_weight}\n`;
      csvContent += `Total Pallets: ${doc.total_pallets}\n\n`;
      csvContent += `ITEMS:\n`;
      csvContent += `Description,Quantity,Weight,Dimensions,Freight Class,Hazmat\n`;
      doc.line_items?.forEach(item => {
        csvContent += `"${item.description}",${item.quantity},${item.weight},"${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height}",${item.freight_class},"${item.hazmat ? item.hazmat_class : 'N/A'}"\n`;
      });
    } else if (docType === 'POD') {
      filename = `POD-${doc.tracking_number}.csv`;
      csvContent = `PROOF OF DELIVERY\n`;
      csvContent += `Tracking: ${doc.tracking_number}\n`;
      csvContent += `POD Number: ${doc.pod_number}\n`;
      csvContent += `Recipient: ${doc.recipient.name}\n`;
      csvContent += `Delivery Status: ${doc.delivery_status}\n`;
      csvContent += `Delivery Time: ${doc.delivery_time}\n`;
      csvContent += `Signed By: ${doc.signed_by}\n`;
    } else if (docType === 'Invoice') {
      filename = `INV-${doc.invoice_number}.csv`;
      csvContent = `INVOICE\n`;
      csvContent += `Invoice Number: ${doc.invoice_number}\n`;
      csvContent += `PO Number: ${doc.po_number}\n`;
      csvContent += `Bill To: ${doc.bill_to.name}\n`;
      csvContent += `Total: $${doc.total}\n`;
      csvContent += `Payment Status: ${doc.payment_status}\n\n`;
      csvContent += `ITEMS:\n`;
      csvContent += `Description,Quantity,Unit Price,Total\n`;
      doc.line_items?.forEach(item => {
        csvContent += `"${item.description}",${item.quantity},$${item.unit_price},$${item.total}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print document
  const handlePrint = (doc, docType) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    let htmlContent = `<!DOCTYPE html><html><head><title>${docType}</title>`;
    htmlContent += `<style>body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; } h1 { border-bottom: 2px solid #333; padding-bottom: 10px; } .section { margin: 20px 0; } .two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; } table { width: 100%; border-collapse: collapse; margin: 15px 0; } th, td { border: 1px solid #ddd; padding: 10px; text-align: left; } th { background-color: #f5f5f5; } .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #999; font-size: 12px; color: #666; }</style></head><body>`;
    
    if (docType === 'BOD') {
      htmlContent += `<h1>Bill of Lading</h1>`;
      htmlContent += `<div class="section"><strong>BOL #:</strong> ${doc.bol_number}</div>`;
      htmlContent += `<div class="two-column">`;
      htmlContent += `<div><h3>Shipper</h3><p><strong>${doc.shipper.name}</strong><br>${doc.shipper.address.address}<br>${doc.shipper.address.city}, ${doc.shipper.address.state}<br>${doc.shipper.phone}</p></div>`;
      htmlContent += `<div><h3>Consignee</h3><p><strong>${doc.consignee.name}</strong><br>${doc.consignee.address.address}<br>${doc.consignee.address.city}, ${doc.consignee.address.state}<br>${doc.consignee.phone}</p></div>`;
      htmlContent += `</div>`;
      htmlContent += `<div class="section"><strong>Carrier:</strong> ${doc.carrier} | <strong>Weight:</strong> ${doc.total_weight} | <strong>Pallets:</strong> ${doc.total_pallets}</div>`;
      htmlContent += `<table><thead><tr><th>Description</th><th>Qty</th><th>Weight</th><th>Freight Class</th><th>Hazmat</th></tr></thead><tbody>`;
      doc.line_items?.forEach(item => {
        htmlContent += `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${item.weight}</td><td>${item.freight_class}</td><td>${item.hazmat ? item.hazmat_class : 'N/A'}</td></tr>`;
      });
      htmlContent += `</tbody></table>`;
    } else if (docType === 'POD') {
      htmlContent += `<h1>Proof of Delivery</h1>`;
      htmlContent += `<div class="section"><strong>Tracking:</strong> ${doc.tracking_number}</div>`;
      htmlContent += `<div class="two-column">`;
      htmlContent += `<div><h3>Recipient</h3><p><strong>${doc.recipient.name}</strong><br>${doc.recipient.phone}<br>${doc.recipient_location.address}<br>${doc.recipient_location.city}, ${doc.recipient_location.state}</p></div>`;
      htmlContent += `<div><h3>Delivery Details</h3><p><strong>Status:</strong> ${doc.delivery_status}<br><strong>Time:</strong> ${doc.delivery_time}<br><strong>Signed By:</strong> ${doc.signed_by}</p></div>`;
      htmlContent += `</div>`;
    } else if (docType === 'Invoice') {
      htmlContent += `<h1>Invoice</h1>`;
      htmlContent += `<div class="section"><strong>Invoice #:</strong> ${doc.invoice_number} | <strong>PO #:</strong> ${doc.po_number}</div>`;
      htmlContent += `<div class="two-column">`;
      htmlContent += `<div><h3>Bill To</h3><p><strong>${doc.bill_to.name}</strong><br>${doc.bill_to.email}</p></div>`;
      htmlContent += `<div><h3>Payment</h3><p><strong>Status:</strong> ${doc.payment_status}<br><strong>Total:</strong> $${doc.total}</p></div>`;
      htmlContent += `</div>`;
      htmlContent += `<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>`;
      doc.line_items?.forEach(item => {
        htmlContent += `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.unit_price}</td><td>$${item.total}</td></tr>`;
      });
      htmlContent += `</tbody></table>`;
    }
    
    htmlContent += `<div class="footer">Printed on ${new Date().toLocaleString()}</div>`;
    htmlContent += `</body></html>`;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  // Email document
  const handleEmail = (doc, docType) => {
    const recipientEmail = docType === 'BOD' ? doc.shipper.email : (docType === 'POD' ? doc.recipient.email : doc.bill_to.email);
    const subject = `${docType} - ${docType === 'BOD' ? doc.bol_number : (docType === 'POD' ? doc.tracking_number : doc.invoice_number)}`;
    alert(`📧 Email Ready to Send:\n\nTo: ${recipientEmail}\nSubject: ${subject}\n\n${docType} document is ready for delivery.\n\nNote: In a production app, this would integrate with your email service.`);
  };

  // Confirm document
  const handleConfirm = (doc, docType) => {
    const action = docType === 'BOD' ? 'Pickup Confirmed' : (docType === 'POD' ? 'Delivery Confirmed' : 'Payment Confirmed');
    alert(`✅ ${action}\n\nDocument: ${docType === 'BOD' ? doc.bol_number : (docType === 'POD' ? doc.tracking_number : doc.invoice_number)}\n\nStatus updated in system.`);
  };

  // Export completed shipments (delivered with collected POD + invoice) with linked docs
  const handleExportCompleted = () => {
    if (!shipments || shipments.length === 0) {
      alert('No shipments available to export.');
      return;
    }

    const completed = shipments.filter(s => s.status === 'DELIVERED' && collectedPODs.has(s.tracking_number) && collectedInvoices.has(s.tracking_number));
    if (completed.length === 0) {
      alert('No completed shipments with collected POD and invoice to export.');
      return;
    }

    const header = ['Tracking', 'Carrier', 'Shipper', 'Consignee', 'BOL Number', 'POD Number', 'Invoice Number', 'Invoice Total', 'Payment Status', 'Delivery Date'];
    const lines = [header.join(',')];

    completed.forEach(shipment => {
      const bod = bods.find(b => b.tracking_number === shipment.tracking_number) || {};
      const pod = pods.find(p => p.tracking_number === shipment.tracking_number) || {};
      const inv = invoices.find(i => i.tracking_number === shipment.tracking_number) || {};

      lines.push([
        `"${shipment.tracking_number || ''}"`,
        `"${shipment.carrier || ''}"`,
        `"${shipment.sender_contact?.name || ''}"`,
        `"${shipment.receiver_contact?.name || ''}"`,
        `"${bod.bol_number || ''}"`,
        `"${pod.pod_number || ''}"`,
        `"${inv.invoice_number || ''}"`,
        inv.total !== undefined ? inv.total : '',
        `"${inv.payment_status || ''}"`,
        `"${shipment.eta ? new Date(shipment.eta).toLocaleDateString() : ''}"`
      ].join(','));
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `completed-shipments-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Jump to Live Tracker for a given tracking number
  const navigateToTracker = (trackingNumber) => {
    if (!trackingNumber) return;
    const shipmentMatch = shipments?.find(s => s.tracking_number === trackingNumber);
    const payload = shipmentMatch || { tracking_number: trackingNumber };
    onNavigate('tracker', payload);
  };

  const bodCount = bods.length;
  const podCount = pods.length;
  const invoiceCount = invoices.length;
  const linkedDocsCount = Object.keys(linkedShipments).length;
  const completedReady = shipments.filter(s => s.status === 'DELIVERED' && collectedPODs.has(s.tracking_number) && collectedInvoices.has(s.tracking_number)).length;
  const pendingPODs = shipments.filter(s => s.status === 'DELIVERED' && !collectedPODs.has(s.tracking_number)).length;
  const pendingInvoices = shipments.filter(s => s.status !== 'PENDING' && !collectedInvoices.has(s.tracking_number)).length;

  // BOD Detail View
  const BODDetail = React.memo(({ bod }) => (
    <div className="document-detail">
      <div className="doc-header">
        <h3>Bill of Lading</h3>
        <div className="doc-number">BOL #{bod.bol_number}</div>
        <div
          className="tracking-badge clickable"
          title="Open this shipment in Live Tracker"
          onClick={() => navigateToTracker(bod.tracking_number)}
        >
          {bod.tracking_number}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Shipper Information</h4>
          <p><strong>Company:</strong> {bod.shipper.name}</p>
          <p><strong>Email:</strong> {bod.shipper.email}</p>
          <p><strong>Phone:</strong> {bod.shipper.phone}</p>
          <p><strong>Address:</strong> {bod.shipper.address.address}, {bod.shipper.address.city}, {bod.shipper.address.state}</p>
        </div>

        <div className="detail-section">
          <h4>Consignee Information</h4>
          <p><strong>Company:</strong> {bod.consignee.name}</p>
          <p><strong>Email:</strong> {bod.consignee.email}</p>
          <p><strong>Phone:</strong> {bod.consignee.phone}</p>
          <p><strong>Address:</strong> {bod.consignee.address.address}, {bod.consignee.address.city}, {bod.consignee.address.state}</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Shipment Details</h4>
          <p><strong>Carrier:</strong> {bod.carrier}</p>
          <p><strong>Total Weight:</strong> {bod.total_weight}</p>
          <p><strong>Total Pallets:</strong> {bod.total_pallets}</p>
          <p><strong>Created:</strong> {new Date(bod.created_date).toLocaleString()}</p>
          <p><strong>Pickup Date:</strong> {new Date(bod.pickup_date).toLocaleString()}</p>
          <p><strong>Est. Delivery:</strong> {new Date(bod.delivery_date).toLocaleString()}</p>
        </div>

        <div className="detail-section">
          <h4>Special Instructions</h4>
          <p className="special-instructions">{bod.special_instructions}</p>
          <p><strong>Status:</strong> <span style={{ color: bod.signed ? 'green' : 'orange' }}>
            {bod.signed ? '✓ Signed' : '⏳ Pending Signature'}
          </span></p>
        </div>
      </div>

      <div className="line-items-section">
        <h4>Line Items</h4>
        <table className="line-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Weight</th>
              <th>Dimensions</th>
              <th>Class</th>
              <th>HazMat</th>
            </tr>
          </thead>
          <tbody>
            {bod.line_items.map(item => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>{item.weight}</td>
                <td>{item.dimensions.length} × {item.dimensions.width} × {item.dimensions.height}</td>
                <td>{item.freight_class}</td>
                <td>{item.hazmat ? `${item.hazmat_class} ⚠️` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="doc-actions">
        <button className="action-btn" onClick={() => handleDownload(bod, 'BOD')}>📥 Download BOL</button>
        <button className="action-btn" onClick={() => handlePrint(bod, 'BOD')}>🖨️ Print</button>
              
              {pods.find(p => p.tracking_number === bod.tracking_number) && (
                <button className="action-btn" style={{ backgroundColor: '#4caf50' }} onClick={() => {
                  const match = pods.find(p => p.tracking_number === bod.tracking_number);
                  if (match) {
                    setActiveTab('pods');
                    setSelectedDocument(match);
                    setSelectedDocumentTab('pods');
                  }
                }}>🔗 View POD</button>
              )}
      </div>
    </div>
  ));

  // POD Detail View
  const PODDetail = React.memo(({ pod }) => (
    <div className="document-detail">
      <div className="doc-header">
        <h3>Proof of Delivery</h3>
        <div className="doc-number">POD #{pod.pod_number}</div>
        <div className="tracking-badge">{pod.tracking_number}</div>
      </div>

      <div className="delivery-status-banner" style={{ 
        backgroundColor: pod.delivery_status === 'DELIVERED' ? '#4caf50' : '#2196f3' 
      }}>
        {pod.delivery_status} - {new Date(pod.delivery_date).toLocaleString()}
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Driver Information</h4>
          <p><strong>Name:</strong> {pod.driver.name}</p>
          <p><strong>License:</strong> {pod.driver.license}</p>
          <p><strong>Vehicle:</strong> {pod.driver.vehicle}</p>
        </div>

        <div className="detail-section">
          <h4>Recipient Information</h4>
          <p><strong>Name:</strong> {pod.recipient.name}</p>
          <p><strong>Email:</strong> {pod.recipient.email}</p>
          <p><strong>Signature Required:</strong> {pod.recipient.signature_required ? 'Yes' : 'No'}</p>
          <p><strong>Signature Captured:</strong> {pod.recipient.signature_captured ? '✓ Yes' : '✗ No'}</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Delivery Location</h4>
          <p><strong>Address:</strong> {pod.recipient_location.address}</p>
          <p><strong>City:</strong> {pod.recipient_location.city}, {pod.recipient_location.state}</p>
          <p><strong>Attempts:</strong> {pod.delivery_attempts}</p>
          <p><strong>Special Handling:</strong> {pod.special_handling}</p>
        </div>

        <div className="detail-section">
          <h4>Condition Report</h4>
          <p style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            {pod.condition_notes}
          </p>
        </div>
      </div>

      {pod.photos?.length > 0 && (
        <div className="photos-section">
          <h4>Delivery Photos</h4>
          <div className="photos-grid">
            {pod.photos.map(photo => (
              <div key={photo.id} className="photo-item">
                <img src={photo.photo_url} alt={photo.description} />
                <div className="photo-info">
                  <p><strong>{photo.location}</strong></p>
                  <p className="timestamp">{new Date(photo.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pod.barcode_scans?.length > 0 && (
        <div className="scans-section">
          <h4>Tracking Scans</h4>
          <div className="scans-timeline">
            {pod.barcode_scans.map(scan => (
              <div key={scan.id} className="scan-item">
                <div className="scan-status" style={{ color: scan.status === 'DELIVERED' ? '#4caf50' : '#2196f3' }}>
                  {scan.status}
                </div>
                <div className="scan-details">
                  <p><strong>{scan.location}</strong></p>
                  <p className="scan-time">{new Date(scan.timestamp).toLocaleString()}</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>Barcode: {scan.barcode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="doc-actions">
        <button className="action-btn" onClick={() => handleDownload(pod, 'POD')}>📥 Download POD</button>
        <button className="action-btn" onClick={() => handlePrint(pod, 'POD')}>🖨️ Print</button>
              
              {bods.find(b => b.tracking_number === pod.tracking_number) && (
                <button className="action-btn" style={{ backgroundColor: '#4caf50' }} onClick={() => {
                  const match = bods.find(b => b.tracking_number === pod.tracking_number);
                  if (match) {
                    setActiveTab('bods');
                    setSelectedDocument(match);
                    setSelectedDocumentTab('bods');
                  }
                }}>🔗 View BOL</button>
              )}
      </div>
    </div>
  ));

  // Invoice Detail View
  const InvoiceDetail = React.memo(({ invoice }) => (
    <div className="document-detail">
      <div className="doc-header">
        <h3>Invoice</h3>
        <div className="doc-number">INV #{invoice.invoice_number}</div>
        <div className={`payment-status ${invoice.payment_status.toLowerCase()}`}>
          {invoice.payment_status}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Bill To</h4>
          <p><strong>{invoice.bill_to.name}</strong></p>
          <p>{invoice.bill_to.address.address}</p>
          <p>{invoice.bill_to.address.city}, {invoice.bill_to.address.state}</p>
          <p>Email: {invoice.bill_to.email}</p>
          <p>Phone: {invoice.bill_to.phone}</p>
        </div>

        <div className="detail-section">
          <h4>Ship To</h4>
          <p><strong>{invoice.ship_to.name}</strong></p>
          <p>{invoice.ship_to.address.address}</p>
          <p>{invoice.ship_to.address.city}, {invoice.ship_to.address.state}</p>
          <p>Email: {invoice.ship_to.email}</p>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <h4>Invoice Details</h4>
          <p><strong>Invoice Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}</p>
          <p><strong>Shipping Date:</strong> {new Date(invoice.shipping_date).toLocaleDateString()}</p>
          <p><strong>Tracking #:</strong> {invoice.tracking_number}</p>
          <p><strong>PO #:</strong> {invoice.po_number}</p>
        </div>

        <div className="detail-section">
          <h4>Payment Terms</h4>
          <p><strong>Terms:</strong> {invoice.payment_terms}</p>
          <p><strong>Method:</strong> {invoice.payment_method}</p>
          <p><strong>Status:</strong> <span style={{ color: invoice.payment_status === 'PAID' ? 'green' : 'orange' }}>
            {invoice.payment_status}
          </span></p>
        </div>
      </div>

      <div className="line-items-section">
        <h4>Line Items</h4>
        <table className="line-items-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.map(item => (
              <tr key={item.id}>
                <td>{item.sku}</td>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>${item.unit_price}</td>
                <td>${item.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoice-totals">
        <div className="totals-row">
          <span>Subtotal:</span>
          <span>${invoice.subtotal}</span>
        </div>
        <div className="totals-row">
          <span>Shipping:</span>
          <span>${invoice.shipping_cost}</span>
        </div>
        <div className="totals-row">
          <span>Insurance:</span>
          <span>${invoice.insurance}</span>
        </div>
        <div className="totals-row">
          <span>Discount:</span>
          <span>-${invoice.discount}</span>
        </div>
        <div className="totals-row">
          <span>Tax (8%):</span>
          <span>${invoice.tax}</span>
        </div>
        <div className="totals-row grand-total">
          <span>Total Due:</span>
          <span>${invoice.total}</span>
        </div>
      </div>

      {invoice.linked_documents?.length > 0 && (
        <div className="linked-docs-section">
          <h4>Linked Documents</h4>
          <div className="linked-docs">
            {invoice.linked_documents.map(doc => (
              <div key={doc.id} className="linked-doc" onClick={() => handleLinkedDocClick(doc)} style={{ cursor: 'pointer' }}>
                <span className="doc-type">{doc.document_type}</span>
                <span className="doc-number">{doc.document_number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="doc-actions">
        <button className="action-btn" onClick={() => handleDownload(invoice, 'Invoice')}>📥 Download Invoice</button>
        <button className="action-btn" onClick={() => handlePrint(invoice, 'Invoice')}>🖨️ Print</button>
              
      </div>
    </div>
  ));

  return (
    <div className="document-manager">
      <div className="doc-header-band">
        <div>
          <p className="eyebrow">Docs hub</p>
          <h2>Document Management Center</h2>
          <p className="subhead">Organize BOLs, PODs, and invoices; track completion status and link to live shipments.</p>
        </div>
        <div className="doc-stats">
          {[{ label: 'BOLs', value: bodCount, color: '#2563eb' }, { label: 'PODs', value: podCount, color: '#0ea5e9' }, { label: 'Invoices', value: invoiceCount, color: '#f97316' }, { label: 'Completed (export-ready)', value: completedReady, color: '#10b981' }]
            .map(tile => (
              <div key={tile.label} className="doc-stat" style={{ borderColor: tile.color }}>
                <div className="stat-label">{tile.label}</div>
                <div className="stat-value" style={{ color: tile.color }}>{tile.value}</div>
              </div>
            ))}
          <div className="doc-stat" style={{ borderColor: '#ef4444' }}>
            <div className="stat-label">Pending PODs</div>
            <div className="stat-value" style={{ color: '#ef4444' }}>{pendingPODs}</div>
          </div>
          <div className="doc-stat" style={{ borderColor: '#f59e0b' }}>
            <div className="stat-label">Pending invoices</div>
            <div className="stat-value" style={{ color: '#f59e0b' }}>{pendingInvoices}</div>
          </div>
          <button className="action-btn export-btn" onClick={handleExportCompleted}>
            📤 Export Completed
          </button>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'bods' ? 'active' : ''}`}
          onClick={() => { setActiveTab('bods'); setSelectedDocument(null); setSelectedDocumentTab(null); }}
        >
          📋 Bills of Lading ({bods.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pods' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pods'); setSelectedDocument(null); setSelectedDocumentTab(null); }}
        >
          ✓ Proofs of Delivery ({pods.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => { setActiveTab('invoices'); setSelectedDocument(null); setSelectedDocumentTab(null); }}
        >
          💰 Invoices ({invoices.length})
        </button>
      </div>

      <div className="content-area">
        {activeTab === 'bods' && (
          <div className="list-and-detail">
            <div className="document-list">
              <h3>Bills of Lading</h3>
              {bods.slice(0, 6).map(bod => (
                <div 
                  key={bod.id}
                  className={`list-item ${selectedDocument?.bol_number === bod.bol_number && selectedDocumentTab === 'bods' ? 'selected' : ''}`}
                  onClick={() => handleSelectDocument(bod, 'bods')}
                >
                  <div className="list-item-header">
                    <div className="doc-title">{bod.bol_number}</div>
                    <div className={`status-badge ${bod.signed ? 'signed' : 'pending'}`}>
                      {bod.signed ? '✓ Signed' : '⏳ Pending'}
                    </div>
                  </div>
                  <div className="list-item-details">
                    <p>{bod.shipper.name} → {bod.consignee.name}</p>
                    <p className="small">
                      TRK:{' '}
                      <button
                        type="button"
                        className="trk-link"
                        title="Open in Live Tracker"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToTracker(bod.tracking_number);
                        }}
                      >
                        {bod.tracking_number}
                      </button>
                    </p>
                    <p className="small">{bod.carrier} | {bod.total_weight}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedDocument && selectedDocumentTab === 'bods' && (
              <div className="detail-pane">
                <BODDetail bod={selectedDocument} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'pods' && (
          <div className="list-and-detail">
            <div className="document-list">
              <h3>Proofs of Delivery</h3>
              {pods.slice(0, 6).map(pod => (
                <div 
                  key={pod.id}
                  className={`list-item ${selectedDocument?.pod_number === pod.pod_number && selectedDocumentTab === 'pods' ? 'selected' : ''}`}
                  onClick={() => handleSelectDocument(pod, 'pods')}
                >
                  <div className="list-item-header">
                    <div className="doc-title">{pod.tracking_number}</div>
                    <div className={`status-badge ${pod.delivery_status === 'DELIVERED' ? 'delivered' : 'pending'}`}>
                      {pod.delivery_status}
                    </div>
                  </div>
                  <div className="list-item-details">
                    <p>{pod.recipient.name}</p>
                    <p className="small">{pod.recipient_location.city}, {pod.recipient_location.state}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedDocument && selectedDocumentTab === 'pods' && (
              <div className="detail-pane">
                <PODDetail pod={selectedDocument} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="list-and-detail">
            <div className="document-list">
              <h3>Invoices</h3>
              {invoices.slice(0, 6).map(inv => (
                <div 
                  key={inv.id}
                  className={`list-item ${selectedDocument?.invoice_number === inv.invoice_number && selectedDocumentTab === 'invoices' ? 'selected' : ''}`}
                  onClick={() => handleSelectDocument(inv, 'invoices')}
                >
                  <div className="list-item-header">
                    <div className="doc-title">{inv.invoice_number}</div>
                    <div className={`status-badge ${inv.payment_status === 'PAID' ? 'paid' : inv.payment_status === 'OVERDUE' ? 'overdue' : 'pending'}`}>
                      {inv.payment_status}
                    </div>
                  </div>
                  <div className="list-item-details">
                    <p>{inv.bill_to.name}</p>
                    <p className="small">TRK: {inv.tracking_number}</p>
                    <p className="small">Total: ${inv.total} | {inv.po_number}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedDocument && selectedDocumentTab === 'invoices' && (
              <div className="detail-pane">
                <InvoiceDetail invoice={selectedDocument} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;
