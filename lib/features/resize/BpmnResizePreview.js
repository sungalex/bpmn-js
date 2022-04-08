import {
  attr as svgAttr,
  remove as svgRemove
} from 'tiny-svg';

import { is } from '../../util/ModelUtil';

import { getLanesRoot } from '../modeling/util/LaneUtil';

import { selfAndAllChildren } from 'diagram-js/lib/util/Elements';

import {
  forEach,
  matchPattern,
  without
} from 'min-dash';

var LOW_PRIORITY = 500;


/**
 * Provides previews for resizing participants and moving lanes when resizing lanes.
 *
 * @param {Canvas} canvas
 * @param {EventBus} eventBus
 * @param {PreviewSupport} previewSupport
 */
export default function BpmnResizePreview(canvas, eventBus, previewSupport) {

  /**
   * Create resizer frames when resizing lane.
   *
   * @param {Object} context
   */
  function resizeLaneCreateFrames(context) {
    var direction = context.direction,
        lane = context.shape,
        participant = getLanesRoot(lane);

    // (1) create resizing participant frame
    var resizingParticipantFrame;

    if (isParticipantResizingHorizontally(lane, direction)) {
      context.horizontallyResizingParticipant = participant;

      resizingParticipantFrame = context.resizingParticipantFrame =
        previewSupport.addFrame(participant, canvas.getActiveLayer());
    }

    if (isParticipantResizingVertically(lane, direction)) {
      context.verticallyResizingParticipant = participant;

      if (!resizingParticipantFrame) {
        resizingParticipantFrame = context.resizingParticipantFrame =
          previewSupport.addFrame(participant, canvas.getActiveLayer());
      }
    }

    // (2) create resizing lanes frames
    var resizingLanesFrames = context.resizingLanesFrames = {};

    var horizontallyResizingLanes = context.horizontallyResizingLanes =
      getHorizontallyResizingLanes(participant, direction);

    horizontallyResizingLanes.forEach(function(resizingLane) {
      if (resizingLane === lane) {
        return;
      }

      resizingLanesFrames[ resizingLane.id ] = previewSupport.addFrame(resizingLane, canvas.getActiveLayer());
    });

    var verticallyResizingLanes = context.verticallyResizingLanes =
      getVerticallyResizingLanes(participant, lane, direction);

    forEach(verticallyResizingLanes, function(resizingLanes) {
      resizingLanes.forEach(function(resizingLane) {
        if (resizingLane === lane || resizingLanesFrames[ resizingLane.id ]) {
          return;
        }

        resizingLanesFrames[ resizingLane.id ] = previewSupport.addFrame(resizingLane, canvas.getActiveLayer());
      });
    });
  }

  /**
   * Create resizer frames when resizing participant.
   *
   * @param {Object} context
   */
  function resizeParticipantCreateFrames(context) {
    var direction = context.direction,
        participant = context.shape;

    // (1) create resizing lanes frames
    var resizingLanesFrames = context.resizingLanesFrames = {};

    var horizontallyResizingLanes = context.horizontallyResizingLanes =
      getHorizontallyResizingLanes(participant, direction);

    horizontallyResizingLanes.forEach(function(resizingLane) {
      resizingLanesFrames[ resizingLane.id ] = previewSupport.addFrame(resizingLane, canvas.getActiveLayer());
    });

    var verticallyResizingLanes = context.verticallyResizingLanes =
      getVerticallyResizingLanes(participant, null, direction);

    forEach(verticallyResizingLanes, function(resizingLanes) {
      resizingLanes.forEach(function(resizingLane) {
        if (resizingLanesFrames[ resizingLane.id ]) {
          return;
        }

        resizingLanesFrames[ resizingLane.id ] = previewSupport.addFrame(resizingLane, canvas.getActiveLayer());
      });
    });
  }

  /**
   * Update resizer frames when resizing lane.
   *
   * @param {Object} context
   */
  function resizeLaneUpdateFrames(context) {
    var delta = context.delta,
        direction = context.direction,
        horizontallyResizingLanes = context.horizontallyResizingLanes,
        horizontallyResizingParticipant = context.horizontallyResizingParticipant,
        resizingParticipantFrame = context.resizingParticipantFrame,
        resizingLanesFrames = context.resizingLanesFrames,
        verticallyResizingLanes = context.verticallyResizingLanes,
        verticallyResizingParticipant = context.verticallyResizingParticipant;

    // (1) update resizing participant frame
    if (horizontallyResizingParticipant) {
      if (direction.includes('w')) {
        growWest(horizontallyResizingParticipant, resizingParticipantFrame, delta);
      } else if (direction.includes('e')) {
        growEast(horizontallyResizingParticipant, resizingParticipantFrame, delta);
      }
    }

    if (verticallyResizingParticipant) {
      if (direction.includes('n')) {
        growNorth(verticallyResizingParticipant, resizingParticipantFrame, delta);
      } else if (direction.includes('s')) {
        growSouth(verticallyResizingParticipant, resizingParticipantFrame, delta);
      }
    }

    // (2) update resizing shapes frames
    horizontallyResizingLanes.forEach(function(resizingLane) {
      var frame = resizingLanesFrames[ resizingLane.id ];

      if (!frame) {
        return;
      }

      if (direction.includes('w')) {
        growWest(resizingLane, frame, delta);
      } else if (direction.includes('e')) {
        growEast(resizingLane, frame, delta);
      }
    });

    verticallyResizingLanes.growing.forEach(function(resizingLane) {
      var frame = resizingLanesFrames[ resizingLane.id ];

      if (!frame) {
        return;
      }

      if (direction.includes('n')) {
        growNorth(resizingLane, frame, delta);
      } else if (direction.includes('s')) {
        growSouth(resizingLane, frame, delta);
      }
    });

    verticallyResizingLanes.shrinking.forEach(function(resizingLane) {
      var frame = resizingLanesFrames[ resizingLane.id ];

      if (!frame) {
        return;
      }

      if (direction.includes('n')) {
        shrinkNorth(resizingLane, frame, delta);
      } else if (direction.includes('s')) {
        shrinkSouth(resizingLane, frame, delta);
      }
    });
  }

  /**
   * Update resizer frames when resizing participant.
   *
   * @param {Object} context
   */
  function resizeParticipantUpdateFrames(context) {
    var delta = context.delta,
        direction = context.direction,
        horizontallyResizingLanes = context.horizontallyResizingLanes,
        resizingLanesFrames = context.resizingLanesFrames,
        verticallyResizingLanes = context.verticallyResizingLanes;

    // (1) update resizing shapes frames
    horizontallyResizingLanes.forEach(function(resizingLane) {
      var frame = resizingLanesFrames[ resizingLane.id ];

      if (!frame) {
        return;
      }

      if (direction.includes('w')) {
        growWest(resizingLane, frame, delta);
      } else if (direction.includes('e')) {
        growEast(resizingLane, frame, delta);
      }
    });

    verticallyResizingLanes.growing.forEach(function(resizingLane) {
      var frame = resizingLanesFrames[ resizingLane.id ];

      if (!frame) {
        return;
      }

      if (direction.includes('n')) {
        growNorth(resizingLane, frame, delta);
      } else if (direction.includes('s')) {
        growSouth(resizingLane, frame, delta);
      }
    });
  }

  /**
   * Remove resizer frames.
   *
   * @param {Object} context
   */
  function removeFrames(context) {
    var resizingParticipantFrame = context.resizingParticipantFrame,
        resizingLanesFrames = context.resizingLanesFrames;

    if (resizingParticipantFrame) {
      svgRemove(resizingParticipantFrame);
    }

    if (resizingLanesFrames) {
      forEach(resizingLanesFrames, function(frame) {
        svgRemove(frame);
      });
    }
  }

  // create previews
  eventBus.on('resize.start', function(event) {
    var context = event.context,
        shape = context.shape;

    if (is(shape, 'bpmn:Lane')) {
      resizeLaneCreateFrames(context);
    } else if (is(shape, 'bpmn:Participant')) {
      resizeParticipantCreateFrames(context);
    }
  });

  // update previews
  eventBus.on('resize.move', LOW_PRIORITY, function(event) {
    var context = event.context,
        shape = context.shape;

    if (is(shape, 'bpmn:Lane')) {
      resizeLaneUpdateFrames(context);
    } else if (is(shape, 'bpmn:Participant')) {
      resizeParticipantUpdateFrames(context);
    }
  });

  // remove previews
  eventBus.on('resize.cleanup', function(event) {
    removeFrames(event.context);
  });

}

