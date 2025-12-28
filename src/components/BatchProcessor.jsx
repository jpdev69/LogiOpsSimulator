import React, { useState } from 'react';
import './BatchProcessor.css';
import { generateShipments } from '../utils/mockDataGenerator';

const BatchProcessor = ({ shipments = [] }) => {
  const [batchData, setBatchData] = useState('');
  const [processedData, setProcessedData] = useState([]);
  const [selectedUpdates, setSelectedUpdates] = useState([]);
  const [processingStep, setProcessingStep] = useState(1);

  const livePool = shipments.length > 0 ? shipments : generateShipments(8);

  const generateSampleCSV = (source = livePool) => {
    const sample = source.slice(0, 8);
    const csv = 'tracking_number,status,eta,notes\n' +
      sample.map(s =>
        `${s.tracking_number},${s.status},${s.eta.substring(0, 16)},${s.notes || 'No notes'}`
      ).join('\n');
    return csv;
  };

  const sampleCSV = generateSampleCSV();

  // Download template CSV
  const handleDownloadTemplate = () => {
    const templateCSV = 'tracking_number,status,eta,notes\n' +
      'TRK001,IN_TRANSIT,2024-01-15 14:30,Example notes\n' +
      'TRK002,DELIVERED,2024-01-14 10:45,\n' +
      'TRK003,PENDING_PICKUP,2024-01-16 09:00,';
    
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'shipment_updates_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload CSV file
  const handleUploadCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target.result;
        setBatchData(csv);
        alert(`✅ CSV uploaded successfully\n\nFile: ${file.name}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nReady to process.`);
      } catch (error) {
        alert('❌ Error reading file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    const data = lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, index) => {
        obj[header.trim()] = values[index] ? values[index].trim() : '';
        return obj;
      }, {});
    });
    return data;
  };

  const handleProcessBatch = () => {
    if (!batchData.trim()) {
      alert('Please paste or enter batch data');
      return;
    }

    const parsedData = parseCSV(batchData);
    const mapped = parsedData.map(item => ({
      ...item,
      match: shipments.find(s => s.tracking_number === item.tracking_number) || null
    }));
    setProcessedData(mapped);
    setSelectedUpdates(mapped.map(item => ({ ...item, selected: true })));
    setProcessingStep(2);
  };

  const handleUpdateSelected = async () => {
    const updates = selectedUpdates
      .filter(item => item.selected)
      .map(({ selected, ...update }) => update);

    if (updates.length === 0) {
      alert('Please select at least one item to update');
      return;
    }

    // Simulate archive/export only
    alert(`✅ Export ready\n\n${updates.length} shipment rows prepared for archiving. No live data was modified.`);

    // Download results
    const resultCSV = 'tracking_number,status,eta,notes,update_timestamp\n' +
      updates.map(u => `${u.tracking_number},${u.status},${u.eta || 'N/A'},${u.notes || ''},${new Date().toISOString()}`).join('\n');
    
    const blob = new Blob([resultCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `batch_update_results_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setProcessingStep(3);
  };

  const toggleSelect = (index) => {
    const updated = [...selectedUpdates];
    updated[index].selected = !updated[index].selected;
    setSelectedUpdates(updated);
  };

  const statusCounts = shipments.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
  const delayed = statusCounts.DELAYED || 0;
  const exception = statusCounts.EXCEPTION || 0;
  const inTransit = statusCounts.IN_TRANSIT || 0;
  const delivered = statusCounts.DELIVERED || 0;

  const simulationSteps = [
    {
      title: 'Download Carrier Report',
      description: 'Carrier sends daily status report via email'
    },
    {
      title: 'Open in Excel',
      description: 'Filter and sort data using Excel functions'
    },
    {
      title: 'Prepare for Upload',
      description: 'Copy relevant columns (tracking, status, ETA)'
    },
    {
      title: 'Upload & Validate',
      description: 'Paste data into system and validate'
    }
  ];

  return (
    <div className="batch-processor">
      <div className="bp-header">
        <div>
          <p className="eyebrow">Ops bulk updates</p>
          <h2>Batch Processing Simulator</h2>
          <p className="subtitle">Paste carrier spreadsheets, reconcile against live context, and export results (no live write-back).</p>
        </div>
        <div className="bp-stats">
          {[{ label: 'Live shipments', value: shipments.length || livePool.length, color: '#2563eb' }, { label: 'In Transit', value: inTransit, color: '#1d4ed8' }, { label: 'Delayed', value: delayed, color: '#f97316' }, { label: 'Exceptions', value: exception, color: '#ef4444' }, { label: 'Delivered', value: delivered, color: '#10b981' }]
            .map(tile => (
              <div key={tile.label} className="stat" style={{ borderColor: tile.color }}>
                <div className="stat-label">{tile.label}</div>
                <div className="stat-value" style={{ color: tile.color }}>{tile.value}</div>
              </div>
            ))}
        </div>
      </div>

      <div className="simulation-steps">
        {simulationSteps.map((step, index) => (
          <div key={index} className={`sim-step ${processingStep > index ? 'completed' : ''}`}>
            <div className="step-number">{index + 1}</div>
            <div className="step-content">
              <h4>{step.title}</h4>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="batch-sections">
        <div className="batch-input-section">
          <h3>Step 1: Input Batch Data</h3>
          <div className="input-options">
            <button onClick={() => setBatchData(sampleCSV)} className="sample-btn">
              Load Live Sample
            </button>
            <button onClick={handleDownloadTemplate} className="sample-btn">
              📥 Download Template
            </button>
            <label className="upload-btn">
              Upload CSV File
              <input type="file" accept=".csv" onChange={handleUploadCSV} style={{ display: 'none' }} />
            </label>
          </div>
          
          <textarea
            value={batchData}
            onChange={(e) => setBatchData(e.target.value)}
            placeholder="Paste CSV data here (tracking_number, status, eta, notes)..."
            rows="10"
            className="batch-textarea"
          />
          
          <button onClick={handleProcessBatch} className="process-btn">
            Process Batch Data
          </button>
        </div>

        {processingStep >= 2 && (
          <div className="batch-review-section">
            <h3>Step 2: Review & Update</h3>
            <p>Select shipments to update (linked to live tracker where matched). This simulator does not modify live data; it only prepares an export.</p>
            
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        checked={selectedUpdates.every(item => item.selected)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedUpdates(selectedUpdates.map(item => ({
                            ...item,
                            selected: checked
                          })));
                        }}
                      />
                    </th>
                    <th>Tracking #</th>
                    <th>New Status</th>
                    <th>New ETA</th>
                    <th>Notes</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUpdates.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleSelect(index)}
                        />
                      </td>
                      <td>{item.tracking_number}</td>
                      <td>
                        <select 
                          value={item.status}
                          onChange={(e) => {
                            const updated = [...selectedUpdates];
                            updated[index].status = e.target.value;
                            setSelectedUpdates(updated);
                          }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_TRANSIT">In Transit</option>
                          <option value="DELAYED">Delayed</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="EXCEPTION">Exception</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="datetime-local"
                          value={item.eta ? item.eta.substring(0, 16) : ''}
                          onChange={(e) => {
                            const updated = [...selectedUpdates];
                            updated[index].eta = e.target.value;
                            setSelectedUpdates(updated);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => {
                            const updated = [...selectedUpdates];
                            updated[index].notes = e.target.value;
                            setSelectedUpdates(updated);
                          }}
                          placeholder="Add notes..."
                        />
                      </td>
                      <td style={{ fontSize: '12px', color: item.match ? '#0f766e' : '#b91c1c' }}>
                        {item.match ? 'Linked to live' : 'No match'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="batch-actions">
              <button onClick={handleUpdateSelected} className="update-btn">
                Export Selected Rows ({selectedUpdates.filter(item => item.selected).length} shipments)
              </button>
              <button className="cancel-btn" onClick={() => setProcessingStep(1)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {processingStep >= 3 && (
          <div className="completion-section">
            <h3>✅ Batch Processing Complete!</h3>
            <p>Your batch update has been exported successfully. File downloaded to your system.</p>
            <button className="new-batch-btn" onClick={() => {
              setBatchData('');
              setProcessedData([]);
              setSelectedUpdates([]);
              setProcessingStep(1);
            }}>
              Start New Batch
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchProcessor;