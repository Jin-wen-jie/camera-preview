import test from 'node:test';
import assert from 'node:assert/strict';

import { startCamera, stopCamera } from '../src/camera.js';

const preferredVideoConstraints = {
  width: { min: 1280, ideal: 1920 },
  height: { min: 720, ideal: 1080 },
  frameRate: { min: 30, ideal: 60 }
};

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
  let playCalled = false;
  const video = {
    srcObject: null,
    async play() {
      playCalled = true;
    }
  };
  const status = { textContent: '', dataset: {} };

  const result = await startCamera({ mediaDevices, video, status });

  assert.deepEqual(calls, [{ video: preferredVideoConstraints, audio: false }]);
  assert.equal(result, stream);
  assert.equal(video.srcObject, stream);
  assert.equal(playCalled, true);
  assert.equal(status.textContent, '摄像头已开启');
  assert.equal(status.dataset.state, 'ready');
});

test('startCamera shows the actual camera settings when the browser reports them', async () => {
  const stream = {
    getTracks() {
      return [];
    },
    getVideoTracks() {
      return [
        {
          getSettings() {
            return {
              frameRate: 59.94,
              width: 1280,
              height: 720
            };
          }
        }
      ];
    }
  };
  const mediaDevices = {
    async getUserMedia() {
      return stream;
    }
  };
  const video = {
    srcObject: null,
    async play() {}
  };
  const status = { textContent: '', dataset: {} };

  await startCamera({ mediaDevices, video, status });

  assert.equal(status.textContent, '摄像头已开启 · 60fps · 1280x720');
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
  assert.equal(status.textContent, '当前浏览器不支持摄像头访问，请使用 Chrome、Edge 或 Safari 打开 HTTPS 页面');
  assert.equal(status.dataset.state, 'error');
});
