"use strict";

var neume = require("../../src");

var NeuContext = neume.Context;
var NeuComponent = neume.Component;

describe("NeuComponent", function() {
  var context = null;

  beforeEach(function() {
    context = new NeuContext(new global.AudioContext().destination);
  });

  describe("(context, node)", function() {
    it("returns a NeuComponent", function() {
      var component = new NeuComponent(
        context, context.createOscillator()
      );
      assert(component instanceof NeuComponent);
    });
  });

  describe("#toAudioNode()", function() {
    it("return an AudioNode", function() {
      var component = new NeuComponent(
        context, context.createOscillator()
      );
      assert(component.toAudioNode() instanceof global.AudioNode);
      assert(component.toAudioNode() === component.toAudioNode());
    });
  });

  describe("#connect(to)", function() {
    it("connect to node", function() {
      var to = context.createGain();

      new NeuComponent(
        context, context.createOscillator()
      ).connect(to);

      assert.deepEqual(to.toJSON(), {
        name: "GainNode",
        gain: {
          value: 1,
          inputs: []
        },
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
    });
  });

  describe("#disconnect(to)", function() {
    it("disconnect from node", function() {
      var to = context.createGain();

      new NeuComponent(
        context, context.createOscillator()
      ).connect(to).disconnect();

      assert.deepEqual(to.toJSON(), {
        name: "GainNode",
        gain: {
          value: 1,
          inputs: []
        },
        inputs: []
      });
    });
  });

});
