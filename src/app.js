import { startCamera, stopCamera } from './camera.js';

const video = document.querySelector('[data-camera-preview]');
const status = document.querySelector('[data-camera-status]');
const startButton = document.querySelector('[data-camera-start]');
const stopButton = document.querySelector('[data-camera-stop]');

let currentStream = null;

function setControls(isRunning) {
  startButton.disabled = isRunning;
  stopButton.disabled = !isRunning;
}

async function handleStart() {
  startButton.disabled = true;

  try {
    currentStream = await startCamera({
      mediaDevices: navigator.mediaDevices,
      video,
      status
    });
    setControls(true);
  } catch {
    currentStream = null;
    setControls(false);
  }
}

function handleStop() {
  stopCamera({ stream: currentStream, video, status });
  currentStream = null;
  setControls(false);
}

startButton.addEventListener('click', handleStart);
stopButton.addEventListener('click', handleStop);
window.addEventListener('beforeunload', () => {
  if (currentStream) {
    stopCamera({ stream: currentStream, video, status: null });
  }
});

setControls(false);
