function setStatus(status, text, state) {
  if (!status) return;
  status.textContent = text;
  if (status.dataset) {
    status.dataset.state = state;
  }
}

export async function startCamera({ mediaDevices, video, status }) {
  if (!mediaDevices?.getUserMedia) {
    const message = '当前浏览器不支持摄像头访问';
    setStatus(status, message, 'error');
    throw new Error(message);
  }

  setStatus(status, '正在请求摄像头权限...', 'loading');

  try {
    const stream = await mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    setStatus(status, '摄像头已开启', 'ready');
    return stream;
  } catch (error) {
    const message = error?.name === 'NotAllowedError'
      ? '摄像头权限被拒绝，请在浏览器地址栏重新允许'
      : '无法打开摄像头，请确认设备可用';
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
