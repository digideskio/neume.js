module.exports = function(neume) {
  "use strict";

  /**
   * $("+", {
   *   mul: signal = 1,
   *   add: signal = 0,
   * }, ...inputs: signal)
   *
   * +-----------+     +-----------+
   * | inputs[0] | ... | inputs[N] |
   * +-----------+     +-----------+
   *   |                 |
   *   +-----------------+
   *   |
   */
  neume.register("+", function(ugen, spec, inputs) {
    return make(ugen, spec, inputs);
  });

  function make(ugen, spec, inputs) {
    return new neume.Unit({
      outlet: new neume.Sum(ugen.$context, inputs)
    });
  }

};
