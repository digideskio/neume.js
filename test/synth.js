"use strict";

var _ = require("../src/utils");
var NeuContext = require("../src/context");
var NeuSynth = require("../src/synth");
var Emitter = require("../src/emitter");

var NeuUGen  = _.NeuUGen;
var NeuParam = _.NeuParam;
var NOP = function() {};

function unitStub() {
  return {
    $methods: {},
    apply: sinon.spy(),
    start: sinon.spy(),
    stop : sinon.spy()
  };
}

describe("NeuSynth", function() {
  var audioContext = null;
  var context = null;
  var osc = null;

  beforeEach(function() {
    audioContext = new window.AudioContext();
    context = new NeuContext(audioContext);
    osc = context.createOscillator();
  });

  describe("(context, func, args)", function() {
    it("returns an instance of NeuSynth", function() {
      assert(new NeuSynth(context, NOP, []) instanceof NeuSynth);
    });
    describe("$", function() {
      it("works", sinon.test(function() {
        var count = 0;

        var stub = this.stub(NeuUGen, "build", function() {
          return { id: count++ };
        });

        var synth = new NeuSynth(context, function($) {
          return $("sin", { freq: 880 }, 1, 2, 3);
        }, []);

        assert(stub.calledOnce === true);
        assert.deepEqual(stub.firstCall.args, [
          synth, "sin", { freq: 880 }, [ 1, 2, 3 ]
        ]);
      }));
      describe(".params(name, defaultValue)", function() {
        it("works", function() {
          var params = {};

          var synth = new NeuSynth(context, function($) {
            params.freq = $.param("freq", 440);
            params.amp  = $.param("amp", 0.25);
            params.amp2 = $.param("amp");
          }, []);

          assert(params.freq instanceof NeuParam);
          assert(params.amp  instanceof NeuParam);
          assert(params.freq === synth.freq);
          assert(params.amp  === synth.amp );
          assert(params.amp  === params.amp2);

          synth.freq = 220;
          synth.amp  = 0.1;

          assert(params.freq.valueOf() === 220);
          assert(params.amp .valueOf() === 0.1);
        });
        it("throw an error if given an invalid name", function() {
          var func = function($) {
            $.param("*", Infinity);
          };

          assert.throws(function() {
            new NeuSynth(context, func, []);
          }, TypeError);
        });
      });
      describe(".in(index)", function() {
        it("works", function() {
          var in0 = null;
          var in1 = null;
          var in2 = null;

          var synth = new NeuSynth(context, function($) {
            in0 = $.in(0);
            in1 = $.in(1);
            in2 = $.in(0);
          }, []);

          assert(in0 instanceof window.GainNode);
          assert(in1 instanceof window.GainNode);
          assert(in0 !== in1);
          assert(in0 === in2);
          assert(synth.$inputs[0] === in0);
          assert(synth.$inputs[1] === in1);
        });
      });
      describe(".out(index, ugen)", function() {
        it("works", function() {
          var ugen0 = null;
          var ugen1 = null;
          var ugen2 = null;
          var ugen3 = null;

          var synth = new NeuSynth(context, function($) {
            ugen0 = $("sin");
            ugen1 = $("sin");
            // ugen2 is null
            ugen3 = $("sin");
            assert($.out( 0, ugen0) === null);
            assert($.out( 1, ugen1) === null);
            assert($.out( 2, ugen2) === null);
            assert($.out( 3, ugen3) === null);
          }, []);

          assert(synth.$outputs[0] === ugen0);
          assert(synth.$outputs[1] === ugen1);
          assert(synth.$outputs[2] === undefined);
          assert(synth.$outputs[3] === ugen3);
        });
      });
      describe(".timeout(timeout, ... callbacks)", function() {
        it("works", function() {
          var passed = [];
          var synth = new NeuSynth(context, function($) {
            $.timeout(0.030, function(t, i) {
              passed.push([ "fizz", t, i ]);
            });
            $.timeout(0.050, function(t, i) {
              passed.push([ "buzz", t, i ]);
            });
            $.timeout(0.150, function(t, i) {
              passed.push([ "fizzbuzz", t, i ]);
            });
          }, []);

          synth.start(0.010);
          synth.stop(0.100);
          audioContext.$process(0.200);

          assert.deepEqual(passed, [
            [ "fizz", 0.040, 1 ],
            [ "buzz", 0.060000000000000005, 1 ],
          ]);
        });
      });
    });
  });

  describe("#context", function() {
    it("is an instance of AudioContext", function() {
      var synth = new NeuSynth(context, NOP, []);

      assert(synth.context instanceof window.AudioContext);
    });
  });

  describe("#outlet", function() {
    it("is an instance of AudioNode", sinon.test(function() {
      this.stub(NeuUGen, "build", function() {
        return { $outlet: osc, $unit: unitStub() };
      });

      var synth = new NeuSynth(context, function($) {
        return $("sin");
      }, []);

      assert(synth.outlet instanceof window.AudioNode);
    }));
  });

  describe("#start(t)", function() {
    it("returns self", function() {
      var synth = new NeuSynth(context, NOP, []);

      assert(synth.start() === synth);
    });
    it("calls each ugen.$unit.start(t) only once", sinon.test(function() {
      var ugens = [];

      this.stub(NeuUGen, "build", function() {
        var ugen = { $outlet: osc, $unit: unitStub() };
        ugens.push(ugen);
        return ugen;
      });

      var synth = new NeuSynth(context, function($) {
        return $("+", $("sin"), $("sin"), $("sin"));
      }, []);

      assert(synth.state === "init", "00:00.000");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.start.called === false, "00:00.000");
      });

      synth.start(1.000);
      synth.start(1.250);

      audioContext.$process(0.5);
      assert(synth.state === "ready", "00:00.500");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.start.called === false, "00:00.500");
      });

      audioContext.$process(0.5);
      assert(synth.state === "start", "00:01.000");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.start.calledOnce === true, "00:01.000");
        assert.deepEqual(ugen.$unit.start.firstCall.args, [ 1 ]);
      });

      audioContext.$process(0.5);
      assert(synth.state === "start", "00:01.500");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.start.calledTwice === false, "00:01.500");
      });
    }));
  });

  describe("#stop(t)", function() {
    it("returns self", function() {
      var synth = new NeuSynth(context, NOP, []);

      assert(synth.stop() === synth);
    });
    it("calls each ugen.$unit.stop(t) only once with calling start first", sinon.test(function() {
      var ugens = [];

      this.stub(NeuUGen, "build", function() {
        var ugen = { $outlet: osc, start: function() {}, $unit: unitStub()  };
        ugens.push(ugen);
        return ugen;
      });

      var synth = new NeuSynth(context, function($) {
        return $("+", $("sin"), $("sin"), $("sin"));
      }, []);

      assert(synth.state === "init", "00:00.000");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.stop.called === false, "00:00.000");
      });

      synth.stop(0.000);
      synth.start(1.000);
      synth.stop(2.000);

      audioContext.$process(0.5);
      assert(synth.state === "ready", "00:00.500");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.stop.called === false, "00:00.500");
      });

      audioContext.$process(0.5);
      assert(synth.state === "start", "00:01.000");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.stop.called === false, "00:01.000");
      });

      audioContext.$process(0.5);
      assert(synth.state === "start", "00:01.500");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.stop.called === false, "00:01.500");
      });

      audioContext.$process(0.5);
      assert(synth.state === "stop", "00:02.000");
      ugens.forEach(function(ugen) {
        assert(ugen.$unit.stop.calledOnce === true, "00:02.000");
        assert.deepEqual(ugen.$unit.stop.firstCall.args, [ 2 ]);
      });

      var destination = _.findAudioNode(context);
      assert(destination.$inputs.indexOf(osc) !== -1);

      audioContext.$process(0.5);
      assert(destination.$inputs.indexOf(osc) === -1);
    }));
  });

  describe("#call(method, ...args)", function() {
    it("returns self", function() {
      var synth = new NeuSynth(context, NOP, []);

      assert(synth.call() === synth);
    });
    it("calls #apply(method, args)", function() {
      var synth = new NeuSynth(context, NOP, []);
      var spy = sinon.spy(synth, "apply");

      synth.call("method", 1, 2, 3);

      assert(spy.calledOnce === true);
      assert.deepEqual(spy.firstCall.args, [ "method", [ 1, 2, 3 ] ]);
    });
  });

  describe("#connect(destination, output, input)", function() {
    it("returns self", function() {
      var synth = new NeuSynth(context, NOP, []);

      assert(synth.connect() === synth);
    });
    it("works", function() {
      var synth1 = new NeuSynth(context, function($) {
        $.out(0, $("sin", { freq: 440 }));
        $.out(1, $("sin", { freq: 660 }));
        $.out(2, $("sin", { freq: 880 }));
      }, []);
      var synth2 = new NeuSynth(context, function($) {
        $.out(0, $("+", $.in(0), $.in(1), $.in(2)));
      }, []);

      synth1.connect(synth2, 0, 1);
      synth1.connect(synth2, 0, 2);
      synth1.connect(synth2, 1, 0);
      synth1.connect(synth2, 2, 0);
      synth1.start();
      synth2.start();

      audioContext.$process(0.1);

      assert.deepEqual(synth2.outlet.toJSON(), {
        name: "GainNode",
        gain: {
          value: 1,
          inputs: []
        },
        inputs: [
          {
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
                  value: 660,
                  inputs: []
                },
                detune: {
                  value: 0,
                  inputs: []
                },
                inputs: []
              },
              {
                name: "OscillatorNode",
                type: "sine",
                frequency: {
                  value: 880,
                  inputs: []
                },
                detune: {
                  value: 0,
                  inputs: []
                },
                inputs: []
              }
            ]
          },
          {
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
          },
          {
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
          }
        ]
      });
    });
  });

  describe("works", function() {
    var synth = null;
    var ugen1 = null;
    var ugen2 = null;
    var ugen3 = null;
    var ugen4 = null;
    var passed = null;

    before(function() {
      sinon.stub(NeuUGen, "build", function(synth, key, spec) {
        var ugen = new Emitter();

        ugen.$key    = key;
        ugen.$id     = spec.id;
        ugen.$class  = [ spec.class ];
        ugen.$outlet = osc;
        ugen.$unit   = unitStub();
        ugen.$unit.apply = function(method, args) {
          passed.push([ spec.id, method, args ]);
        };

        return ugen;
      });
    });

    beforeEach(function() {
      passed = [];
      synth = new NeuSynth(context, function($) {
        ugen1 = $("line", { id: "ugen1", class: "amp" });
        ugen2 = $("adsr", { id: "ugen2", class: "amp" });
        ugen3 = $("line", { id: "ugen3", class: "lfo" });
        ugen4 = $("adsr", { id: "ugen4", class: "lfo" });
        return $("+", ugen1, ugen2, ugen3, ugen4);
      }, []);
    });

    after(function() {
      NeuUGen.build.restore();
    });

    describe("#apply(method, args)", function() {

      it("returns self", function() {
        assert(synth.apply() === synth);
      });

      it("calls ugen.$unit.apply(method, args)", function() {
        synth.apply(".amp:release", [ 10, 20 ]);

        assert.deepEqual(passed, [
          [ "ugen1", "release", [ 10, 20 ]],
          [ "ugen2", "release", [ 10, 20 ]],
        ]);
      });
    });

    describe("#hasListeners(event)", function() {
      it("checks if event targets have any listeners", function() {
        synth.on(".amp:end", it);

        assert(synth.hasListeners("end")        === true);
        assert(synth.hasListeners("line:end")   === true);
        assert(synth.hasListeners("adsr:end")   === true);
        assert(synth.hasListeners("#ugen1:end") === true);
        assert(synth.hasListeners("#ugen2:end") === true);
        assert(synth.hasListeners("#ugen3:end") === false);
        assert(synth.hasListeners("#ugen4:end") === false);
        assert(synth.hasListeners(".amp:end")   === true);
        assert(synth.hasListeners(".lfo:end")   === false);
        assert(synth.hasListeners("done")       === false);
      });
      it("case of an invalid event name", function() {
        synth.on("*", it);

        assert(synth.hasListeners("*") === false);
      });
    });

    describe("#listeners(event)", function() {
      it("returns listeners of event targets", function() {
        synth.on("end", it);

        assert.deepEqual(synth.listeners("end"), [ it ]);
      });
    });

    describe("#on(event, listener)", function() {
      it("returns self", function() {
        assert(synth.on("end", it) === synth);
      });
      it("adds the listener to event targets", function() {
        var passed = [];
        var listener = function(n) {
          passed.push(n);
        };

        synth.on(".amp:end", listener);

        ugen1.emit("end", 1); // .amp *
        ugen2.emit("end", 2); // .amp *
        ugen3.emit("end", 3); // .lfo
        ugen4.emit("end", 4); // .lfo

        ugen1.emit("end", 1); // .amp *
        ugen2.emit("end", 2); // .amp *
        ugen3.emit("end", 3); // .lfo
        ugen4.emit("end", 4); // .lfo

        assert.deepEqual(passed, [ 1, 2, 1, 2 ]);
      });
    });

    describe("#once(event, listener)", function() {
      it("returns self", function() {
        assert(synth.once("end", it) === synth);
      });
      it("adds the single-shot listener to event targets", function() {
        var passed = [];
        var listener = function(n) {
          passed.push(n);
        };

        synth.once("line:end", listener);

        ugen1.emit("end", 1); // line *
        ugen2.emit("end", 2); // adsr
        ugen3.emit("end", 3); // line *
        ugen4.emit("end", 4); // adsr

        ugen1.emit("end", 1); // line
        ugen2.emit("end", 2); // adsr
        ugen3.emit("end", 3); // line
        ugen4.emit("end", 4); // adsr

        assert.deepEqual(passed, [ 1, 3 ]);
      });
    });

    describe("#off(event, listener)", function() {
      it("returns self", function() {
        assert(synth.off("end", it) === synth);
      });
      it("removes the listener from event targets", function() {
        var passed = [];
        var listener = function(n) {
          passed.push(n);
        };

        synth.on("end", listener);
        synth.off("#ugen4:end", listener);

        ugen1.emit("end", 1); // #ugen1 *
        ugen2.emit("end", 2); // #ugen2 *
        ugen3.emit("end", 3); // #ugen3 *
        ugen4.emit("end", 4); // #ugen4

        ugen1.emit("end", 1); // #ugen1 *
        ugen2.emit("end", 2); // #ugen2 *
        ugen3.emit("end", 3); // #ugen3 *
        ugen4.emit("end", 4); // #ugen4

        assert.deepEqual(passed, [ 1, 2, 3, 1, 2, 3 ]);
      });
    });

  });

});
