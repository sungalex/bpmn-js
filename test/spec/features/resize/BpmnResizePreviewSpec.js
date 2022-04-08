import {
  bootstrapModeler,
  inject
} from 'test/TestHelper';

import coreModule from 'lib/core';
import modelingModule from 'lib/features/modeling';
import resizeModule from 'lib/features/resize';

import {
  queryAll as domQueryAll
} from 'min-dom';

import {
  createCanvasEvent as canvasEvent
} from '../../../util/MockEvents';


describe('features/modeling - resize lane', function() {

  var diagramXML = require('./BpmnResizePreview.bpmn');

  var testModules = [
    coreModule,
    modelingModule,
    resizeModule
  ];

  beforeEach(bootstrapModeler(diagramXML, { modules: testModules }));

  beforeEach(inject(function(dragging) {
    dragging.setOptions({ manual: true });
  }));


  describe('participant', function() {

    it('should show correct preview');

  });


  describe('lane', function() {

    it('should show correct preview', inject(function(canvas, dragging, elementRegistry, resize) {

      // given
      var lane1 = elementRegistry.get('Lane_1'),
          lane2 = elementRegistry.get('Lane_2'),
          lane3 = elementRegistry.get('Lane_3'),
          lane31 = elementRegistry.get('Lane_3_1'),
          lane32 = elementRegistry.get('Lane_3_2'),
          participant = elementRegistry.get('Participant_1');

      // when
      resize.activate(canvasEvent({ x: 0, y: 0 }), lane1, 'se');

      dragging.move(canvasEvent({ x: 20, y: 20 }));

      // then
      var context = dragging.context().data.context;

      console.log(context);

      var resizingLanesFrames = context.resizingLanesFrames,
          resizingParticipantFrame = context.resizingParticipantFrame;

      expect(getBounds(resizingLanesFrames.Lane_2)).to.have.bounds({
        x: lane2.x,
        y: lane2.y + 20,
        width: lane2.width + 20,
        height: lane2.height - 20
      });

      expect(getBounds(resizingLanesFrames.Lane_3)).to.have.bounds({
        x: lane3.x,
        y: lane3.y,
        width: lane3.width + 20,
        height: lane3.height
      });

      expect(getBounds(resizingLanesFrames.Lane_3_1)).to.have.bounds({
        x: lane31.x,
        y: lane31.y,
        width: lane31.width + 20,
        height: lane31.height
      });

      expect(getBounds(resizingLanesFrames.Lane_3_2)).to.have.bounds({
        x: lane32.x,
        y: lane32.y,
        width: lane32.width + 20,
        height: lane32.height
      });

      expect(getBounds(resizingParticipantFrame)).to.have.bounds({
        x: participant.x,
        y: participant.y,
        width: participant.width + 20,
        height: participant.height
      });
    }));

  });

});

// helpers //////////

function getBounds(svg) {
  return {
    x: parseInt(svg.getAttribute('x')),
    y: parseInt(svg.getAttribute('y')),
    width: parseInt(svg.getAttribute('width')),
    height: parseInt(svg.getAttribute('height'))
  };
}
