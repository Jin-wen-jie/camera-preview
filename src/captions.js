import { setStatus } from './utils.js';

const EMPTY_CAPTION = '字幕将在这里显示';
const UNSUPPORTED_MESSAGE = '当前浏览器不支持实时字幕';

function setCaption(output, text, state) {
  if (!output) return;
  output.textContent = text;
  if (output.dataset) {
    output.dataset.state = state;
  }
}

function getTranscript(result) {
  return result?.[0]?.transcript?.trim() || '';
}

export function createCaptionController({
  SpeechRecognition,
  output,
  status,
  language = 'zh-CN',
  onTranscript = () => {},
  onStateChange = () => {}
}) {
  if (!SpeechRecognition) {
    setCaption(output, UNSUPPORTED_MESSAGE, 'error');
    setStatus(status, `${UNSUPPORTED_MESSAGE}，请使用 Chrome 或 Edge`, 'error');
    return {
      isSupported: false,
      start() {
        return false;
      },
      stop() {}
    };
  }

  let recognition = null;
  let isRunning = false;
  let shouldKeepListening = false;
  let retryDelay = 1000; // Exponential backoff: 1s → 2s → 4s → 8s

  function retryLater() {
    if (!shouldKeepListening) return;
    setTimeout(() => {
      if (!shouldKeepListening) return;
      recognition = createRecognition();
      try {
        recognition.start();
      } catch {
        retryDelay = Math.min(retryDelay * 2, 8000);
        setStatus(status, `重连中 (${Math.round(retryDelay / 1000)}s)…`, 'loading');
        retryLater();
      }
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 8000);
  }

  function setRunning(nextIsRunning) {
    if (isRunning === nextIsRunning) return;
    isRunning = nextIsRunning;
    onStateChange(isRunning);
  }

  function createRecognition() {
    const instance = new SpeechRecognition();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = language;

    instance.onstart = () => {
      retryDelay = 1000; // Reset backoff on successful connection
      setStatus(status, '正在听你说话', 'ready');
      setRunning(true);
    };

    instance.onresult = (event) => {
      let interimTranscript = '';
      let recentTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = getTranscript(result);
        if (!transcript) continue;

        if (!result.isFinal) {
          interimTranscript = transcript;
        } else {
          recentTranscript = transcript;
        }
      }

      const visibleTranscript = interimTranscript || recentTranscript;
      setCaption(output, visibleTranscript || EMPTY_CAPTION, visibleTranscript ? 'active' : 'idle');
      if (visibleTranscript) {
        onTranscript(visibleTranscript, recentTranscript || visibleTranscript);
      }
    };

    instance.onerror = (event) => {
      if (event?.error === 'not-allowed') {
        shouldKeepListening = false;
        setStatus(status, '麦克风权限被拒绝，请点击地址栏左侧图标重新允许麦克风', 'error');
        setRunning(false);
        return;
      }

      // Transient error — retry with backoff
      setStatus(status, `识别出错，即将重试…`, 'loading');
      setRunning(false);
      retryLater();
    };

    instance.onend = () => {
      if (!shouldKeepListening) {
        setStatus(status, '实时字幕已停止', 'idle');
        setRunning(false);
        return;
      }

      // Use exponential backoff when reconnecting
      retryLater();
    };

    return instance;
  }

  return {
    isSupported: true,
    get isRunning() {
      return isRunning;
    },
    start() {
      if (isRunning) return true;

      shouldKeepListening = true;
      recognition = createRecognition();
      setCaption(output, EMPTY_CAPTION, 'idle');
      setStatus(status, '正在听你说话', 'ready');

      try {
        recognition.start();
        setRunning(true);
        return true;
      } catch (error) {
        const detail = error?.message || '请重试';
        shouldKeepListening = false;
        setStatus(status, `无法开启实时字幕：${detail}`, 'error');
        setRunning(false);
        return false;
      }
    },
    stop() {
      if (!recognition) {
        setStatus(status, '实时字幕未开启', 'idle');
        shouldKeepListening = false;
        setRunning(false);
        return;
      }

      shouldKeepListening = false;
      recognition.stop();
    }
  };
}
