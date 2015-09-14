'use strict';

var inherits = require('inherits');

var is = require('../../util/ModelUtil').is,
    getBoundingBox = require('diagram-js/lib/util/Elements').getBBox;

var pick = require('lodash/object/pick'),
    assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach'),
    values = require('lodash/object/values'),
    flatten = require('lodash/array/flatten');

var CommandInterceptor = require('diagram-js/lib/command/CommandInterceptor');

var OFFSET = { top: 60, bottom: 60, left: 100, right: 100 };
var PADDING = { top: 2, bottom: 2, left: 15, right: 15 };

/**
 * An auto resize component that takes care of expanding parent participants
 * and lanes if elements are modeled close to an edge of the parent element.
 */
function AutoResize(eventBus, canvas, modeling){

  CommandInterceptor.call(this, eventBus);

  this.postExecuted([ 'shape.create' ], function(event) {
    var context = event.context,
        shape = context.shape,
        parent = context.parent || context.newParent;

    expand([shape], parent);
  });

  this.postExecuted([ 'elements.move' ], function(event) {

    var context = event.context,
        elements = flatten(values(context.closure.topLevel)),
        parent = context.parent || context.newParent;

    expand(elements, parent);
  });

  /**
   * Returns an object which indicates near which bounding edge(s)
   * of a target a bounding box is located.
   *
   * @param  {Object} bbox  bounding box object with x, y, width and height properties
   * @param  {Shape}  target
   * @param  {Number} padding
   *
   * @return {Object} {top, bottom, left, right}
   *
   * @example
   *
   * // If the bounding box is near the bottom left corner of a target the return object is:
   * { top: false, bottom: true, left: true, right: false }
   *
   */
  function isInbounds(bbox, target, padding) {
    return {
      top: bbox.y < target.y + padding.top && bbox.y + bbox.height > target.y,
      bottom: bbox.y < target.y + target.height && bbox.y + bbox.height > target.y + target.height - padding.bottom,
      left: bbox.x < target.x + padding.left && bbox.x + bbox.width > target.x,
      right: bbox.x < target.x + target.width && bbox.x + bbox.width > target.x + target.width - padding.right,
    };
  }

  /**
   * Expand the target shape if the bounding box of the moved elements is near or on an edge,
   * considering the position of the bounding box in relation to the parent's edge plus padding.
   * The amount to expand can be defined for each edge in the OFFSET object.
   *
   * @param  {Array<Shape>} [elements]
   * @param  {Shape} target
   */
  function expand(elements, target) {

    var bbox = getBoundingBox(elements),
        canExpand = true;

    if (!is(target, 'bpmn:Participant') && !is(target, 'bpmn:Lane')) {
      return;
    }

    forEach(elements, function(element) {

      if (is(element, 'bpmn:Lane') || element.labelTarget) {
        canExpand = false;
        return;
      }
    });

    if (!canExpand) {
      return;
    }

    var inbounds = isInbounds(bbox, target, PADDING);

    var newBounds = pick(target, [ 'x', 'y', 'width', 'height' ]);

    if (inbounds.top) {
      var topPosition = bbox.y - OFFSET.top;
      assign(newBounds, { y: topPosition, height: target.height + target.y - topPosition });
    }

    if (inbounds.bottom) {
      assign(newBounds, { height: bbox.y + bbox.height + OFFSET.bottom - target.y });
    }

    if (inbounds.left) {
      var leftPosition = bbox.x - OFFSET.left;
      assign(newBounds, { x: leftPosition, width: target.width + target.x - leftPosition });
    }

    if (inbounds.right) {
      assign(newBounds, { width: bbox.x + bbox.width + OFFSET.right - target.x });
    }

    modeling.resizeShape(target, newBounds);
  }
}

AutoResize.$inject = [ 'eventBus', 'canvas', 'modeling' ];

inherits(AutoResize, CommandInterceptor);

module.exports = AutoResize;