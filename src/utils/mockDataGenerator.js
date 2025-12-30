// Mock Data Generator with Recursive Random Data
const STATUSES = ['PENDING', 'IN_TRANSIT', 'DELAYED', 'DELIVERED', 'EXCEPTION'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CARRIERS = ['UPS', 'FedEx', 'DHL', 'USPS', 'XPO'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
const STATES = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA'];

const generateRandomString = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
};

const generateTrackingNumber = () => {
  return `TRK${Math.random().toString().substring(2, 11)}`;
};

const generateEmail = () => {
  const names = ['john', 'sarah', 'mike', 'lisa', 'alex', 'jordan'];
  const domains = ['ups.com', 'fedex.com', 'customer.com', 'logistics.com', 'shipping.com'];
  return `${names[Math.floor(Math.random() * names.length)]}${Math.floor(Math.random() * 999)}@${domains[Math.floor(Math.random() * domains.length)]}`;
};

const generatePhone = () => {
  return `+1${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
};

const generateLocation = () => {
  const index = Math.floor(Math.random() * CITIES.length);
  return {
    city: CITIES[index],
    state: STATES[index],
    address: `${Math.floor(Math.random() * 9999) + 1} ${generateRandomString(10)} St`,
    zip: `${Math.floor(Math.random() * 90000) + 10000}`
  };
};

const generateFutureTime = (hoursAhead = 24) => {
  const now = new Date();
  const future = new Date(now.getTime() + Math.random() * hoursAhead * 60 * 60 * 1000);
  return future.toISOString();
};

const generatePastTime = (hoursBefore = 24) => {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * hoursBefore * 60 * 60 * 1000);
  return past.toISOString();
};

// Recursive shipment generation with nested items
export const generateShipments = (count = 10) => {
  const shipments = [];
  for (let i = 0; i < count; i++) {
    shipments.push({
      id: i + 1,
      tracking_number: generateTrackingNumber(),
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
      carrier: CARRIERS[Math.floor(Math.random() * CARRIERS.length)],
      origin: generateLocation(),
      destination: generateLocation(),
      sender_contact: {
        name: `Sender ${generateRandomString(5)}`,
        email: generateEmail(),
        phone: generatePhone()
      },
      receiver_contact: {
        name: `Receiver ${generateRandomString(5)}`,
        email: generateEmail(),
        phone: generatePhone()
      },
      customer_name: `Customer ${generateRandomString(5)}`,
      customer_email: generateEmail(),
      customer_phone: generatePhone(),
      eta: generateFutureTime(72),
      created_at: generatePastTime(168),
      weight: `${Math.floor(Math.random() * 50) + 1} lbs`,
      items: generateShipmentItems(Math.floor(Math.random() * 4) + 1), // Recursive!
      notes: [
        'Initial pickup completed',
        'In transit to distribution center',
        'Out for delivery',
        'Delivered to recipient'
      ][Math.floor(Math.random() * 4)]
    });
  }
  return shipments;
};

// Recursive items within shipments
const generateShipmentItems = (count = 2) => {
  const items = [];
  const itemNames = [
    'Laptop Computer', 'Office Chair', 'Desk Lamp', 'Monitor 27"',
    'Printer Supplies', 'Cardboard Boxes', 'Winter Jacket', 'Running Shoes',
    'Coffee Maker', 'Microwave Oven', 'Textbooks', 'Art Supplies',
    'Power Tools', 'Garden Equipment', 'Sporting Goods', 'Kitchen Appliances'
  ];
  for (let i = 0; i < count; i++) {
    items.push({
      id: i + 1,
      name: itemNames[Math.floor(Math.random() * itemNames.length)],
      description: `${generateRandomString(3)} - ${['Electronics', 'Clothing', 'Books', 'Furniture', 'Food'][Math.floor(Math.random() * 5)]}`,
      sku: `SKU-${generateRandomString(6)}`,
      quantity: Math.floor(Math.random() * 10) + 1,
      weight: Math.floor(Math.random() * 50) + 1,
      status_history: generateStatusHistory(Math.floor(Math.random() * 3) + 2) // Recursive!
    });
  }
  return items;
};

// Recursive status history
const generateStatusHistory = (count = 2) => {
  const history = [];
  let timeOffset = 0;
  for (let i = 0; i < count; i++) {
    const now = new Date();
    now.setHours(now.getHours() - timeOffset);
    history.push({
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)],
      timestamp: now.toISOString(),
      location: generateLocation(),
      notes: ['Processed', 'Sorted', 'In transit', 'Out for delivery'][Math.floor(Math.random() * 4)]
    });
    timeOffset += Math.floor(Math.random() * 12) + 1;
  }
  return history;
};

// Generate emails with recursive structures
export const generateEmails = (count = 15) => {
  const emailTypes = [
    {
      subject: 'URGENT: Weather Delay - Flight Cancelled',
      sender_type: 'carrier',
      body: 'Flight TRK{TRACKING} was cancelled due to severe weather conditions. New departure scheduled for tomorrow 8:00 AM. Affected shipments: {COUNT} packages. Estimated delay: 24 hours. Customer notification recommended.',
      priority: 'HIGH'
    },
    {
      subject: 'ETA Change: Arrived at Distribution Center',
      sender_type: 'carrier',
      body: 'Shipment TRK{TRACKING} has arrived at our Memphis distribution hub. Processing time: 4-6 hours. New delivery window: {DATE}. All items scanned and verified. No damage reported.',
      priority: 'MEDIUM'
    },
    {
      subject: 'EXCEPTION: Address Issue - Delivery Attempted',
      sender_type: 'carrier',
      body: 'Delivery attempt failed for TRK{TRACKING}. Reason: Address incomplete/incorrect. Customer was not home. Package available for redelivery tomorrow. Requires clarification on correct delivery address before proceeding.',
      priority: 'HIGH'
    },
    {
      subject: 'Shipment Confirmed - Picked Up',
      sender_type: 'carrier',
      body: 'Shipment TRK{TRACKING} has been picked up from your warehouse. Weight confirmed: {WEIGHT}. All {COUNT} items match BOL #BOL-{BOL}. In transit to first distribution point.',
      priority: 'LOW'
    },
    {
      subject: 'POD Available - Delivery Completed',
      sender_type: 'carrier',
      body: 'Proof of Delivery received for TRK{TRACKING}. Signed by: {RECEIVER}. Delivery completed at {DATE}. PDF attached. All items delivered in good condition.',
      priority: 'MEDIUM'
    },
    {
      subject: 'CUSTOMER: Where is my package?',
      sender_type: 'customer',
      body: 'Hi, I ordered something and it was supposed to arrive by today. I haven\'t received it yet and tracking says "in transit". I need this urgently - can you tell me exactly when it will arrive? My tracking number is TRK{TRACKING}.',
      priority: 'HIGH'
    },
    {
      subject: 'URGENT: Package Damaged Upon Receipt',
      sender_type: 'customer',
      body: 'I received my package TRK{TRACKING} today but it arrived damaged. The box was crushed and the contents are broken. This is unacceptable. I need a replacement shipped immediately or a full refund. Please advise.',
      priority: 'CRITICAL'
    },
    {
      subject: 'Address Correction Requested',
      sender_type: 'customer',
      body: 'I need to correct my delivery address for order TRK{TRACKING}. The label shows the old address. Can you update it to: {ADDRESS}? The package hasn\'t left the warehouse yet. Please confirm this is possible.',
      priority: 'HIGH'
    },
    {
      subject: 'Billing Inquiry - Invoice TRK{TRACKING}',
      sender_type: 'customer',
      body: 'I received an invoice for shipment TRK{TRACKING}. I was quoted $45.50 but the invoice shows $58.75. Can you explain the difference? Does this include fuel surcharge and insurance?',
      priority: 'MEDIUM'
    },
    {
      subject: 'System Alert: BOL Discrepancy',
      sender_type: 'internal',
      body: 'BOL #BOL-{BOL} for shipment TRK{TRACKING} has a weight discrepancy. Manifest: {WEIGHT_1}. Scale reading: {WEIGHT_2}. Difference: {DIFF}%. Awaiting shipper verification before processing.',
      priority: 'MEDIUM'
    },
    {
      subject: 'Rate Quote Request - New Customer',
      sender_type: 'customer',
      body: 'We\'re a new customer interested in your shipping services. Can you provide a quote for regular weekly shipments of 50-100 boxes to various US locations? We need overnight and ground options. Can you email me a rate card?',
      priority: 'MEDIUM'
    },
    {
      subject: 'ALERT: Shipment Not Scanned at Checkpoint',
      sender_type: 'carrier',
      body: 'Shipment TRK{TRACKING} failed to scan at Chicago checkpoint as of {TIME}. Last known location: Indianapolis hub. Investigating potential scanning error. May affect delivery window if not resolved in next 2 hours.',
      priority: 'HIGH'
    }
  ];

  const emails = [];
  // Use timestamp to generate unique IDs that don't conflict
  const baseId = Date.now();
  
  for (let i = 0; i < count; i++) {
    const emailType = emailTypes[Math.floor(Math.random() * emailTypes.length)];
    const tracking = generateTrackingNumber();
    const bol = Math.floor(Math.random() * 90000) + 10000;
    const weight = `${Math.floor(Math.random() * 50) + 1} lbs`;
    const weight1 = Math.floor(Math.random() * 2500) + 100;
    const weight2 = weight1 + (Math.random() > 0.5 ? Math.floor(Math.random() * 50) - 25 : 0);
    
    let body = emailType.body
      .replace('{TRACKING}', tracking)
      .replace('{BOL}', bol)
      .replace('{COUNT}', Math.floor(Math.random() * 10) + 1)
      .replace('{WEIGHT}', weight)
      .replace('{WEIGHT_1}', `${weight1} lbs`)
      .replace('{WEIGHT_2}', `${weight2} lbs`)
      .replace('{DIFF}', ((Math.abs(weight1 - weight2) / weight1) * 100).toFixed(1))
      .replace('{DATE}', new Date(Date.now() + Math.random() * 86400000).toLocaleString())
      .replace('{TIME}', new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString())
      .replace('{ADDRESS}', `${Math.floor(Math.random() * 9999) + 1} ${generateRandomString(10)} St, ${CITIES[Math.floor(Math.random() * CITIES.length)]}, ${STATES[Math.floor(Math.random() * STATES.length)]}`)
      .replace('{RECEIVER}', `${generateRandomString(5)} ${generateRandomString(5)}`);

    emails.push({
      id: baseId + i,
      sender: emailType.sender_type === 'internal' ? 'system@logistics.com' : generateEmail(),
      subject: emailType.subject,
      body: body,
      created_at: generatePastTime(48),
      read: Math.random() > 0.3,
      priority: emailType.priority,
      sender_type: emailType.sender_type,
      attachments: emailType.sender_type !== 'customer' ? generateAttachments(Math.floor(Math.random() * 2) + (emailType.sender_type === 'carrier' ? 1 : 0)) : [],
      tags: generateTags(Math.floor(Math.random() * 3) + 1)
    });
  }
  return emails;
};

// Recursive attachments
const generateAttachments = (count = 1) => {
  const attachments = [];
  const fileTypes = ['pdf', 'xlsx', 'csv', 'jpg', 'doc'];
  for (let i = 0; i < count; i++) {
    attachments.push({
      id: i + 1,
      filename: `document_${generateRandomString(4)}.${fileTypes[Math.floor(Math.random() * fileTypes.length)]}`,
      size: `${Math.floor(Math.random() * 5000) + 100} KB`,
      uploaded_at: generatePastTime(24)
    });
  }
  return attachments;
};

// Recursive tags
const generateTags = (count = 1) => {
  const tagOptions = ['urgent', 'follow-up', 'delay', 'exception', 'customer', 'carrier', 'internal'];
  const tags = [];
  for (let i = 0; i < count; i++) {
    tags.push(tagOptions[Math.floor(Math.random() * tagOptions.length)]);
  }
  return [...new Set(tags)]; // Remove duplicates
};

// Generate phone calls
export const generateCalls = (count = 8) => {
  const callIssues = [
    {
      reason: 'Shipment Delayed',
      caller_type: 'Customer',
      description: 'My delivery was supposed to arrive today but tracking shows delayed. Where is it?',
      action_needed: 'Contact carrier for updated ETA and notify customer',
      status: 'UPDATE'
    },
    {
      reason: 'Wrong Address',
      caller_type: 'Customer',
      description: 'I gave you my correct address but the label shows wrong address. Can you fix it?',
      action_needed: 'Verify address on file and contact shipper to correct if needed',
      status: 'UPDATE'
    },
    {
      reason: 'Damaged Package',
      caller_type: 'Customer',
      description: 'Package arrived but contents are damaged. I need a replacement.',
      action_needed: 'File carrier damage claim and arrange replacement shipment',
      status: 'COMPLAINT'
    },
    {
      reason: 'Not Home for Delivery',
      caller_type: 'Driver',
      description: 'Customer not at home. Attempted delivery failed. What should I do?',
      action_needed: 'Call customer to reschedule or approve return to warehouse',
      status: 'COMPLAINT'
    },
    {
      reason: 'Schedule Pickup',
      caller_type: 'Customer',
      description: 'I need to ship something. Can you schedule a pickup for tomorrow morning?',
      action_needed: 'Confirm pickup time and location with customer',
      status: 'UPDATE'
    },
    {
      reason: 'Billing Question',
      caller_type: 'Customer',
      description: 'Why am I being charged for shipping? I thought this was prepaid.',
      action_needed: 'Review invoice and explain charges or correct billing',
      status: 'INQUIRY'
    },
    {
      reason: 'Cannot Find Shipment',
      caller_type: 'Customer',
      description: 'My tracking number is not working. Can you look up my order?',
      action_needed: 'Search orders by name/email and provide tracking info',
      status: 'COMPLAINT'
    },
    {
      reason: 'Carrier Pickup Failed',
      caller_type: 'Warehouse',
      description: 'Carrier missed our scheduled pickup. When will they come?',
      action_needed: 'Call carrier to reschedule pickup and notify shipper',
      status: 'COMPLAINT'
    }
  ];

  const calls = [];
  for (let i = 0; i < count; i++) {
    const issue = callIssues[i % callIssues.length];
    const shipment = generateShipments(1)[0];
    
    calls.push({
      id: i + 1,
      phone_number: generatePhone(),
      caller_name: `${issue.caller_type} - ${generateRandomString(4)}`,
      caller_type: issue.caller_type,
      reason: issue.reason,
      description: issue.description,
      action_needed: issue.action_needed,
      call_status: issue.status,
      timestamp: generatePastTime(2),
      duration: null,
      resolved: false,
      resolution_notes: '',
      related_shipment: {
        tracking_number: shipment.tracking_number,
        status: shipment.status,
        origin: shipment.origin,
        destination: shipment.destination,
        eta: shipment.eta
      }
    });
  }
  return calls;
};

// Generate priority list items recursively
export const generatePriorityList = (count = 12) => {
  const tasks = [];
  const coordinatorTasks = [
    {
      title: 'Contact carrier for delayed shipment',
      description: 'Shipment TRK-2024-89342 delayed 6+ hours. Call carrier to get ETA update and notify customer.',
      subtasks: ['Call carrier dispatch', 'Get new ETA', 'Update tracking system', 'Email customer']
    },
    {
      title: 'Resolve BOL discrepancy',
      description: 'BOL #BOL-45821 has weight mismatch (manifest shows 2500 lbs, scale shows 2480 lbs). Verify with shipper.',
      subtasks: ['Review BOL details', 'Contact shipper', 'Update documentation', 'Approve shipment']
    },
    {
      title: 'Follow up on failed delivery',
      description: 'Customer not available for delivery. POD #POD-23456 marked as failed. Reschedule delivery time.',
      subtasks: ['Review delivery notes', 'Contact customer', 'Schedule new delivery', 'Update customer']
    },
    {
      title: 'Audit freight invoice',
      description: 'Invoice #INV-78901 arrived. Verify charges against shipment details and BOL before payment.',
      subtasks: ['Review invoice', 'Check shipping rates', 'Verify BOL match', 'Approve for payment']
    },
    {
      title: 'Process customer complaint',
      description: 'Customer reports package damaged on arrival. File claim and arrange replacement shipment.',
      subtasks: ['Document damage', 'Take photos', 'File carrier claim', 'Ship replacement']
    },
    {
      title: 'Confirm pickup appointments',
      description: 'Multiple pickups scheduled for today. Call customers to confirm times and access details.',
      subtasks: ['Review pickup list', 'Call customers', 'Confirm times', 'Notify driver']
    },
    {
      title: 'Reconcile batch updates',
      description: 'Batch of 25 shipments updated yesterday. Verify all status changes match actual delivery confirmations.',
      subtasks: ['Review batch file', 'Check POD receipts', 'Cross-reference tracking', 'Report discrepancies']
    },
    {
      title: 'Handle customs clearance',
      description: 'International shipment in customs. Prepare documentation and coordinate with broker.',
      subtasks: ['Gather documents', 'Contact broker', 'Complete forms', 'Track release']
    },
    {
      title: 'Investigate returned shipment',
      description: 'Package returned to origin - "address unknown". Locate correct customer and arrange redelivery.',
      subtasks: ['Find correct address', 'Contact customer', 'Update address', 'Reschedule delivery']
    },
    {
      title: 'Verify payment received',
      description: 'Customer payment overdue by 30 days. Send follow-up notice and discuss payment plan.',
      subtasks: ['Review account', 'Send payment reminder', 'Call customer', 'Arrange payment']
    },
    {
      title: 'Coordinate with warehouse',
      description: 'Shipment ready for pickup but warehouse reports inventory issue. Verify contents before releasing.',
      subtasks: ['Contact warehouse', 'Request inventory check', 'Verify contents', 'Authorize pickup']
    },
    {
      title: 'Update route optimization',
      description: 'Review daily deliveries and consolidate shipments to improve efficiency. Reassign to drivers.',
      subtasks: ['Analyze delivery areas', 'Consolidate shipments', 'Plan new routes', 'Notify drivers']
    }
  ];
  
  for (let i = 0; i < count; i++) {
    const taskTemplate = coordinatorTasks[i % coordinatorTasks.length];
    tasks.push({
      id: i + 1,
      title: taskTemplate.title,
      priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
      status: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'][Math.floor(Math.random() * 4)],
      assigned_to: 'You (Logistics Coordinator)',
      due_date: generateFutureTime(Math.floor(Math.random() * 24) + 1), // Due within 24 hours
      description: taskTemplate.description,
      subtasks: generateCoordinatorSubtasks(taskTemplate.subtasks) // Use real subtasks
    });
  }
  return tasks;
};

// Coordinator subtasks based on real workflow
const generateCoordinatorSubtasks = (subtaskTitles = []) => {
  return subtaskTitles.map((title, i) => ({
    id: i + 1,
    title: title,
    completed: Math.random() > 0.65 // More tasks incomplete
  }));
};

// Generate daily summary data
export const generateDailySummary = () => {
  return {
    date: new Date().toISOString().split('T')[0],
    total_shipments: Math.floor(Math.random() * 100) + 50,
    delivered_today: Math.floor(Math.random() * 80) + 20,
    delayed: Math.floor(Math.random() * 20) + 5,
    exceptions: Math.floor(Math.random() * 10) + 2,
    emails_sent: Math.floor(Math.random() * 50) + 10,
    calls_made: Math.floor(Math.random() * 30) + 5,
    customer_satisfaction: (Math.random() * 0.3 + 0.7).toFixed(2),
    performance_metrics: generatePerformanceMetrics() // Recursive!
  };
};

// Recursive performance metrics
const generatePerformanceMetrics = () => {
  return {
    on_time_delivery: `${(Math.random() * 30 + 70).toFixed(1)}%`,
    carrier_reliability: `${(Math.random() * 20 + 80).toFixed(1)}%`,
    customer_inquiries_resolved: `${(Math.random() * 20 + 80).toFixed(1)}%`,
    avg_response_time: `${Math.floor(Math.random() * 15) + 5} min`,
    peak_hours: generatePeakHours(3) // Recursive!
  };
};

// Recursive peak hours
const generatePeakHours = (count = 3) => {
  const hours = [];
  for (let i = 0; i < count; i++) {
    const hour = Math.floor(Math.random() * 24);
    hours.push({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      activity_count: Math.floor(Math.random() * 100) + 20
    });
  }
  return hours;
};

// Generate Bills of Lading (BOD)
export const generateBODs = (count = 10) => {
  const bods = [];
  for (let i = 0; i < count; i++) {
    const shipmentCount = Math.floor(Math.random() * 5) + 1;
    bods.push({
      id: i + 1,
      bol_number: `BOL-${Math.random().toString().substring(2, 11)}`,
      created_date: generatePastTime(168),
      carrier: CARRIERS[Math.floor(Math.random() * CARRIERS.length)],
      shipper: {
        name: `Shipper Company ${generateRandomString(3)}`,
        email: generateEmail(),
        phone: generatePhone(),
        address: generateLocation()
      },
      consignee: {
        name: `Consignee Business ${generateRandomString(3)}`,
        email: generateEmail(),
        phone: generatePhone(),
        address: generateLocation()
      },
      special_instructions: [
        'Handle with care - Fragile items',
        'Keep in dry environment',
        'No stacking',
        'Refrigerated transport required',
        'Expedited delivery requested'
      ][Math.floor(Math.random() * 5)],
      line_items: generateBOLLineItems(shipmentCount), // Recursive!
      total_weight: `${(Math.random() * 1000 + 100).toFixed(2)} lbs`,
      total_pallets: Math.floor(Math.random() * 20) + 1,
      pickup_date: generatePastTime(72),
      delivery_date: generateFutureTime(72),
      signed: Math.random() > 0.3,
      signature_date: generatePastTime(24),
      notes: 'All items verified and loaded'
    });
  }
  return bods;
};

// Recursive BOL line items
const generateBOLLineItems = (count = 3) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: i + 1,
      description: `${generateRandomString(3)} - ${['Electronics', 'Clothing', 'Books', 'Furniture', 'Food', 'Auto Parts'][Math.floor(Math.random() * 6)]}`,
      quantity: Math.floor(Math.random() * 100) + 1,
      unit: ['Box', 'Pallet', 'Case', 'Carton'][Math.floor(Math.random() * 4)],
      weight: `${(Math.random() * 500 + 10).toFixed(2)} lbs`,
      dimensions: {
        length: `${Math.floor(Math.random() * 40) + 10} in`,
        width: `${Math.floor(Math.random() * 30) + 8} in`,
        height: `${Math.floor(Math.random() * 30) + 8} in`
      },
      freight_class: ['50', '55', '60', '65', '70', '85', '100'][Math.floor(Math.random() * 7)],
      hazmat: Math.random() > 0.85,
      hazmat_class: Math.random() > 0.85 ? `Class ${Math.floor(Math.random() * 8) + 1}` : null
    });
  }
  return items;
};

// Generate Proofs of Delivery (POD)
export const generatePODs = (count = 10) => {
  const pods = [];
  for (let i = 0; i < count; i++) {
    const trackingNumber = generateTrackingNumber();
    pods.push({
      id: i + 1,
      pod_number: `POD-${Math.random().toString().substring(2, 11)}`,
      tracking_number: trackingNumber,
      shipment_id: Math.floor(Math.random() * 100) + 1,
      delivery_date: generatePastTime(72),
      delivery_time: new Date(new Date().getTime() - Math.random() * 72 * 60 * 60 * 1000).toLocaleTimeString(),
      carrier: CARRIERS[Math.floor(Math.random() * CARRIERS.length)],
      driver: {
        name: `Driver ${generateRandomString(6)}`,
        license: `DL${generateRandomString(8)}`,
        vehicle: `${Math.floor(Math.random() * 9000) + 1000}`
      },
      recipient: {
        name: `Recipient ${generateRandomString(5)}`,
        signature_required: Math.random() > 0.3,
        signature_captured: Math.random() > 0.2,
        email: generateEmail()
      },
      recipient_location: generateLocation(),
      condition_notes: [
        'Delivered in good condition',
        'Minor box damage noted',
        'Item appears tampered',
        'Recipient reported missing item',
        'Perfect condition'
      ][Math.floor(Math.random() * 5)],
      photos: generatePODPhotos(Math.floor(Math.random() * 3) + 1), // Recursive!
      barcode_scans: generateBarcodeScans(Math.floor(Math.random() * 4) + 1), // Recursive!
      delivery_status: ['DELIVERED', 'SIGNED', 'ATTEMPTED', 'FAILED'][Math.floor(Math.random() * 4)],
      delivery_attempts: Math.floor(Math.random() * 3) + 1,
      special_handling: [
        'Left with neighbor',
        'Left at door',
        'Signature waived',
        'Held for customer pickup',
        'Delivered to receptionist'
      ][Math.floor(Math.random() * 5)]
    });
  }
  return pods;
};

// Recursive POD photos
const generatePODPhotos = (count = 1) => {
  const photos = [];
  for (let i = 0; i < count; i++) {
    photos.push({
      id: i + 1,
      timestamp: generatePastTime(48),
      location: ['Front door', 'Side entrance', 'Package box', 'Recipient hands'][Math.floor(Math.random() * 4)],
      photo_url: `https://via.placeholder.com/300x200?text=POD+Photo+${i + 1}`,
      description: `Delivery photo ${i + 1}: Package at ${['front door', 'side entrance', 'recipient location'][Math.floor(Math.random() * 3)]}`
    });
  }
  return photos;
};