BpmnResizePreview.$inject = [
  'canvas',
  'eventBus',
  'previewSupport'
];


// helpers //////////

function compareLanesY(laneA, laneB) {
  if (laneA.y < laneB.y) {
    return -1;
  }

  if (laneA.y > laneB.y) {
    return 1;
  }

  return 0;
}

function getFirstLane(element) {
  return element.children.filter(isLane).sort(compareLanesY).shift();
}

function getHorizontallyResizingLanes(participant, direction) {
  if (!direction.includes('w') && !direction.includes('e')) {
    return [];
  }

  return selfAndAllChildren(participant).filter(isLane);
}

function getLastLane(element) {
  return element.children.filter(isLane).sort(compareLanesY).pop();
}

function getNorthernNeighboringLane(lane) {
  var lanes = lane.parent.children.filter(isLane).sort(compareLanesY);

  var index = lanes.indexOf(lane) - 1;

  if (index < 0) {
    return null;
  }

  return lanes[ index ];
}

function getParentLane(lane) {
  var parent = lane.parent;

  if (is(parent, 'bpmn:Lane')) {
    return parent;
  }

  return null;
}

function getParentLanes(lane) {
  var parentLane = getParentLane(lane);

  if (parentLane) {
    return [ parentLane ].concat(getParentLanes(parentLane));
  }

  return [];
}

