import inherits from 'inherits';

import ResizeSnapping from 'diagram-js/lib/features/snapping/ResizeSnapping';

import { is } from '../../util/ModelUtil';

import {
  bottomLeft,
  bottomRight,
  topLeft,
  topRight
} from 'diagram-js/lib/features/snapping/SnapUtil';


export default function BpmnResizeSnapping(injector) {
  injector.invoke(ResizeSnapping, this);
}

inherits(BpmnResizeSnapping, ResizeSnapping);

BpmnResizeSnapping.$inject = [ 'injector' ];

BpmnResizeSnapping.prototype.addSnapTargetPoints = function(snapPoints, shape, target, direction) {
  if (is(shape, 'bpmn:Lane')) {
    return addLaneSnapPoints(shape, direction, snapPoints);
  }

  return ResizeSnapping.prototype.addSnapTargetPoints.call(this, snapPoints, shape, target, direction);
};


// helpers //////////

/**
 * Add snap points when resizing lane. Lanes only snap to themselves.
 *
 * @param {djs.model.shape} lane
 * @param {string} direction
 * @param {Object} snapPoints
 *
 * @returns {Object}
 */
function addLaneSnapPoints(lane, direction, snapPoints) {
  if (direction === 'nw' || direction === 'n' || direction === 'w') {
    snapPoints.add('corner', topLeft(lane));
  } else if (direction === 'se' || direction === 's' || direction === 'e') {
    snapPoints.add('corner', bottomRight(lane));
  } else if (direction === 'ne') {
    snapPoints.add('corner', topRight(lane));
  } else if (direction === 'sw') {
    snapPoints.add('corner', bottomLeft(lane));
  }

  return snapPoints;
}