// Recursive barcode scans
const generateBarcodeScans = (count = 2) => {
  const scans = [];
  const scanLocations = ['Distribution Center', 'Pickup Location', 'In Transit', 'Out for Delivery', 'Delivery Location'];
  for (let i = 0; i < count; i++) {
    scans.push({
      id: i + 1,
      timestamp: generatePastTime(72),
      location: scanLocations[i % scanLocations.length],
      barcode: `${Math.random().toString().substring(2, 15)}`,
      status: STATUSES[i % STATUSES.length],
      scanned_by: `Scanner ${generateRandomString(4)}`
    });
  }
  return scans;
};

// Generate Invoices
export const generateInvoices = (count = 10) => {
  const invoices = [];
  for (let i = 0; i < count; i++) {
    const subtotal = Math.random() * 5000 + 500;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    
    invoices.push({
      id: i + 1,
      invoice_number: `INV-${Math.random().toString().substring(2, 11)}`,
      invoice_date: generatePastTime(168),
      due_date: generateFutureTime(30),
      shipping_date: generatePastTime(72),
      tracking_number: generateTrackingNumber(),
      bill_to: {
        name: `Company ${generateRandomString(4)}`,
        email: generateEmail(),
        phone: generatePhone(),
        address: generateLocation()
      },
      ship_to: {
        name: `Destination ${generateRandomString(4)}`,
        email: generateEmail(),
        address: generateLocation()
      },
      line_items: generateInvoiceLineItems(Math.floor(Math.random() * 5) + 2), // Recursive!
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      shipping_cost: (Math.random() * 200 + 25).toFixed(2),
      insurance: (Math.random() * 100).toFixed(2),
      discount: (Math.random() * 50).toFixed(2),
      total: total.toFixed(2),
      payment_terms: ['NET30', 'NET60', 'DUE_ON_RECEIPT', 'NET15'][Math.floor(Math.random() * 4)],
      payment_status: ['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'][Math.floor(Math.random() * 4)],
      payment_method: ['Wire Transfer', 'Credit Card', 'ACH', 'Check'][Math.floor(Math.random() * 4)],
      po_number: `PO-${generateRandomString(6)}`,
      reference_notes: 'Order confirmed and ready for shipment',
      linked_documents: generateLinkedDocuments(Math.floor(Math.random() * 2) + 1) // Recursive!
    });
  }
  return invoices;
};

