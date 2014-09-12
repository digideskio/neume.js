"use strict";

var neume = require("../src/neume");

neume.use(require("../src/ugen/osc"));
neume.use(require("../src/ugen/conv"));

describe("ugen/conv", function() {
  describe("$(conv $(sin))", function() {
    /*
     * +--------+
     * | $(sin) |
     * +--------+
     *   |
     * +-------------------+
     * | ConvolverNode     |
     * | - buffer: null    |
     * | - normalize: true |
     * +-------------------+
     *   |
     */
    it("return a ConvolverNode that is connected with $(sin)", function() {
      var context = new neume.Context(new window.AudioContext());
      var buffer = neume.Buffer.from(context, [ 1, 2, 3, 4 ]);

      var synth = neume.Neume(function($) {
        return $("conv", { buffer: buffer, normalize: false }, $("sin"));
      })();

      assert.deepEqual(synth.outlet.toJSON(), {
        name: "ConvolverNode",
        normalize: false,
        inputs: [
          {
            name: "OscillatorNode",
            type: "sine",
            frequency: {
              value: 440,
              inputs: []
            },
            detune: {
              value: 0,
              inputs: []
            },
            inputs: []
          }
        ]
      });

      assert.deepEqual(synth.outlet.buffer.toJSON(), {
        name: "AudioBuffer",
        sampleRate: 44100,
        length: 4,
        duration: 0.00009070294784580499,
        numberOfChannels: 1
      });
    });
  });

});