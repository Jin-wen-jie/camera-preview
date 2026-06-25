export function setStatus(status, text, state) {
  if (!status) return;
  status.textContent = text;
  if (status.dataset) {
    status.dataset.state = state;
  }
}

export function normalize(text) {
  return String(text || '').replace(/\s+/g, '');
}