function getSouthernNeighboringLane(lane) {
  var lanes = lane.parent.children.filter(isLane).sort(compareLanesY);

  var index = lanes.indexOf(lane) + 1;

  if (index > lanes.length - 1) {
    return null;
  }

  return lanes[ index ];
}

/**
 * Get vertically resizing shapes depending on wheter lane or participant is being resized.
 *
 * @param {djs.model.Shape} participant
 * @param {djs.model.Shape} [lane]
 * @param {string} direction
 *
 * @returns {Array<djs.model.Shape>}
 */
function getVerticallyResizingLanes(participant, lane, direction) {
  if (!direction.includes('n') && !direction.includes('s')) {
    return {
      growing: [],
      shrinking: []
    };
  }

  // participant is being resized
  if (!lane) {

    if (direction.includes('n')) {
      return {
        growing: getVeryFirstLanes(participant),
        shrinking: []
      };
    } else if (direction.includes('s')) {
      return {
        growing: getVeryLastLanes(participant),
        shrinking: []
      };
    }
  }

  // lane is being resized
  var hasParentLane = is(lane.parent, 'bpmn:Lane'),
      neighboringLane,
      parentLane,
      shrinking = [];

  if (direction.includes('n')) {

    if (isVeryFirstLane(lane)) {

      // return very first lanes (growing)
      return {
        growing: without(getVeryFirstLanes(participant), matchPattern({ id: lane.id })),
        shrinking: []
      };
    } else if (isFirstLane(lane)) {

      // return all parent lanes (growing)
      // and northern neighbor of parent lane and all its very last lanes (shrinking)
      if (hasParentLane) {
        parentLane = getParentLane(lane);

        neighboringLane = getNorthernNeighboringLane(parentLane);

        if (neighboringLane) {
          shrinking = [ neighboringLane ].concat(getVeryLastLanes(neighboringLane));
        }
      }

      return {
        growing: getParentLanes(lane),
        shrinking: shrinking
      };
    } else {

      // return northern neighboring lane and all its very last lanes (shrinking)
      neighboringLane = getNorthernNeighboringLane(lane);

      if (neighboringLane) {
        shrinking = [ neighboringLane ].concat(getVeryLastLanes(neighboringLane));
      }

      return {
        growing: [],
        shrinking: shrinking
      };
    }
  } else if (direction.includes('s')) {

    if (isVeryLastLane(lane)) {
      return {
        growing: without(getVeryLastLanes(participant), matchPattern({ id: lane.id })),
        shrinking: []
      };
    } else if (isLastLane(lane)) {

      // return all parent lanes (growing)
      // and southern neighbor of parent lane and all its very first lanes (shrinking)
      if (hasParentLane) {
        parentLane = getParentLane(lane);

        neighboringLane = getSouthernNeighboringLane(parentLane);

        if (neighboringLane) {
          shrinking = [ neighboringLane ].concat(getVeryFirstLanes(neighboringLane));
        }
      }

      return {
        growing: getParentLanes(lane),
        shrinking: shrinking
      };
    } else {

      // return southern neighboring lane and all its very first lanes (shrinking)
      neighboringLane = getSouthernNeighboringLane(lane);

      if (neighboringLane) {
        shrinking = [ neighboringLane ].concat(getVeryFirstLanes(neighboringLane));
      }

      return {
        growing: [],
        shrinking: shrinking
      };
    }
  }
}

