import { setStatus } from './utils.js';

const preferredVideoConstraints = {
  width: { min: 1280, ideal: 1920 },
  height: { min: 720, ideal: 1080 },
  frameRate: { min: 30, ideal: 60 }
};

function formatCameraReadyMessage(stream) {
  const settings = stream?.getVideoTracks?.()[0]?.getSettings?.() || {};
  const details = [];

  if (Number.isFinite(settings.frameRate)) {
    details.push(`${Math.round(settings.frameRate)}fps`);
  }

  if (Number.isFinite(settings.width) && Number.isFinite(settings.height)) {
    details.push(`${settings.width}x${settings.height}`);
  }

  return ['摄像头已开启', ...details].join(' · ');
}

async function boostVideoTrack(stream) {
  const track = stream?.getVideoTracks?.()[0];
  if (!track) return;

  try {
    await track.applyConstraints({
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 60 }
    });
  } catch {
    // 设备不支持更高参数时静默降级
  }
}

export async function startCamera({ mediaDevices, video, status }) {
  if (!mediaDevices?.getUserMedia) {
    const message = '当前浏览器不支持摄像头访问，请使用 Chrome、Edge 或 Safari 打开 HTTPS 页面';
    setStatus(status, message, 'error');
    throw new Error(message);
  }

  setStatus(status, '正在请求摄像头权限...', 'loading');
  if (video?.dataset) video.dataset.state = 'loading';

  try {
    const stream = await mediaDevices.getUserMedia({
      video: preferredVideoConstraints,
      audio: false
    });
    if (video) video.srcObject = stream;
    await boostVideoTrack(stream);
    await video?.play?.();
    if (video?.dataset) video.dataset.state = 'ready';
    setStatus(status, formatCameraReadyMessage(stream), 'ready');
    return stream;
  } catch (error) {
    if (video?.dataset) video.dataset.state = 'error';
    const message = error?.name === 'NotAllowedError'
      ? '摄像头权限被拒绝，请点击地址栏左侧图标重新允许摄像头'
      : `无法打开摄像头：${error?.message || '请确认设备未被其他软件占用'}`;
    if (video) video.srcObject = null;
    setStatus(status, message, 'error');
    const err = new Error(message);
    try { err.cause = error; } catch { /* ignore */ }
    throw err;
  }
}

export function stopCamera({ stream, video, status } = {}) {
  stream?.getTracks?.().forEach((track) => track.stop());
  if (video) {
    video.srcObject = null;
    if (video.dataset) video.dataset.state = 'idle';
  }
  if (status) setStatus(status, '摄像头已停止', 'idle');
}
