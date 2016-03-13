'use strict';

const {Editor, EditorState, RichUtils} = Draft;
const {List, Repeat, Map} = Immutable

class RichEditorExample extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      dragImgState: {
        isDragActive: false
      },
      droppedFiles: [],
      ActiveImage: Map()
    };

    this.focus = () => this.refs.editor.focus();
    this.onChange = (editorState) => this.setState({editorState});

    this.handleKeyCommand = (command) => this._handleKeyCommand(command);
    this.toggleBlockType = (type) => this._toggleBlockType(type);
    this.toggleInlineStyle = (style) => this._toggleInlineStyle(style);

    // this.onDragEnter = this._onDragEnter.bind(this);
    this.onDragEnter = (e) => this._onDragEnter(e);
    this.onDrop = (e) => this._onDrop(e);
    this.BlockRenderer = this._blockRenderer.bind(this);
  }

  _handleKeyCommand(command) {
    const {editorState} = this.state;
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  _toggleBlockType(blockType) {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  setImageActive(blockKey){
    var {ActiveImage} = this.state;
    this.setState({ActiveImage: ActiveImage.set(blockKey,blockKey)});
  }
  /* --- extension for drag and drop image -----*/

  _onDragEnter(e){
    e.preventDefault();

    // Count the dropzone and any children that are entered.
    ++this.enterCounter;

    // This is tricky. During the drag even the dataTransfer.files is null
    // But Chrome implements some drag store, which is accesible via dataTransfer.items
    const dataTransferItems = e.dataTransfer && e.dataTransfer.items ? e.dataTransfer.items : [];

    // Now we need to convert the DataTransferList to Array
    // const allFilesAccepted = this.allFilesAccepted(Array.prototype.slice.call(dataTransferItems));
    const allFilesAccepted = dataTransferItems;

    this.setState({
      dragImgState: {
        isDragActive: allFilesAccepted ? true: false
      }
    });
  }

  _onDrop(e){
    e.preventDefault();

    const droppedFiles = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    const max = this.props.multiple ? droppedFiles.length : 1;
    const files = [];
    for(let i = 0; i < max; i++){
      const file = droppedFiles[i];
      if(!this.props.disablePreview){
        file.preview = window.URL.createObjectURL(file);
      };
      files.push(file.preview);
    };

    this.setState({
      editorState: insertImg(this.state.editorState, files[0]),
      droppedFiles: files
    });
  }

  _blockRenderer(block) {
    if (block.getType() === 'image'){
      return {
        component: ImgBLOCK,
        props:{
          onSetImageActive: (blockKey) =>{
            var {ActiveImage} = this.state;
            this.setState({ActiveImage: ActiveImage.set(blockKey, blockKey)});
          },
          removeImageBlock: (blockKey) =>{
            console.log('blockKey : ', blockKey);
            var {editorState} = this.state;
            this.setState({
              editorState: removeImgBlock(editorState, blockKey)
            })
          }
        }
      }
    };
    return null;
  }
  /* ---------------- ending ----------------- */

  render() {
    const {editorState} = this.state;

    // If the user changes block type before entering any text, we can
    // either style the placeholder or hide it. Let's just hide it now.
    let className = 'RichEditor-editor';
    var contentState = editorState.getCurrentContent();
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== 'unstyled') {
        className += ' RichEditor-hidePlaceholder';
      }
    }

    return (
      <div className="RichEditor-root">
        <BlockStyleControls
         editorState={editorState}
         onToggle={this.toggleBlockType}
        />
        <InlineStyleControls
         editorState={editorState}
         onToggle={this.toggleInlineStyle}
        />
        <div
         className={className}
         onClick={this.focus}
         onDragEnter={this.onDragEnter}
         onDrop={this.onDrop}
         >
          <Editor
           blockRendererFn={this.BlockRenderer}
           blockStyleFn={getBlockStyle}
           customStyleMap={styleMap}
           editorState={editorState}
           handleKeyCommand={this.handleKeyCommand}
           onChange={this.onChange}
           placeholder="Tell a story..."
           ref="editor"
           spellCheck={true}
          />
        </div>
      </div>
    );
  }
}

// Custom overrides for "code" style.
const styleMap = {
  CODE: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
    fontSize: 16,
    padding: 2,
  },
};

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote': return 'RichEditor-blockquote';
    default: return null;
  }
}

class StyleButton extends React.Component {
  constructor() {
    super();
    this.onToggle = (e) => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
    };
  }

  render() {
    let className = 'RichEditor-styleButton';
    if (this.props.active) {
      className += ' RichEditor-activeButton';
    }

    return (
      <span className={className} onMouseDown={this.onToggle}>
        {this.props.label}
      </span>
    );
  }
}

const BLOCK_TYPES = [
  {label: 'H1', style: 'header-one'},
  {label: 'H2', style: 'header-two'},
  {label: 'Blockquote', style: 'blockquote'},
  {label: 'UL', style: 'unordered-list-item'},
  {label: 'OL', style: 'ordered-list-item'},
  {label: 'Code Block', style: 'code-block'},
];

