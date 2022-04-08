import ResizeModule from 'diagram-js/lib/features/resize';

import BpmnResizePreview from './BpmnResizePreview';

export default {
  __depends__: [
    ResizeModule
  ],
  __init__: [ 'bpmnResizePreview' ],
  bpmnResizePreview: [ 'type', BpmnResizePreview ]
};