// Recursive invoice line items
const generateInvoiceLineItems = (count = 2) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    const quantity = Math.floor(Math.random() * 50) + 1;
    const unitPrice = Math.random() * 200 + 10;
    items.push({
      id: i + 1,
      sku: `SKU-${generateRandomString(8)}`,
      description: `${generateRandomString(3)} - ${['Electronics', 'Clothing', 'Books', 'Furniture', 'Food', 'Auto Parts'][Math.floor(Math.random() * 6)]}`,
      quantity: quantity,
      unit: 'EA',
      unit_price: unitPrice.toFixed(2),
      line_total: (quantity * unitPrice).toFixed(2),
      tax_rate: '8%'
    });
  }
  return items;
};

// Recursive linked documents
const generateLinkedDocuments = (count = 1) => {
  const docs = [];
  const docTypes = ['BOL', 'PO', 'POD', 'ASN'];
  for (let i = 0; i < count; i++) {
    docs.push({
      id: i + 1,
      document_type: docTypes[i % docTypes.length],
      document_number: `${docTypes[i % docTypes.length]}-${generateRandomString(6)}`,
      link_date: generatePastTime(24),
      status: 'LINKED'
    });
  }
  return docs;
};

export default {
  generateShipments,
  generateEmails,
  generateCalls,
  generatePriorityList,
  generateDailySummary,
  generateBODs,
  generatePODs,
  generateInvoices
};
