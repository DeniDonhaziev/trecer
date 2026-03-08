/**
 * Step Counter Library — считывание шагов с акселерометра (DeviceMotion).
 * Использование: StepCounter.start(function() { ... }), StepCounter.stop()
 */
(function (global) {
  'use strict';

  var handler = null;
  var active = false;
  var lastStepTime = 0;
  var stepTimings = [];
  var accelBuffer = [];
  var lp1 = 9.8, lp2 = 9.8;
  var lastValley = 0, lastValleyTime = 0, lastPeakTime = 0;

  var MIN_STEP_MS = 380;
  var MAX_STEP_MS = 1100;
  var MIN_PROMINENCE = 0.32;
  var MAX_PROMINENCE = 1.8;

  function getTypicalInterval() {
    if (stepTimings.length < 2) return 580;
    var sum = 0, n = stepTimings.length;
    for (var k = 0; k < n; k++) sum += stepTimings[k];
    return sum / n;
  }

  function StepCounter() {}

  StepCounter.isSupported = function () {
    return typeof DeviceMotionEvent !== 'undefined';
  };

  StepCounter.isActive = function () {
    return active;
  };

  StepCounter.requestPermission = function () {
    if (typeof DeviceMotionEvent === 'undefined' || typeof DeviceMotionEvent.requestPermission !== 'function') {
      return Promise.resolve('unsupported');
    }
    return DeviceMotionEvent.requestPermission().then(function (perm) {
      return perm;
    }).catch(function () {
      return 'denied';
    });
  };

  StepCounter.start = function (onStep) {
    if (active && handler) return Promise.resolve(false);

    stepTimings = [];
    accelBuffer = [];
    lp1 = lp2 = 9.8;
    lastValley = lastPeakTime = lastValleyTime = 0;

    handler = function (e) {
      var a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      var mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
      lp1 = 0.78 * lp1 + 0.22 * mag;
      lp2 = 0.94 * lp2 + 0.06 * mag;
      var diff = lp1 - lp2;
      accelBuffer.push(diff);
      if (accelBuffer.length > 80) accelBuffer.shift();
      if (accelBuffer.length < 30) return;

      var i = accelBuffer.length - 6;
      var curr = accelBuffer[i];
      var p2 = accelBuffer[i - 2], p1 = accelBuffer[i - 1];
      var n1 = accelBuffer[i + 1], n2 = accelBuffer[i + 2];
      if (p2 == null || n2 == null) return;

      var isPeak = curr > p2 && curr > p1 && curr >= n1 && curr >= n2;
      if (!isPeak) {
        if (curr < lastValley) {
          lastValley = curr;
          lastValleyTime = Date.now();
        }
        return;
      }

      var prominence = curr - lastValley;
      var now = Date.now();
      var gap = lastPeakTime > 0 ? now - lastPeakTime : 9999;

      if (prominence < MIN_PROMINENCE) return;
      if (prominence > MAX_PROMINENCE) {
        lastValley = curr;
        lastValleyTime = now;
        return;
      }
      if (gap < MIN_STEP_MS) {
        lastValley = curr;
        return;
      }
      if (gap > MAX_STEP_MS) {
        lastValley = curr;
        lastValleyTime = now;
        stepTimings.length = 0;
      }

      stepTimings.push(gap);
      if (stepTimings.length > 6) stepTimings.shift();
      var typical = getTypicalInterval();
      var inRhythm = stepTimings.length < 2 ||
        (gap >= MIN_STEP_MS && gap <= MAX_STEP_MS && Math.abs(gap - typical) < 320);
      if (stepTimings.length >= 3 && !inRhythm) {
        lastValley = curr;
        return;
      }

      lastPeakTime = now;
      lastValley = curr;
      lastValleyTime = now;
      lastStepTime = now;
      if (typeof onStep === 'function') onStep();
    };

    var isSecure = global.isSecureContext ||
      global.location.protocol === 'https:' ||
      global.location.hostname === 'localhost' ||
      global.location.hostname === '127.0.0.1';

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function' && isSecure) {
      return DeviceMotionEvent.requestPermission().then(function (perm) {
        if (perm === 'granted') {
          global.addEventListener('devicemotion', handler);
          active = true;
          return true;
        }
        return false;
      }).catch(function () {
        return false;
      });
    }

    if (typeof DeviceMotionEvent === 'undefined') return Promise.resolve(false);
    try {
      global.addEventListener('devicemotion', handler);
      active = true;
      return Promise.resolve(true);
    } catch (err) {
      return Promise.resolve(false);
    }
  };

  StepCounter.stop = function () {
    if (!active || !handler) return;
    global.removeEventListener('devicemotion', handler);
    active = false;
    handler = null;
  };

  global.StepCounter = StepCounter;
})(typeof window !== 'undefined' ? window : this);
