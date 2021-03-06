/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule EditorState
 * 
 */

'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var BlockTree = require('./BlockTree');
var ContentState = require('./ContentState');
var EditorBidiService = require('./EditorBidiService');
var Immutable = require('immutable');
var SelectionState = require('./SelectionState');

var OrderedSet = Immutable.OrderedSet;
var Record = Immutable.Record;
var Stack = Immutable.Stack;

var defaultRecord = {
  allowUndo: true,
  currentContent: null,
  decorator: null,
  directionMap: null,
  forceSelection: false,
  inCompositionMode: false,
  inlineStyleOverride: null,
  lastChangeType: null,
  nativelyRenderedContent: null,
  redoStack: Stack(),
  selection: null,
  treeMap: null,
  undoStack: Stack()
};

var EditorStateRecord = Record(defaultRecord);

var EditorState = (function () {
  _createClass(EditorState, [{
    key: 'toJS',
    value: function toJS() {
      return this.getImmutable().toJS();
    }
  }, {
    key: 'getAllowUndo',
    value: function getAllowUndo() {
      return this.getImmutable().get('allowUndo');
    }
  }, {
    key: 'getCurrentContent',
    value: function getCurrentContent() {
      return this.getImmutable().get('currentContent');
    }
  }, {
    key: 'getUndoStack',
    value: function getUndoStack() {
      return this.getImmutable().get('undoStack');
    }
  }, {
    key: 'getRedoStack',
    value: function getRedoStack() {
      return this.getImmutable().get('redoStack');
    }
  }, {
    key: 'getSelection',
    value: function getSelection() {
      return this.getImmutable().get('selection');
    }
  }, {
    key: 'getDecorator',
    value: function getDecorator() {
      return this.getImmutable().get('decorator');
    }
  }, {
    key: 'isInCompositionMode',
    value: function isInCompositionMode() {
      return this.getImmutable().get('inCompositionMode');
    }
  }, {
    key: 'mustForceSelection',
    value: function mustForceSelection() {
      return this.getImmutable().get('forceSelection');
    }
  }, {
    key: 'getNativelyRenderedContent',
    value: function getNativelyRenderedContent() {
      return this.getImmutable().get('nativelyRenderedContent');
    }
  }, {
    key: 'getLastChangeType',
    value: function getLastChangeType() {
      return this.getImmutable().get('lastChangeType');
    }

    /**
     * While editing, the user may apply inline style commands with a collapsed
     * cursor, intending to type text that adopts the specified style. In this
     * case, we track the specified style as an "override" that takes precedence
     * over the inline style of the text adjacent to the cursor.
     *
     * If null, there is no override in place.
     */
  }, {
    key: 'getInlineStyleOverride',
    value: function getInlineStyleOverride() {
      return this.getImmutable().get('inlineStyleOverride');
    }

    /**
     * Get the appropriate inline style for the editor state. If an
     * override is in place, use it. Otherwise, the current style is
     * based on the location of the selection state.
     */
  }, {
    key: 'getCurrentInlineStyle',
    value: function getCurrentInlineStyle() {
      var override = this.getInlineStyleOverride();
      if (override != null) {
        return override;
      }

      var content = this.getCurrentContent();
      var selection = this.getSelection();

      if (selection.isCollapsed()) {
        return getInlineStyleForCollapsedSelection(content, selection);
      }

      return getInlineStyleForNonCollapsedSelection(content, selection);
    }
  }, {
    key: 'getBlockTree',
    value: function getBlockTree(blockKey) {
      return this.getImmutable().getIn(['treeMap', blockKey]);
    }
  }, {
    key: 'isSelectionAtStartOfContent',
    value: function isSelectionAtStartOfContent() {
      var firstKey = this.getCurrentContent().getBlockMap().first().getKey();
      return this.getSelection().hasEdgeWithin(firstKey, 0, 0);
    }
  }, {
    key: 'isSelectionAtEndOfContent',
    value: function isSelectionAtEndOfContent() {
      var content = this.getCurrentContent();
      var blockMap = content.getBlockMap();
      var last = blockMap.last();
      var end = last.getLength();
      return this.getSelection().hasEdgeWithin(last.getKey(), end, end);
    }
  }, {
    key: 'getDirectionMap',
    value: function getDirectionMap() {
      return this.getImmutable().get('directionMap');
    }

    /**
     * Incorporate native DOM selection changes into the EditorState. This
     * method can be used when we simply want to accept whatever the DOM
     * has given us to represent selection, and we do not need to re-render
     * the editor.
     *
     * To forcibly move the DOM selection, see `EditorState.forceSelection`.
     */
  }], [{
    key: 'createEmpty',
    value: function createEmpty(decorator) {
      return EditorState.createWithContent(ContentState.createFromText(''), decorator);
    }
  }, {
    key: 'createWithContent',
    value: function createWithContent(contentState, decorator) {
      var firstKey = contentState.getBlockMap().first().getKey();
      return EditorState.create({
        currentContent: contentState,
        undoStack: Stack(),
        redoStack: Stack(),
        decorator: decorator || null,
        selection: SelectionState.createEmpty(firstKey)
      });
    }
  }, {
    key: 'create',
    value: function create(config) {
      var currentContent = config.currentContent;
      var decorator = config.decorator;

      var recordConfig = _extends({}, config, {
        treeMap: generateNewTreeMap(currentContent, decorator),
        directionMap: EditorBidiService.getDirectionMap(currentContent)
      });
      return new EditorState(new EditorStateRecord(recordConfig));
    }
  }, {
    key: 'set',
    value: function set(editorState, put) {
      var map = editorState.getImmutable().withMutations(function (state) {
        var existingDecorator = state.get('decorator');
        var decorator = existingDecorator;
        if (put.decorator === null) {
          decorator = null;
        } else if (put.decorator) {
          decorator = put.decorator;
        }

        var newContent = put.currentContent || editorState.getCurrentContent();

        if (decorator !== existingDecorator) {
          var treeMap = state.get('treeMap');
          var newTreeMap;
          if (decorator && existingDecorator) {
            newTreeMap = regenerateTreeForNewDecorator(newContent.getBlockMap(), treeMap, decorator, existingDecorator);
          } else {
            newTreeMap = generateNewTreeMap(newContent, decorator);
          }

          state.merge({
            decorator: decorator,
            treeMap: newTreeMap,
            nativelyRenderedContent: null
          });
          return;
        }

        var existingContent = editorState.getCurrentContent();
        if (newContent !== existingContent) {
          state.set('treeMap', regenerateTreeForNewBlocks(editorState, newContent.getBlockMap(), decorator));
        }

        state.merge(put);
      });

      return new EditorState(map);
    }
  }, {
    key: 'acceptSelection',
    value: function acceptSelection(editorState, selection) {
      return updateSelection(editorState, selection, false);
    }

    /**
     * At times, we need to force the DOM selection to be where we
     * need it to be. This can occur when the anchor or focus nodes
     * are non-text nodes, for instance. In this case, we want to trigger
     * a re-render of the editor, which in turn forces selection into
     * the correct place in the DOM. The `forceSelection` method
     * accomplishes this.
     *
     * This method should be used in cases where you need to explicitly
     * move the DOM selection from one place to another without a change
     * in ContentState.
     */
  }, {
    key: 'forceSelection',
    value: function forceSelection(editorState, selection) {
      if (!selection.getHasFocus()) {
        selection = selection.set('hasFocus', true);
      }
      return updateSelection(editorState, selection, true);
    }

    /**
     * Move selection to the end of the editor without forcing focus.
     */
  }, {
    key: 'moveSelectionToEnd',
    value: function moveSelectionToEnd(editorState) {
      var content = editorState.getCurrentContent();
      var lastBlock = content.getLastBlock();
      var lastKey = lastBlock.getKey();
      var length = lastBlock.getLength();

      return EditorState.acceptSelection(editorState, new SelectionState({
        anchorKey: lastKey,
        anchorOffset: length,
        focusKey: lastKey,
        focusOffset: length,
        isBackward: false
      }));
    }

    /**
     * Force focus to the end of the editor. This is useful in scenarios
     * where we want to programatically focus the input and it makes sense
     * to allow the user to continue working seamlessly.
     */
  }, {
    key: 'moveFocusToEnd',
    value: function moveFocusToEnd(editorState) {
      var afterSelectionMove = EditorState.moveSelectionToEnd(editorState);
      return EditorState.forceSelection(afterSelectionMove, afterSelectionMove.getSelection());
    }

    /**
     * Push the current ContentState onto the undo stack if it should be
     * considered a boundary state, and set the provided ContentState as the
     * new current content.
     */
  }, {
    key: 'push',
    value: function push(editorState, contentState, changeType) {
      if (editorState.getCurrentContent() === contentState) {
        return editorState;
      }

      var forceSelection = changeType !== 'insert-characters';
      var directionMap = EditorBidiService.getDirectionMap(contentState, editorState.getDirectionMap());

      if (!editorState.getAllowUndo()) {
        return EditorState.set(editorState, {
          currentContent: contentState,
          directionMap: directionMap,
          lastChangeType: changeType,
          selection: contentState.getSelectionAfter(),
          forceSelection: forceSelection,
          inlineStyleOverride: null
        });
      }

      var selection = editorState.getSelection();
      var currentContent = editorState.getCurrentContent();
      var undoStack = editorState.getUndoStack();
      var newContent = contentState;

      if (selection !== currentContent.getSelectionAfter() || mustBecomeBoundary(editorState, changeType)) {
        undoStack = undoStack.push(currentContent);
        newContent = newContent.set('selectionBefore', selection);
      } else if (changeType === 'insert-characters' || changeType === 'backspace-character' || changeType === 'delete-character') {
        // Preserve the previous selection.
        newContent = newContent.set('selectionBefore', currentContent.getSelectionBefore());
      }

      return EditorState.set(editorState, {
        currentContent: newContent,
        directionMap: directionMap,
        undoStack: undoStack,
        redoStack: Stack(),
        lastChangeType: changeType,
        selection: contentState.getSelectionAfter(),
        forceSelection: forceSelection,
        inlineStyleOverride: null
      });
    }

    /**
     * Make the top ContentState in the undo stack the new current content and
     * push the current content onto the redo stack.
     */
  }, {
    key: 'undo',
    value: function undo(editorState) {
      if (!editorState.getAllowUndo()) {
        return editorState;
      }

      var undoStack = editorState.getUndoStack();
      var newCurrentContent = undoStack.peek();
      if (!newCurrentContent) {
        return editorState;
      }

      var currentContent = editorState.getCurrentContent();
      var directionMap = EditorBidiService.getDirectionMap(newCurrentContent, editorState.getDirectionMap());

      return EditorState.set(editorState, {
        currentContent: newCurrentContent,
        directionMap: directionMap,
        undoStack: undoStack.shift(),
        redoStack: editorState.getRedoStack().push(currentContent),
        forceSelection: true,
        inlineStyleOverride: null,
        lastChangeType: 'undo',
        nativelyRenderedContent: null,
        selection: currentContent.getSelectionBefore()
      });
    }

    /**
     * Make the top ContentState in the redo stack the new current content and
     * push the current content onto the undo stack.
     */
  }, {
    key: 'redo',
    value: function redo(editorState) {
      if (!editorState.getAllowUndo()) {
        return editorState;
      }

      var redoStack = editorState.getRedoStack();
      var newCurrentContent = redoStack.peek();
      if (!newCurrentContent) {
        return editorState;
      }

      var currentContent = editorState.getCurrentContent();
      var directionMap = EditorBidiService.getDirectionMap(newCurrentContent, editorState.getDirectionMap());

      return EditorState.set(editorState, {
        currentContent: newCurrentContent,
        directionMap: directionMap,
        undoStack: editorState.getUndoStack().push(currentContent),
        redoStack: redoStack.shift(),
        forceSelection: true,
        inlineStyleOverride: null,
        lastChangeType: 'redo',
        nativelyRenderedContent: null,
        selection: newCurrentContent.getSelectionAfter()
      });
    }

    /**
     * Not for public consumption.
     */
  }]);

  function EditorState(immutable) {
    _classCallCheck(this, EditorState);

    this._immutable = immutable;
  }

  /**
   * Set the supplied SelectionState as the new current selection, and set
   * the `force` flag to trigger manual selection placement by the view.
   */

  /**
   * Not for public consumption.
   */

  _createClass(EditorState, [{
    key: 'getImmutable',
    value: function getImmutable() {
      return this._immutable;
    }
  }]);

  return EditorState;
})();