function getVeryFirstLanes(participant) {
  function getFirstLaneAndFirstChildLanes(element) {
    var firstLane = getFirstLane(element);

    if (firstLane) {
      return [ firstLane ].concat(getFirstLaneAndFirstChildLanes(firstLane));
    }

    return [];
  }

  return getFirstLaneAndFirstChildLanes(participant);
}

function getVeryLastLanes(participant) {
  function getLastLaneAndLastChildLanes(element) {
    var lastLane = getLastLane(element);

    if (lastLane) {
      return [ lastLane ].concat(getLastLaneAndLastChildLanes(lastLane));
    }

    return [];
  }

  return getLastLaneAndLastChildLanes(participant);
}

function growEast(shape, svg, delta) {
  svgAttr(svg, {
    width: shape.width + delta.x
  });
}

function growNorth(shape, svg, delta) {
  svgAttr(svg, {
    y: shape.y + delta.y,
    height: shape.height - delta.y
  });
}

function growSouth(shape, svg, delta) {
  svgAttr(svg, {
    height: shape.height + delta.y
  });
}

function growWest(shape, svg, delta) {
  svgAttr(svg, {
    x: shape.x + delta.x,
    width: shape.width - delta.x
  });
}


function isFirstLane(lane) {
  return lane.parent.children
    .filter(isLane)
    .sort(compareLanesY)
    .indexOf(lane) === 0;
}

function isLane(element) {
  return is(element, 'bpmn:Lane');
}

function isLastLane(lane) {
  var lanes = lane.parent.children
    .filter(isLane)
    .sort(compareLanesY);

  return lanes.indexOf(lane) === lanes.length - 1;
}

function isParticipantResizingHorizontally(lane, direction) {
  return direction.includes('e') || direction.includes('w');
}

function isParticipantResizingVertically(lane, direction) {
  if (isVeryFirstLane(lane) && direction.includes('n')) {
    return true;
  }

  if (isVeryLastLane(lane) && direction.includes('s')) {
    return true;
  }

  return false;
}

function isVeryFirstLane(lane) {
  var parent = lane.parent;

  return isFirstLane(lane) && (is(parent, 'bpmn:Participant') || isVeryFirstLane(parent));
}

function isVeryLastLane(lane) {
  var parent = lane.parent;

  return isLastLane(lane) && (is(parent, 'bpmn:Participant') || isVeryLastLane(parent));
}

function shrinkNorth(shape, svg, delta) {
  growSouth(shape, svg, delta);
}

function shrinkSouth(shape, svg, delta) {
  growNorth(shape, svg, delta);
}