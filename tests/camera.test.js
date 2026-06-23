import test from 'node:test';
import assert from 'node:assert/strict';

import { startCamera, stopCamera } from '../src/camera.js';

test('startCamera requests webcam video and shows the stream', async () => {
  const calls = [];
  const stream = {
    getTracks() {
      return [];
    }
  };
  const mediaDevices = {
    async getUserMedia(constraints) {
      calls.push(constraints);
      return stream;
    }
  };
  const video = { srcObject: null };
  const status = { textContent: '', dataset: {} };

  const result = await startCamera({ mediaDevices, video, status });

  assert.deepEqual(calls, [{ video: true, audio: false }]);
  assert.equal(result, stream);
  assert.equal(video.srcObject, stream);
  assert.equal(status.textContent, '摄像头已开启');
  assert.equal(status.dataset.state, 'ready');
});

test('stopCamera stops all tracks and clears the video preview', () => {
  const stopped = [];
  const stream = {
    getTracks() {
      return [
        { stop: () => stopped.push('video') },
        { stop: () => stopped.push('audio') }
      ];
    }
  };
  const video = { srcObject: stream };
  const status = { textContent: '', dataset: {} };

  stopCamera({ stream, video, status });

  assert.deepEqual(stopped, ['video', 'audio']);
  assert.equal(video.srcObject, null);
  assert.equal(status.textContent, '摄像头已停止');
  assert.equal(status.dataset.state, 'idle');
});

test('startCamera reports a clear message when webcam access is unavailable', async () => {
  const mediaDevices = {};
  const video = { srcObject: null };
  const status = { textContent: '', dataset: {} };

  await assert.rejects(
    startCamera({ mediaDevices, video, status }),
    /当前浏览器不支持摄像头访问/
  );
  assert.equal(video.srcObject, null);
  assert.equal(status.textContent, '当前浏览器不支持摄像头访问');
  assert.equal(status.dataset.state, 'error');
});