function updateSelection(editorState, selection, forceSelection) {
  return EditorState.set(editorState, {
    selection: selection,
    forceSelection: forceSelection,
    nativelyRenderedContent: null,
    inlineStyleOverride: null
  });
}

/**
 * Regenerate the entire tree map for a given ContentState and decorator.
 * Returns an OrderedMap that maps all available ContentBlock objects.
 */
function generateNewTreeMap(contentState, decorator) {
  return contentState.getBlockMap().map(function (block) {
    return BlockTree.generate(block, decorator);
  }).toOrderedMap();
}

/**
 * Regenerate tree map objects for all ContentBlocks that have changed
 * between the current editorState and newContent. Returns an OrderedMap
 * with only changed regenerated tree map objects.
 */
function regenerateTreeForNewBlocks(editorState, newBlockMap, decorator) {
  var prevBlockMap = editorState.getCurrentContent().getBlockMap();
  var prevTreeMap = editorState.getImmutable().get('treeMap');
  return prevTreeMap.merge(newBlockMap.toSeq().filter(function (block, key) {
    return block !== prevBlockMap.get(key);
  }).map(function (block) {
    return BlockTree.generate(block, decorator);
  }));
}

/**
 * Generate tree map objects for a new decorator object, preserving any
 * decorations that are unchanged from the previous decorator.
 *
 * Note that in order for this to perform optimally, decoration Lists for
 * decorators should be preserved when possible to allow for direct immutable
 * List comparison.
 */
