"use strict";

var neume = require("../../src");

neume.use(require("../../src/ugen/buf"));

describe("ugen/buf", function() {
  var Neume = null;
  var context = null;
  var buffer = null;

  before(function() {
    Neume = neume(new global.AudioContext());
  });

  beforeEach(function() {
    context = new neume.Context(Neume.context.destination);
  });

  describe("$(buf buffer:buffer)", function() {
    /*
     * +------------------+
     * | BufferSourceNode |
     * +------------------+
     *   |
     */
    beforeEach(function() {
      buffer = neume.Buffer.from(context, [ 1, 2, 3, 4 ]);
    });

    it("returns a BufferSourceNode", function() {
      var synth = new Neume.Synth(function($) {
        return $("buf", { buf: buffer });
      });

      assert.deepEqual(synth.toAudioNode().toJSON(), {
        name: "GainNode",
        gain: {
          value: 1,
          inputs: []
        },
        inputs: [
          {
            name: "AudioBufferSourceNode",
            buffer: {
              name: "AudioBuffer",
              length: 4,
              duration: 4 / 44100,
              sampleRate: 44100,
              numberOfChannels: 1
            },
            playbackRate: {
              value: 1,
              inputs: []
            },
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            inputs: []
          }
        ]
      });
    });

    it("works", function() {
      var synth = new Neume.Synth(function($) {
        return $("buf", { buf: buffer });
      });

      var audioContext = Neume.audioContext;
      var outlet = synth.toAudioNode().$inputs[0];

      audioContext.$reset();
      synth.$context.reset();

      synth.start(0.100);
      synth.stop(0.200);

      audioContext.$processTo("00:00.250");
      assert(outlet.$stateAtTime(0.000) === "SCHEDULED");
      assert(outlet.$stateAtTime(0.050) === "SCHEDULED");
      assert(outlet.$stateAtTime(0.100) === "PLAYING");
      assert(outlet.$stateAtTime(0.150) === "PLAYING");
      assert(outlet.$stateAtTime(0.200) === "FINISHED");
      assert(outlet.$stateAtTime(0.250) === "FINISHED");
    });

    it("works without duration", function() {
      var synth = new Neume.Synth(function($) {
        return $("buf", { buf: buffer, offset: 5 });
      });

      var audioContext = Neume.audioContext;
      var outlet = synth.toAudioNode().$inputs[0];
      var spy = sinon.spy(outlet, "start");

      audioContext.$reset();
      synth.$context.reset();

      synth.start(0.100);

      audioContext.$processTo("00:00.100");

      assert(spy.calledOnce === true);
      assert.deepEqual(spy.firstCall.args, [ 0.100, 5 ]);
    });

    it("works duration", function() {
      var synth = new Neume.Synth(function($) {
        return $("buf", { buf: buffer, offset: 5, dur: 10 });
      });

      var audioContext = Neume.audioContext;
      var outlet = synth.toAudioNode().$inputs[0];
      var spy = sinon.spy(outlet, "start");

      audioContext.$reset();
      synth.$context.reset();

      synth.start(0.100);

      audioContext.$processTo("00:00.100");

      assert(spy.calledOnce === true);
      assert.deepEqual(spy.firstCall.args, [ 0.100, 5, 10 ]);
    });

  });

  describe("$(AudioBuffer)", function() {
    it("returns a BufferSourceNode", function() {
      var audioBuffer = context.createBuffer(1, 128, 44100);
      var synth = new Neume.Synth(function($) {
        return $(audioBuffer);
      });

      assert.deepEqual(synth.toAudioNode().toJSON(), {
        name: "GainNode",
        gain: {
          value: 1,
          inputs: []
        },
        inputs: [
          {
            name: "AudioBufferSourceNode",
            buffer: {
              name: "AudioBuffer",
              length: 128,
              duration: 128 / 44100,
              sampleRate: 44100,
              numberOfChannels: 1
            },
            playbackRate: {
              value: 1,
              inputs: []
            },
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            inputs: []
          }
        ]
      });
    });
  });

  describe("$(NeuBuffer)", function() {
    it("returns a BufferSourceNode", function() {
      var buffer = neume.Buffer.from(context, [ 1, 2, 3, 4 ]);
      var synth = new Neume.Synth(function($) {
        return $(buffer);
      });

      assert.deepEqual(synth.toAudioNode().toJSON(), {
        name: "GainNode",
        gain: {
          value: 1,
          inputs: []
        },
        inputs: [
          {
            name: "AudioBufferSourceNode",
            buffer: {
              name: "AudioBuffer",
              length: 4,
              duration: 4 / 44100,
              sampleRate: 44100,
              numberOfChannels: 1
            },
            playbackRate: {
              value: 1,
              inputs: []
            },
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            inputs: []
          }
        ]
      });
    });
  });

});
