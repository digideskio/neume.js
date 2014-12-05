module.exports = function(neume, util) {
  "use strict";

  /* istanbul ignore next */
  var NOP = function() {};

  /**
   * $(function, {
   *   timeConstant: [number] = 0
   * } ... inputs)
   *
   * methods:
   *   setValue(t, value)
   *   execute(t)
   *
   * +--------+      +-------+
   * | inputs |  or  | DC(1) |
   * +--------+      +-------+
   *   ||||||
   * +-------------------------+
   * | GainNode                |
   * | - gain: evaluated value |
   * +-------------------------+
   *   |
   */
  neume.register("function", function(ugen, spec, inputs) {
    var context = ugen.$context;
    var outlet = null;

    var data = typeof spec.value === "function" ? spec.value : /* istanbul ignore next */ NOP;
    var count = 0;

    var prevValue = util.finite(data(0, count++));
    var param = context.createNeuParam(prevValue, spec);

    if (inputs.length) {
      outlet = context.createGain();
      context.createNeuSum(inputs).connect(outlet);
      context.connect(param, outlet.gain);
    } else {
      outlet = param;
    }

    function update(t0) {
      var v0 = prevValue;
      var v1 = data(t0, count++);

      param.update(v1, v0, t0);

      prevValue = v1;
    }

    return new neume.Unit({
      outlet: outlet,
      methods: {
        setValue: function(t, value) {
          if (typeof value === "function") {
            context.sched(util.finite(context.toSeconds(t)), function() {
              data = value;
            });
          }
        },
        evaluate: function(t) {
          context.sched(util.finite(context.toSeconds(t)), function(t) {
            update(t);
          });
        }
      }
    });
  });

};