function regenerateTreeForNewDecorator(blockMap, previousTreeMap, decorator, existingDecorator) {
  return previousTreeMap.merge(blockMap.toSeq().filter(function (block) {
    return decorator.getDecorations(block) !== existingDecorator.getDecorations(block);
  }).map(function (block) {
    return BlockTree.generate(block, decorator);
  }));
}

/**
 * Return whether a change should be considered a boundary state, given
 * the previous change type. Allows us to discard potential boundary states
 * during standard typing or deletion behavior.
 */
function mustBecomeBoundary(editorState, changeType) {
  var lastChangeType = editorState.getLastChangeType();
  return changeType !== lastChangeType || changeType !== 'insert-characters' && changeType !== 'backspace-character' && changeType !== 'delete-character';
}

function getInlineStyleForCollapsedSelection(content, selection) {
  var startKey = selection.getStartKey();
  var startOffset = selection.getStartOffset();
  var startBlock = content.getBlockForKey(startKey);

  // If the cursor is not at the start of the block, look backward to
  // preserve the style of the preceding character.
  if (startOffset > 0) {
    return startBlock.getInlineStyleAt(startOffset - 1);
  }

  // The caret is at position zero in this block. If the block has any
  // text at all, use the style of the first character.
  if (startBlock.getLength()) {
    return startBlock.getInlineStyleAt(0);
  }

  // Otherwise, look upward in the document to find the closest character.
  return lookUpwardForInlineStyle(content, startKey);
}

function getInlineStyleForNonCollapsedSelection(content, selection) {
  var startKey = selection.getStartKey();
  var startOffset = selection.getStartOffset();
  var startBlock = content.getBlockForKey(startKey);

  // If there is a character just inside the selection, use its style.
  if (startOffset < startBlock.getLength()) {
    return startBlock.getInlineStyleAt(startOffset);
  }

  // Check if the selection at the end of a non-empty block. Use the last
  // style in the block.
  if (startOffset > 0) {
    return startBlock.getInlineStyleAt(startOffset - 1);
  }

  // Otherwise, look upward in the document to find the closest character.
  return lookUpwardForInlineStyle(content, startKey);
}

function lookUpwardForInlineStyle(content, fromKey) {
  var previousBlock = content.getBlockBefore(fromKey);
  var previousLength;

  while (previousBlock) {
    previousLength = previousBlock.getLength();
    if (previousLength) {
      return previousBlock.getInlineStyleAt(previousLength - 1);
    }
    previousBlock = content.getBlockBefore(previousBlock.getKey());
  }

  return OrderedSet();
}

module.exports = EditorState;