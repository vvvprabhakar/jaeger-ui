// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';
import { mount } from 'enzyme';

import TimelineViewingLayer from './TimelineViewingLayer';

function mapFromSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

describe('<TimelineViewingLayer>', () => {
  let wrapper;
  let instance;

  const viewStart = 0.25;
  const viewEnd = 0.9;
  const props = {
    boundsInvalidator: Math.random(),
    updateNextViewRangeTime: jest.fn(),
    updateViewRange: jest.fn(),
    viewRangeTime: {
      current: [viewStart, viewEnd],
    },
  };

  beforeEach(() => {
    props.updateNextViewRangeTime.mockReset();
    props.updateViewRange.mockReset();
    wrapper = mount(<TimelineViewingLayer {...props} />);
    instance = wrapper.instance();
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.TimelineViewingLayer').length).toBe(1);
  });

  it('sets _root to the root DOM node', () => {
    expect(instance._root).toBeDefined();
    expect(wrapper.find('.TimelineViewingLayer').getDOMNode()).toBe(instance._root);
  });

  describe('uses DraggableManager', () => {
    it('initializes the DraggableManager', () => {
      const dm = instance._draggerReframe;
      expect(dm).toBeDefined();
      expect(dm.onMouseMove).toBe(instance._handleReframeMouseMove);
      expect(dm.onMouseLeave).toBe(instance._handleReframeMouseLeave);
      expect(dm.onDragStart).toBe(instance._handleReframeDragUpdate);
      expect(dm.onDragMove).toBe(instance._handleReframeDragUpdate);
      expect(dm.onDragEnd).toBe(instance._handleReframeDragEnd);
    });

    it('provides the DraggableManager handlers as callbacks', () => {
      const { handleMouseDown, handleMouseLeave, handleMouseMove } = instance._draggerReframe;
      const rootWrapper = wrapper.find('.TimelineViewingLayer');
      expect(rootWrapper.prop('onMouseDown')).toBe(handleMouseDown);
      expect(rootWrapper.prop('onMouseLeave')).toBe(handleMouseLeave);
      expect(rootWrapper.prop('onMouseMove')).toBe(handleMouseMove);
    });

    it('returns the dragging bounds from _getDraggingBounds()', () => {
      const left = 10;
      const width = 100;
      instance._root.getBoundingClientRect = () => ({ left, width });
      expect(instance._getDraggingBounds()).toEqual({ width, clientXLeft: left });
    });

    it('updates viewRange.time.cursor via _draggerReframe.onMouseMove', () => {
      const value = 0.5;
      const cursor = mapFromSubRange(viewStart, viewEnd, value);
      instance._draggerReframe.onMouseMove({ value });
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[{ cursor }]]);
    });

    it('resets viewRange.time.cursor via _draggerReframe.onMouseLeave', () => {
      instance._draggerReframe.onMouseLeave();
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[{ cursor: undefined }]]);
    });

    it('handles drag start via _draggerReframe.onDragStart', () => {
      const value = 0.5;
      const shift = mapFromSubRange(viewStart, viewEnd, value);
      const update = { reframe: { shift, anchor: shift } };
      instance._draggerReframe.onDragStart({ value });
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[update]]);
    });

    it('handles drag move via _draggerReframe.onDragMove', () => {
      const anchor = 0.25;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: Math.random() } };
      const value = 0.5;
      const shift = mapFromSubRange(viewStart, viewEnd, value);
      // make sure `anchor` is already present on the props
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.prop('viewRangeTime').reframe.anchor).toBe(anchor);
      // the next update should integrate `value` and use the existing anchor
      instance._draggerReframe.onDragStart({ value });
      const update = { reframe: { anchor, shift } };
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[update]]);
    });

    it('handles drag end via _draggerReframe.onDragEnd', () => {
      const manager = { resetBounds: jest.fn() };
      const value = 0.5;
      const shift = mapFromSubRange(viewStart, viewEnd, value);
      const anchor = 0.25;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: Math.random() } };
      wrapper.setProps({ viewRangeTime });
      instance._draggerReframe.onDragEnd({ manager, value });
      expect(manager.resetBounds.mock.calls).toEqual([[]]);
      expect(props.updateViewRange.mock.calls).toEqual([[anchor, shift]]);
    });
  });

  describe('render()', () => {
    it('renders nothing without a nextViewRangeTime', () => {
      expect(wrapper.find('div').length).toBe(1);
    });

    it('renders the cursor when it is the only non-current value set', () => {
      const cursor = viewStart + 0.5 * (viewEnd - viewStart);
      const baseViewRangeTime = { ...props.viewRangeTime, cursor };
      wrapper.setProps({ viewRangeTime: baseViewRangeTime });
      // cursor is rendered when solo
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(1);
      // cursor is skipped when shiftStart, shiftEnd, or reframe are present
      let viewRangeTime = { ...baseViewRangeTime, shiftStart: cursor };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(0);
      viewRangeTime = { ...baseViewRangeTime, shiftEnd: cursor };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(0);
      viewRangeTime = { ...baseViewRangeTime, reframe: { anchor: cursor, shift: cursor } };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(0);
    });

    it('renders the reframe dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: viewEnd } };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingRight.isReframeDrag').length).toBe(1);
    });

    it('renders the shiftStart dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftStart: viewEnd };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingRight.isShiftDrag').length).toBe(1);
    });

    it('renders the shiftEnd dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftEnd: viewStart };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingLeft.isShiftDrag').length).toBe(1);
    });
  });
});
