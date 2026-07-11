export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RFQ_RECIPIENT = 'linda@colorprintingpackage.com';
const MAX_FIELD_LENGTH = 2000;

function clean(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}

function field(data, name) {
  return clean(data[name] || data[name.toLowerCase()] || '');
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

function buildEmailBody(data) {
  const rows = [
    ['Product Type', field(data, 'Product Type')],
    ['Size', field(data, 'Size')],
    ['Quantity', field(data, 'Quantity')],
    ['Material', field(data, 'Material')],
    ['Destination', field(data, 'Destination')],
    ['Name', field(data, 'Name')],
    ['Email', field(data, 'Email')],
    ['Phone / WhatsApp', field(data, 'Phone') || field(data, 'WhatsApp')],
    ['Message', field(data, 'Message')],
    ['Page URL', field(data, 'Page URL')],
    ['Submitted At', new Date().toISOString()]
  ];

  return rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

async function submitViaFormSubmit(data) {
  const body = buildEmailBody(data);
  const payload = {
    _subject: `Packaging RFQ - ${field(data, 'Product Type') || 'Website Inquiry'}`,
    _template: 'table',
    _captcha: 'false',
    _autoresponse: 'Thank you for contacting Packaging Factory Direct. Linda Wang will review your RFQ and reply soon.',
    product_type: field(data, 'Product Type'),
    size: field(data, 'Size'),
    quantity: field(data, 'Quantity'),
    material: field(data, 'Material'),
    destination: field(data, 'Destination'),
    name: field(data, 'Name'),
    email: field(data, 'Email'),
    phone: field(data, 'Phone') || field(data, 'WhatsApp'),
    message: field(data, 'Message'),
    page_url: field(data, 'Page URL'),
    rfq_details: body
  };

  const response = await fetch(`https://formsubmit.co/ajax/${RFQ_RECIPIENT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://www.packagingfactorydirect.com',
      Referer: field(data, 'Page URL') || 'https://www.packagingfactorydirect.com/contact.html'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok || parsed?.success === false || parsed?.success === 'false') {
    throw new Error(parsed?.message || text || `FormSubmit failed with ${response.status}`);
  }

  return parsed || { success: true };
}

export async function POST(request) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, message: 'Invalid RFQ payload.' }, 400);
  }

  const quantity = field(data, 'Quantity');
  const message = field(data, 'Message');
  const productType = field(data, 'Product Type');

  if (!quantity && !message && !productType) {
    return json({ ok: false, message: 'Please add product type, quantity, or message before submitting.' }, 400);
  }

  try {
    const result = await submitViaFormSubmit(data);
    return json({
      ok: true,
      message: 'RFQ submitted. Linda Wang will receive the inquiry by email.',
      provider: 'formsubmit',
      result
    });
  } catch (error) {
    return json({
      ok: false,
      message: 'RFQ email could not be sent automatically. Please use WhatsApp or email Linda directly.',
      error: clean(error.message)
    }, 502);
  }
}
