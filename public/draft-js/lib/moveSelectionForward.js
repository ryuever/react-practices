/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule moveSelectionForward
 * 
 */

/**
 * Given a collapsed selection, move the focus `maxDistance` forward within
 * the selected block. If the selection will go beyond the end of the block,
 * move focus to the start of the next block, but no further.
 *
 * This function is not Unicode-aware, so surrogate pairs will be treated
 * as having length 2.
 */
'use strict';

function moveSelectionForward(editorState, maxDistance) {
  var selection = editorState.getSelection();
  var key = selection.getStartKey();
  var offset = selection.getStartOffset();
  var content = editorState.getCurrentContent();

  var focusKey = key;
  var focusOffset;

  var block = content.getBlockForKey(key);

  if (maxDistance > block.getText().length - offset) {
    focusKey = content.getKeyAfter(key);
    focusOffset = 0;
  } else {
    focusOffset = offset + maxDistance;
  }

  return selection.merge({ focusKey: focusKey, focusOffset: focusOffset });
}

module.exports = moveSelectionForward;