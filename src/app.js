import { startCamera, stopCamera } from './camera.js';
import { createCaptionController } from './captions.js';

const video = document.querySelector('[data-camera-preview]');
const status = document.querySelector('[data-camera-status]');
const startButton = document.querySelector('[data-camera-start]');
const stopButton = document.querySelector('[data-camera-stop]');
const captionOutput = document.querySelector('[data-live-caption]');
const captionStatus = document.querySelector('[data-caption-status]');
const captionStartButton = document.querySelector('[data-caption-start]');
const captionStopButton = document.querySelector('[data-caption-stop]');

let currentStream = null;
let captionController = null;

function setControls(isRunning) {
  startButton.disabled = isRunning;
  stopButton.disabled = !isRunning;
}

function setCaptionControls(isRunning) {
  const isSupported = captionController?.isSupported !== false;
  captionStartButton.disabled = !isSupported || isRunning;
  captionStopButton.disabled = !isSupported || !isRunning;
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
captionController = createCaptionController({
  SpeechRecognition: window.SpeechRecognition || window.webkitSpeechRecognition,
  output: captionOutput,
  status: captionStatus,
  onStateChange: setCaptionControls
});
captionStartButton.addEventListener('click', () => {
  captionController.start();
});
captionStopButton.addEventListener('click', () => {
  captionController.stop();
});
window.addEventListener('beforeunload', () => {
  if (currentStream) {
    stopCamera({ stream: currentStream, video, status: null });
  }
  captionController.stop();
});

setControls(false);
setCaptionControls(false);
handleStart();
