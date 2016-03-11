var DropzoneDemo = React.createClass({
  getInitialState: function () {
    return {
      files: []
    };
  },

  onDrop: function (files) {
    console.log('this value : ', this);
    this.setState({
      files: files
    });
  },

  onOpenClick: function () {
    this.refs.dropzone.open();
  },

  render: function () {
    return (
      <div>
        <Dropzone ref="dropzone" onDrop={this.onDrop} accept="image/*">
          <div>Try dropping some files here, or click to select files to upload.</div>
        </Dropzone>
        <button type="button" onClick={this.onOpenClick}>
          Open Dropzone
        </button>
        {this.state.files.length > 0 ? <div>
         <h2>Uploading {this.state.files.length} files...</h2>
         <div>{this.state.files.map((file) => <img src={file.preview} /> )}</div>
         </div> : null}
      </div>
         );
        }
  });

  ReactDOM.render(<DropzoneDemo />,
                  document.getElementById("content"));
