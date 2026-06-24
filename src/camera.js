function setStatus(status, text, state) {
  if (!status) return;
  status.textContent = text;
  if (status.dataset) {
    status.dataset.state = state;
  }
}

const preferredVideoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 60, max: 60 }
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

export async function startCamera({ mediaDevices, video, status }) {
  if (!mediaDevices?.getUserMedia) {
    const message = '当前浏览器不支持摄像头访问，请使用 Chrome、Edge 或 Safari 打开 HTTPS 页面';
    setStatus(status, message, 'error');
    throw new Error(message);
  }

  setStatus(status, '正在请求摄像头权限...', 'loading');

  try {
    const stream = await mediaDevices.getUserMedia({
      video: preferredVideoConstraints,
      audio: false
    });
    video.srcObject = stream;
    await video.play?.();
    setStatus(status, formatCameraReadyMessage(stream), 'ready');
    return stream;
  } catch (error) {
    const message = error?.name === 'NotAllowedError'
      ? '摄像头权限被拒绝，请点击地址栏左侧图标重新允许摄像头'
      : `无法打开摄像头：${error?.message || '请确认设备未被其他软件占用'}`;
    video.srcObject = null;
    setStatus(status, message, 'error');
    throw new Error(message, { cause: error });
  }
}

export function stopCamera({ stream, video, status }) {
  stream?.getTracks?.().forEach((track) => track.stop());
  if (video) {
    video.srcObject = null;
  }
  setStatus(status, '摄像头已停止', 'idle');
}
