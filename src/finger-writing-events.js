export function dispatchFingerWritingResult(
  result,
  {
    target = window,
    CustomEvent = window.CustomEvent
  } = {}
) {
  target.dispatchEvent(new CustomEvent('finger-writing-result', {
    detail: result
  }));
}