const BlockStyleControls = (props) => {
  const {editorState} = props;
  const selection = editorState.getSelection();
  const blockType = editorState
          .getCurrentContent()
          .getBlockForKey(selection.getStartKey())
          .getType();

  return (
    <div className="RichEditor-controls">
      {BLOCK_TYPES.map((type) =>
        <StyleButton
        key={type.label}
        active={type.style === blockType}
        label={type.label}
        onToggle={props.onToggle}
        style={type.style}
        />
       )}
    </div>
  );
};

var INLINE_STYLES = [
  {label: 'Bold', style: 'BOLD'},
  {label: 'Italic', style: 'ITALIC'},
  {label: 'Underline', style: 'UNDERLINE'},
  {label: 'Monospace', style: 'CODE'},
];

const InlineStyleControls = (props) => {
  var currentStyle = props.editorState.getCurrentInlineStyle();
  return (
    <div className="RichEditor-controls">
      {INLINE_STYLES.map(type =>
        <StyleButton
        key={type.label}
        active={currentStyle.has(type.style)}
        label={type.label}
        onToggle={props.onToggle}
        style={type.style}
        />
       )}
    </div>
  );
};

ReactDOM.render(
  <RichEditorExample />,
  document.getElementById('content')
);


const {
  BlockMapBuilder,
  CharacterMetadata,
  ContentBlock,
  Entity,
  Modifier,
  genKey,
} = Draft;

var insertImg = function(editorState, previewLink){
  var contentState = editorState.getCurrentContent();
  var selectionState = editorState.getSelection();

  var afterRemoval = Modifier.removeRange(
    contentState,
    selectionState,
    'backward'
  );

  var targetSelection = afterRemoval.getSelectionAfter();
  var afterSplit = Modifier.splitBlock(afterRemoval, targetSelection);
  var insertionTarget = afterSplit.getSelectionAfter();

  var asImage = Modifier.setBlockType(afterSplit, insertionTarget, 'image');

  var entityKey = Entity.create(
    'PHOTO',
    'IMMUTABLE',
    {content: previewLink}
  );

  var charData = CharacterMetadata.create({entity: entityKey});

  var fragmentArray = [
    new ContentBlock({
      key: genKey(),
      type: 'image',
      text: ' ',
      characterList: List(Repeat(charData, 1))
    }),
    new ContentBlock({
      key: genKey(),
      type: 'unstyled',
      text: '',
      characterList: List(),
    }),
  ]

  var fragment = BlockMapBuilder.createFromArray(fragmentArray);
  var withImg = Modifier.replaceWithFragment(
    asImage,
    insertionTarget,
    fragment
  );

  var newContent = withImg.merge({
    selectionBefore: selectionState,
    selectionAfter: withImg.getSelectionAfter().set('hasFocus', true)
  });

  return EditorState.push(editorState, newContent, 'insert-fragment');
}


const {SelectionState} = Draft;

function removeImgBlock(editorState, blockKey) {
  var content = editorState.getCurrentContent();
  var block = content.getBlockForKey(blockKey);

  var targetRange = new SelectionState({
    anchorKey: blockKey,
    anchorOffset: 0,
    focusKey: blockKey,
    focusOffset: block.getLength()
  });

  var withoutTeX = Modifier.removeRange(content, targetRange, 'backward');
  var resetBlock = Modifier.setBlockType(
    withoutTeX,
    withoutTeX.getSelectionAfter(),
    'unstyled'
  );

  var newState = EditorState.push(editorState, resetBlock, 'remove-range');
  return EditorState.forceSelection(newState, resetBlock.getSelectionAfter());
}

var ImgBLOCK = React.createClass({
  getInitialState: function(){
    return{divActive: false}
  },

  _getValue: function(){
    return Entity.get(this.props.block.getEntityAt(0))
                 .getData()['content']
  },

  handleKeydown: function(e) {
    var keyId = e.keyCode;
    switch(keyId){
      case 8:
        console.log('backspace');
        this.props.blockProps.removeImageBlock(this.props.block.getKey());
        // removeImgBlock(editorState, blockKey);
        break;
      default:
        window.addEventListener('keydown', this.handleClick);
        this.setState({
          divActive: false
        })
        break;
    }
  },

  handleClick: function(e) {
    console.log("handle click -------")
    window.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKeydown);
    if (this.state){
      this.setState({
        divActive: false
      });
    }
    console.log("handle click ------- end");
  },

  componentWillUnmount: function() {
    console.log('will unmount');
    window.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('click', this.handleClick);
  },

  _onClick: function(e){
    this.setState({
      divActive: true,
      activeId: this.props.block.getKey()
    });

    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('click', this.handleClick, true);

  },

  render: function(){
    var previewLink = this._getValue();
    const divActive = this.state.divActive;
    var divClassName = "";
    if(divActive){
      divClassName = "image-container divActive";
    }else{
      divClassName = "image-container";
    }

    return(
      <div className={divClassName} contentEditable={false} onClick={this._onClick} ref="mm">
        <img className="insert-image" src={previewLink} contentEditable={false} />
      </div>
    )
  }
})
