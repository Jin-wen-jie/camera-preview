import test from 'node:test';
import assert from 'node:assert/strict';

import { dispatchFingerWritingResult } from '../src/finger-writing-events.js';

test('dispatchFingerWritingResult sends a finger-writing-result CustomEvent', () => {
  const events = [];
  const target = {
    dispatchEvent(event) {
      events.push(event);
      return true;
    }
  };
  const CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  const result = {
    source: 'finger-writing',
    text: '',
    strokes: [[{ x: 10, y: 20, timestamp: 1000 }]],
    createdAt: 1200
  };

  dispatchFingerWritingResult(result, { target, CustomEvent });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'finger-writing-result');
  assert.deepEqual(events[0].detail, result);
});
