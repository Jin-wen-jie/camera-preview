const EMPTY_CAPTION = '字幕将在这里显示';
const UNSUPPORTED_MESSAGE = '当前浏览器不支持实时字幕';

function setStatus(status, text, state) {
  if (!status) return;
  status.textContent = text;
  if (status.dataset) {
    status.dataset.state = state;
  }
}

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
  let finalTranscript = '';

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

        recentTranscript = `${recentTranscript} ${transcript}`.trim();

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const visibleTranscript = `${finalTranscript} ${interimTranscript}`.trim();
      setCaption(output, visibleTranscript || EMPTY_CAPTION, visibleTranscript ? 'active' : 'idle');
      if (recentTranscript) {
        onTranscript(visibleTranscript, recentTranscript);
      }
    };

    instance.onerror = (event) => {
      const message = event?.error === 'not-allowed'
        ? '麦克风权限被拒绝，请点击地址栏左侧图标重新允许麦克风'
        : '实时字幕识别出错，请重新开启字幕';
      setStatus(status, message, 'error');
      setRunning(false);
    };

    instance.onend = () => {
      if (!isRunning) return;
      setStatus(status, '实时字幕已停止', 'idle');
      setRunning(false);
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

      finalTranscript = '';
      recognition = createRecognition();
      setCaption(output, EMPTY_CAPTION, 'idle');
      setStatus(status, '正在听你说话', 'ready');

      try {
        recognition.start();
        setRunning(true);
        return true;
      } catch (error) {
        const detail = error?.message || '请重试';
        setStatus(status, `无法开启实时字幕：${detail}`, 'error');
        setRunning(false);
        return false;
      }
    },
    stop() {
      if (!recognition) {
        setStatus(status, '实时字幕未开启', 'idle');
        setRunning(false);
        return;
      }

      recognition.stop();
    }
  };
}
